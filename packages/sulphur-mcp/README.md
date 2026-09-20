# Sulphur MCP launcher

Run Sulphur's local session MCP server from a checked-out Sulphur project:

```bash
node /path/to/Sulphur/packages/sulphur-mcp/bin/sulphur-mcp.mjs --project /path/to/Sulphur --session SESSION_ID
```

The session ID is displayed in Sulphur's running session details. The launcher
starts the project-local MCP server and does not receive database, OAuth, SMTP,
APK, or ADB credentials.
