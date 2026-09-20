-- Separate from Better Auth's generated user/session/account/verification schema.
-- PostgreSQL is the production source of truth for all monetary balances and grants.
create table if not exists organization (
  id uuid primary key,
  owner_user_id text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists plan (
  id text primary key,
  name text not null,
  active boolean not null default true,
  included_credits integer not null check (included_credits >= 0),
  limits jsonb not null default '{}'::jsonb
);

create table if not exists subscription (
  id uuid primary key,
  organization_id uuid not null references organization(id),
  provider text not null,
  provider_subscription_id text unique,
  plan_id text not null references plan(id),
  status text not null check (status in ('trialing','active','past_due','canceled','paused')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists credit_ledger (
  id uuid primary key,
  organization_id uuid not null references organization(id),
  amount integer not null,
  reason text not null check (reason in ('plan_grant','top_up','usage','adjustment','refund')),
  external_reference text unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists support_request (
  id uuid primary key,
  organization_id uuid not null references organization(id),
  requester_user_id text not null,
  subject text not null,
  status text not null check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now()
);
