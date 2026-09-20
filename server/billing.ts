import { pool } from "./db.js";

const iso = (value: Date | null) => value?.toISOString() ?? null;

export async function billingOverview(ownerUserId: string) {
  const organization = await pool.query<{ id: string }>(
    "select id from organization where owner_user_id = $1 limit 1",
    [ownerUserId],
  );
  const organizationId = organization.rows[0]?.id;
  if (!organizationId) throw new Error("Your billing profile is still being created. Please try again shortly.");

  const [subscription, credits, payments, promos] = await Promise.all([
    pool.query<{ plan_id: string; status: string; current_period_end: Date | null; created_at: Date }>(
      `select plan_id, status, current_period_end, created_at from subscription
       where organization_id = $1 order by created_at desc limit 1`, [organizationId]),
    pool.query<{ balance: string }>(
      `select coalesce(sum(amount) filter (where expires_at is null or expires_at > now()), 0) as balance
       from credit_ledger where organization_id = $1`, [organizationId]),
    pool.query<{ id: string; amount_cents: number; currency: string; status: string; provider: string; created_at: Date }>(
      `select id, amount_cents, currency, status, provider, created_at from payment_transaction
       where organization_id = $1 order by created_at desc`, [organizationId]),
    pool.query<{ code: string; discount_percent: number; redeemed_at: Date }>(
      `select p.code, p.discount_percent, r.redeemed_at from promo_redemption r
       join promo_code p on p.id = r.promo_code_id
       where r.organization_id = $1 order by r.redeemed_at desc`, [organizationId]),
  ]);
  const active = subscription.rows[0];
  return {
    subscription: active ? { planId: active.plan_id, status: active.status, currentPeriodEnd: iso(active.current_period_end), createdAt: active.created_at.toISOString() } : null,
    creditBalance: Number(credits.rows[0]?.balance ?? 0),
    payments: payments.rows.map((payment) => ({ ...payment, createdAt: payment.created_at.toISOString() })),
    promos: promos.rows.map((promo) => ({ code: promo.code, discountPercent: promo.discount_percent, redeemedAt: promo.redeemed_at.toISOString() })),
  };
}

export async function redeemPromoCode(ownerUserId: string, candidate: string) {
  const code = candidate.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new Error("Enter a valid promo code.");
  const client = await pool.connect();
  try {
    await client.query("begin");
    const organization = await client.query<{ id: string }>("select id from organization where owner_user_id = $1 for update", [ownerUserId]);
    const organizationId = organization.rows[0]?.id;
    if (!organizationId) throw new Error("Your billing profile is still being created. Please try again shortly.");
    const promo = await client.query<{ id: string; discount_percent: number; max_redemptions: number | null }>(
      `select id, discount_percent, max_redemptions from promo_code
       where code = $1 and active and (expires_at is null or expires_at > now()) for update`, [code]);
    const record = promo.rows[0];
    if (!record) throw new Error("This promo code is unavailable.");
    const count = await client.query<{ count: string }>("select count(*) from promo_redemption where promo_code_id = $1", [record.id]);
    if (record.max_redemptions !== null && Number(count.rows[0]?.count ?? 0) >= record.max_redemptions) throw new Error("This promo code has reached its redemption limit.");
    await client.query("insert into promo_redemption (promo_code_id, organization_id) values ($1, $2)", [record.id, organizationId]);
    await client.query("commit");
    return { code, discountPercent: record.discount_percent };
  } catch (error) {
    await client.query("rollback");
    if ((error as { code?: string }).code === "23505") throw new Error("This promo code has already been applied to your workspace.");
    throw error;
  } finally { client.release(); }
}
