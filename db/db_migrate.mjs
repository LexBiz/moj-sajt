import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'

function readEnv(name) {
  const v = process.env[name]
  return typeof v === 'string' ? v.trim() : ''
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

async function listApplied(client) {
  const res = await client.query('SELECT filename FROM schema_migrations ORDER BY applied_at ASC')
  return new Set(res.rows.map((r) => String(r.filename)))
}

function listMigrationFiles(migrationsDir) {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))
}

async function applyOne(client, migrationsDir, filename) {
  const full = path.join(migrationsDir, filename)
  const sql = fs.readFileSync(full, 'utf8')
  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query('INSERT INTO schema_migrations(filename) VALUES ($1)', [filename])
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  }
}

async function main() {
  const databaseUrl = readEnv('DATABASE_URL')
  if (!databaseUrl) {
    console.error('DATABASE_URL is missing')
    process.exit(1)
  }

  const migrationsDir = path.join(process.cwd(), 'db', 'migrations')
  if (!fs.existsSync(migrationsDir)) {
    console.error('Missing migrations dir:', migrationsDir)
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const client = await pool.connect()
  try {
    await ensureMigrationsTable(client)
    const applied = await listApplied(client)
    const files = listMigrationFiles(migrationsDir)
    let appliedCount = 0
    for (const f of files) {
      if (applied.has(f)) continue
      console.log('Applying migration:', f)
      await applyOne(client, migrationsDir, f)
      appliedCount += 1
    }
    console.log('Migrations complete. Applied:', appliedCount)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('Migration failed:', e?.message || e)
  process.exit(1)
})

