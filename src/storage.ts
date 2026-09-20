export type AppRecord = {
  id: string;
  name: string;
  description?: string;
  packageName?: string;
  size: number;
  uploadedAt: string;
  lastSessionAt?: string;
  policy: "restricted" | "standard";
};

const apiBase = import.meta.env.VITE_AUTH_URL ?? window.location.origin;

export type UsageLimits = {
  monthlySessionStarts: number;
  maxActiveSessions: number;
  maxStorageBytes: number;
  dailyMcpCalls: number;
};
export type UsageSummary = {
  limits: UsageLimits;
  metrics: {
    sessionsThisMonth: number;
    activeSessions: number;
    sessionMinutesThisMonth: number;
    appCount: number;
    storageBytes: number;
    mcpCallsToday: number;
    toolCallsToday: number;
    clicksToday: number;
    aiRequestsToday: number;
  };
  history: Array<{ day: string; mcpCalls: number; toolCalls: number; clicks: number; aiRequests: number; appEvents: number; sessionEvents: number }>;
  events: Array<{ kind: string; action: string | null; at: string }>;
};

export type AppDefaults = {
  defaultEgressAllowed: boolean;
  sessionDurationMinutes: number;
  cleanStart: boolean;
  defaultOrientation: "portrait" | "landscape";
  sessionRetentionDays: number;
};
export type McpSettings = {
  defaultConnector: "codex" | "claude" | "gemini";
  allowScreenState: boolean;
  allowScreenshots: boolean;
  allowActionLog: boolean;
  allowActions: boolean;
};
export type EmailPreferences = { productUpdates: boolean; billingUpdates: boolean; teamUpdates: boolean; announcements: boolean };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: "include",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(body.message ?? "This request could not be completed.");
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}

export function getUsage() {
  return api<UsageSummary>("/api/usage");
}

export type BillingOverview = {
  subscription: { planId: string; status: string; currentPeriodEnd: string | null; createdAt: string } | null;
  creditBalance: number;
  payments: Array<{ id: string; amount_cents: number; currency: string; status: string; provider: string; createdAt: string }>;
  promos: Array<{ code: string; discountPercent: number; redeemedAt: string }>;
};

export function getBilling() {
  return api<BillingOverview>("/api/billing");
}

export function redeemPromo(code: string) {
  return api<{ promo: { code: string; discountPercent: number } }>("/api/billing/promos/redeem", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
  });
}

export function startCheckout(planId: "developer" | "team" | "scale", cadence: "monthly" | "yearly") {
  return api<{ url: string }>("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, cadence }) });
}

export async function getAppDefaults() {
  const result = await api<{ defaults: AppDefaults }>("/api/settings/apps");
  return result.defaults;
}

export async function saveAppDefaults(defaults: AppDefaults) {
  const result = await api<{ defaults: AppDefaults }>("/api/settings/apps", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(defaults),
  });
  return result.defaults;
}

export async function saveUsageLimits(limits: UsageLimits) {
  const result = await api<{ limits: UsageLimits }>("/api/usage/limits", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(limits),
  });
  return result.limits;
}

export async function getMcpSettings() {
  return (await api<{ settings: McpSettings }>("/api/mcp/settings")).settings;
}
export async function saveMcpSettings(settings: McpSettings) {
  return (await api<{ settings: McpSettings }>("/api/mcp/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) })).settings;
}
export async function getEmailPreferences() {
  return (await api<{ preferences: EmailPreferences }>("/api/settings/email")).preferences;
}
export async function saveEmailPreferences(preferences: EmailPreferences) {
  return (await api<{ preferences: EmailPreferences }>("/api/settings/email", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preferences) })).preferences;
}

export async function listApps(): Promise<AppRecord[]> {
  const result = await api<{
    apps: Array<{
      id: string;
      displayName: string;
      description: string | null;
      byteSize: number;
      createdAt: string;
    }>;
  }>("/api/apps");
  return result.apps.map((app) => ({
    id: app.id,
    name: app.displayName,
    description: app.description ?? undefined,
    size: app.byteSize,
    uploadedAt: app.createdAt,
    policy: "restricted",
  }));
}

