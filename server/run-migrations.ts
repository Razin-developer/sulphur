import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

const migrationsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')

export async function migrationFiles() {
  return (await readdir(migrationsDirectory)).filter((name) => /^\d{3}_[a-z_]+\.sql$/.test(name)).sort()
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString || connectionString.includes('[YOUR-PASSWORD]') || connectionString.includes('DB_PASSWORD') || connectionString.includes('localhost')) {
    throw new Error('Set DATABASE_URL to your complete Supabase pooler URI before running migrations.')
  }
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query('select pg_advisory_lock(74278401)')
    await client.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())')
    const applied = new Set((await client.query<{ name: string }>('select name from schema_migrations')).rows.map((row) => row.name))
    for (const name of await migrationFiles()) {
      if (applied.has(name)) continue
      const sql = await readFile(path.join(migrationsDirectory, name), 'utf8')
      await client.query('begin')
      try {
        await client.query(sql)
        await client.query('insert into schema_migrations (name) values ($1)', [name])
        await client.query('commit')
        console.log(`Applied ${name}`)
      } catch (error) {
        await client.query('rollback')
        throw error
      }
    }
  } finally {
    await client.query('select pg_advisory_unlock(74278401)').catch(() => undefined)
    await client.end()
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
