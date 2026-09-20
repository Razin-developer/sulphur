-- New workspaces start on the durable Free plan. A paid-plan trial is created
-- only after the payment provider has collected a payment method.
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
  values (gen_random_uuid(), organization_id, 'sulphur', 'free', 'active', null);
  return new;
end;
$$;

update subscription
set status = 'active', current_period_end = null, updated_at = now()
where provider = 'sulphur' and plan_id = 'free' and status = 'trialing';
