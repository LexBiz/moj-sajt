import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadEnvFile(path.join(rootDir, '.env'))
loadEnvFile(path.join(rootDir, '.env.local'))

const dbUrl = String(process.env.CRM_DATABASE_URL || process.env.DATABASE_URL || '').trim()
if (!dbUrl) {
  console.error('CRM_DATABASE_URL or DATABASE_URL is required')
  process.exit(1)
}

const { Pool } = pg
const pool = new Pool({ connectionString: dbUrl })

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsDir).filter((x) => x.endsWith('.sql')).sort()
  for (const id of files) {
    const exists = await pool.query('SELECT 1 FROM crm_schema_migrations WHERE id = $1', [id])
    if (exists.rowCount > 0) continue
    const sql = fs.readFileSync(path.join(migrationsDir, id), 'utf8')
    await pool.query('BEGIN')
    try {
      await pool.query(sql)
      await pool.query('INSERT INTO crm_schema_migrations (id) VALUES ($1)', [id])
      await pool.query('COMMIT')
      console.log(`Applied migration: ${id}`)
    } catch (e) {
      await pool.query('ROLLBACK')
      throw e
    }
  }
}

run()
  .then(async () => {
    await pool.end()
    console.log('CRM migrations complete')
  })
  .catch(async (e) => {
    console.error('Migration failed:', e)
    await pool.end()
    process.exit(1)
  })
