import { Pool } from 'pg'

let _pool: Pool | null = null

export function hasDatabase() {
  const url = String(process.env.DATABASE_URL || '').trim()
  return Boolean(url)
}

export function db() {
  if (_pool) return _pool
  const connectionString = String(process.env.DATABASE_URL || '').trim()
  if (!connectionString) throw new Error('DATABASE_URL is missing')
  _pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_MS || 30_000),
  })
  return _pool
}

