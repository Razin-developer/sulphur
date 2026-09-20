import { randomUUID } from "node:crypto";
import { pool } from "./db.js";
import { getMcpSettings } from "./mcp-settings.js";
import { recordMcpCall, recordUsageEvent } from "./usage.js";
import { appendCoTesterSummary, loadCoTesterContext, saveCoTesterTurn } from "./cotester-context.js";
import {
  actOnNativeSession,
  controlNativeSession,
  getNativeUiSnapshot,
  relaunchNativeSessionApp,
  screenshotForSession,
} from "../worker/native-windows.js";

type OpenAiOutput = { type: string; name?: string; arguments?: string; call_id?: string; content?: Array<{ type?: string; text?: string }> };
type OpenAiUsage = { input_tokens?: number; output_tokens?: number; total_tokens?: number };
type OpenAiResponse = { id: string; output?: OpenAiOutput[]; output_text?: string; usage?: OpenAiUsage };
export type AgentRunStep = { label: string; detail: string; state: "complete" | "blocked" | "working" };

const toolDefinitions = [
  { type: "function", name: "get_screen_state", description: "Read whether this Android test session is running.", parameters: { type: "object", properties: {}, additionalProperties: false } },
  { type: "function", name: "get_ui_snapshot", description: "Read the current actionable UI elements. Always inspect this before interacting and after each action.", parameters: { type: "object", properties: {}, additionalProperties: false } },
  { type: "function", name: "take_screenshot", description: "Capture the current Android screen when visual context is needed.", parameters: { type: "object", properties: {}, additionalProperties: false } },
  { type: "function", name: "session_control", description: "Control the running test device without leaving this session. Use home or overview only to inspect app lifecycle behavior; use relaunch_app to return to the app.", parameters: { type: "object", properties: { action: { type: "string", enum: ["back", "home", "overview", "rotate_left", "rotate_right", "power"] } }, required: ["action"], additionalProperties: false } },
  { type: "function", name: "relaunch_app", description: "Force-stop and relaunch the APK attached to this session. Use this to establish a clean foreground state, never to interact with another app.", parameters: { type: "object", properties: {}, additionalProperties: false } },
  { type: "function", name: "act", description: "Perform one snapshot-bound Android action. Only use an element ID from the current snapshot.", parameters: { type: "object", properties: { snapshotId: { type: "string" }, kind: { type: "string", enum: ["tap", "type", "long_press", "scroll", "back", "wait"] }, elementId: { type: "string" }, value: { type: "string" } }, required: ["snapshotId", "kind"], additionalProperties: false } },
] as const;

const instructions = `You are CoTester, Sulphur's autonomous Android app-test harness. You have exactly one owner-scoped APK session and its controlled tool surface; treat it as a clean-room test device, never as a general computer.

Operating protocol:
1. First establish state: inspect the UI snapshot, and use a screenshot when visual hierarchy, layout, truncation, or rendering matters. Do not guess from the chat history.
2. Build a small test plan from the user request. For each flow, observe → act once using a current snapshot element ID → observe again. Tool calls are sequential on purpose; do not race or batch interactions.
3. Use relaunch_app to recover a clean foreground app state. Use session_control only for lifecycle, navigation, orientation, or resilience checks. A request to test a purchase flow means exercise the cart and in-app checkout screens. You may complete a clearly marked mock, sandbox, or test-order confirmation inside the assigned APK, but never enter payment credentials, use a real payment provider, place a real order, create an external account, or submit irreversible data. Do not leave the assigned APK, alter system settings beyond the exposed controls, or use coordinates/ADB.
4. Treat every tool result as evidence. A button being visible is not a passing test; report what happened after activation. If a flow needs credentials, payment, OTP, or unavailable data, stop at that boundary and name it as a limitation.
5. Be economical: test the requested path first, stop when evidence is conclusive, and retain discoveries from earlier turns. When the app state conflicts with prior context, trust the latest snapshot.

Do not reveal private chain-of-thought. Instead, make your work legible with a brief, evidence-based report in GitHub-flavored Markdown. Always use exactly these level-two headings, in this order: ## Plan, ## View, ## Pros, ## Cons, and ## Next steps. Make each section self-contained and separated by a blank line. In View, describe only observed UI, actions, and evidence. In Pros, list verified behavior that worked. In Cons, list defects, blocked checks, risks, and coverage gaps; say “None observed” when appropriate. Use concise bullets for steps. When reporting two or more related checks, outcomes, or defects, use a Markdown table with meaningful column headers (for example: Check | Evidence | Outcome). Use bold sparingly for outcomes and inline code only for UI labels, element IDs, or technical values. Never claim success without observed evidence.`;

