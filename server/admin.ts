import { randomUUID } from "node:crypto";
import { pool } from "./db.js";
import { sendEmail, type EmailCategory } from "./email.js";

type AdminAction = "pause" | "restore" | "extend_trial";

const iso = (value: Date | null) => value?.toISOString() ?? null;

export async function adminOverview() {
  const [metrics, users, apps, sessions, promos, payments, activity] = await Promise.all([
    pool.query<{ users: string; trials: string; active_sessions: string; apps: string; revenue_cents: string }>(`select
      (select count(*) from "user") users,
      (select count(*) from subscription where status = 'trialing' and current_period_end > now()) trials,
      (select count(*) from android_session where status in ('queued','starting','running','paused')) active_sessions,
      (select count(*) from apk_artifact) apps,
      (select coalesce(sum(amount_cents) filter (where status = 'paid'), 0) from payment_transaction) revenue_cents`),
    pool.query<{ id: string; name: string; email: string; created_at: Date; app_count: string; session_count: string; plan: string | null; billing_status: string | null; trial_ends_at: Date | null }>(`select u.id, u.name, u.email, u.created_at,
      count(distinct a.id) as app_count, count(distinct ses.id) as session_count,
      max(s.plan_id) as plan, max(s.status) as billing_status, max(s.current_period_end) filter (where s.status = 'trialing') as trial_ends_at
      from "user" u left join apk_artifact a on a.owner_user_id = u.id
      left join android_session ses on ses.owner_user_id = u.id
      left join organization o on o.owner_user_id = u.id left join subscription s on s.organization_id = o.id
      group by u.id, u.name, u.email, u.created_at order by u.created_at desc limit 250`),
    pool.query<{ id: string; display_name: string; byte_size: string; status: string; created_at: Date; owner: string; email: string }>(`select a.id, a.display_name, a.byte_size, a.status, a.created_at, u.name as owner, u.email
      from apk_artifact a join "user" u on u.id = a.owner_user_id order by a.created_at desc limit 250`),
    pool.query<{ id: string; status: string; created_at: Date; ended_at: Date | null; app: string; owner: string; email: string }>(`select s.id, s.status, s.created_at, s.ended_at, a.display_name as app, u.name as owner, u.email
      from android_session s join apk_artifact a on a.id = s.artifact_id join "user" u on u.id = s.owner_user_id order by s.created_at desc limit 250`),
    pool.query<{ id: string; code: string; discount_percent: number; active: boolean; max_redemptions: number | null; expires_at: Date | null; redemptions: string }>(`select p.id, p.code, p.discount_percent, p.active, p.max_redemptions, p.expires_at, count(r.id) as redemptions
      from promo_code p left join promo_redemption r on r.promo_code_id = p.id group by p.id order by p.created_at desc limit 100`),
    pool.query<{ id: string; amount_cents: number; currency: string; status: string; provider: string; created_at: Date; owner: string; email: string }>(`select p.id, p.amount_cents, p.currency, p.status, p.provider, p.created_at, u.name as owner, u.email
      from payment_transaction p join organization o on o.id = p.organization_id join "user" u on u.id = o.owner_user_id order by p.created_at desc limit 250`),
    pool.query<{ day: string; signups: string; sessions: string; mcp_calls: string }>(`select d.day::date::text as day, count(distinct u.id) filter (where u.created_at::date = d.day::date) as signups,
      count(distinct s.id) as sessions, count(distinct e.id) filter (where e.kind = 'mcp_call') as mcp_calls
      from generate_series(current_date - interval '13 days', current_date, interval '1 day') d(day)
      left join "user" u on u.created_at::date = d.day::date
      left join android_session s on s.created_at::date = d.day::date
      left join workspace_usage_event e on e.created_at::date = d.day::date
      group by d.day order by d.day`),
  ]);
  const m = metrics.rows[0];
  return {
    metrics: { users: Number(m?.users ?? 0), trials: Number(m?.trials ?? 0), activeSessions: Number(m?.active_sessions ?? 0), apps: Number(m?.apps ?? 0), revenueCents: Number(m?.revenue_cents ?? 0) },
    users: users.rows.map((row) => ({ ...row, appCount: Number(row.app_count), sessionCount: Number(row.session_count), createdAt: row.created_at.toISOString(), trialEndsAt: iso(row.trial_ends_at) })),
    apps: apps.rows.map((row) => ({ ...row, size: Number(row.byte_size), createdAt: row.created_at.toISOString() })),
    sessions: sessions.rows.map((row) => ({ ...row, createdAt: row.created_at.toISOString(), endedAt: iso(row.ended_at) })),
    promos: promos.rows.map((row) => ({ ...row, redemptions: Number(row.redemptions), expiresAt: iso(row.expires_at) })),
    payments: payments.rows.map((row) => ({ ...row, createdAt: row.created_at.toISOString() })),
    activity: activity.rows.map((row) => ({ day: row.day.slice(0, 10), signups: Number(row.signups), sessions: Number(row.sessions), mcpCalls: Number(row.mcp_calls) })),
  };
}

