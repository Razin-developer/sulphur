import "dotenv/config";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { auth } from "./auth.js";
import { trustedOrigins } from "./origins.js";
import {
  artifactPathForOwner,
  listArtifacts,
  removeArtifact,
  saveQuarantinedApk,
  updateArtifactDetails,
} from "./artifacts.js";
import {
  controlNativeSession,
  endNativeSession,
  listNativeSessions,
  removeNativeSession,
  screenshotForSession,
  startNativeSession,
} from "../worker/native-windows.js";
import {
  apiSecurityHeaders,
  FixedWindowRateLimiter,
  rateLimit,
} from "./security.js";
import { maximumApkBytes } from "../src/apk-intake.js";
import {
  assertSessionStartWithinLimits,
  assertStorageCapacity,
  recordUsageEvent,
  updateUsageLimits,
  usageSummary,
} from "./usage.js";
import { appDefaults, updateAppDefaults } from "./app-settings.js";
import { getMcpSettings, updateMcpSettings, type McpSettings } from "./mcp-settings.js";
import { workspaceAccess } from "./billing-access.js";
import { billingOverview, redeemPromoCode } from "./billing.js";
import { getEmailPreferences, updateEmailPreferences, type EmailPreferences } from "./email.js";
import { createSubscriptionCheckout, handleStripeEvent, verifyStripeEvent } from "./stripe.js";
import { adminOverview, createPromo, sendAdminBroadcast, togglePromo, updateUserAccess } from "./admin.js";
import { adminSession, clearAdminSession, createAdminSession } from "./admin-auth.js";
import { deleteCoTesterConversation, listCoTesterConversations, renameCoTesterConversation } from "./cotester-context.js";
import { enqueueCoTesterRun, getCoTesterRun, getLatestCoTesterRun } from "./cotester-run-queue.js";

export const app = new Hono();
const authReadLimiter = new FixedWindowRateLimiter(120, 60_000);
const authWriteLimiter = new FixedWindowRateLimiter(20, 60_000);
const appsLimiter = new FixedWindowRateLimiter(120, 60_000);
const uploadLimiter = new FixedWindowRateLimiter(6, 60 * 60_000);
// The authenticated session owner alone can request these frames. This cap
// supports the local live preview without relaxing other workspace APIs.
const screenLimiter = new FixedWindowRateLimiter(720, 60_000);

app.use("*", apiSecurityHeaders());
app.use(
  "/api/*",
  cors({
    // Never reflect or substitute an untrusted origin. A missing CORS header is
    // intentional for origins that are not explicitly trusted.
    origin: (requestOrigin) =>
      trustedOrigins.includes(requestOrigin) ? requestOrigin : "",
    credentials: true,
  }),
);
app.use("/api/auth/*", async (context, next) => {
  const limiter = ["GET", "HEAD", "OPTIONS"].includes(context.req.method)
    ? authReadLimiter
    : authWriteLimiter;
  return rateLimit(limiter, `auth:${context.req.method}`)(context, next);
});
app.all("/api/auth/*", (context) => auth.handler(context.req.raw));
app.get("/health", (context) => context.json({ ok: true }));

app.post("/api/billing/stripe/webhook", async (context) => {
  try {
    const event = verifyStripeEvent(await context.req.text(), context.req.header("stripe-signature"));
    await handleStripeEvent(event);
    return context.json({ received: true });
  } catch (error) { return context.json({ message: error instanceof Error ? error.message : "Invalid webhook." }, 400); }
});

async function signedInUser(context: Context) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  // A session alone is not enough to access tenant data or start a worker.
  // Verification is enforced here, not merely in the browser flow.
  return session?.user?.emailVerified ? session.user : null;
}

const signedInAdmin = (context: Context) => adminSession(context);

app.get("/api/admin/session", (context) => context.json({ authenticated: Boolean(signedInAdmin(context)) }));
app.post("/api/admin/session", rateLimit(authWriteLimiter, "admin:login"), async (context) => {
  const body = await context.req.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  if (!createAdminSession(context, typeof body?.email === "string" ? body.email : "", typeof body?.password === "string" ? body.password : "")) return context.json({ message: "Invalid administrator credentials." }, 401);
  return context.json({ authenticated: true });
});
app.delete("/api/admin/session", (context) => { clearAdminSession(context); return context.body(null, 204); });

