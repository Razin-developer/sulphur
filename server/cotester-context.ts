import { randomUUID } from "node:crypto";
import { pool } from "./db.js";

export type ContextTurn = { role: "user" | "assistant"; content: string };
export type CoTesterContext = { conversationId: string; appName: string; appDescription: string | null; summary: string; turns: ContextTurn[] };
export type StoredCoTesterConversation = { id: string; artifactId: string; title: string; updatedAt: string; messages: ContextTurn[] };

export async function listCoTesterConversations(ownerUserId: string): Promise<StoredCoTesterConversation[]> {
  const result = await pool.query<{ id: string; artifact_id: string; title: string; updated_at: Date; messages: ContextTurn[] }>(
    `select c.id, c.artifact_id, c.title, c.updated_at,
       coalesce(json_agg(json_build_object('role', m.role, 'content', m.content) order by m.created_at)
         filter (where m.id is not null), '[]'::json) as messages
     from cotester_conversation c
     left join lateral (
       select id, role, content, created_at from cotester_message
       where conversation_id = c.id order by created_at desc limit 12
     ) m on true
     where c.owner_user_id = $1
     group by c.id
     order by c.updated_at desc
     limit 50`,
    [ownerUserId],
  );
  return result.rows.map((row) => ({ id: row.id, artifactId: row.artifact_id, title: row.title, updatedAt: row.updated_at.toISOString(), messages: row.messages }));
}

export async function loadCoTesterContext(ownerUserId: string, conversationId: string, sessionId: string, userText: string): Promise<CoTesterContext> {
  const session = await pool.query<{ artifact_id: string; display_name: string; description: string | null }>(
    `select s.artifact_id, a.display_name, a.description from android_session s
     join apk_artifact a on a.id = s.artifact_id
     where s.id = $1 and s.owner_user_id = $2 and s.status = 'running'`, [sessionId, ownerUserId]);
  const current = session.rows[0];
  if (!current) throw new Error("This Android session is no longer running.");
  const existing = await pool.query<{ artifact_id: string; context_summary: string }>(
    "select artifact_id, context_summary from cotester_conversation where id = $1 and owner_user_id = $2", [conversationId, ownerUserId]);
  if (existing.rows[0] && existing.rows[0].artifact_id !== current.artifact_id)
    throw new Error("This conversation belongs to a different app.");
  if (!existing.rows[0]) {
    await pool.query(
      `insert into cotester_conversation (id, owner_user_id, artifact_id, session_id, title)
       values ($1, $2, $3, $4, $5)`,
      [conversationId, ownerUserId, current.artifact_id, sessionId, userText.slice(0, 120)],
    );
  } else {
    await pool.query("update cotester_conversation set session_id = $1, updated_at = now() where id = $2", [sessionId, conversationId]);
  }
  const messages = await pool.query<{ role: "user" | "assistant"; content: string }>(
    `select role, content from (select role, content, created_at from cotester_message where conversation_id = $1 order by created_at desc limit 12) recent order by created_at asc`, [conversationId]);
  return { conversationId, appName: current.display_name, appDescription: current.description, summary: existing.rows[0]?.context_summary ?? "", turns: messages.rows };
}

export async function saveCoTesterTurn(conversationId: string, role: ContextTurn["role"], content: string) {
  await pool.query("insert into cotester_message (id, conversation_id, role, content) values ($1, $2, $3, $4)", [randomUUID(), conversationId, role, content.slice(0, 12000)]);
  await pool.query("update cotester_conversation set updated_at = now() where id = $1", [conversationId]);
}

/**
 * Keep a compact, durable record of outcomes in addition to the recent raw
 * turns. This lets a long-running test retain decisions and discoveries
 * without sending an unbounded transcript back to the model on every run.
 */
export async function appendCoTesterSummary(conversationId: string, request: string, outcome: string) {
  const note = `Test request: ${request.slice(0, 600)}\nObserved outcome: ${outcome.slice(0, 1600)}`;
  await pool.query(
    `update cotester_conversation
     set context_summary = right(concat_ws(E'\n\n', nullif(context_summary, ''), $2::text), 8000), updated_at = now()
     where id = $1`,
    [conversationId, note],
  );
}

export async function renameCoTesterConversation(ownerUserId: string, conversationId: string, title: string) {
  const result = await pool.query<{ id: string }>(
    `update cotester_conversation set title = $3, updated_at = now()
     where id = $1 and owner_user_id = $2 returning id`,
    [conversationId, ownerUserId, title.trim().slice(0, 120)],
  );
  if (!result.rows[0]) throw new Error("That test conversation was not found.");
}

export async function deleteCoTesterConversation(ownerUserId: string, conversationId: string) {
  const result = await pool.query<{ id: string }>(
    "delete from cotester_conversation where id = $1 and owner_user_id = $2 returning id",
    [conversationId, ownerUserId],
  );
  if (!result.rows[0]) throw new Error("That test conversation was not found.");
}
