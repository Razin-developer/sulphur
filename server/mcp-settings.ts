import { pool } from "./db.js";

export type McpSettings = {
  defaultConnector: "codex" | "claude" | "gemini";
  allowScreenState: boolean;
  allowScreenshots: boolean;
  allowActionLog: boolean;
  allowActions: boolean;
};

const defaults: McpSettings = {
  defaultConnector: "codex", allowScreenState: true, allowScreenshots: true,
  allowActionLog: true, allowActions: true,
};

type Row = {
  default_connector: McpSettings["defaultConnector"]; allow_screen_state: boolean;
  allow_screenshots: boolean; allow_action_log: boolean; allow_actions: boolean;
};
const map = (row: Row): McpSettings => ({
  defaultConnector: row.default_connector, allowScreenState: row.allow_screen_state,
  allowScreenshots: row.allow_screenshots, allowActionLog: row.allow_action_log,
  allowActions: row.allow_actions,
});

export async function getMcpSettings(ownerUserId: string) {
  await pool.query("insert into workspace_mcp_setting (owner_user_id) values ($1) on conflict (owner_user_id) do nothing", [ownerUserId]);
  const result = await pool.query<Row>("select default_connector, allow_screen_state, allow_screenshots, allow_action_log, allow_actions from workspace_mcp_setting where owner_user_id = $1", [ownerUserId]);
  return result.rows[0] ? map(result.rows[0]) : defaults;
}

export async function updateMcpSettings(ownerUserId: string, values: McpSettings) {
  const result = await pool.query<Row>(`insert into workspace_mcp_setting
    (owner_user_id, default_connector, allow_screen_state, allow_screenshots, allow_action_log, allow_actions)
    values ($1,$2,$3,$4,$5,$6)
    on conflict (owner_user_id) do update set default_connector = excluded.default_connector, allow_screen_state = excluded.allow_screen_state, allow_screenshots = excluded.allow_screenshots, allow_action_log = excluded.allow_action_log, allow_actions = excluded.allow_actions, updated_at = now()
    returning default_connector, allow_screen_state, allow_screenshots, allow_action_log, allow_actions`,
    [ownerUserId, values.defaultConnector, values.allowScreenState, values.allowScreenshots, values.allowActionLog, values.allowActions]);
  return map(result.rows[0]);
}
