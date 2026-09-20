create table if not exists workspace_usage_limit (
  owner_user_id text primary key references "user"(id) on delete cascade,
  monthly_session_starts integer not null default 20 check (monthly_session_starts between 1 and 10000),
  max_active_sessions integer not null default 1 check (max_active_sessions between 1 and 5),
  max_storage_bytes bigint not null default 536870912 check (max_storage_bytes between 52428800 and 21474836480),
  daily_mcp_calls integer not null default 1000 check (daily_mcp_calls between 1 and 100000),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_usage_event (
  id uuid primary key,
  owner_user_id text not null references "user"(id) on delete cascade,
  kind text not null check (kind in ('mcp_call', 'tool_call', 'click', 'ai_request')),
  action text,
  session_id uuid references android_session(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists workspace_usage_event_owner_created_idx on workspace_usage_event(owner_user_id, created_at desc);

alter table workspace_usage_limit enable row level security;
alter table workspace_usage_event enable row level security;
