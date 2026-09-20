-- Durable CoTester runs survive browser navigation and are claimed by one
-- worker at a time. Owner-scoped indexes keep status and conversation reads
-- bounded without scanning another workspace.
create table if not exists cotester_run (
  id uuid primary key,
  owner_user_id text not null references "user"(id) on delete cascade,
  conversation_id uuid not null references cotester_conversation(id) on delete cascade,
  session_id uuid not null references android_session(id) on delete restrict,
  request_text text not null check (char_length(request_text) between 1 and 6000),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  answer text check (answer is null or char_length(answer) <= 12000),
  error text check (error is null or char_length(error) <= 2000),
  trace jsonb not null default '[]'::jsonb,
  credits_used integer,
  input_tokens integer,
  output_tokens integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cotester_run_owner_conversation_created_idx
  on cotester_run(owner_user_id, conversation_id, created_at desc);
create index if not exists cotester_run_queue_idx
  on cotester_run(created_at asc) where status = 'queued';

create table if not exists cotester_run_event (
  id bigserial primary key,
  run_id uuid not null references cotester_run(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 160),
  detail text not null check (char_length(detail) <= 1000),
  state text not null check (state in ('complete', 'blocked', 'working')),
  created_at timestamptz not null default now()
);

create index if not exists cotester_run_event_run_created_idx
  on cotester_run_event(run_id, created_at asc, id asc);

alter table cotester_run enable row level security;
alter table cotester_run_event enable row level security;
