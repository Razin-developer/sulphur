import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { pool } from "../server/db.js";
import { recordMcpCall } from "../server/usage.js";
import { getMcpSettings } from "../server/mcp-settings.js";
import {
  actOnNativeSession,
  getNativeUiSnapshot,
  screenshotForSession,
} from "../worker/native-windows.js";

const sessionId = process.env.SULPHUR_SESSION_ID?.trim();

async function scopedSession() {
  if (!sessionId)
    throw new Error(
      "Set SULPHUR_SESSION_ID to the running session ID shown in Sulphur before connecting this MCP server.",
    );
  const result = await pool.query<{
    owner_user_id: string;
    status: string;
    created_at: Date;
  }>(
    "select owner_user_id, status, created_at from android_session where id = $1",
    [sessionId],
  );
  const session = result.rows[0];
  if (!session) throw new Error("This Sulphur session was not found.");
  if (session.status !== "running")
    throw new Error("This Sulphur session is not running.");
  return session;
}

async function assertMcpCapability(ownerUserId: string, capability: "screen" | "screenshot" | "log" | "action") {
  const settings = await getMcpSettings(ownerUserId);
  const allowed = capability === "screen" ? settings.allowScreenState
    : capability === "screenshot" ? settings.allowScreenshots
    : capability === "log" ? settings.allowActionLog : settings.allowActions;
  if (!allowed) throw new Error(`This workspace has disabled ${capability === "screen" ? "screen state" : capability} access for MCP connections.`);
}

const server = new McpServer(
  { name: "sulphur", version: "0.2.0" },
  {
    instructions:
      "This server is bound to one running local Sulphur Android session. It exposes a snapshot-bound UI model: inspect elements with get_ui_snapshot, then act only on an element ID from that exact snapshot. It never exposes ADB, APK files, database credentials, raw coordinates, or another session.",
  },
);

server.registerTool(
  "get_screen_state",
  {
    description: "Read the status of the configured running Android session.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    try {
      const session = await scopedSession();
      await assertMcpCapability(session.owner_user_id, "screen");
      await recordMcpCall(session.owner_user_id, "get_screen_state", sessionId);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              sessionId,
              status: "running",
              mode: "local snapshot-bound interaction",
              startedAt: session.created_at.toISOString(),
              next: "Use take_screenshot to inspect the current screen.",
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              error instanceof Error
                ? error.message
                : "The session is unavailable.",
          },
        ],
        isError: true,
      };
    }
  },
);

server.registerTool(
  "get_ui_snapshot",
  {
    description: "Read the current actionable Android UI elements for this session. Use the returned snapshot ID and element IDs with act.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    try {
      const session = await scopedSession();
      await assertMcpCapability(session.owner_user_id, "screen");
      await recordMcpCall(session.owner_user_id, "get_ui_snapshot", sessionId);
      const snapshot = await getNativeUiSnapshot(session.owner_user_id, sessionId!);
      return { content: [{ type: "text" as const, text: JSON.stringify(snapshot) }] };
    } catch (error) {
      return { content: [{ type: "text" as const, text: error instanceof Error ? error.message : "The UI is unavailable." }], isError: true };
    }
  },
);

server.registerTool(
  "take_screenshot",
  {
    description:
      "Capture the current screen for the configured running Android session.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    try {
      const session = await scopedSession();
      await assertMcpCapability(session.owner_user_id, "screenshot");
      await recordMcpCall(session.owner_user_id, "take_screenshot", sessionId);
      const image = await screenshotForSession(
        session.owner_user_id,
        sessionId!,
      );
      if (!image) throw new Error("The session screen is unavailable.");
      return {
        content: [
          {
            type: "image" as const,
            data: image.toString("base64"),
            mimeType: "image/png" as const,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              error instanceof Error
                ? error.message
                : "The screenshot could not be captured.",
          },
        ],
        isError: true,
      };
    }
  },
);

server.registerTool(
  "get_action_log",
  {
    description: "Read the local session lifecycle state.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    try {
      const session = await scopedSession();
      await assertMcpCapability(session.owner_user_id, "log");
      await recordMcpCall(session.owner_user_id, "get_action_log", sessionId);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify([
              {
                event: "session_running",
                at: session.created_at.toISOString(),
                mode: "local view-only",
              },
            ]),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              error instanceof Error
                ? error.message
                : "The session is unavailable.",
          },
        ],
        isError: true,
      };
    }
  },
);

server.registerTool(
  "act",
  {
    description:
      "Perform one safe Android action against an element from the current UI snapshot. Refresh the UI snapshot after every action.",
    inputSchema: {
      snapshotId: z.string().min(1),
      kind: z.enum(["tap", "type", "long_press", "scroll", "back", "wait"]),
      elementId: z.string().min(1).optional(),
      value: z.string().max(4096).optional(),
    },
  },
  async (input) => {
    try {
      const session = await scopedSession();
      await assertMcpCapability(session.owner_user_id, "action");
      await recordMcpCall(session.owner_user_id, `act:${input.kind}`, sessionId);
      const result = await actOnNativeSession(session.owner_user_id, sessionId!, input);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (error) {
      return { content: [{ type: "text" as const, text: error instanceof Error ? error.message : "The Android action could not be completed." }], isError: true };
    }
  },
);

await server.connect(new StdioServerTransport());
