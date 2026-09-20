-- Makes audit entries work for dedicated environment-based administrators,
-- who deliberately do not need a customer account in the application.
alter table admin_audit_log add column if not exists admin_email text;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'admin_audit_log' and column_name = 'admin_user_id') then
    update admin_audit_log l set admin_email = u.email from "user" u where l.admin_user_id = u.id and l.admin_email is null;
  end if;
end;
$$;
alter table admin_audit_log alter column admin_email set not null;
alter table admin_audit_log drop column if exists admin_user_id;
