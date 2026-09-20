-- Durable commercial primitives. Credits are represented by immutable ledger entries;
-- no mutable balance can become inconsistent under concurrent usage.
create table if not exists organization (
  id uuid primary key,
  owner_user_id text not null references "user"(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);
create index if not exists organization_owner_user_id_idx on organization(owner_user_id);

create table if not exists plan (
  id text primary key,
  name text not null check (char_length(name) between 1 and 80),
  active boolean not null default true,
  included_credits integer not null check (included_credits >= 0),
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists subscription (
  id uuid primary key,
  organization_id uuid not null references organization(id) on delete cascade,
  provider text not null,
  provider_subscription_id text unique,
  plan_id text not null references plan(id) on delete restrict,
  status text not null check (status in ('trialing','active','past_due','canceled','paused')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscription_organization_id_idx on subscription(organization_id);
create index if not exists subscription_active_organization_idx on subscription(organization_id, current_period_end) where status in ('trialing', 'active', 'past_due');

create table if not exists credit_ledger (
  id uuid primary key,
  organization_id uuid not null references organization(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (reason in ('plan_grant','top_up','usage','adjustment','refund')),
  external_reference text unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_organization_created_idx on credit_ledger(organization_id, created_at desc);

create table if not exists support_request (
  id uuid primary key,
  organization_id uuid not null references organization(id) on delete cascade,
  requester_user_id text not null references "user"(id) on delete restrict,
  subject text not null check (char_length(subject) between 1 and 200),
  status text not null check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_request_organization_status_idx on support_request(organization_id, status, created_at desc);
