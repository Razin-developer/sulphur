import { copyFileSync, existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (args) => spawnSync(npm, args, { stdio: "inherit" });

if (!existsSync("node_modules")) {
  const install = run(["install"]);
  if (install.status !== 0) process.exit(install.status ?? 1);
}

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.error("Created .env from .env.example. Add your local database and authentication values, then run npm run local again.");
  process.exit(1);
}

const migrate = run(["run", "db:migrate"]);
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

const api = spawn(npm, ["run", "auth:dev"], { stdio: "inherit" });
const web = spawn(npm, ["run", "dev", "--", "--host", "localhost"], { stdio: "inherit" });
const stop = () => { api.kill(); web.kill(); process.exit(); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
api.on("exit", (code) => { if (code && code !== 0) stop(); });
web.on("exit", (code) => { if (code && code !== 0) stop(); });
