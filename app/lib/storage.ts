import { hasDatabase, db } from './db'
import { readJsonFile, writeJsonFile } from './jsonStore'
import path from 'path'

export type Tenant = { id: string; name: string; plan: string; notes?: string | null; createdAt?: string; updatedAt?: string }
export type TenantProfile = any
export type ChannelConnection = any
export type Lead = any

const TENANTS_FILE = path.join(process.cwd(), 'data', 'tenants.json')
const PROFILES_FILE = path.join(process.cwd(), 'data', 'tenant-profiles.json')
const CONNECTIONS_FILE = path.join(process.cwd(), 'data', 'channel-connections.json')
const LEADS_FILE = path.join(process.cwd(), 'data', 'leads.json')

function storageMode() {
  const mode = String(process.env.STORAGE_MODE || '').trim().toLowerCase()
  if (mode === 'pg' || mode === 'postgres' || mode === 'postgresql') return 'postgres'
  return 'json'
}

export function isPostgresEnabled() {
  return storageMode() === 'postgres' && hasDatabase()
}

// TENANTS
export async function listTenants(): Promise<Tenant[]> {
  if (!isPostgresEnabled()) return (readJsonFile(TENANTS_FILE, []) as any[]).map((t) => ({ ...t }))
  const res = await db().query(
    'SELECT id, name, plan, notes, created_at as "createdAt", updated_at as "updatedAt" FROM tenants ORDER BY created_at DESC',
  )
  return res.rows
}

export async function upsertTenant(t: Tenant) {
  if (!isPostgresEnabled()) {
    const all = readJsonFile(TENANTS_FILE, []) as any[]
    const idx = all.findIndex((x) => x.id === t.id)
    const now = new Date().toISOString()
    const next = { ...t, updatedAt: now, createdAt: all[idx]?.createdAt || now }
    if (idx >= 0) all[idx] = next
    else all.unshift(next)
    writeJsonFile(TENANTS_FILE, all)
    return next
  }
  const res = await db().query(
    `INSERT INTO tenants (id, name, plan, notes)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       plan = EXCLUDED.plan,
       notes = EXCLUDED.notes,
       updated_at = now()
     RETURNING id, name, plan, notes, created_at as "createdAt", updated_at as "updatedAt"`,
    [t.id, t.name, t.plan || 'START', t.notes || null],
  )
  return res.rows[0]
}

// PROFILES
export async function getTenantProfile(tenantId: string): Promise<TenantProfile | null> {
  if (!isPostgresEnabled()) {
    const all = readJsonFile(PROFILES_FILE, []) as any[]
    return (all.find((p) => p.tenantId === tenantId) as any) || null
  }
  const res = await db().query(
    `SELECT COALESCE(data, jsonb_build_object(
        'tenantId', tenant_id,
        'niche', niche,
        'offer', offer,
        'faq', faq,
        'language', language,
        'timezone', timezone,
        'managerTelegramId', manager_telegram_id
      )) as profile
     FROM tenant_profiles WHERE tenant_id=$1`,
    [tenantId],
  )
  return (res.rows[0]?.profile as any) || null
}

export async function upsertTenantProfile(p: TenantProfile) {
  if (!isPostgresEnabled()) {
    const all = readJsonFile(PROFILES_FILE, []) as any[]
    const idx = all.findIndex((x) => x.tenantId === p.tenantId)
    if (idx >= 0) all[idx] = { ...all[idx], ...p }
    else all.unshift(p)
    writeJsonFile(PROFILES_FILE, all)
    return p
  }
  const tenantId = String(p?.tenantId || '').trim()
  if (!tenantId) throw new Error('tenantId is required')
  const data = p
  // Also keep some fields in columns for future querying (optional).
  const niche = typeof p?.niche === 'string' ? p.niche : null
  const offer = typeof p?.offer === 'string' ? p.offer : null
  const faq = typeof p?.faq === 'string' ? p.faq : null
  const language = typeof p?.defaultLang === 'string' ? p.defaultLang : typeof p?.language === 'string' ? p.language : null
  const timezone = typeof p?.timezone === 'string' ? p.timezone : null
  const managerTelegramId = typeof p?.managerTelegramChatId === 'string' ? p.managerTelegramChatId : typeof p?.managerTelegramId === 'string' ? p.managerTelegramId : null
  const res = await db().query(
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
       updated_at=now()
     RETURNING tenant_id as "tenantId"`,
    [
      tenantId,
      niche,
      offer,
      faq,
      language,
      timezone,
      managerTelegramId,
      data,
    ],
  )
  return { ...p, tenantId: res.rows[0]?.tenantId || p.tenantId }
}

// CONNECTIONS
export async function listChannelConnections(): Promise<ChannelConnection[]> {
  if (!isPostgresEnabled()) return readJsonFile(CONNECTIONS_FILE, []) as any
  const res = await db().query(
    `SELECT COALESCE(data, jsonb_build_object(
        'id', id,
        'tenantId', tenant_id,
        'channel', channel,
        'externalId', external_id,
        'meta', meta
      )) as connection
     FROM channel_connections ORDER BY created_at DESC`,
  )
  return res.rows.map((r) => r.connection)
}

export async function upsertChannelConnection(c: ChannelConnection) {
  if (!isPostgresEnabled()) {
    const all = readJsonFile(CONNECTIONS_FILE, []) as any[]
    const idx = all.findIndex((x) => x.id === c.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...c }
    else all.unshift(c)
    writeJsonFile(CONNECTIONS_FILE, all)
    return c
  }
  const id = String(c?.id || '').trim()
  if (!id) throw new Error('id is required')
  const tenantId = String(c?.tenantId || '').trim()
  if (!tenantId) throw new Error('tenantId is required')
  const channel = String(c?.channel || '').trim()
  if (!channel) throw new Error('channel is required')
  const externalId = c?.externalId == null ? '' : String(c.externalId).trim()
  const res = await db().query(
    `INSERT INTO channel_connections (id, tenant_id, channel, external_id, meta, data)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET
       tenant_id=EXCLUDED.tenant_id,
       channel=EXCLUDED.channel,
       external_id=EXCLUDED.external_id,
       meta=EXCLUDED.meta,
       data=EXCLUDED.data,
       updated_at=now()
     RETURNING id`,
    [id, tenantId, channel, externalId, c?.meta ?? null, c],
  )
  return { ...c, id: res.rows[0]?.id || c.id }
}

export async function resolveTenantIdByConnection(channel: string, externalId: string): Promise<string | null> {
  if (!isPostgresEnabled()) {
    const all = readJsonFile(CONNECTIONS_FILE, []) as any[]
    const found = all.find((x) => String(x.channel) === channel && String(x.externalId) === externalId)
    return found?.tenantId || null
  }
  const res = await db().query('SELECT tenant_id FROM channel_connections WHERE channel=$1 AND external_id=$2 LIMIT 1', [
    channel,
    externalId,
  ])
  return res.rows[0]?.tenant_id || null
}

// LEADS (kept minimal for now; we’ll switch API gradually)
export async function listLeads(): Promise<Lead[]> {
  if (!isPostgresEnabled()) return readJsonFile(LEADS_FILE, []) as any
  const res = await db().query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 500')
  return res.rows
}

