create table if not exists workspace_app_setting (
  owner_user_id text primary key references "user"(id) on delete cascade,
  default_egress_allowed boolean not null default false,
  session_duration_minutes integer not null default 60 check (session_duration_minutes between 15 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table workspace_app_setting enable row level security;
