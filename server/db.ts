import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required to start the authentication service.')

// Keep a small per-process pool: a pooler is shared across app instances.
export const pool = new Pool({ connectionString, max: 5 })
export const db = drizzle(pool)