export async function updateUserAccess(adminEmail: string, targetUserId: string, action: AdminAction) {
  const update = action === "pause"
    ? `update subscription set status = 'paused', updated_at = now() where organization_id in (select id from organization where owner_user_id = $1)`
    : action === "restore"
      ? `update subscription set status = 'active', updated_at = now() where organization_id in (select id from organization where owner_user_id = $1)`
      : `update subscription set status = 'trialing', current_period_end = greatest(coalesce(current_period_end, now()), now()) + interval '14 days', updated_at = now() where organization_id in (select id from organization where owner_user_id = $1)`;
  const result = await pool.query(update, [targetUserId]);
  if (!result.rowCount) throw new Error("No billing profile was found for this user.");
  await pool.query(`insert into admin_audit_log (admin_email, action, target_user_id, metadata) values ($1, $2, $3, $4)`, [adminEmail, action, targetUserId, JSON.stringify({ source: "admin_console" })]);
}

export async function togglePromo(adminEmail: string, promoId: string) {
  const result = await pool.query<{ active: boolean }>(`update promo_code set active = not active where id = $1 returning active`, [promoId]);
  if (!result.rows[0]) throw new Error("Promo code was not found.");
  await pool.query(`insert into admin_audit_log (admin_email, action, metadata) values ($1, 'toggle_promo', $2)`, [adminEmail, JSON.stringify({ promoId, active: result.rows[0].active })]);
  return result.rows[0];
}

export async function createPromo(adminEmail: string, input: { code: string; discountPercent: number; maxRedemptions?: number }) {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(code) || !Number.isInteger(input.discountPercent) || input.discountPercent < 1 || input.discountPercent > 100 || (input.maxRedemptions !== undefined && (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1))) throw new Error("Provide a valid code, discount, and redemption limit.");
  const result = await pool.query(`insert into promo_code (id, code, discount_percent, max_redemptions) values ($1, $2, $3, $4) returning id`, [randomUUID(), code, input.discountPercent, input.maxRedemptions ?? null]);
  await pool.query(`insert into admin_audit_log (admin_email, action, metadata) values ($1, 'create_promo', $2)`, [adminEmail, JSON.stringify({ promoId: result.rows[0].id, code })]);
}

export async function sendAdminBroadcast(adminEmail: string, input: { subject: string; message: string; category: Extract<EmailCategory, 'announcement' | 'product'> }) {
  const subject = input.subject.trim();
  const message = input.message.trim();
  if (!subject || subject.length > 160 || !message || message.length > 10_000) throw new Error("Provide a subject up to 160 characters and a message up to 10,000 characters.");
  const users = await pool.query<{ id: string; email: string; name: string }>(`select id, email, name from "user" where email_verified = true order by created_at asc`);
  let sent = 0, suppressed = 0, failed = 0;
  for (const user of users.rows) {
    try {
      const result = await sendEmail({ userId: user.id, to: user.email, category: input.category, template: 'admin_broadcast', subject, html: `<p>Hi ${user.name || 'there'},</p><p>${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>` });
      if (result.status === 'sent') sent++; else suppressed++;
    } catch { failed++; }
  }
  await pool.query(`insert into admin_audit_log (admin_email, action, metadata) values ($1, 'send_broadcast', $2)`, [adminEmail, JSON.stringify({ category: input.category, subject, recipients: users.rows.length, sent, suppressed, failed })]);
  return { recipients: users.rows.length, sent, suppressed, failed };
}
