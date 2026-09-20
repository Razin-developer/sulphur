import { timingSafeEqual } from "node:crypto";

const json = (res, status, body) => {
  res.status(status);
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};

const matchesPassword = (provided, expected) => {
  if (typeof provided !== "string" || !expected) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export default function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Use POST." });

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return json(res, 400, { error: "Invalid request." });
  }

  if (!matchesPassword(body?.password, process.env.INSTALLER_PASSWORD)) {
    return json(res, 401, { error: "Invalid installer password." });
  }

  const encoded = process.env.SULPHUR_ENV_BUNDLE_B64;
  if (!encoded) return json(res, 503, { error: "Installer is not configured yet." });

  let env;
  try {
    env = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return json(res, 503, { error: "Installer environment bundle is invalid." });
  }
  if (!env.includes("=")) return json(res, 503, { error: "Installer environment bundle is invalid." });

  return json(res, 200, { env });
}
