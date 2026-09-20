-- Browser clients use no direct table access. The server-side database role is the
-- only application data path, while RLS prevents accidental Data API exposure.
alter table "user" enable row level security;
alter table session enable row level security;
alter table account enable row level security;
alter table verification enable row level security;
alter table organization enable row level security;
alter table plan enable row level security;
alter table subscription enable row level security;
alter table credit_ledger enable row level security;
alter table support_request enable row level security;