app.get("/api/admin/overview", rateLimit(appsLimiter, "admin:read"), async (context) => {
  const user = await signedInAdmin(context);
  if (!user) return context.json({ message: "Administrator access is required." }, 403);
  return context.json(await adminOverview());
});

app.post("/api/admin/users/:id/access", rateLimit(appsLimiter, "admin:write"), async (context) => {
  const user = await signedInAdmin(context);
  if (!user) return context.json({ message: "Administrator access is required." }, 403);
  const body = await context.req.json().catch(() => null) as { action?: unknown } | null;
  if (!body || !["pause", "restore", "extend_trial"].includes(String(body.action))) return context.json({ message: "Choose a valid access action." }, 400);
  try {
    await updateUserAccess(user.email, context.req.param("id"), body.action as "pause" | "restore" | "extend_trial");
    return context.json({ ok: true });
  } catch (error) {
    return context.json({ message: error instanceof Error ? error.message : "User access could not be updated." }, 400);
  }
});

app.post("/api/admin/promos", rateLimit(appsLimiter, "admin:write"), async (context) => {
  const user = await signedInAdmin(context);
  if (!user) return context.json({ message: "Administrator access is required." }, 403);
  const body = await context.req.json().catch(() => null) as { code?: unknown; discountPercent?: unknown; maxRedemptions?: unknown } | null;
  try {
    await createPromo(user.email, { code: String(body?.code ?? ""), discountPercent: Number(body?.discountPercent), maxRedemptions: body?.maxRedemptions === undefined || body.maxRedemptions === "" ? undefined : Number(body.maxRedemptions) });
    return context.json({ ok: true }, 201);
  } catch (error) {
    return context.json({ message: error instanceof Error ? error.message : "Promo code could not be created." }, 400);
  }
});

app.post("/api/admin/promos/:id/toggle", rateLimit(appsLimiter, "admin:write"), async (context) => {
  const user = await signedInAdmin(context);
  if (!user) return context.json({ message: "Administrator access is required." }, 403);
  try {
    return context.json(await togglePromo(user.email, context.req.param("id")));
  } catch (error) {
    return context.json({ message: error instanceof Error ? error.message : "Promo code could not be updated." }, 400);
  }
});

app.post("/api/admin/email/broadcast", rateLimit(authWriteLimiter, "admin:broadcast"), async (context) => {
  const user = await signedInAdmin(context);
  if (!user) return context.json({ message: "Administrator access is required." }, 403);
  const body = await context.req.json().catch(() => null) as { subject?: unknown; message?: unknown; category?: unknown } | null;
  if (typeof body?.subject !== 'string' || typeof body?.message !== 'string' || !['announcement', 'product'].includes(String(body?.category))) return context.json({ message: "Provide a subject, message, and valid email category." }, 400);
  try { return context.json(await sendAdminBroadcast(user.email, { subject: body.subject, message: body.message, category: body.category as 'announcement' | 'product' })); }
  catch (error) { return context.json({ message: error instanceof Error ? error.message : "Broadcast could not be sent." }, 400); }
});

app.get("/api/apps", rateLimit(appsLimiter, "apps:read"), async (context) => {
  const user = await signedInUser(context);
  if (!user)
    return context.json({ message: "Sign in to view your apps." }, 401);
  return context.json({ apps: await listArtifacts(user.id) });
});

app.get("/api/usage", rateLimit(appsLimiter, "usage:read"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in to view workspace usage." }, 401);
  return context.json(await usageSummary(user.id));
});

app.get("/api/billing", rateLimit(appsLimiter, "billing:read"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Verify your email to view billing." }, 401);
  try { return context.json(await billingOverview(user.id)); }
  catch (error) { return context.json({ message: error instanceof Error ? error.message : "Billing could not be loaded." }, 409); }
});

