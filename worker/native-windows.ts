import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { pool } from "../server/db.js";
import type { AppDefaults } from "../server/app-settings.js";

const sdkRoot =
  process.env.ANDROID_SDK_ROOT ||
  path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
const adb = path.join(sdkRoot, "platform-tools", "adb.exe");
const emulator = path.join(sdkRoot, "emulator", "emulator.exe");
const serial = "emulator-5554";
// The Android 11 image stays responsive on this local worker. Override this
// only when an administrator has provisioned another verified AVD.
const avdName = process.env.SULPHUR_AVD_NAME || "Sulphur_API_30";
const emulatorRamMb = process.env.SULPHUR_EMULATOR_RAM_MB || "1536";
const emulatorCores = process.env.SULPHUR_EMULATOR_CORES || "2";
let booting: Promise<boolean> | undefined;

type Session = {
  id: string;
  artifactId: string;
  status: string;
  createdAt: string;
};

async function expireDueSessions(ownerUserId?: string) {
  const parameters = ownerUserId ? [ownerUserId] : [];
  const ownerClause = ownerUserId ? " and owner_user_id = $1" : "";
  await pool.query(
    `update android_session set status = 'ended', ended_at = now()
     where status in ('queued', 'starting', 'running', 'paused') and expires_at <= now()${ownerClause}`,
    parameters,
  );
}

async function purgeRetainedSessions(ownerUserId: string, retentionDays: number) {
  await pool.query(
    `delete from android_session where owner_user_id = $1 and status in ('ended', 'failed')
     and ended_at < now() - ($2 * interval '1 day')`,
    [ownerUserId, retentionDays],
  );
}

function scheduleSessionExpiry(sessionId: string, lifetimeMinutes: number) {
  const timer = setTimeout(() => {
    pool.query(
      "update android_session set status = 'ended', ended_at = now() where id = $1 and status in ('queued', 'starting', 'running', 'paused')",
      [sessionId],
    ).catch(() => undefined);
  }, lifetimeMinutes * 60_000);
  timer.unref();
}
export type NativeControl =
  | "power"
  | "volume_up"
  | "volume_down"
  | "volume_status"
  | "rotate_left"
  | "rotate_right"
  | "back"
  | "home"
  | "overview";

export type NativeUiElement = {
  id: string;
  role: "button" | "input" | "scrollable" | "element";
  name: string;
  enabled: boolean;
  clickable: boolean;
  longClickable: boolean;
  scrollable: boolean;
  className: string;
  bounds: { left: number; top: number; right: number; bottom: number };
};

export type NativeUiSnapshot = {
  id: string;
  capturedAt: string;
  elements: NativeUiElement[];
};

export type NativeUiAction = {
  snapshotId: string;
  kind: "tap" | "type" | "long_press" | "scroll" | "back" | "wait";
  elementId?: string;
  value?: string;
};

