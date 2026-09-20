-- Durable, owner-scoped CoTester context. Message rows are indexed by the
-- conversation timeline so continuation reads never scan another workspace.
create table if not exists cotester_conversation (
  id uuid primary key,
  owner_user_id text not null references "user"(id) on delete cascade,
  artifact_id uuid not null references apk_artifact(id) on delete restrict,
  session_id uuid references android_session(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  context_summary text not null default '' check (char_length(context_summary) <= 12000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cotester_conversation_owner_updated_idx on cotester_conversation(owner_user_id, updated_at desc);

create table if not exists cotester_message (
  id uuid primary key,
  conversation_id uuid not null references cotester_conversation(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  created_at timestamptz not null default now()
);
create index if not exists cotester_message_conversation_created_idx on cotester_message(conversation_id, created_at desc);

alter table cotester_conversation enable row level security;
alter table cotester_message enable row level security;