function toolStep(name: string, args: Record<string, unknown>, result: unknown): AgentRunStep {
  const blocked = Boolean(result && typeof result === "object" && "error" in result);
  const action = name === "act" ? String(args.kind ?? "interaction") : name.replaceAll("_", " ");
  return {
    label: blocked ? `Could not use ${action}` : `Used ${action}`,
    detail: blocked ? String((result as { error?: unknown }).error ?? "The tool was unavailable.") : "Collected session-scoped evidence.",
    state: blocked ? "blocked" : "complete",
  };
}

function finalText(response: OpenAiResponse) {
  if (response.output_text?.trim()) return response.output_text.trim();
  return response.output
    ?.filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n") ?? "";
}

function apiConfig() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("The in-app agent is not configured. Add OPENAI_API_KEY to the server environment.");
  return { key, model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini" };
}

async function openai(body: Record<string, unknown>) {
  const { key } = apiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify(body), signal: controller.signal,
    });
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") throw new Error("The AI test harness took longer than 45 seconds to respond. Your app session is still running; send the request again.");
    throw error;
  } finally { clearTimeout(timeout); }
  const payload = await response.json().catch(() => ({})) as OpenAiResponse & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || "The AI provider could not complete this request.");
  return payload;
}

function creditRates() {
  const input = Number(process.env.AI_CREDITS_PER_1K_INPUT_TOKENS ?? 1);
  const output = Number(process.env.AI_CREDITS_PER_1K_OUTPUT_TOKENS ?? 4);
  if (!Number.isFinite(input) || input < 0 || !Number.isFinite(output) || output < 0)
    throw new Error("AI credit rates must be non-negative numbers.");
  return { input, output };
}

