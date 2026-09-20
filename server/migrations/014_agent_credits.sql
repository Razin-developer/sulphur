-- Credits become the unit of value for an in-app agent request. Keep the
-- existing immutable ledger as the source of truth; no mutable balance is
-- introduced.
insert into credit_ledger (id, organization_id, amount, reason, external_reference)
select gen_random_uuid(), o.id, p.included_credits, 'plan_grant', 'initial-agent-credit-grant:' || o.id
from organization o
join subscription s on s.organization_id = o.id and s.status in ('trialing', 'active')
join plan p on p.id = s.plan_id
where p.included_credits > 0
  and not exists (
    select 1 from credit_ledger l
    where l.organization_id = o.id and l.reason = 'plan_grant'
  );

-- New workspaces receive their plan grant at provisioning time. The external
-- reference makes a retry safe without making credit state mutable.
create or replace function provision_user_billing() returns trigger
language plpgsql
set search_path = public
as $$
declare organization_id uuid;
declare granted_credits integer;
begin
  insert into organization (id, owner_user_id, name)
  values (gen_random_uuid(), new.id, coalesce(nullif(new.name, ''), 'Sulphur workspace'))
  returning id into organization_id;

  insert into subscription (id, organization_id, provider, plan_id, status, current_period_end)
  values (gen_random_uuid(), organization_id, 'sulphur', 'free', 'active', null);

  select included_credits into granted_credits from plan where id = 'free';
  if coalesce(granted_credits, 0) > 0 then
    insert into credit_ledger (id, organization_id, amount, reason, external_reference)
    values (gen_random_uuid(), organization_id, granted_credits, 'plan_grant', 'initial-agent-credit-grant:' || organization_id);
  end if;
  return new;
end;
$$;
