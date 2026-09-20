-- Commercial state is provisioned with a 14-day trial for every new user.
-- The admin console reads these durable records; payment tokens stay with the provider.
create extension if not exists pgcrypto;

insert into plan (id, name, included_credits, limits) values
  ('free', 'Free', 100, '{"monthlySessionStarts":20,"maxActiveSessions":1}'::jsonb),
  ('team', 'Team', 600, '{"monthlySessionStarts":500,"maxActiveSessions":5}'::jsonb),
  ('scale', 'Scale', 2500, '{"monthlySessionStarts":5000,"maxActiveSessions":20}'::jsonb)
on conflict (id) do nothing;

create or replace function provision_user_billing() returns trigger
language plpgsql
set search_path = public
as $$
declare organization_id uuid;
begin
  insert into organization (id, owner_user_id, name)
  values (gen_random_uuid(), new.id, coalesce(nullif(new.name, ''), 'Sulphur workspace'))
  returning id into organization_id;

  insert into subscription (id, organization_id, provider, plan_id, status, current_period_end)
  values (gen_random_uuid(), organization_id, 'sulphur', 'free', 'trialing', now() + interval '14 days');
  return new;
end;
$$;

drop trigger if exists provision_user_billing_trigger on "user";
create trigger provision_user_billing_trigger
after insert on "user"
for each row execute function provision_user_billing();

insert into organization (id, owner_user_id, name)
select gen_random_uuid(), u.id, coalesce(nullif(u.name, ''), 'Sulphur workspace')
from "user" u
where not exists (select 1 from organization o where o.owner_user_id = u.id);

insert into subscription (id, organization_id, provider, plan_id, status, current_period_end)
select gen_random_uuid(), o.id, 'sulphur', 'free', 'trialing', now() + interval '14 days'
from organization o
where not exists (select 1 from subscription s where s.organization_id = o.id);

create table if not exists promo_code (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,40}$'),
  discount_percent integer not null check (discount_percent between 1 and 100),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists promo_code_active_idx on promo_code(active, expires_at) where active;

create table if not exists promo_redemption (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references promo_code(id) on delete restrict,
  organization_id uuid not null references organization(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (promo_code_id, organization_id)
);
create index if not exists promo_redemption_organization_idx on promo_redemption(organization_id, redeemed_at desc);

create table if not exists payment_transaction (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete restrict,
  provider text not null check (char_length(provider) between 1 and 80),
  provider_payment_id text unique,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  status text not null check (status in ('pending','paid','failed','refunded')),
  created_at timestamptz not null default now()
);
create index if not exists payment_transaction_organization_created_idx on payment_transaction(organization_id, created_at desc);

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null check (char_length(action) between 1 and 80),
  target_user_id text references "user"(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on admin_audit_log(created_at desc);
