create table if not exists workspace_mcp_setting (
  owner_user_id text primary key references "user"(id) on delete cascade,
  default_connector text not null default 'codex' check (default_connector in ('codex', 'claude', 'gemini')),
  allow_screen_state boolean not null default true,
  allow_screenshots boolean not null default true,
  allow_action_log boolean not null default true,
  allow_actions boolean not null default true,
  require_action_approval boolean not null default true,
  token_ttl_minutes integer not null default 60 check (token_ttl_minutes between 5 and 1440),
  updated_at timestamptz not null default now()
);

alter table workspace_mcp_setting enable row level security;
