# Sulphur local MCP

This is a local STDIO MCP server. It attaches to one running Sulphur session
using `SULPHUR_SESSION_ID`; it never receives ADB addresses, APK paths,
database credentials, or access to any other session.

## Run it directly

From this project directory, start a session in the Sulphur web app, copy its
session ID, and run:

```powershell
$env:SULPHUR_SESSION_ID = "PASTE_RUNNING_SESSION_ID"
npx tsx mcp/server.ts
```

The process is for MCP clients, so it will wait silently for a client
connection. `Ctrl+C` stops it.

## Available now

- `get_screen_state`
- `take_screenshot`
- `get_action_log`

`act` and `reset_session` remain deliberately unavailable in local view-only
mode. They will be enabled only after snapshot-scoped semantic controls are
implemented.

## Client configuration

Use the commands and manual JSON/TOML snippets in `clients.md`. Keep the
session ID local; it is only valid while that specific session is running.
