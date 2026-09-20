# Connect Sulphur MCP to an agent

Start a running session in Sulphur and copy its session ID. Replace `SESSION_ID`
below. These commands launch a local, session-scoped MCP server; they do not
send your APK, database URL, OAuth keys, or ADB address to npm.

## Codex CLI

```powershell
codex mcp add sulphur -- npx -y @sulphur-ai/mcp --project "C:\Users\razin\Desktop\Products\Sulphur" --session "SESSION_ID"
codex mcp list
```

Use `/mcp` in Codex to check that Sulphur is connected.

## Claude Code

```powershell
claude mcp add sulphur --scope project -- npx -y @sulphur-ai/mcp --project "C:\Users\razin\Desktop\Products\Sulphur" --session "SESSION_ID"
claude mcp get sulphur
```

## Gemini CLI

```powershell
gemini mcp add --scope project sulphur npx -y @sulphur-ai/mcp --project "C:\Users\razin\Desktop\Products\Sulphur" --session "SESSION_ID"
gemini mcp list
```

## Other local MCP clients

Use this process definition wherever the client accepts an MCP stdio server.
The in-app **Set up MCP** dialog has a searchable catalog and shows the
launcher for the selected client.

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@sulphur-ai/mcp",
    "--project",
    "C:\\Users\\razin\\Desktop\\Products\\Sulphur",
    "--session",
    "SESSION_ID"
  ]
}
```

Remove the integration or replace its session ID when the Android session ends.