app.post("/api/billing/promos/redeem", rateLimit(appsLimiter, "billing:write"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Verify your email before applying a promo code." }, 401);
  const body = await context.req.json().catch(() => null) as { code?: unknown } | null;
  if (typeof body?.code !== "string") return context.json({ message: "Enter a valid promo code." }, 400);
  try { return context.json({ promo: await redeemPromoCode(user.id, body.code) }, 201); }
  catch (error) { return context.json({ message: error instanceof Error ? error.message : "Promo code could not be applied." }, 409); }
});

app.post("/api/billing/checkout", rateLimit(appsLimiter, "billing:write"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Verify your email before starting a trial." }, 401);
  const body = await context.req.json().catch(() => null) as { planId?: unknown; cadence?: unknown } | null;
  const planId = typeof body?.planId === "string" ? body.planId : "";
  const cadence = body?.cadence === "monthly" || body?.cadence === "yearly" ? body.cadence : null;
  if (!['developer', 'team', 'scale'].includes(planId) || !cadence) return context.json({ message: "Choose a valid paid plan." }, 400);
  const origin = context.req.header("origin") ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5173";
  try { return context.json({ url: await createSubscriptionCheckout(user.id, user.email, planId, cadence, origin) }); }
  catch (error) { return context.json({ message: error instanceof Error ? error.message : "Checkout could not be started." }, 409); }
});

app.put("/api/usage/limits", rateLimit(appsLimiter, "usage:write"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in before changing usage limits." }, 401);
  const body = await context.req.json().catch(() => null) as Record<string, unknown> | null;
  const values = body && {
    monthlySessionStarts: Number(body.monthlySessionStarts),
    maxActiveSessions: Number(body.maxActiveSessions),
    maxStorageBytes: Number(body.maxStorageBytes),
    dailyMcpCalls: Number(body.dailyMcpCalls),
  };
  if (!values) return context.json({ message: "Choose valid workspace limits." }, 400);
  try {
    return context.json({ limits: await updateUsageLimits(user.id, values) });
  } catch (error) {
    return context.json({ message: error instanceof Error ? error.message : "Limits could not be saved." }, 400);
  }
});

app.get("/api/settings/apps", rateLimit(appsLimiter, "apps:read"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in to view app defaults." }, 401);
  return context.json({ defaults: await appDefaults(user.id) });
});

app.put("/api/settings/apps", rateLimit(appsLimiter, "apps:write"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in before changing app defaults." }, 401);
  const body = await context.req.json().catch(() => null) as Record<string, unknown> | null;
  const values = body && {
    defaultEgressAllowed: body.defaultEgressAllowed === true,
    sessionDurationMinutes: Number(body.sessionDurationMinutes),
    cleanStart: body.cleanStart === true,
    defaultOrientation: body.defaultOrientation,
    sessionRetentionDays: Number(body.sessionRetentionDays),
  };
  if (!values) return context.json({ message: "Choose valid app defaults." }, 400);
  try {
    return context.json({ defaults: await updateAppDefaults(user.id, values) });
  } catch (error) {
    return context.json({ message: error instanceof Error ? error.message : "App defaults could not be saved." }, 400);
  }
});

app.get("/api/mcp/settings", rateLimit(appsLimiter, "mcp-settings:read"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in to view MCP settings." }, 401);
  return context.json({ settings: await getMcpSettings(user.id) });
});

app.put("/api/mcp/settings", rateLimit(appsLimiter, "mcp-settings:write"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in before changing MCP settings." }, 401);
  const body = await context.req.json().catch(() => null) as McpSettings | null;
  const valid = body && ["codex", "claude", "gemini"].includes(body.defaultConnector) &&
    [body.allowScreenState, body.allowScreenshots, body.allowActionLog, body.allowActions].every((value) => typeof value === "boolean");
  if (!valid) return context.json({ message: "Choose valid MCP connection settings." }, 400);
  return context.json({ settings: await updateMcpSettings(user.id, body) });
});

app.get("/api/settings/email", rateLimit(appsLimiter, "email:read"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in to view email preferences." }, 401);
  return context.json({ preferences: await getEmailPreferences(user.id) });
});