function creditsForTokens(inputTokens: number, outputTokens: number) {
  const rates = creditRates();
  // Credits are whole, durable ledger units. Use one minimum unit for a
  // completed run, then scale by the actual model input and output volume.
  return Math.max(1, Math.ceil((inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output));
}

async function useCredits(ownerUserId: string, credits: number) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const organization = await client.query<{ id: string }>("select id from organization where owner_user_id = $1 for update", [ownerUserId]);
    const organizationId = organization.rows[0]?.id;
    if (!organizationId) throw new Error("Your billing profile is still being created. Please try again shortly.");
    const balance = await client.query<{ balance: string }>("select coalesce(sum(amount) filter (where expires_at is null or expires_at > now()), 0) as balance from credit_ledger where organization_id = $1", [organizationId]);
    if (Number(balance.rows[0]?.balance ?? 0) < credits) throw new Error(`This CoTester run used ${credits} AI credits, but your balance is too low. Add credits to continue.`);
    await client.query("insert into credit_ledger (id, organization_id, amount, reason, external_reference) values ($1, $2, $3, 'usage', $4)", [randomUUID(), organizationId, -credits, `agent-request:${randomUUID()}`]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
}

async function runTool(ownerUserId: string, sessionId: string, name: string, args: Record<string, unknown>) {
  const settings = await getMcpSettings(ownerUserId);
  if (name === "get_screen_state") {
    if (!settings.allowScreenState) throw new Error("This workspace has disabled screen state access for MCP connections.");
    await recordMcpCall(ownerUserId, name, sessionId);
    return { sessionId, status: "running", mode: "snapshot-bound interaction" };
  }
  if (name === "get_ui_snapshot") {
    if (!settings.allowScreenState) throw new Error("This workspace has disabled screen state access for MCP connections.");
    await recordMcpCall(ownerUserId, name, sessionId);
    return getNativeUiSnapshot(ownerUserId, sessionId);
  }
  if (name === "take_screenshot") {
    if (!settings.allowScreenshots) throw new Error("This workspace has disabled screenshot access for MCP connections.");
    await recordMcpCall(ownerUserId, name, sessionId);
    const image = await screenshotForSession(ownerUserId, sessionId);
    return image ? { captured: true, mimeType: "image/png", bytes: image.length } : { captured: false };
  }
  if (name === "session_control") {
    if (!settings.allowActions) throw new Error("This workspace has disabled session controls for MCP connections.");
    const action = String(args.action ?? "");
    if (!["back", "home", "overview", "rotate_left", "rotate_right", "power"].includes(action)) throw new Error("That session control is not available.");
    await recordMcpCall(ownerUserId, `session:${action}`, sessionId);
    return controlNativeSession(ownerUserId, sessionId, action as Parameters<typeof controlNativeSession>[2]);
  }
  if (name === "relaunch_app") {
    if (!settings.allowActions) throw new Error("This workspace has disabled session controls for MCP connections.");
    await recordMcpCall(ownerUserId, "session:relaunch_app", sessionId);
    return relaunchNativeSessionApp(ownerUserId, sessionId);
  }
  if (name === "act") {
    if (!settings.allowActions) throw new Error("This workspace has disabled UI actions for MCP connections.");
    await recordMcpCall(ownerUserId, `act:${String(args.kind)}`, sessionId);
    return actOnNativeSession(ownerUserId, sessionId, args as Parameters<typeof actOnNativeSession>[2]);
  }
  throw new Error("That tool is not available in this session.");
}

export async function runAgent(ownerUserId: string, sessionId: string, conversationId: string, userText: string, options: { userTurnAlreadySaved?: boolean; onProgress?(step: AgentRunStep): Promise<void> | void } = {}) {
  if (!userText.trim()) throw new Error("Send a testing request to start the agent.");
  const context = await loadCoTesterContext(ownerUserId, conversationId, sessionId, userText);
  if (!options.userTurnAlreadySaved) await saveCoTesterTurn(conversationId, "user", userText);
  const prompt: Array<Record<string, unknown>> = [
    { role: "developer", content: `App context: ${context.appName}${context.appDescription ? ` — ${context.appDescription}` : ""}. ${context.summary ? `Prior test summary: ${context.summary}` : ""}` },
    ...context.turns.map((message) => ({ role: message.role, content: message.content.slice(0, 6000) })),
  ];
  const visionRequested = /\b(visual|look|layout|screen|screenshot|appearance|design|see|image)\b/i.test(userText);
  let visionScreenshotCaptured = false;
  if (visionRequested) {
    const settings = await getMcpSettings(ownerUserId);
    if (settings.allowScreenshots) await recordMcpCall(ownerUserId, "vision:screenshot", sessionId);
    const image = settings.allowScreenshots ? await screenshotForSession(ownerUserId, sessionId) : null;
    if (image) {
      visionScreenshotCaptured = true;
      prompt.push({ role: "user", content: [{ type: "input_text", text: userText.slice(0, 6000) }, { type: "input_image", image_url: `data:image/png;base64,${image.toString("base64")}`, detail: "low" }] });
    }
    else prompt.push({ role: "user", content: userText.slice(0, 6000) });
  } else prompt.push({ role: "user", content: userText.slice(0, 6000) });
  const { model } = apiConfig();
  // Function-call continuations use previous_response_id. These short-lived
  // Responses must be stored so OpenAI can resolve that ID across HTTP calls.
  const trace: AgentRunStep[] = [
    { label: "Understood the request", detail: "Scoped the requested test to this app session.", state: "complete" },
    { label: "Prepared a test plan", detail: "The harness will inspect, act, then verify each result.", state: "complete" },
    ...(visionScreenshotCaptured ? [{ label: "Captured the current screen", detail: "Added the session screenshot for visual analysis.", state: "complete" as const }] : []),
  ];
  for (const step of trace) await options.onProgress?.(step);
  // A modest but sufficient budget for multi-screen catalogue and mock
  // checkout flows. Every call remains sequential and snapshot-bound.
  const maxToolSteps = 16;
  const responseOptions = { reasoning: { effort: "minimal" }, max_output_tokens: 3_000, store: true };
  let response = await openai({ model, instructions, input: prompt, tools: toolDefinitions, tool_choice: "auto", parallel_tool_calls: false, max_tool_calls: 1, ...responseOptions });
  let inputTokens = response.usage?.input_tokens ?? 0;
  let outputTokens = response.usage?.output_tokens ?? 0;
  for (let turn = 0; turn < maxToolSteps; turn += 1) {
    const calls = response.output?.filter((item) => item.type === "function_call") ?? [];
    if (!calls.length) break;
    const outputs: Array<Record<string, unknown>> = [];
    for (const call of calls) {
      let result: unknown;
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(call.arguments ?? "{}") as Record<string, unknown>; result = await runTool(ownerUserId, sessionId, call.name ?? "", args); }
      catch (error) { result = { error: error instanceof Error ? error.message : "Tool failed." }; }
      trace.push(toolStep(call.name ?? "tool", args, result));
      await options.onProgress?.(trace.at(-1)!);
      outputs.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
    }
    const finalPass = turn === maxToolSteps - 1;
    response = await openai({
      model, instructions, previous_response_id: response.id,
      input: finalPass ? [...outputs, { role: "user", content: "The run's tool budget is reached. Do not use more tools; write the concise evidence-based test report and clearly list untested coverage." }] : outputs,
      ...(finalPass ? { tool_choice: "none" } : { tools: toolDefinitions, tool_choice: "auto", parallel_tool_calls: false, max_tool_calls: 1 }),
      ...responseOptions,
    });
    inputTokens += response.usage?.input_tokens ?? 0;
    outputTokens += response.usage?.output_tokens ?? 0;
  }
  const answer = finalText(response) || "The harness completed its allowed tool steps but the AI provider did not return a final report. No result has been inferred—review the run activity and send a narrower follow-up.";
  trace.push({ label: "Analysed the evidence", detail: "Compared each observed result with the requested flow.", state: "complete" });
  await options.onProgress?.(trace.at(-1)!);
  trace.push({ label: "Prepared the test report", detail: "Findings and coverage limits are below.", state: "complete" });
  await options.onProgress?.(trace.at(-1)!);
  const creditsUsed = creditsForTokens(inputTokens, outputTokens);
  await useCredits(ownerUserId, creditsUsed);
  await saveCoTesterTurn(conversationId, "assistant", answer);
  await appendCoTesterSummary(conversationId, userText, answer);
  await recordUsageEvent(ownerUserId, "ai_request", `in_app_agent:${inputTokens}:${outputTokens}:${creditsUsed}`, sessionId);
  const billing = await pool.query<{ balance: string }>(`select coalesce(sum(l.amount) filter (where l.expires_at is null or l.expires_at > now()), 0) as balance from credit_ledger l join organization o on o.id = l.organization_id where o.owner_user_id = $1`, [ownerUserId]);
  return { answer, trace, conversationId, creditsRemaining: Number(billing.rows[0]?.balance ?? 0), creditsUsed, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
}
