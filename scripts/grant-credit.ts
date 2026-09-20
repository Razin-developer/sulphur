import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const email = process.argv[2]?.trim();
const amount = Number(process.argv[3]);
if (!email || !Number.isInteger(amount) || amount === 0) throw new Error("Usage: tsx scripts/grant-credit.ts EMAIL INTEGER_AMOUNT");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const user = await pool.query<{ id: string }>('select id from "user" where lower(email) = lower($1)', [email]);
if (!user.rows[0]) throw new Error("No user account found for that email.");
const org = await pool.query<{ id: string }>("select id from organization where owner_user_id = $1", [user.rows[0].id]);
if (!org.rows[0]) throw new Error("No billing organization exists for that account.");
const reference = `manual:${email.toLowerCase()}:${amount}:2026-09-20`;
await pool.query("insert into credit_ledger (id, organization_id, amount, reason, external_reference) values ($1, $2, $3, 'adjustment', $4) on conflict (external_reference) do nothing", [randomUUID(), org.rows[0].id, amount, reference]);
const balance = await pool.query<{ balance: string }>("select coalesce(sum(amount), 0) as balance from credit_ledger where organization_id = $1", [org.rows[0].id]);
console.log(`Credit grant complete. Ledger balance: ${balance.rows[0]?.balance ?? "0"}`);
await pool.end();
