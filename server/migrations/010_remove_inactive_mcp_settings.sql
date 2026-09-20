alter table workspace_mcp_setting
  drop column if exists require_action_approval,
  drop column if exists token_ttl_minutes;
