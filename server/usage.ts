import { randomUUID } from "node:crypto";
import { pool } from "./db.js";

export type UsageLimits = {
  monthlySessionStarts: number;
  maxActiveSessions: number;
  maxStorageBytes: number;
  dailyMcpCalls: number;
};

const defaults: UsageLimits = {
  monthlySessionStarts: 20,
  maxActiveSessions: 1,
  maxStorageBytes: 512 * 1024 * 1024,
  dailyMcpCalls: 1000,
};

type LimitRow = {
  monthly_session_starts: number;
  max_active_sessions: number;
  max_storage_bytes: string;
  daily_mcp_calls: number;
};

const toLimits = (row: LimitRow): UsageLimits => ({
  monthlySessionStarts: row.monthly_session_starts,
  maxActiveSessions: row.max_active_sessions,
  maxStorageBytes: Number(row.max_storage_bytes),
  dailyMcpCalls: row.daily_mcp_calls,
});

export async function usageLimits(ownerUserId: string): Promise<UsageLimits> {
  await pool.query(
    `insert into workspace_usage_limit (owner_user_id) values ($1)
     on conflict (owner_user_id) do nothing`,
    [ownerUserId],
  );
  const result = await pool.query<LimitRow>(
    `select monthly_session_starts, max_active_sessions, max_storage_bytes, daily_mcp_calls
     from workspace_usage_limit where owner_user_id = $1`,
    [ownerUserId],
  );
  return result.rows[0] ? toLimits(result.rows[0]) : defaults;
}

export async function updateUsageLimits(
  ownerUserId: string,
  changes: UsageLimits,
): Promise<UsageLimits> {
  const valid =
    Number.isInteger(changes.monthlySessionStarts) && changes.monthlySessionStarts >= 1 && changes.monthlySessionStarts <= 10_000 &&
    Number.isInteger(changes.maxActiveSessions) && changes.maxActiveSessions >= 1 && changes.maxActiveSessions <= 5 &&
    Number.isInteger(changes.maxStorageBytes) && changes.maxStorageBytes >= 50 * 1024 * 1024 && changes.maxStorageBytes <= 20 * 1024 * 1024 * 1024 &&
    Number.isInteger(changes.dailyMcpCalls) && changes.dailyMcpCalls >= 1 && changes.dailyMcpCalls <= 100_000;
  if (!valid) throw new Error("Choose limits within the allowed workspace range.");
  const result = await pool.query<LimitRow>(
    `insert into workspace_usage_limit (owner_user_id, monthly_session_starts, max_active_sessions, max_storage_bytes, daily_mcp_calls)
     values ($1, $2, $3, $4, $5)
     on conflict (owner_user_id) do update set monthly_session_starts = excluded.monthly_session_starts,
       max_active_sessions = excluded.max_active_sessions, max_storage_bytes = excluded.max_storage_bytes,
       daily_mcp_calls = excluded.daily_mcp_calls, updated_at = now()
     returning monthly_session_starts, max_active_sessions, max_storage_bytes, daily_mcp_calls`,
    [ownerUserId, changes.monthlySessionStarts, changes.maxActiveSessions, changes.maxStorageBytes, changes.dailyMcpCalls],
  );
  return toLimits(result.rows[0]);
}

export async function assertStorageCapacity(ownerUserId: string, incomingBytes: number) {
  const limits = await usageLimits(ownerUserId);
  const result = await pool.query<{ total: string }>(
    "select coalesce(sum(byte_size), 0) as total from apk_artifact where owner_user_id = $1",
    [ownerUserId],
  );
  if (Number(result.rows[0]?.total ?? 0) + incomingBytes > limits.maxStorageBytes)
    throw new Error("Storage limit reached. Increase the storage limit in Settings → Usage, then upload again.");
}

export async function assertSessionStartWithinLimits(ownerUserId: string) {
  const limits = await usageLimits(ownerUserId);
  const result = await pool.query<{ monthly: string; active: string }>(
    `select count(*) filter (where created_at >= date_trunc('month', now())) as monthly,
            count(*) filter (where status in ('queued', 'starting', 'running', 'paused')) as active
     from android_session where owner_user_id = $1`,
    [ownerUserId],
  );
  const current = result.rows[0];
  if (Number(current?.monthly ?? 0) >= limits.monthlySessionStarts)
    throw new Error(`Session limit reached (${current?.monthly ?? 0} of ${limits.monthlySessionStarts} this month). Increase the monthly session limit in Settings → Usage and continue.`);
  if (Number(current?.active ?? 0) >= limits.maxActiveSessions)
    throw new Error(`Active-session limit reached (${current?.active ?? 0} of ${limits.maxActiveSessions}). End a session or increase the active-session limit in Settings → Usage.`);
}