app.put("/api/settings/email", rateLimit(appsLimiter, "email:write"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in before changing email preferences." }, 401);
  const body = await context.req.json().catch(() => null) as Partial<EmailPreferences> | null;
  if (!body || [body.productUpdates, body.billingUpdates, body.teamUpdates, body.announcements].some((value) => typeof value !== 'boolean')) return context.json({ message: "Choose valid email notification preferences." }, 400);
  return context.json({ preferences: await updateEmailPreferences(user.id, body as EmailPreferences) });
});

app.patch(
  "/api/apps/:id",
  rateLimit(appsLimiter, "apps:write"),
  async (context) => {
    const user = await signedInUser(context);
    if (!user)
      return context.json({ message: "Sign in before updating an app." }, 401);
    const body = (await context.req.json().catch(() => null)) as {
      name?: unknown;
      description?: unknown;
    } | null;
    const displayName = typeof body?.name === "string" ? body.name.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";
    if (!displayName || displayName.length > 120)
      return context.json(
        { message: "Give your app a name of up to 120 characters." },
        400,
      );
    if (description.length > 1000)
      return context.json(
        { message: "Keep the app description to 1,000 characters or fewer." },
        400,
      );
    const app = await updateArtifactDetails(
      user.id,
      context.req.param("id"),
      displayName,
      description || null,
    );
    if (!app) return context.json({ message: "This app is no longer available." }, 404);
    await recordUsageEvent(user.id, "app_updated", "details_updated");
    return context.json({ app });
  },
);

app.post(
  "/api/apps",
  rateLimit(appsLimiter, "apps:write"),
  bodyLimit({
    // Multipart framing is included in content length, hence a small overhead.
    maxSize: maximumApkBytes + 1024 * 1024,
    onError: (context) =>
      context.json(
        { message: "This APK is larger than the current 50 MB review limit." },
        413,
      ),
  }),
  async (context) => {
    const user = await signedInUser(context);
    if (!user)
      return context.json({ message: "Sign in before uploading an APK." }, 401);
    const contentType = context.req.header("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data"))
      return context.json(
        { message: "Upload an APK file using the upload form." },
        415,
      );
    const uploadLimit = uploadLimiter.check(`upload:user:${user.id}`);
    context.header("RateLimit-Limit", String(uploadLimit.limit));
    context.header("RateLimit-Remaining", String(uploadLimit.remaining));
    context.header(
      "RateLimit-Reset",
      String(Math.ceil(uploadLimit.resetAt / 1000)),
    );
    if (!uploadLimit.allowed) {
      context.header("Retry-After", String(uploadLimit.retryAfterSeconds));
      return context.json(
        {
          message: "You have reached the upload limit. Please try again later.",
        },
        429,
      );
    }
    let form: FormData;
    try {
      form = await context.req.formData();
    } catch {
      return context.json(
        {
          message:
            "The upload form could not be read. Choose an APK and try again.",
        },
        400,
      );
    }
    const file = form.get("file");
    if (
      !file ||
      typeof file === "string" ||
      typeof file.arrayBuffer !== "function"
    )
      return context.json({ message: "Choose an Android APK file." }, 400);
    try {
      await assertStorageCapacity(user.id, file.size);
    } catch (error) {
      return context.json({ message: error instanceof Error ? error.message : "Storage limit reached." }, 409);
    }
    const submittedName = form.get("name");
    const submittedDescription = form.get("description");
    const displayName =
      typeof submittedName === "string" ? submittedName.trim() : "";
    const description =
      typeof submittedDescription === "string"
        ? submittedDescription.trim()
        : "";
    if (!displayName || displayName.length > 120)
      return context.json(
        { message: "Give your app a name of up to 120 characters." },
        400,
      );
    if (description.length > 1000)
      return context.json(
        { message: "Keep the app description to 1,000 characters or fewer." },
        400,
      );
    try {
      const app = await saveQuarantinedApk(
        user.id,
        file,
        displayName,
        description || null,
      );
      await recordUsageEvent(user.id, "app_uploaded", "apk_uploaded");
      return context.json(
        { app, message: "APK received and awaiting review before it can run." },
        201,
      );
    } catch (error) {
      const message =
        error instanceof Error && /APK|50 MB|empty/.test(error.message)
          ? error.message
          : "The APK could not be received. Try again.";
      return context.json({ message }, 400);
    }
  },
);

