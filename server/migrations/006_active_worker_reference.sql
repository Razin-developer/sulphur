-- A native emulator is reusable after a session ends. Only concurrently active
-- sessions must be prevented from claiming the same worker reference.
alter table android_session drop constraint if exists android_session_worker_reference_key;
drop index if exists android_session_active_worker_idx;
create unique index android_session_active_worker_idx
  on android_session(worker_reference)
  where worker_reference is not null and status in ('queued', 'starting', 'running', 'paused');
