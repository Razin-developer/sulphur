import { createHmac, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";

const cookieName = "sulphur_admin";
const sessionLifetimeSeconds = 8 * 60 * 60;

const equal = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};
const secret = () => process.env.BETTER_AUTH_SECRET ?? "";
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function configuredAdmin() {
  return Boolean(process.env.ADMIN_MAIL?.trim() && process.env.ADMIN_PASS && secret());
}

export function adminSession(context: Context) {
  const token = getCookie(context, cookieName);
  if (!token || !configuredAdmin()) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !equal(signature, sign(payload))) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string; exp?: number };
    if (value.email !== process.env.ADMIN_MAIL?.trim().toLowerCase() || !Number.isInteger(value.exp) || value.exp * 1000 < Date.now()) return null;
    return { email: value.email };
  } catch { return null; }
}

export function createAdminSession(context: Context, email: string, password: string) {
  const expectedEmail = process.env.ADMIN_MAIL?.trim().toLowerCase() ?? "";
  const expectedPassword = process.env.ADMIN_PASS ?? "";
  if (!configuredAdmin() || !equal(email.trim().toLowerCase(), expectedEmail) || !equal(password, expectedPassword)) return false;
  const payload = Buffer.from(JSON.stringify({ email: expectedEmail, exp: Math.floor(Date.now() / 1000) + sessionLifetimeSeconds })).toString("base64url");
  setCookie(context, cookieName, `${payload}.${sign(payload)}`, { httpOnly: true, sameSite: "Strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: sessionLifetimeSeconds });
  return true;
}

export function clearAdminSession(context: Context) {
  deleteCookie(context, cookieName, { path: "/" });
}
