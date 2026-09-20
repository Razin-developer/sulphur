import Stripe from "stripe";
import { pool } from "./db.js";
import { sendBillingEmail } from "./email.js";

const priceEnv: Record<string, string> = {
  "developer:monthly": "STRIPE_PRICE_DEVELOPER_MONTHLY", "developer:yearly": "STRIPE_PRICE_DEVELOPER_YEARLY",
  "team:monthly": "STRIPE_PRICE_TEAM_MONTHLY", "team:yearly": "STRIPE_PRICE_TEAM_YEARLY",
  "scale:monthly": "STRIPE_PRICE_SCALE_MONTHLY", "scale:yearly": "STRIPE_PRICE_SCALE_YEARLY",
};

const client = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe checkout is not configured yet.");
  return new Stripe(key);
};

const planNames: Record<string, string> = { developer: "Developer", team: "Team", scale: "Scale" };
function recurringLineItem(planId: string, cadence: "monthly" | "yearly", configured: string): Stripe.Checkout.SessionCreateParams.LineItem {
  if (configured.startsWith("price_")) return { price: configured, quantity: 1 };
  const dollars = Number(configured.replace(/^\$/, ""));
  if (!Number.isFinite(dollars) || dollars <= 0) throw new Error("This plan price must be a Stripe price ID or a positive USD amount.");
  return { price_data: { currency: "usd", unit_amount: Math.round(dollars * 100), product_data: { name: `Sulphur ${planNames[planId] ?? planId}` }, recurring: { interval: cadence === "yearly" ? "year" : "month" } }, quantity: 1 };
}

export async function createSubscriptionCheckout(ownerUserId: string, email: string, planId: string, cadence: "monthly" | "yearly", origin: string) {
  const key = priceEnv[`${planId}:${cadence}`];
  const price = key && process.env[key];
  if (!price) throw new Error("This plan is not configured for checkout yet.");
  const org = await pool.query<{ id: string }>("select id from organization where owner_user_id = $1 limit 1", [ownerUserId]);
  if (!org.rows[0]) throw new Error("Your billing profile is still being created. Please try again shortly.");
  const session = await client().checkout.sessions.create({
    mode: "subscription", customer_email: email, payment_method_types: ["card"], payment_method_collection: "always",
    line_items: [recurringLineItem(planId, cadence, price)], subscription_data: { trial_period_days: 14, metadata: { organizationId: org.rows[0].id, planId } },
    metadata: { organizationId: org.rows[0].id, planId, cadence },
    success_url: `${origin}/settings/billing?checkout=success`, cancel_url: `${origin}/pricing?checkout=cancel`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export function verifyStripeEvent(payload: string, signature: string | undefined) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) throw new Error("Stripe webhook verification is not configured.");
  return client().webhooks.constructEvent(payload, signature, secret);
}

export async function handleStripeEvent(event: Stripe.Event) {
  const data = event.data.object as Stripe.Checkout.Session | Stripe.Invoice | Stripe.Subscription;
  const metadata = data.metadata ?? {};
  const organizationId = metadata.organizationId;
  if (!organizationId) return;
  const recipient = await pool.query<{ id: string; email: string; name: string }>(`select u.id, u.email, u.name from organization o join "user" u on u.id = o.owner_user_id where o.id = $1`, [organizationId]);
  const user = recipient.rows[0];
  if (!user) return;
  if (event.type === 'checkout.session.completed') {
    const session = data as Stripe.Checkout.Session;
    const planId = metadata.planId ?? 'paid';
    await pool.query(`update subscription set provider = 'stripe', provider_subscription_id = $2, plan_id = $3, status = 'trialing', updated_at = now() where organization_id = $1`, [organizationId, typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null, planId]);
    await sendBillingEmail({ userId: user.id, to: user.email, name: user.name, event: 'purchase_success', plan: planId, amount: session.amount_total ? new Intl.NumberFormat('en-US', { style: 'currency', currency: session.currency ?? 'usd' }).format(session.amount_total / 100) : undefined });
  }
  if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed') {
    const invoice = data as Stripe.Invoice;
    const paid = event.type === 'invoice.payment_succeeded';
    await pool.query(`insert into payment_transaction (organization_id, provider, provider_payment_id, amount_cents, currency, status)
      values ($1, 'stripe', $2, $3, $4, $5) on conflict (provider_payment_id) do update set status = excluded.status`, [organizationId, invoice.id, invoice.amount_paid ?? invoice.amount_due ?? 0, (invoice.currency ?? 'usd').toUpperCase(), paid ? 'paid' : 'failed']);
    if (!paid) await sendBillingEmail({ userId: user.id, to: user.email, name: user.name, event: 'payment_failed' });
  }
}
