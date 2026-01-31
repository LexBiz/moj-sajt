import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return
    const raw = fs.readFileSync(filePath, 'utf8')
    const lines = raw.split(/\r?\n/)
    for (const line of lines) {
      const s = String(line || '').trim()
      if (!s || s.startsWith('#')) continue
      const idx = s.indexOf('=')
      if (idx <= 0) continue
      const key = s.slice(0, idx).trim()
      let val = s.slice(idx + 1).trim()
      if (!key) continue
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // ignore
  }
}

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
  // Load env from local files for server runs (pm2/next does this, but plain node script doesn't).
  loadEnvFile(path.join(process.cwd(), '.env.local'))
  loadEnvFile(path.join(process.cwd(), '.env'))

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

