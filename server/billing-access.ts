import { pool } from "./db.js";

export type WorkspaceAccess = {
  planId: string;
  sessionDurationMinutes: number;
  trialEndsAt: string | null;
};

/**
 * Resolve product access from the durable subscription record. The database
 * A workspace session needs enough time for the emulator to boot and for a
 * tool-using test run to complete. Credits meter AI use; the local harness
 * does not impose a second five-minute execution deadline.
 */
export async function workspaceAccess(ownerUserId: string): Promise<WorkspaceAccess> {
  const result = await pool.query<{
    plan_id: string;
    status: string;
    current_period_end: Date | null;
  }>(
    `select s.plan_id, s.status, s.current_period_end
     from subscription s
     join organization o on o.id = s.organization_id
     where o.owner_user_id = $1
     order by s.created_at desc limit 1`,
    [ownerUserId],
  );
  const subscription = result.rows[0];
  if (!subscription)
    throw new Error("Your billing profile is still being created. Please try again shortly.");

  const periodValid = Boolean(subscription.current_period_end && subscription.current_period_end > new Date());
  if (subscription.plan_id === "free" && subscription.status === "active") {
    return { planId: subscription.plan_id, sessionDurationMinutes: 60, trialEndsAt: null };
  }
  if (subscription.status === "trialing" && periodValid) {
    return { planId: subscription.plan_id, sessionDurationMinutes: 60, trialEndsAt: subscription.current_period_end!.toISOString() };
  }
  if (subscription.status === "active" && periodValid) {
    return { planId: subscription.plan_id, sessionDurationMinutes: Number.MAX_SAFE_INTEGER, trialEndsAt: null };
  }
  throw new Error("Your 14-day trial has ended. Choose a paid plan to start another session.");
}
