#!/usr/bin/env node
import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const value = (flag) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const project = value('--project') || process.env.SULPHUR_PROJECT_DIR || process.cwd()
const sessionId = value('--session') || process.env.SULPHUR_SESSION_ID
const entry = path.resolve(project, 'mcp', 'server.ts')

if (!sessionId) {
  console.error('Sulphur MCP requires --session SESSION_ID or SULPHUR_SESSION_ID.')
  process.exit(1)
}
if (!existsSync(entry)) {
  console.error(`No Sulphur project was found at ${project}. Pass --project with the Sulphur project directory.`)
  process.exit(1)
}

const tsx = path.resolve(project, 'node_modules', 'tsx', 'dist', 'cli.mjs')
if (!existsSync(tsx)) {
  console.error(`Sulphur's local runtime was not found at ${tsx}. Run npm install in ${project}.`)
  process.exit(1)
}

const child = spawn(process.execPath, [tsx, entry], {
  cwd: project,
  env: { ...process.env, SULPHUR_SESSION_ID: sessionId },
  stdio: 'inherit',
  windowsHide: true,
})
child.on('error', (error) => { console.error(error.message); process.exit(1) })
child.on('exit', (code) => process.exit(code ?? 1))