function run(args: string[], binary = adb): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    const output: Buffer[] = [],
      errors: Buffer[] = [];
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Android command timed out after 45 seconds: ${path.basename(binary)} ${args.join(" ")}`));
    }, 45_000);
    child.stdout.on("data", (chunk) => output.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => errors.push(Buffer.from(chunk)));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      code === 0
        ? resolve(Buffer.concat(output))
        : reject(
            new Error(
              Buffer.concat(errors).toString() ||
                `Android command failed (${code}).`,
            ),
          );
    });
  });
}

const pause = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function deviceReady() {
  if (!existsSync(adb))
    throw new Error("Android tools are not installed on this computer.");
  const devices = (await run(["devices"])).toString();
  return devices.includes(`${serial}\tdevice`);
}

async function deviceIsBooting() {
  if (!existsSync(adb)) return false;
  try {
    const devices = (await run(["devices"])).toString();
    return devices.includes(`${serial}\toffline`) || devices.includes(`${serial}\tdevice`);
  } catch {
    return false;
  }
}

async function waitForDeviceReady() {
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    try {
      if (await deviceReady()) return true;
    } catch {
      // ADB can briefly restart while the emulator comes online.
    }
    await pause(2_000);
  }
  throw new Error("Android startup reached the five-minute limit. The local emulator never became available to ADB. Check the Android Emulator window, then try again.");
}

async function startEmulator() {
  if (!existsSync(emulator))
    throw new Error("Android Emulator is not installed on this computer.");
  // A rebooting AVD stays visible to ADB as `offline`. Do not launch a second
  // emulator on its port; wait for that same device to finish booting.
  if (await deviceIsBooting()) return waitForDeviceReady();
  spawn(
    emulator,
    [
      // Use the explicit switch. On Windows, a bare @AVD argument is
      // inconsistently forwarded when the worker is launched detached.
      "-avd",
      avdName,
      "-no-snapshot",
      // This local software-rendered AVD is stable with its audio host device
      // disabled. Android still reports media volume, but does not output sound
      // into the browser's screenshot stream.
      "-no-audio",
      "-no-boot-anim",
      "-gpu",
      // Software rendering saturated the host and produced black ADB frames.
      // Host rendering uses the local GPU and keeps System UI responsive.
      "host",
      "-memory",
      emulatorRamMb,
      "-cores",
      emulatorCores,
      "-port",
      "5554",
    ],
    { detached: true, stdio: "ignore", windowsHide: true },
  ).unref();
  // Some local images never populate sys.boot_completed even after package
  // management and screen capture are usable. ADB's `device` state is the
  // reliable readiness boundary for this worker.
  return waitForDeviceReady();
}

async function ready() {
  if (await deviceReady()) return false;
  if (!booting) booting = startEmulator().finally(() => (booting = undefined));
  return booting;
}

async function packageName(apkPath: string) {
  const aapt = path.join(sdkRoot, "build-tools", "35.0.0", "aapt.exe");
  if (!existsSync(aapt)) return null;
  const metadata = (await run(["dump", "badging", apkPath], aapt)).toString();
  return /^package: name='([^']+)'/m.exec(metadata)?.[1] ?? null;
}

async function restoreSessionApp(ownerUserId: string, sessionId: string) {
  const session = await pool.query<{ artifact_id: string; storage_key: string }>(
    `select s.artifact_id, a.storage_key from android_session s
     join apk_artifact a on a.id = s.artifact_id
     where s.id = $1 and s.owner_user_id = $2 and s.status = 'running'`,
    [sessionId, ownerUserId],
  );
  const row = session.rows[0];
  if (!row || row.storage_key.includes("..")) return;
  const apkPath = path.join(process.cwd(), ".sulphur", "artifacts", row.storage_key);
  if (!existsSync(apkPath)) return;
  await run(["-s", serial, "install", "-r", apkPath]);
  const pkg = await packageName(apkPath);
  if (pkg) await run(["-s", serial, "shell", "monkey", "-p", pkg, "1"]);
}

export async function startNativeSession(
  ownerUserId: string,
  artifactId: string,
  apkPath: string,
  defaults: AppDefaults,
): Promise<Session> {
  await expireDueSessions();
  await purgeRetainedSessions(ownerUserId, defaults.sessionRetentionDays);
  await ready();
  const active = await pool.query<{ id: string }>(
    "select id from android_session where status in ('queued', 'starting', 'running', 'paused') limit 1",
  );
  if (active.rows[0])
    throw new Error(
      "This local worker is already running a session. End it before starting another one.",
    );
  if (!existsSync(apkPath))
    throw new Error("The saved APK is no longer available.");
  const id = randomUUID();
  await pool.query(
    `insert into android_session (id, artifact_id, owner_user_id, status, worker_reference, egress_allowed, expires_at)
     values ($1, $2, $3, 'starting', $4, $5, now() + ($6 * interval '1 minute'))`,
    [id, artifactId, ownerUserId, serial, defaults.defaultEgressAllowed, defaults.sessionDurationMinutes],
  );
  try {
    const pkg = await packageName(apkPath);
    if (defaults.cleanStart && pkg) await run(["-s", serial, "uninstall", pkg]).catch(() => undefined);
    await run(["-s", serial, "shell", "svc", "wifi", defaults.defaultEgressAllowed ? "enable" : "disable"]);
    await run(["-s", serial, "shell", "svc", "data", defaults.defaultEgressAllowed ? "enable" : "disable"]);
    await run(["-s", serial, "install", "-r", apkPath]);
    if (defaults.cleanStart && pkg) await run(["-s", serial, "shell", "pm", "clear", pkg]);
    await run(["-s", serial, "shell", "settings", "put", "system", "accelerometer_rotation", "0"]);
    await run(["-s", serial, "shell", "settings", "put", "system", "user_rotation", defaults.defaultOrientation === "landscape" ? "1" : "0"]);
    if (pkg) await run(["-s", serial, "shell", "monkey", "-p", pkg, "1"]);
    const result = await pool.query<{
      id: string;
      artifact_id: string;
      status: string;
      created_at: Date;
    }>(
      "update android_session set status = 'running' where id = $1 returning id, artifact_id, status, created_at",
      [id],
    );
    const row = result.rows[0];
    scheduleSessionExpiry(id, defaults.sessionDurationMinutes);
    return {
      id: row.id,
      artifactId: row.artifact_id,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    };
  } catch (error) {
    await pool.query(
      "update android_session set status = 'failed', ended_at = now() where id = $1",
      [id],
    );
    throw error;
  }
}

export async function listNativeSessions(ownerUserId: string) {
  await expireDueSessions(ownerUserId);
  const result = await pool.query<{
    id: string;
    artifact_id: string;
    status: string;
    created_at: Date;
  }>(
    "select id, artifact_id, status, created_at from android_session where owner_user_id = $1 order by created_at desc",
    [ownerUserId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    artifactId: row.artifact_id,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function screenshotForSession(
  ownerUserId: string,
  sessionId: string,
) {
  await expireDueSessions(ownerUserId);
  try {
    await assertRunningSession(ownerUserId, sessionId);
  } catch {
    return null;
  }
  return run(["-s", serial, "exec-out", "screencap", "-p"]);
}

function decodeXml(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&#10;", " ");
}

function uiSnapshotFromXml(xml: string): NativeUiSnapshot {
  const elements: NativeUiElement[] = [];
  const nodePattern = /<node\s+([^>]*?)\/?>(?:<\/node>)?/g;
  let node: RegExpExecArray | null;
  while ((node = nodePattern.exec(xml)) && elements.length < 200) {
    const attrs: Record<string, string> = {};
    for (const match of node[1].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[match[1]] = decodeXml(match[2]);
    const bounds = attrs.bounds?.match(/^\[(\d+),(\d+)]\[(\d+),(\d+)]$/);
    if (!bounds) continue;
    const clickable = attrs.clickable === "true";
    const longClickable = attrs["long-clickable"] === "true";
    const scrollable = attrs.scrollable === "true";
    const className = attrs.class || "";
    const isInput = className.endsWith("EditText");
    if (!clickable && !longClickable && !scrollable && !isInput) continue;
    // Cards often expose their action on a clickable container while the
    // accessible label lives in a child TextView. Surface that first child
    // label so agents never need to guess a coordinate or opaque container.
    const descendant = xml.slice(node.index + node[0].length);
    const childText = descendant.match(/text="([^"]+)"/)?.[1];
    const name = attrs["content-desc"] || attrs.text || (childText && decodeXml(childText)) || attrs["resource-id"] || className;
    elements.push({
      id: `element-${elements.length + 1}`,
      role: isInput ? "input" : scrollable ? "scrollable" : className.endsWith("Button") ? "button" : "element",
      name: name.slice(0, 160), enabled: attrs.enabled !== "false", clickable, longClickable, scrollable, className,
      bounds: { left: Number(bounds[1]), top: Number(bounds[2]), right: Number(bounds[3]), bottom: Number(bounds[4]) },
    });
  }
  const canonical = JSON.stringify(elements.map(({ id, ...element }) => element));
  return { id: createHash("sha256").update(canonical).digest("hex").slice(0, 24), capturedAt: new Date().toISOString(), elements };
}

async function assertRunningSession(ownerUserId: string, sessionId: string) {
  await expireDueSessions(ownerUserId);
  await pool.query(
    `update android_session set status = 'ended', ended_at = now()
     where id = $1 and owner_user_id = $2 and status = 'running' and expires_at <= now()`,
    [sessionId, ownerUserId],
  );
  const session = await pool.query<{ status: string }>(
    "select status from android_session where id = $1 and owner_user_id = $2", [sessionId, ownerUserId],
  );
  if (session.rows[0]?.status !== "running") throw new Error("This Android session is not running.");
  const deviceStarted = await ready();
  if (deviceStarted) await restoreSessionApp(ownerUserId, sessionId);
}

export async function getNativeUiSnapshot(ownerUserId: string, sessionId: string) {
  await assertRunningSession(ownerUserId, sessionId);
  await run(["-s", serial, "shell", "uiautomator", "dump", "/sdcard/sulphur-window.xml"]);
  const xml = (await run(["-s", serial, "shell", "cat", "/sdcard/sulphur-window.xml"])).toString();
  return uiSnapshotFromXml(xml);
}

export async function actOnNativeSession(ownerUserId: string, sessionId: string, action: NativeUiAction) {
  const snapshot = await getNativeUiSnapshot(ownerUserId, sessionId);
  if (snapshot.id !== action.snapshotId) return { status: "stale_snapshot" as const, snapshot };
  const element = action.elementId ? snapshot.elements.find((candidate) => candidate.id === action.elementId) : undefined;
  const center = element && { x: Math.round((element.bounds.left + element.bounds.right) / 2), y: Math.round((element.bounds.top + element.bounds.bottom) / 2) };
  if (action.kind === "back") await run(["-s", serial, "shell", "input", "keyevent", "4"]);
  else if (action.kind === "wait") await pause(Math.min(Math.max(Number(action.value) || 500, 100), 5_000));
  else if (!element || !center) throw new Error("Choose an element from the current UI snapshot before acting.");
  else if (!element.enabled) throw new Error("That visible element is currently unavailable.");
  else if (action.kind === "tap") {
    if (!element.clickable) throw new Error("That element cannot be tapped.");
    await run(["-s", serial, "shell", "input", "tap", String(center.x), String(center.y)]);
  } else if (action.kind === "long_press") {
    if (!element.longClickable) throw new Error("That element does not support press-and-hold.");
    await run(["-s", serial, "shell", "input", "swipe", String(center.x), String(center.y), String(center.x), String(center.y), "650"]);
  } else if (action.kind === "scroll") {
    if (!element.scrollable) throw new Error("Choose a scrollable element from the current UI snapshot.");
    const direction = action.value === "up" ? -1 : 1;
    const start = Math.round(element.bounds.top + (element.bounds.bottom - element.bounds.top) * (direction > 0 ? 0.78 : 0.22));
    const end = Math.round(element.bounds.top + (element.bounds.bottom - element.bounds.top) * (direction > 0 ? 0.28 : 0.72));
    await run(["-s", serial, "shell", "input", "swipe", String(center.x), String(start), String(center.x), String(end), "260"]);
  } else if (action.kind === "type") {
    if (element.role !== "input" || !action.value) throw new Error("Choose a text input and provide text to enter.");
    await run(["-s", serial, "shell", "input", "tap", String(center.x), String(center.y)]);
    await run(["-s", serial, "shell", "input", "text", action.value.replaceAll(" ", "%s")]);
  }
  await pause(180);
  return { status: "completed" as const, snapshot: await getNativeUiSnapshot(ownerUserId, sessionId) };
}

export async function endNativeSession(ownerUserId: string, sessionId: string) {
  const result = await pool.query(
    "update android_session set status = 'ended', ended_at = now() where id = $1 and owner_user_id = $2 and status in ('queued', 'starting', 'running', 'paused') returning id",
    [sessionId, ownerUserId],
  );
  return Boolean(result.rows[0]);
}

/** Relaunch only the APK already bound to this running, owner-scoped session. */
export async function relaunchNativeSessionApp(ownerUserId: string, sessionId: string) {
  await assertRunningSession(ownerUserId, sessionId);
  const session = await pool.query<{ storage_key: string }>(
    `select a.storage_key from android_session s join apk_artifact a on a.id = s.artifact_id
     where s.id = $1 and s.owner_user_id = $2 and s.status = 'running'`,
    [sessionId, ownerUserId],
  );
  const storageKey = session.rows[0]?.storage_key;
  if (!storageKey || storageKey.includes("..")) throw new Error("The session APK is not available.");
  const apkPath = path.join(process.cwd(), ".sulphur", "artifacts", storageKey);
  const pkg = await packageName(apkPath);
  if (!pkg) throw new Error("The app package could not be identified.");
  await run(["-s", serial, "shell", "am", "force-stop", pkg]);
  await run(["-s", serial, "shell", "monkey", "-p", pkg, "1"]);
  await pause(300);
  return { status: "restarted" as const, snapshot: await getNativeUiSnapshot(ownerUserId, sessionId) };
}

async function currentVolume() {
  // `media_session volume --get` is silent on the local Android image.
  // AudioService reports both the current music volume and its valid range.
  const audioDump = (
    await run(["-s", serial, "shell", "dumpsys", "audio"])
  ).toString();
  const musicStream = audioDump.match(
    /STREAM_MUSIC:\s*[\s\S]*?Max:\s*(\d+)[\s\S]*?streamVolume:\s*(\d+)/i,
  );
  return musicStream
    ? { value: Number(musicStream[2]), max: Number(musicStream[1]) }
    : null;
}

export async function controlNativeSession(
  ownerUserId: string,
  sessionId: string,
  action: NativeControl,
) {
  await expireDueSessions(ownerUserId);
  await assertRunningSession(ownerUserId, sessionId);
  const commands: Record<NativeControl, string[]> = {
    power: ["shell", "input", "keyevent", "26"],
    volume_up: ["shell", "cmd", "media_session", "volume", "--stream", "3", "--adj", "raise"],
    volume_down: ["shell", "cmd", "media_session", "volume", "--stream", "3", "--adj", "lower"],
    volume_status: [],
    rotate_left: ["shell", "settings", "put", "system", "user_rotation", "3"],
    rotate_right: ["shell", "settings", "put", "system", "user_rotation", "1"],
    back: ["shell", "input", "keyevent", "4"],
    home: ["shell", "input", "keyevent", "3"],
    overview: ["shell", "input", "keyevent", "187"],
  };
  if (action === "volume_status") {
    const level = await currentVolume();
    return { volume: level?.value ?? null, volumeMax: level?.max ?? null };
  }
  if (action === "rotate_left" || action === "rotate_right")
    await run([
      "-s",
      serial,
      "shell",
      "settings",
      "put",
      "system",
      "accelerometer_rotation",
      "0",
    ]);
  await run(["-s", serial, ...commands[action]]);
  const level =
    action === "volume_up" || action === "volume_down"
      ? await currentVolume()
      : null;
  return { volume: level?.value ?? null, volumeMax: level?.max ?? null };
}

export async function removeNativeSession(
  ownerUserId: string,
  sessionId: string,
) {
  const result = await pool.query(
    "delete from android_session where id = $1 and owner_user_id = $2 and status in ('ended', 'failed') returning id",
    [sessionId, ownerUserId],
  );
  return Boolean(result.rows[0]);
}