export async function saveApp(
  file: File,
  name: string,
  description: string,
  policy: AppRecord["policy"],
): Promise<AppRecord> {
  if (policy !== "restricted")
    throw new Error(
      "New apps start with restricted access until a session is reviewed.",
    );
  const form = new FormData();
  form.set("file", file);
  form.set("name", name);
  form.set("description", description);
  const result = await api<{
    app: {
      id: string;
      displayName: string;
      description: string | null;
      byteSize: number;
      createdAt: string;
    };
  }>("/api/apps", { method: "POST", body: form });
  return {
    id: result.app.id,
    name: result.app.displayName,
    description: result.app.description ?? undefined,
    size: result.app.byteSize,
    uploadedAt: result.app.createdAt,
    policy: "restricted",
  };
}

export function removeApp(id: string) {
  return api<void>(`/api/apps/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function updateApp(
  id: string,
  name: string,
  description: string,
): Promise<AppRecord> {
  const result = await api<{
    app: {
      id: string;
      displayName: string;
      description: string | null;
      byteSize: number;
      createdAt: string;
    };
  }>(`/api/apps/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  return {
    id: result.app.id,
    name: result.app.displayName,
    description: result.app.description ?? undefined,
    size: result.app.byteSize,
    uploadedAt: result.app.createdAt,
    policy: "restricted",
  };
}

export type SessionRecord = {
  id: string;
  artifactId: string;
  status: string;
  createdAt: string;
};

export async function startSession(appId: string) {
  const result = await api<{ session: SessionRecord }>(
    `/api/apps/${encodeURIComponent(appId)}/sessions`,
    { method: "POST" },
  );
  return result.session;
}

export async function listSessions() {
  const result = await api<{ sessions: SessionRecord[] }>("/api/sessions");
  return result.sessions;
}

export function endSession(id: string) {
  return api<void>(`/api/sessions/${encodeURIComponent(id)}/end`, {
    method: "POST",
  });
}

export type DeviceControl =
  | "power"
  | "volume_up"
  | "volume_down"
  | "volume_status"
  | "rotate_left"
  | "rotate_right"
  | "back"
  | "home"
  | "overview";
export function controlSession(id: string, action: DeviceControl) {
  return api<{ result: { volume: number | null; volumeMax: number | null } }>(
    `/api/sessions/${encodeURIComponent(id)}/control`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    },
  );
}

export function removeSession(id: string) {
  return api<void>(`/api/sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export type AgentMessage = { role: "user" | "assistant"; content: string };
export type AgentRunStep = { label: string; detail: string; state: "complete" | "blocked" | "working" };
export type AgentRun = {
  id: string; conversationId: string; sessionId: string; requestText: string;
  status: "queued" | "running" | "succeeded" | "failed";
  answer: string | null; error: string | null; trace: AgentRunStep[];
  events: Array<AgentRunStep & { createdAt: string }>;
  creditsUsed: number | null; inputTokens: number | null; outputTokens: number | null;
  createdAt: string; startedAt: string | null; completedAt: string | null;
};
export type StoredAgentConversation = { id: string; artifactId: string; title: string; updatedAt: string; messages: AgentMessage[] };
export async function listAgentConversations() {
  const result = await api<{ conversations: StoredAgentConversation[] }>("/api/cotester/conversations");
  return result.conversations;
}
export async function sendAgentMessage(id: string, conversationId: string, messages: AgentMessage[]) {
  return api<{ run: AgentRun }>(`/api/sessions/${encodeURIComponent(id)}/agent`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId, messages }),
  });
}

export function getAgentRun(id: string) {
  return api<{ run: AgentRun }>(`/api/cotester/runs/${encodeURIComponent(id)}`);
}

export function getConversationAgentRun(conversationId: string) {
  return api<{ run: AgentRun | null }>(`/api/cotester/conversations/${encodeURIComponent(conversationId)}/run`);
}

export function streamAgentRun(id: string, onRun: (run: AgentRun) => void, onFailure: () => void) {
  const stream = new EventSource(`${apiBase}/api/cotester/runs/${encodeURIComponent(id)}/events`, { withCredentials: true });
  stream.onmessage = (event) => {
    try {
      const run = JSON.parse(event.data) as AgentRun;
      onRun(run);
      if (run.status === "succeeded" || run.status === "failed") stream.close();
    } catch { onFailure(); stream.close(); }
  };
  stream.onerror = () => { onFailure(); stream.close(); };
  return () => stream.close();
}

export function renameAgentConversation(id: string, title: string) {
  return api<void>(`/api/cotester/conversations/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
}

export function deleteAgentConversation(id: string) {
  return api<void>(`/api/cotester/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function sessionScreenshotUrl(id: string) {
  return `${apiBase}/api/sessions/${encodeURIComponent(id)}/screenshot`;
}
