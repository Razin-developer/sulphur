import { randomUUID } from "node:crypto";
import { pool } from "./db.js";
import { loadCoTesterContext, saveCoTesterTurn } from "./cotester-context.js";
import { runAgent, type AgentRunStep } from "./agent.js";

export type CoTesterRunStatus = "queued" | "running" | "succeeded" | "failed";
export type CoTesterRunEvent = AgentRunStep & { createdAt: string };
export type CoTesterRun = {
  id: string; conversationId: string; sessionId: string; requestText: string; status: CoTesterRunStatus;
  answer: string | null; error: string | null; trace: AgentRunStep[]; events: CoTesterRunEvent[];
  creditsUsed: number | null; inputTokens: number | null; outputTokens: number | null;
  createdAt: string; startedAt: string | null; completedAt: string | null;
};

type RunRow = {
  id: string; owner_user_id: string; conversation_id: string; session_id: string; request_text: string;
  status: CoTesterRunStatus; answer: string | null; error: string | null; trace: AgentRunStep[];
  credits_used: number | null; input_tokens: number | null; output_tokens: number | null;
  created_at: Date; started_at: Date | null; completed_at: Date | null;
};
let workerRunning = false;
let workerScheduled = false;

function toRun(row: RunRow, events: CoTesterRunEvent[] = []): CoTesterRun {
  return { id: row.id, conversationId: row.conversation_id, sessionId: row.session_id, requestText: row.request_text, status: row.status, answer: row.answer, error: row.error, trace: Array.isArray(row.trace) ? row.trace : [], events, creditsUsed: row.credits_used, inputTokens: row.input_tokens, outputTokens: row.output_tokens, createdAt: row.created_at.toISOString(), startedAt: row.started_at?.toISOString() ?? null, completedAt: row.completed_at?.toISOString() ?? null };
}

export async function enqueueCoTesterRun(ownerUserId: string, sessionId: string, conversationId: string, requestText: string) {
  const content = requestText.trim();
  if (!content) throw new Error("Send a testing request to start the agent.");
  // Persist the turn before queueing so a refresh immediately shows it.
  await loadCoTesterContext(ownerUserId, conversationId, sessionId, content);
  await saveCoTesterTurn(conversationId, "user", content);
  const id = randomUUID();
  const result = await pool.query<RunRow>(
    `insert into cotester_run (id, owner_user_id, conversation_id, session_id, request_text)
     values ($1, $2, $3, $4, $5) returning *`,
    [id, ownerUserId, conversationId, sessionId, content],
  );
  scheduleCoTesterWorker();
  return toRun(result.rows[0]);
}

async function addEvent(runId: string, step: AgentRunStep) {
  await pool.query(
    "insert into cotester_run_event (run_id, label, detail, state) values ($1, $2, $3, $4)",
    [runId, step.label.slice(0, 160), step.detail.slice(0, 1000), step.state],
  );
  await pool.query("update cotester_run set trace = coalesce(trace, '[]'::jsonb) || $2::jsonb, updated_at = now() where id = $1", [runId, JSON.stringify([step])]);
}

async function claimNextRun() {
  const result = await pool.query<RunRow>(
    `with next_run as (
       select id from cotester_run where status = 'queued' order by created_at asc for update skip locked limit 1
     ) update cotester_run r set status = 'running', started_at = now(), updated_at = now()
       from next_run where r.id = next_run.id returning r.*`,
  );
  return result.rows[0] ? toRun(result.rows[0]) : null;
}

async function processRun(run: CoTesterRun & { ownerUserId: string }) {
  await addEvent(run.id, { label: "Started CoTester", detail: "The queued request is now running in the session worker.", state: "working" });
  try {
    const result = await runAgent(run.ownerUserId, run.sessionId, run.conversationId, run.requestText, {
      userTurnAlreadySaved: true,
      onProgress: (step) => addEvent(run.id, step),
    });
    await pool.query(
      `update cotester_run set status = 'succeeded', answer = $2, trace = $3::jsonb, credits_used = $4,
       input_tokens = $5, output_tokens = $6, completed_at = now(), updated_at = now() where id = $1`,
      [run.id, result.answer, JSON.stringify(result.trace), result.creditsUsed, result.inputTokens, result.outputTokens],
    );
    await addEvent(run.id, { label: "Completed the test report", detail: "The findings and coverage limits are saved in this conversation.", state: "complete" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The testing worker could not complete this request.";
    await pool.query("update cotester_run set status = 'failed', error = $2, completed_at = now(), updated_at = now() where id = $1", [run.id, message.slice(0, 2000)]);
    await addEvent(run.id, { label: "Run stopped", detail: message, state: "blocked" });
  }
}

export function scheduleCoTesterWorker() {
  if (workerScheduled || workerRunning) return;
  workerScheduled = true;
  queueMicrotask(async () => {
    workerScheduled = false;
    workerRunning = true;
    try {
      for (;;) {
        const run = await claimNextRun();
        if (!run) break;
        const owner = await pool.query<{ owner_user_id: string }>("select owner_user_id from cotester_run where id = $1", [run.id]);
        const ownerUserId = owner.rows[0]?.owner_user_id;
        if (!ownerUserId) continue;
        await processRun({ ...run, ownerUserId });
      }
    } finally { workerRunning = false; }
  });
}

export async function recoverCoTesterWorker() {
  // A server restart never loses work: a run that was claimed but had no
  // terminal result is returned to the queue and picked up again.
  await pool.query("update cotester_run set status = 'queued', started_at = null, updated_at = now() where status = 'running' and completed_at is null");
  scheduleCoTesterWorker();
}

export async function getCoTesterRun(ownerUserId: string, runId: string) {
  const row = await pool.query<RunRow>("select * from cotester_run where id = $1 and owner_user_id = $2", [runId, ownerUserId]);
  if (!row.rows[0]) throw new Error("That CoTester run was not found.");
  const events = await pool.query<{ label: string; detail: string; state: AgentRunStep["state"]; created_at: Date }>("select label, detail, state, created_at from cotester_run_event where run_id = $1 order by created_at asc, id asc", [runId]);
  return toRun(row.rows[0], events.rows.map((event) => ({ label: event.label, detail: event.detail, state: event.state, createdAt: event.created_at.toISOString() })));
}

export async function getLatestCoTesterRun(ownerUserId: string, conversationId: string) {
  const result = await pool.query<RunRow>("select * from cotester_run where conversation_id = $1 and owner_user_id = $2 order by created_at desc limit 1", [conversationId, ownerUserId]);
  return result.rows[0] ? getCoTesterRun(ownerUserId, result.rows[0].id) : null;
}
