-- APKs remain quarantined until a dedicated worker finishes review. The browser
-- never receives a filesystem key, and no session may run a quarantined artifact.
create table if not exists apk_artifact (
  id uuid primary key,
  owner_user_id text not null references "user"(id) on delete cascade,
  original_name text not null check (char_length(original_name) between 1 and 255),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 52428800),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  storage_key text not null unique,
  status text not null check (status in ('quarantined', 'rejected', 'ready')) default 'quarantined',
  package_name text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists apk_artifact_owner_created_idx on apk_artifact(owner_user_id, created_at desc);
create unique index if not exists apk_artifact_owner_sha256_idx on apk_artifact(owner_user_id, sha256);

create table if not exists android_session (
  id uuid primary key,
  artifact_id uuid not null references apk_artifact(id) on delete restrict,
  owner_user_id text not null references "user"(id) on delete cascade,
  status text not null check (status in ('queued', 'starting', 'running', 'paused', 'ended', 'failed')),
  egress_allowed boolean not null default false,
  worker_reference text unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  ended_at timestamptz
);
create index if not exists android_session_owner_created_idx on android_session(owner_user_id, created_at desc);
create index if not exists android_session_active_worker_idx on android_session(worker_reference) where status in ('queued', 'starting', 'running', 'paused');

alter table apk_artifact enable row level security;
alter table android_session enable row level security;
