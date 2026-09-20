alter table workspace_app_setting add column if not exists clean_start boolean not null default true;
alter table workspace_app_setting add column if not exists default_orientation text not null default 'portrait'
  check (default_orientation in ('portrait', 'landscape'));
alter table workspace_app_setting add column if not exists session_retention_days integer not null default 30
  check (session_retention_days between 1 and 365);