export async function recordMcpCall(ownerUserId: string, action: string, sessionId?: string) {
  const limits = await usageLimits(ownerUserId);
  const result = await pool.query<{ count: string }>(
    `select count(*) from workspace_usage_event
     where owner_user_id = $1 and kind = 'mcp_call' and created_at >= date_trunc('day', now())`,
    [ownerUserId],
  );
  const used = Number(result.rows[0]?.count ?? 0);
  if (used >= limits.dailyMcpCalls)
    throw new Error(`MCP call limit reached (${used} of ${limits.dailyMcpCalls} today). Increase the daily MCP call limit in Settings → Usage and continue.`);
  await pool.query(
    `insert into workspace_usage_event (id, owner_user_id, kind, action, session_id) values ($1, $2, 'mcp_call', $3, $4)`,
    [randomUUID(), ownerUserId, action, sessionId ?? null],
  );
  if (action.startsWith("act:")) {
    await pool.query(
      `insert into workspace_usage_event (id, owner_user_id, kind, action, session_id) values ($1, $2, $3, $4, $5)`,
      [randomUUID(), ownerUserId, "tool_call", action, sessionId ?? null],
    );
  }
  if (action === "act:tap")
    await pool.query(
      `insert into workspace_usage_event (id, owner_user_id, kind, action, session_id) values ($1, $2, 'click', $3, $4)`,
      [randomUUID(), ownerUserId, action, sessionId ?? null],
    );
}

export async function recordUsageEvent(
  ownerUserId: string,
  kind: "app_uploaded" | "app_updated" | "app_deleted" | "session_started" | "session_ended" | "session_deleted" | "session_control" | "ai_request",
  action: string,
  sessionId?: string,
) {
  await pool.query(
    `insert into workspace_usage_event (id, owner_user_id, kind, action, session_id) values ($1, $2, $3, $4, $5)`,
    [randomUUID(), ownerUserId, kind, action, sessionId ?? null],
  );
}

export async function usageSummary(ownerUserId: string) {
  const [limits, totals, history, events] = await Promise.all([
    usageLimits(ownerUserId),
    pool.query<{ sessions: string; active_sessions: string; session_minutes: string; apps: string; storage_bytes: string; mcp_calls: string; tool_calls: string; clicks: string; ai_requests: string }>(
      `select
        (select count(*) from android_session where owner_user_id = $1 and created_at >= date_trunc('month', now())) as sessions,
        (select count(*) from android_session where owner_user_id = $1 and status in ('queued', 'starting', 'running', 'paused')) as active_sessions,
        (select coalesce(round(sum(extract(epoch from (coalesce(ended_at, now()) - created_at)) / 60)), 0) from android_session where owner_user_id = $1 and created_at >= date_trunc('month', now())) as session_minutes,
        (select count(*) from apk_artifact where owner_user_id = $1) as apps,
        (select coalesce(sum(byte_size), 0) from apk_artifact where owner_user_id = $1) as storage_bytes,
        count(*) filter (where kind = 'mcp_call' and created_at >= date_trunc('day', now())) as mcp_calls,
        count(*) filter (where kind = 'tool_call' and created_at >= date_trunc('day', now())) as tool_calls,
        count(*) filter (where kind = 'click' and created_at >= date_trunc('day', now())) as clicks,
        count(*) filter (where kind = 'ai_request' and created_at >= date_trunc('day', now())) as ai_requests
       from workspace_usage_event where owner_user_id = $1`,
      [ownerUserId],
    ),
    pool.query<{ day: string; mcp_calls: string; tool_calls: string; clicks: string; ai_requests: string; app_events: string; session_events: string }>(
      `select to_char(created_at::date, 'YYYY-MM-DD') as day,
        count(*) filter (where kind = 'mcp_call') as mcp_calls,
        count(*) filter (where kind = 'tool_call') as tool_calls,
        count(*) filter (where kind = 'click') as clicks,
        count(*) filter (where kind = 'ai_request') as ai_requests,
        count(*) filter (where kind in ('app_uploaded', 'app_updated', 'app_deleted')) as app_events,
        count(*) filter (where kind in ('session_started', 'session_ended', 'session_deleted', 'session_control')) as session_events
       from workspace_usage_event where owner_user_id = $1 and created_at >= current_date - interval '6 days'
       group by created_at::date order by created_at::date`,
      [ownerUserId],
    ),
    pool.query<{ kind: string; action: string | null; created_at: Date }>(
      `select kind, action, created_at from workspace_usage_event
       where owner_user_id = $1 order by created_at desc limit 100`,
      [ownerUserId],
    ),
  ]);
  const row = totals.rows[0];
  return {
    limits,
    metrics: {
      sessionsThisMonth: Number(row?.sessions ?? 0), activeSessions: Number(row?.active_sessions ?? 0), sessionMinutesThisMonth: Number(row?.session_minutes ?? 0), appCount: Number(row?.apps ?? 0),
      storageBytes: Number(row?.storage_bytes ?? 0), mcpCallsToday: Number(row?.mcp_calls ?? 0),
      toolCallsToday: Number(row?.tool_calls ?? 0), clicksToday: Number(row?.clicks ?? 0), aiRequestsToday: Number(row?.ai_requests ?? 0),
    },
    history: history.rows.map((item) => ({ day: item.day, mcpCalls: Number(item.mcp_calls), toolCalls: Number(item.tool_calls), clicks: Number(item.clicks), aiRequests: Number(item.ai_requests), appEvents: Number(item.app_events), sessionEvents: Number(item.session_events) })),
    events: events.rows.map((item) => ({ kind: item.kind, action: item.action, at: item.created_at.toISOString() })),
  };
}
