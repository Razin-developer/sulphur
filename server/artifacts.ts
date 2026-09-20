import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "./db.js";
import { apkIntakeIssue, maximumApkBytes } from "../src/apk-intake.js";

const artifactRoot = path.resolve(process.cwd(), ".sulphur", "artifacts");

type StoredArtifact = {
  id: string;
  originalName: string;
  displayName: string;
  description: string | null;
  byteSize: number;
  status: "quarantined";
  createdAt: string;
};

export async function saveQuarantinedApk(
  ownerUserId: string,
  file: File,
  displayName: string,
  description: string | null,
): Promise<StoredArtifact> {
  const header = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  const issue = apkIntakeIssue(file, header);
  if (issue) throw new Error(issue);
  if (file.size > maximumApkBytes)
    throw new Error("This APK is larger than the current 50 MB review limit.");

  const body = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  const sha256 = createHash("sha256").update(body).digest("hex");
  const relativeKey = path.join(ownerUserId, `${id}.apk`);
  const absolutePath = path.join(artifactRoot, relativeKey);
  const tempPath = `${absolutePath}.uploading`;
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(tempPath, body, { flag: "wx" });
  await rename(tempPath, absolutePath);

  try {
    const result = await pool.query<{
      id: string;
      original_name: string;
      display_name: string;
      description: string | null;
      byte_size: string;
      status: "quarantined";
      created_at: Date;
    }>(
      `insert into apk_artifact (id, owner_user_id, original_name, display_name, description, byte_size, sha256, storage_key, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'quarantined')
       returning id, original_name, display_name, description, byte_size, status, created_at`,
      [
        id,
        ownerUserId,
        file.name,
        displayName,
        description,
        body.length,
        sha256,
        relativeKey,
      ],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      originalName: row.original_name,
      displayName: row.display_name,
      description: row.description,
      byteSize: Number(row.byte_size),
      status: row.status,
      createdAt: row.created_at.toISOString(),
    };
  } catch (error) {
    await unlink(absolutePath).catch(() => undefined);
    throw error;
  }
}

export async function listArtifacts(ownerUserId: string) {
  const result = await pool.query<{
    id: string;
    original_name: string;
    display_name: string;
    description: string | null;
    byte_size: string;
    status: string;
    created_at: Date;
  }>(
    "select id, original_name, display_name, description, byte_size, status, created_at from apk_artifact where owner_user_id = $1 order by created_at desc",
    [ownerUserId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    originalName: row.original_name,
    displayName: row.display_name,
    description: row.description,
    byteSize: Number(row.byte_size),
    status: row.status,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function removeArtifact(ownerUserId: string, artifactId: string) {
  const result = await pool.query<{ storage_key: string }>(
    "delete from apk_artifact where id = $1 and owner_user_id = $2 returning storage_key",
    [artifactId, ownerUserId],
  );
  const row = result.rows[0];
  if (!row) return false;
  await unlink(path.join(artifactRoot, row.storage_key)).catch(() => undefined);
  return true;
}

export async function updateArtifactDetails(
  ownerUserId: string,
  artifactId: string,
  displayName: string,
  description: string | null,
) {
  const result = await pool.query<{
    id: string;
    original_name: string;
    display_name: string;
    description: string | null;
    byte_size: string;
    status: "quarantined";
    created_at: Date;
  }>(
    `update apk_artifact set display_name = $1, description = $2
     where id = $3 and owner_user_id = $4
     returning id, original_name, display_name, description, byte_size, status, created_at`,
    [displayName, description, artifactId, ownerUserId],
  );
  const row = result.rows[0];
  return row
    ? {
        id: row.id,
        originalName: row.original_name,
        displayName: row.display_name,
        description: row.description,
        byteSize: Number(row.byte_size),
        status: row.status,
        createdAt: row.created_at.toISOString(),
      }
    : null;
}

export async function artifactPathForOwner(
  ownerUserId: string,
  artifactId: string,
) {
  const result = await pool.query<{ storage_key: string }>(
    "select storage_key from apk_artifact where id = $1 and owner_user_id = $2 and status = $3",
    [artifactId, ownerUserId, "quarantined"],
  );
  const storageKey = result.rows[0]?.storage_key;
  if (!storageKey || storageKey.includes("..")) return null;
  return path.join(artifactRoot, storageKey);
}