app.delete(
  "/api/apps/:id",
  rateLimit(appsLimiter, "apps:write"),
  async (context) => {
    const user = await signedInUser(context);
    if (!user)
      return context.json({ message: "Sign in before removing an APK." }, 401);
    if (!(await removeArtifact(user.id, context.req.param("id"))))
      return context.json({ message: "That APK is no longer available." }, 404);
    await recordUsageEvent(user.id, "app_deleted", "apk_removed");
    return context.body(null, 204);
  },
);

app.post(
  "/api/apps/:id/sessions",
  rateLimit(appsLimiter, "apps:write"),
  async (context) => {
    const user = await signedInUser(context);
    if (!user)
      return context.json(
        { message: "Sign in before starting a session." },
        401,
      );
    const apkPath = await artifactPathForOwner(
      user.id,
      context.req.param("id"),
    );
    if (!apkPath)
      return context.json(
        { message: "This app is not available for a session." },
        404,
      );
    try {
      await assertSessionStartWithinLimits(user.id);
      const access = await workspaceAccess(user.id);
      const defaults = await appDefaults(user.id);
      // Trial sessions are capped by billing access; a paid plan keeps the
      // workspace-configured session duration.
      defaults.sessionDurationMinutes = Math.min(defaults.sessionDurationMinutes, access.sessionDurationMinutes);
      const session = await startNativeSession(user.id, context.req.param("id"), apkPath, defaults);
      await recordUsageEvent(user.id, "session_started", "session_started", session.id);
      return context.json({ session }, 201);
    } catch (error) {
      return context.json({ message: error instanceof Error ? error.message : "Session limit reached." }, 409);
    }
  },
);

app.get(
  "/api/sessions",
  rateLimit(appsLimiter, "apps:read"),
  async (context) => {
    const user = await signedInUser(context);
    if (!user)
      return context.json({ message: "Sign in to view sessions." }, 401);
    return context.json({ sessions: await listNativeSessions(user.id) });
  },
);

app.get(
  "/api/sessions/:id/screenshot",
  rateLimit(screenLimiter, "session:screen"),
  async (context) => {
    const user = await signedInUser(context);
    if (!user)
      return context.json({ message: "Sign in to view this session." }, 401);
    try {
      const image = await screenshotForSession(
        user.id,
        context.req.param("id"),
      );
      return image
        ? new Response(image, {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "no-store",
            },
          })
        : context.json({ message: "This session is not running." }, 404);
    } catch (error) {
      return context.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "The screen is unavailable.",
        },
        409,
      );
    }
  },
);

app.post(
  "/api/sessions/:id/end",
  rateLimit(appsLimiter, "apps:write"),
  async (context) => {
    const user = await signedInUser(context);
    if (!user)
      return context.json({ message: "Sign in before ending a session." }, 401);
    if (!(await endNativeSession(user.id, context.req.param("id"))))
      return context.json({ message: "This session is not running." }, 404);
    await recordUsageEvent(user.id, "session_ended", "session_ended", context.req.param("id"));
    return context.body(null, 204);
  },
);

app.post("/api/sessions/:id/agent", rateLimit(authWriteLimiter, "session:agent"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in before using the testing agent." }, 401);
  const body = await context.req.json().catch(() => null) as { messages?: unknown; conversationId?: unknown } | null;
  const messages = Array.isArray(body?.messages) ? body.messages.filter((item): item is { role: "user" | "assistant"; content: string } =>
    Boolean(item) && (item as { role?: unknown }).role !== undefined && ["user", "assistant"].includes(String((item as { role: unknown }).role)) && typeof (item as { content?: unknown }).content === "string"
  ) : [];
  const conversationId = typeof body?.conversationId === "string" && /^[0-9a-f-]{36}$/i.test(body.conversationId) ? body.conversationId : null;
  const latest = messages.at(-1);
  if (!conversationId || !latest || latest.role !== "user" || messages.some((message) => message.content.length > 6000)) return context.json({ message: "Provide a conversation and a short testing request." }, 400);
  try { return context.json({ run: await enqueueCoTesterRun(user.id, context.req.param("id"), conversationId, latest.content) }, 202); }
  catch (error) { return context.json({ message: error instanceof Error ? error.message : "The testing agent could not queue this request." }, 409); }
});

