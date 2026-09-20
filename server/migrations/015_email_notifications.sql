-- Notification preferences are per user. Security-critical authentication
-- messages deliberately bypass these preferences.
create table if not exists email_preference (
  user_id text primary key references "user"(id) on delete cascade,
  product_updates boolean not null default true,
  billing_updates boolean not null default true,
  team_updates boolean not null default true,
  announcements boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists email_delivery (
  id uuid primary key default gen_random_uuid(),
  user_id text references "user"(id) on delete set null,
  recipient text not null,
  category text not null check (category in ('authentication','billing','team','product','announcement')),
  template text not null,
  subject text not null,
  status text not null check (status in ('sent','failed','suppressed')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists email_delivery_user_created_idx on email_delivery(user_id, created_at desc);
create index if not exists email_delivery_created_idx on email_delivery(created_at desc);
