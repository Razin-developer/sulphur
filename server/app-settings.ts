import { pool } from "./db.js";

export type AppDefaults = {
  defaultEgressAllowed: boolean;
  sessionDurationMinutes: number;
  cleanStart: boolean;
  defaultOrientation: "portrait" | "landscape";
  sessionRetentionDays: number;
};

const defaults: AppDefaults = {
  defaultEgressAllowed: false,
  sessionDurationMinutes: 60,
  cleanStart: true,
  defaultOrientation: "portrait",
  sessionRetentionDays: 30,
};

type AppDefaultsRow = {
  default_egress_allowed: boolean;
  session_duration_minutes: number;
  clean_start: boolean;
  default_orientation: "portrait" | "landscape";
  session_retention_days: number;
};

const toDefaults = (row: AppDefaultsRow): AppDefaults => ({
  defaultEgressAllowed: row.default_egress_allowed,
  sessionDurationMinutes: row.session_duration_minutes,
  cleanStart: row.clean_start,
  defaultOrientation: row.default_orientation,
  sessionRetentionDays: row.session_retention_days,
});

export async function appDefaults(ownerUserId: string): Promise<AppDefaults> {
  await pool.query(
    `insert into workspace_app_setting (owner_user_id) values ($1)
     on conflict (owner_user_id) do nothing`,
    [ownerUserId],
  );
  const result = await pool.query<AppDefaultsRow>(
    `select default_egress_allowed, session_duration_minutes, clean_start, default_orientation, session_retention_days
     from workspace_app_setting where owner_user_id = $1`,
    [ownerUserId],
  );
  return result.rows[0] ? toDefaults(result.rows[0]) : defaults;
}

export async function updateAppDefaults(
  ownerUserId: string,
  changes: AppDefaults,
): Promise<AppDefaults> {
  if (!Number.isInteger(changes.sessionDurationMinutes) || changes.sessionDurationMinutes < 15 || changes.sessionDurationMinutes > 1440)
    throw new Error("Choose a session duration between 15 minutes and 24 hours.");
  if (typeof changes.cleanStart !== "boolean" || !["portrait", "landscape"].includes(changes.defaultOrientation) || !Number.isInteger(changes.sessionRetentionDays) || changes.sessionRetentionDays < 1 || changes.sessionRetentionDays > 365)
    throw new Error("Choose valid session defaults.");
  const result = await pool.query<AppDefaultsRow>(
    `insert into workspace_app_setting (owner_user_id, default_egress_allowed, session_duration_minutes, clean_start, default_orientation, session_retention_days)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (owner_user_id) do update set
       default_egress_allowed = excluded.default_egress_allowed,
       session_duration_minutes = excluded.session_duration_minutes,
       clean_start = excluded.clean_start,
       default_orientation = excluded.default_orientation,
       session_retention_days = excluded.session_retention_days,
       updated_at = now()
     returning default_egress_allowed, session_duration_minutes, clean_start, default_orientation, session_retention_days`,
    [ownerUserId, changes.defaultEgressAllowed, changes.sessionDurationMinutes, changes.cleanStart, changes.defaultOrientation, changes.sessionRetentionDays],
  );
  return toDefaults(result.rows[0]);
}
