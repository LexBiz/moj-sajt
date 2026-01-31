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
  if (!mode && hasDatabase()) return 'postgres'
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
  return res.rows.map((r) => ({
    ...r,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : r.createdAt || r.created_at || null,
  }))
}

export async function hasRecentLeadByContact(input: { contact: string; source?: string; withinMs?: number }) {
  const contact = String(input.contact || '').trim()
  if (!contact) return false
  const source = String(input.source || '').trim().toLowerCase()
  const withinMs = typeof input.withinMs === 'number' ? input.withinMs : 24 * 60 * 60 * 1000
  if (!isPostgresEnabled()) {
    const leads = readJsonFile(LEADS_FILE, []) as any[]
    const now = Date.now()
    return leads.slice(0, 300).some((l: any) => {
      if (source && String(l?.source || '').toLowerCase() !== source) return false
      if (String(l?.contact || '').trim() !== contact) return false
      const t = Date.parse(String(l?.createdAt || l?.created_at || ''))
      if (!Number.isFinite(t)) return false
      return now - t < withinMs
    })
  }
  const res = await db().query(
    `SELECT id FROM leads
     WHERE contact = $1
     ${source ? 'AND LOWER(source) = $2' : ''}
     AND created_at > now() - (${source ? '$3' : '$2'}::int * interval '1 millisecond')
     LIMIT 1`,
    source ? [contact, source, withinMs] : [contact, withinMs],
  )
  return (res.rows || []).length > 0
}

export async function createLead(input: any) {
  const nowIso = new Date().toISOString()
  const lead = {
    id: typeof input?.id === 'number' ? input.id : Date.now(),
    tenantId: input?.tenantId || null,
    name: input?.name || null,
    contact: input?.contact || input?.phone || null,
    email: input?.email || null,
    businessType: input?.businessType || null,
    channel: input?.channel || null,
    pain: input?.pain || null,
    question: input?.question || null,
    clientMessages: Array.isArray(input?.clientMessages) ? input.clientMessages : null,
    aiRecommendation: input?.aiRecommendation || null,
    aiSummary: input?.aiSummary || null,
    aiReadiness: input?.aiReadiness || null,
    source: input?.source || null,
    lang: input?.lang || null,
    notes: input?.notes || null,
    createdAt: input?.createdAt || nowIso,
    status: input?.status || 'new',
  }
  if (!lead.contact) throw new Error('missing_contact')

  if (!isPostgresEnabled()) {
    const leads = readJsonFile(LEADS_FILE, []) as any[]
    leads.unshift(lead)
    writeJsonFile(LEADS_FILE, leads)
    return lead
  }

  const res = await db().query(
    `INSERT INTO leads (
      id, tenant_id, name, contact, email, business_type, channel, pain, question,
      client_messages, ai_recommendation, ai_summary, ai_readiness, source, lang, notes, status, created_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13::jsonb,$14,$15,$16,$17,$18
    )
    RETURNING id, created_at`,
    [
      lead.id,
      lead.tenantId,
      lead.name,
      lead.contact,
      lead.email,
      lead.businessType,
      lead.channel,
      lead.pain,
      lead.question,
      lead.clientMessages ? JSON.stringify(lead.clientMessages) : null,
      lead.aiRecommendation,
      lead.aiSummary,
      lead.aiReadiness ? JSON.stringify(lead.aiReadiness) : null,
      lead.source,
      lead.lang,
      lead.notes,
      lead.status,
      lead.createdAt,
    ],
  )
  const row = res.rows?.[0] || {}
  return { ...lead, id: row.id || lead.id, createdAt: row.created_at ? new Date(row.created_at).toISOString() : lead.createdAt }
}

export async function deleteLeadById(id: number) {
  if (!Number.isFinite(id)) return false
  if (!isPostgresEnabled()) {
    const all = readJsonFile(LEADS_FILE, []) as any[]
    const next = all.filter((l) => Number(l?.id) !== Number(id))
    if (next.length === all.length) return false
    writeJsonFile(LEADS_FILE, next)
    return true
  }
  const res = await db().query('DELETE FROM leads WHERE id=$1', [id])
  return res.rowCount > 0
}

export async function deleteLeadsByTenant(tenantId: string) {
  const tid = String(tenantId || '').trim().toLowerCase()
  if (!tid) return 0
  if (!isPostgresEnabled()) {
    const all = readJsonFile(LEADS_FILE, []) as any[]
    const next = all.filter((l) => String(l?.tenantId || '').toLowerCase() !== tid)
    const removed = all.length - next.length
    if (removed > 0) writeJsonFile(LEADS_FILE, next)
    return removed
  }
  const res = await db().query('DELETE FROM leads WHERE tenant_id=$1', [tid])
  return res.rowCount || 0
}

export async function deleteAllLeads() {
  if (!isPostgresEnabled()) {
    const all = readJsonFile(LEADS_FILE, []) as any[]
    const removed = all.length
    if (removed > 0) writeJsonFile(LEADS_FILE, [])
    return removed
  }
  const res = await db().query('DELETE FROM leads')
  return res.rowCount || 0
}

