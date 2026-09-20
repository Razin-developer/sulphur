create table if not exists "user" (
  id text primary key,
  name text not null,
  email text not null unique,
  email_verified boolean not null,
  image text,
  username text unique,
  display_username text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists session (
  id text primary key,
  expires_at timestamptz not null,
  token text not null unique,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  ip_address text,
  user_agent text,
  user_id text not null references "user"(id) on delete cascade
);
create index if not exists session_user_id_idx on session(user_id);

create table if not exists account (
  id text primary key,
  account_id text not null,
  provider_id text not null,
  user_id text not null references "user"(id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists account_user_id_idx on account(user_id);
create unique index if not exists account_provider_account_idx on account(provider_id, account_id);

create table if not exists verification (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz,
  updated_at timestamptz
);
create index if not exists verification_identifier_idx on verification(identifier);