app.get("/api/cotester/runs/:id", rateLimit(authReadLimiter, "cotester:run"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in to view this CoTester run." }, 401);
  try { return context.json({ run: await getCoTesterRun(user.id, context.req.param("id")) }); }
  catch (error) { return context.json({ message: error instanceof Error ? error.message : "This CoTester run could not be loaded." }, 404); }
});

app.get("/api/cotester/conversations/:id/run", rateLimit(authReadLimiter, "cotester:run"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in to view this CoTester run." }, 401);
  const run = await getLatestCoTesterRun(user.id, context.req.param("id"));
  return context.json({ run });
});

app.get("/api/cotester/runs/:id/events", async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in to stream this CoTester run." }, 401);
  const runId = context.req.param("id");
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      const publish = async () => {
        try {
          const run = await getCoTesterRun(user.id, runId);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(run)}\n\n`));
          if (["succeeded", "failed"].includes(run.status)) {
            if (timer) clearInterval(timer);
            controller.close();
          }
        } catch {
          if (timer) clearInterval(timer);
          controller.close();
        }
      };
      void publish();
      timer = setInterval(() => void publish(), 900);
    },
    cancel() { if (timer) clearInterval(timer); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
});

app.get("/api/cotester/conversations", rateLimit(authReadLimiter, "cotester:conversations"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in to view test conversations." }, 401);
  return context.json({ conversations: await listCoTesterConversations(user.id) });
});

app.patch("/api/cotester/conversations/:id", rateLimit(authWriteLimiter, "cotester:conversation"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in before updating a test conversation." }, 401);
  const body = await context.req.json().catch(() => null) as { title?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 120) return context.json({ message: "Use a conversation title up to 120 characters." }, 400);
  try { await renameCoTesterConversation(user.id, context.req.param("id"), title); return context.body(null, 204); }
  catch (error) { return context.json({ message: error instanceof Error ? error.message : "The conversation could not be renamed." }, 404); }
});

app.delete("/api/cotester/conversations/:id", rateLimit(authWriteLimiter, "cotester:conversation"), async (context) => {
  const user = await signedInUser(context);
  if (!user) return context.json({ message: "Sign in before deleting a test conversation." }, 401);
  try { await deleteCoTesterConversation(user.id, context.req.param("id")); return context.body(null, 204); }
  catch (error) { return context.json({ message: error instanceof Error ? error.message : "The conversation could not be deleted." }, 404); }
});

app.post(
  "/api/sessions/:id/control",
  rateLimit(appsLimiter, "apps:write"),
  async (context) => {
    const user = await signedInUser(context);
    if (!user)
      return context.json(
        { message: "Sign in before controlling this session." },
        401,
      );
    const body = (await context.req.json().catch(() => null)) as {
      action?: unknown;
    } | null;
    const action = typeof body?.action === "string" ? body.action : "";
    if (
      ![
          "power",
          "volume_up",
          "volume_down",
          "volume_status",
        "rotate_left",
        "rotate_right",
        "back",
        "home",
        "overview",
      ].includes(action)
    )
      return context.json(
        { message: "That device control is not available." },
        400,
      );
    try {
      const result = await controlNativeSession(user.id, context.req.param("id"), action as Parameters<typeof controlNativeSession>[2]);
      await recordUsageEvent(user.id, "session_control", action, context.req.param("id"));
      return context.json({ result });
    } catch (error) {
      return context.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "The device control could not be completed.",
        },
        409,
      );
    }
  },
);

app.delete(
  "/api/sessions/:id",
  rateLimit(appsLimiter, "apps:write"),
  async (context) => {
    const user = await signedInUser(context);
    if (!user)
      return context.json(
        { message: "Sign in before deleting a session." },
        401,
      );
    if (!(await removeNativeSession(user.id, context.req.param("id"))))
      return context.json(
        { message: "Only ended or failed sessions can be deleted." },
        409,
      );
    await recordUsageEvent(user.id, "session_deleted", "session_removed", context.req.param("id"));
    return context.body(null, 204);
  },
);
