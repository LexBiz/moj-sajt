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

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback
    const raw = fs.readFileSync(file, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'))
  loadEnvFile(path.join(process.cwd(), '.env'))

  const databaseUrl = readEnv('DATABASE_URL')
  if (!databaseUrl) {
    console.error('DATABASE_URL is missing')
    process.exit(1)
  }

  const dataDir = path.join(process.cwd(), 'data')
  const tenantsFile = path.join(dataDir, 'tenants.json')
  const profilesFile = path.join(dataDir, 'tenant-profiles.json')
  const connectionsFile = path.join(dataDir, 'channel-connections.json')
  const leadsFile = path.join(dataDir, 'leads.json')

  const tenants = readJson(tenantsFile, [])
  const profiles = readJson(profilesFile, [])
  const connections = readJson(connectionsFile, [])
  const leads = readJson(leadsFile, [])

  const pool = new Pool({ connectionString: databaseUrl })
  const client = await pool.connect()
  try {
    let tenantsUpserted = 0
    let profilesUpserted = 0
    let connectionsUpserted = 0
    let leadsInserted = 0

    await client.query('BEGIN')

    if (Array.isArray(tenants)) {
      for (const t of tenants) {
        const id = String(t?.id || '').trim()
        if (!id) continue
        const name = String(t?.name || id).trim()
        const plan = String(t?.plan || 'START').trim() || 'START'
        const notes = typeof t?.notes === 'string' ? t.notes : null
        await client.query(
          `INSERT INTO tenants (id, name, plan, notes)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (id) DO UPDATE SET
             name=EXCLUDED.name,
             plan=EXCLUDED.plan,
             notes=EXCLUDED.notes,
             updated_at=now()`,
          [id, name, plan, notes],
        )
        tenantsUpserted += 1
      }
    }

    if (Array.isArray(profiles)) {
      for (const p of profiles) {
        const tenantId = String(p?.tenantId || p?.tenant_id || '').trim()
        if (!tenantId) continue
        // Ensure tenant exists
        await client.query(`INSERT INTO tenants (id, name, plan) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`, [
          tenantId,
          tenantId,
          'START',
        ])
        const niche = typeof p?.niche === 'string' ? p.niche : null
        const offer = typeof p?.offer === 'string' ? p.offer : null
        const faq = typeof p?.faq === 'string' ? p.faq : null
        const language = typeof p?.defaultLang === 'string' ? p.defaultLang : typeof p?.language === 'string' ? p.language : null
        const timezone = typeof p?.timezone === 'string' ? p.timezone : null
        const managerTelegramId =
          typeof p?.managerTelegramChatId === 'string'
            ? p.managerTelegramChatId
            : typeof p?.managerTelegramId === 'string'
              ? p.managerTelegramId
              : null
        const data = p
        await client.query(
          `INSERT INTO tenant_profiles (tenant_id, niche, offer, faq, language, timezone, manager_telegram_id, data)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (tenant_id) DO UPDATE SET
             niche=EXCLUDED.niche,
             offer=EXCLUDED.offer,
             faq=EXCLUDED.faq,
             language=EXCLUDED.language,
             timezone=EXCLUDED.timezone,
             manager_telegram_id=EXCLUDED.manager_telegram_id,
             data=EXCLUDED.data,
             updated_at=now()`,
          [tenantId, niche, offer, faq, language, timezone, managerTelegramId, data],
        )
        profilesUpserted += 1
      }
    }

    if (Array.isArray(connections)) {
      for (const c of connections) {
        const id = String(c?.id || '').trim()
        const tenantId = String(c?.tenantId || c?.tenant_id || '').trim()
        const channel = String(c?.channel || '').trim()
        const externalId = c?.externalId == null ? '' : String(c.externalId).trim()
        if (!id || !tenantId || !channel || !externalId) continue

        // Ensure tenant exists
        await client.query(`INSERT INTO tenants (id, name, plan) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`, [
          tenantId,
          tenantId,
          'START',
        ])

        const meta = c?.meta ?? null
        const data = c

        // Upsert by primary key; if unique (channel, external_id) collides with a different id, update that row instead.
        try {
          await client.query(
            `INSERT INTO channel_connections (id, tenant_id, channel, external_id, meta, data)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (id) DO UPDATE SET
               tenant_id=EXCLUDED.tenant_id,
               channel=EXCLUDED.channel,
               external_id=EXCLUDED.external_id,
               meta=EXCLUDED.meta,
               data=EXCLUDED.data,
               updated_at=now()`,
            [id, tenantId, channel, externalId, meta, data],
          )
        } catch (e) {
          await client.query(
            `UPDATE channel_connections
             SET tenant_id=$1, meta=$2, data=$3, updated_at=now()
             WHERE channel=$4 AND external_id=$5`,
            [tenantId, meta, data, channel, externalId],
          )
        }
        connectionsUpserted += 1
      }
    }

    if (Array.isArray(leads)) {
      for (const l of leads) {
        const id = typeof l?.id === 'number' ? l.id : Number(l?.id)
        if (!Number.isFinite(id)) continue
        const contact = String(l?.contact || l?.phone || '').trim()
        if (!contact) continue
        await client.query(
          `INSERT INTO leads (id, tenant_id, name, contact, email, business_type, channel, pain, question, client_messages, ai_recommendation, ai_summary, ai_readiness, source, lang, notes, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, COALESCE($18::timestamptz, now()))
           ON CONFLICT (id) DO NOTHING`,
          [
            id,
            l?.tenantId || null,
            l?.name || null,
            contact,
            l?.email || null,
            l?.businessType || null,
            l?.channel || null,
            l?.pain || null,
            l?.question || null,
            l?.clientMessages || null,
            l?.aiRecommendation || null,
            l?.aiSummary || null,
            l?.aiReadiness || null,
            l?.source || null,
            l?.lang || null,
            l?.notes || null,
            l?.status || 'new',
            l?.createdAt || l?.created_at || null,
          ],
        )
        leadsInserted += 1
      }
    }

    await client.query('COMMIT')

    console.log(
      JSON.stringify(
        { ok: true, tenantsUpserted, profilesUpserted, connectionsUpserted, leadsInserted, source: 'data/*.json' },
        null,
        2,
      ),
    )
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore
    }
    console.error('Import failed:', e?.message || e)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()

