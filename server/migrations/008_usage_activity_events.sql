alter table workspace_usage_event drop constraint if exists workspace_usage_event_kind_check;
alter table workspace_usage_event add constraint workspace_usage_event_kind_check check (kind in (
  'mcp_call', 'tool_call', 'click', 'ai_request',
  'app_uploaded', 'app_updated', 'app_deleted',
  'session_started', 'session_ended', 'session_deleted', 'session_control'
));
