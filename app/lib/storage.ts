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
const ASSISTANT_ITEMS_FILE = path.join(process.cwd(), 'data', 'assistant-items.json')
const ASSISTANT_MESSAGES_FILE = path.join(process.cwd(), 'data', 'assistant-messages.json')

function storageMode() {
  const mode = String(process.env.STORAGE_MODE || '').trim().toLowerCase()
  if (mode === 'pg' || mode === 'postgres' || mode === 'postgresql') return 'postgres'
  if (!mode && hasDatabase()) return 'postgres'
  return 'json'
}

export function isPostgresEnabled() {
  return storageMode() === 'postgres' && hasDatabase()
}

const PG_QUERY_TIMEOUT_MS = Math.max(500, Math.min(20_000, Number(process.env.PG_QUERY_TIMEOUT_MS || 2500) || 2500))

async function pgQuery<T = any>(sql: string, params?: any[]) {
  // If PG is unreachable/misconfigured, fail fast so chat doesn't hang.
  const p = db().query(sql as any, params as any)
  const timeout = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error(`pg_timeout_${PG_QUERY_TIMEOUT_MS}ms`)), PG_QUERY_TIMEOUT_MS),
  )
  return (await Promise.race([p, timeout])) as T
}

// TENANTS
export async function listTenants(): Promise<Tenant[]> {
  if (!isPostgresEnabled()) return (readJsonFile(TENANTS_FILE, []) as any[]).map((t) => ({ ...t }))
  const res = await pgQuery(
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
  const res = await pgQuery(
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
  const res = await pgQuery(
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
  const res = await pgQuery(
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
  const res = await pgQuery(
    `SELECT COALESCE(data, jsonb_build_object(
        'id', id,
        'tenantId', tenant_id,
        'channel', channel,
        'externalId', external_id,
        'meta', meta
      )) as connection
     FROM channel_connections ORDER BY created_at DESC`,
  )
  return res.rows.map((r: any) => r.connection)
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
  const res = await pgQuery(
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
  const res = await pgQuery('SELECT tenant_id FROM channel_connections WHERE channel=$1 AND external_id=$2 LIMIT 1', [
    channel,
    externalId,
  ])
  return res.rows[0]?.tenant_id || null
}

// LEADS (kept minimal for now; we’ll switch API gradually)
export async function listLeads(): Promise<Lead[]> {
  if (!isPostgresEnabled()) return readJsonFile(LEADS_FILE, []) as any
  const res = await pgQuery('SELECT * FROM leads ORDER BY created_at DESC LIMIT 500')
  return res.rows.map((r: any) => ({
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
  const res = await pgQuery(
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

  const res = await pgQuery(
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
  const res = await pgQuery('DELETE FROM leads WHERE id=$1', [id])
  return (res.rowCount || 0) > 0
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
  const res = await pgQuery('DELETE FROM leads WHERE tenant_id=$1', [tid])
  return res.rowCount || 0
}

export async function deleteAllLeads() {
  if (!isPostgresEnabled()) {
    const all = readJsonFile(LEADS_FILE, []) as any[]
    const removed = all.length
    if (removed > 0) writeJsonFile(LEADS_FILE, [])
    return removed
  }
  const res = await pgQuery('DELETE FROM leads')
  return res.rowCount || 0
}

export async function deleteLeadsByIds(ids: number[]) {
  const list = Array.isArray(ids) ? ids.map((x) => Number(x)).filter((x) => Number.isFinite(x)) : []
  if (!list.length) return 0
  if (!isPostgresEnabled()) {
    const all = readJsonFile(LEADS_FILE, []) as any[]
    const set = new Set(list.map((x) => Number(x)))
    const next = all.filter((l) => !set.has(Number(l?.id)))
    const removed = all.length - next.length
    if (removed > 0) writeJsonFile(LEADS_FILE, next)
    return removed
  }
  const res = await pgQuery('DELETE FROM leads WHERE id = ANY($1::bigint[])', [list])
  return res.rowCount || 0
}

// PERSONAL ASSISTANT MEMORY (Admin)
// PERSONAL ASSISTANT MEMORY (Admin)
// NOTE: In Postgres these fields are TEXT, so we can safely extend types over time.
export type AssistantItemKind =
  | 'note'
  | 'task'
  | 'reminder'
  | 'project'
  | 'meeting'
  | 'decision'
  | 'blocker'
  | 'contact'
  | 'reference'
  | 'fact'
export type AssistantItemStatus = 'inbox' | 'open' | 'waiting' | 'done' | 'archived' | 'cancelled'

export type AssistantItem = {
  id: number
  tenantId: string
  kind: AssistantItemKind
  title?: string | null
  body?: string | null
  status: AssistantItemStatus
  priority?: number | null
  dueAt?: string | null
  remindAt?: string | null
  remindedAt?: string | null
  tags?: any[] | null
  meta?: any | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type AssistantMessage = {
  id: number
  tenantId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string | null
}

function normalizeAssistantKind(k: unknown): AssistantItemKind {
  const s = String(k || '').trim().toLowerCase()
  if (s === 'task') return 'task'
  if (s === 'reminder') return 'reminder'
  if (s === 'project') return 'project'
  if (s === 'meeting') return 'meeting'
  if (s === 'decision') return 'decision'
  if (s === 'blocker') return 'blocker'
  if (s === 'contact') return 'contact'
  if (s === 'reference') return 'reference'
  if (s === 'fact') return 'fact'
  return 'note'
}

function normalizeAssistantStatus(s: unknown): AssistantItemStatus {
  const v = String(s || '').trim().toLowerCase()
  if (v === 'inbox') return 'inbox'
  if (v === 'waiting') return 'waiting'
  if (v === 'done') return 'done'
  if (v === 'archived') return 'archived'
  if (v === 'cancelled' || v === 'canceled') return 'cancelled'
  return 'open'
}

function safeIsoOrNull(v: any) {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
  if (!s) return null
  const t = Date.parse(s)
  if (!Number.isFinite(t)) return null
  return new Date(t).toISOString()
}

export async function listAssistantItems(input: {
  tenantId: string
  kind?: AssistantItemKind | string | null
  status?: AssistantItemStatus | string | null
  q?: string | null
  limit?: number
}) {
  const tenantId = String(input.tenantId || '').trim().toLowerCase()
  if (!tenantId) throw new Error('tenantId is required')
  const kind = input.kind ? normalizeAssistantKind(input.kind) : null
  const status = input.status ? normalizeAssistantStatus(input.status) : null
  const q = typeof input.q === 'string' ? input.q.trim() : ''
  const limit = Math.max(1, Math.min(200, Number(input.limit || 60) || 60))

  if (!isPostgresEnabled()) {
    const all = readJsonFile(ASSISTANT_ITEMS_FILE, []) as any[]
    return (Array.isArray(all) ? all : [])
      .filter((x) => String(x?.tenantId || '').toLowerCase() === tenantId)
      .filter((x) => (kind ? normalizeAssistantKind(x?.kind) === kind : true))
      .filter((x) => (status ? normalizeAssistantStatus(x?.status) === status : true))
      .filter((x) => {
        if (!q) return true
        const hay = `${x?.title || ''}\n${x?.body || ''}`.toLowerCase()
        return hay.includes(q.toLowerCase())
      })
      .slice(0, limit)
  }

  const params: any[] = [tenantId]
  let where = 'tenant_id=$1'
  if (kind) {
    params.push(kind)
    where += ` AND kind=$${params.length}`
  }
  if (status) {
    params.push(status)
    where += ` AND status=$${params.length}`
  }
  if (q) {
    params.push(`%${q}%`)
    where += ` AND (COALESCE(title,'') ILIKE $${params.length} OR COALESCE(body,'') ILIKE $${params.length})`
  }
  params.push(limit)
  const res = await pgQuery(
    `SELECT
      id,
      tenant_id as "tenantId",
      kind,
      title,
      body,
      status,
      priority,
      due_at as "dueAt",
      remind_at as "remindAt",
      reminded_at as "remindedAt",
      tags,
      meta,
      created_at as "createdAt",
      updated_at as "updatedAt"
     FROM assistant_items
     WHERE ${where}
     ORDER BY COALESCE(remind_at, due_at, created_at) DESC
     LIMIT $${params.length}`,
    params,
  )
  return res.rows
}

export async function getAssistantItemsByIds(input: { tenantId: string; ids: number[] }) {
  const tenantId = String(input.tenantId || '').trim().toLowerCase()
  if (!tenantId) throw new Error('tenantId is required')
  const ids = Array.isArray(input.ids) ? input.ids.map((x) => Number(x)).filter((x) => Number.isFinite(x)) : []
  if (!ids.length) return []

  if (!isPostgresEnabled()) {
    const all = readJsonFile(ASSISTANT_ITEMS_FILE, []) as any[]
    const map = new Map<number, any>()
    for (const x of Array.isArray(all) ? all : []) {
      if (String(x?.tenantId || '').toLowerCase() !== tenantId) continue
      const id = Number(x?.id)
      if (!Number.isFinite(id)) continue
      map.set(id, x)
    }
    return ids.map((id) => map.get(id)).filter(Boolean)
  }

  const res = await pgQuery(
    `SELECT
      id,
      tenant_id as "tenantId",
      kind,
      title,
      body,
      status,
      priority,
      due_at as "dueAt",
      remind_at as "remindAt",
      reminded_at as "remindedAt",
      tags,
      meta,
      created_at as "createdAt",
      updated_at as "updatedAt"
     FROM assistant_items
     WHERE tenant_id=$1
       AND id = ANY($2::bigint[])`,
    [tenantId, ids],
  )
  const map = new Map<number, any>()
  for (const row of res.rows || []) map.set(Number(row?.id), row)
  return ids.map((id) => map.get(id)).filter(Boolean)
}

export async function createAssistantItem(input: Partial<AssistantItem> & { tenantId: string }) {
  const tenantId = String(input.tenantId || '').trim().toLowerCase()
  if (!tenantId) throw new Error('tenantId is required')
  const kind = normalizeAssistantKind(input.kind)
  const status = normalizeAssistantStatus(input.status)
  const title = typeof input.title === 'string' ? input.title.trim() : input.title == null ? null : String(input.title).trim()
  const body = typeof input.body === 'string' ? input.body.trim() : input.body == null ? null : String(input.body).trim()
  const priority = input.priority == null ? null : Number(input.priority)
  const dueAt = safeIsoOrNull(input.dueAt)
  const remindAt = safeIsoOrNull(input.remindAt)
  const tags = Array.isArray(input.tags) ? input.tags : null
  const meta = input.meta ?? null

  if (!isPostgresEnabled()) {
    const all = readJsonFile(ASSISTANT_ITEMS_FILE, []) as any[]
    const now = new Date().toISOString()
    const id = Date.now()
    const item: AssistantItem = {
      id,
      tenantId,
      kind,
      title,
      body,
      status,
      priority: Number.isFinite(priority as any) ? (priority as any) : null,
      dueAt,
      remindAt,
      remindedAt: null,
      tags,
      meta,
      createdAt: now,
      updatedAt: now,
    }
    all.unshift(item)
    writeJsonFile(ASSISTANT_ITEMS_FILE, all)
    return item
  }

  const res = await pgQuery(
    `INSERT INTO assistant_items (tenant_id, kind, title, body, status, priority, due_at, remind_at, tags, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb)
     RETURNING
      id,
      tenant_id as "tenantId",
      kind,
      title,
      body,
      status,
      priority,
      due_at as "dueAt",
      remind_at as "remindAt",
      reminded_at as "remindedAt",
      tags,
      meta,
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    [tenantId, kind, title, body, status, Number.isFinite(priority as any) ? priority : null, dueAt, remindAt, tags ? JSON.stringify(tags) : null, meta ? JSON.stringify(meta) : null],
  )
  return res.rows[0]
}

export async function updateAssistantItem(id: number, patch: Partial<AssistantItem>) {
  const itemId = Number(id)
  if (!Number.isFinite(itemId)) throw new Error('invalid_id')

  if (!isPostgresEnabled()) {
    const all = readJsonFile(ASSISTANT_ITEMS_FILE, []) as any[]
    const idx = all.findIndex((x) => Number(x?.id) === itemId)
    if (idx < 0) return null
    const now = new Date().toISOString()
    const cur = all[idx]
    const next = {
      ...cur,
      ...patch,
      kind: patch.kind ? normalizeAssistantKind(patch.kind) : cur.kind,
      status: patch.status ? normalizeAssistantStatus(patch.status) : cur.status,
      dueAt: patch.dueAt !== undefined ? safeIsoOrNull(patch.dueAt) : cur.dueAt,
      remindAt: patch.remindAt !== undefined ? safeIsoOrNull(patch.remindAt) : cur.remindAt,
      remindedAt: patch.remindedAt !== undefined ? safeIsoOrNull(patch.remindedAt) : cur.remindedAt,
      updatedAt: now,
    }
    all[idx] = next
    writeJsonFile(ASSISTANT_ITEMS_FILE, all)
    return next
  }

  // Minimal update: only fields we use right now.
  const fields: string[] = []
  const params: any[] = []
  const push = (sql: string, val: any) => {
    params.push(val)
    fields.push(`${sql}=$${params.length}`)
  }
  if (patch.kind) push('kind', normalizeAssistantKind(patch.kind))
  if (patch.title !== undefined) push('title', patch.title == null ? null : String(patch.title).trim())
  if (patch.body !== undefined) push('body', patch.body == null ? null : String(patch.body).trim())
  if (patch.status) push('status', normalizeAssistantStatus(patch.status))
  if (patch.priority !== undefined) push('priority', patch.priority == null ? null : Number(patch.priority))
  if (patch.dueAt !== undefined) push('due_at', safeIsoOrNull(patch.dueAt))
  if (patch.remindAt !== undefined) push('remind_at', safeIsoOrNull(patch.remindAt))
  if (patch.remindedAt !== undefined) push('reminded_at', safeIsoOrNull(patch.remindedAt))
  if (patch.tags !== undefined) push('tags', patch.tags == null ? null : JSON.stringify(patch.tags))
  if (patch.meta !== undefined) push('meta', patch.meta == null ? null : JSON.stringify(patch.meta))
  if (!fields.length) return null
  params.push(itemId)
  const res = await pgQuery(
    `UPDATE assistant_items SET ${fields.join(', ')}, updated_at=now()
     WHERE id=$${params.length}
     RETURNING
      id,
      tenant_id as "tenantId",
      kind,
      title,
      body,
      status,
      priority,
      due_at as "dueAt",
      remind_at as "remindAt",
      reminded_at as "remindedAt",
      tags,
      meta,
      created_at as "createdAt",
      updated_at as "updatedAt"`,
    params,
  )
  return res.rows?.[0] || null
}

export async function listDueAssistantReminders(input: { tenantId: string; dueWithinMs?: number; limit?: number }) {
  const tenantId = String(input.tenantId || '').trim().toLowerCase()
  if (!tenantId) throw new Error('tenantId is required')
  const dueWithinMs = Math.max(10_000, Math.min(7 * 24 * 60 * 60 * 1000, Number(input.dueWithinMs || 60_000) || 60_000))
  const limit = Math.max(1, Math.min(50, Number(input.limit || 20) || 20))

  if (!isPostgresEnabled()) {
    const all = readJsonFile(ASSISTANT_ITEMS_FILE, []) as any[]
    const now = Date.now()
    return (Array.isArray(all) ? all : [])
      .filter((x) => String(x?.tenantId || '').toLowerCase() === tenantId)
      .filter((x) => normalizeAssistantKind(x?.kind) === 'reminder')
      .filter((x) => normalizeAssistantStatus(x?.status) === 'open')
      .filter((x) => {
        const ra = Date.parse(String(x?.remindAt || ''))
        if (!Number.isFinite(ra)) return false
        if (ra > now + dueWithinMs) return false
        const rr = Date.parse(String(x?.remindedAt || ''))
        return !Number.isFinite(rr) || rr < ra
      })
      .slice(0, limit)
  }

  const res = await pgQuery(
    `SELECT
      id,
      tenant_id as "tenantId",
      kind,
      title,
      body,
      status,
      priority,
      due_at as "dueAt",
      remind_at as "remindAt",
      reminded_at as "remindedAt",
      tags,
      meta,
      created_at as "createdAt",
      updated_at as "updatedAt"
     FROM assistant_items
     WHERE tenant_id=$1
       AND kind='reminder'
       AND status='open'
       AND remind_at IS NOT NULL
       AND remind_at <= now() + ($2::int * interval '1 millisecond')
       AND (reminded_at IS NULL OR reminded_at < remind_at)
     ORDER BY remind_at ASC
     LIMIT $3`,
    [tenantId, dueWithinMs, limit],
  )
  return res.rows
}

export async function appendAssistantMessage(input: { tenantId: string; role: AssistantMessage['role']; content: string }) {
  const tenantId = String(input.tenantId || '').trim().toLowerCase()
  if (!tenantId) throw new Error('tenantId is required')
  const role = input.role
  const content = String(input.content || '').trim()
  if (!content) throw new Error('missing_content')

  if (!isPostgresEnabled()) {
    const all = readJsonFile(ASSISTANT_MESSAGES_FILE, []) as any[]
    const now = new Date().toISOString()
    const msg: AssistantMessage = { id: Date.now(), tenantId, role, content, createdAt: now }
    all.unshift(msg)
    writeJsonFile(ASSISTANT_MESSAGES_FILE, all)
    return msg
  }

  const res = await pgQuery(
    `INSERT INTO assistant_messages (tenant_id, role, content)
     VALUES ($1,$2,$3)
     RETURNING id, tenant_id as "tenantId", role, content, created_at as "createdAt"`,
    [tenantId, role, content],
  )
  return res.rows[0]
}

export async function listAssistantMessages(input: { tenantId: string; limit?: number }) {
  const tenantId = String(input.tenantId || '').trim().toLowerCase()
  if (!tenantId) throw new Error('tenantId is required')
  const limit = Math.max(1, Math.min(200, Number(input.limit || 60) || 60))

  if (!isPostgresEnabled()) {
    const all = readJsonFile(ASSISTANT_MESSAGES_FILE, []) as any[]
    return (Array.isArray(all) ? all : []).filter((x) => String(x?.tenantId || '').toLowerCase() === tenantId).slice(0, limit)
  }

  const res = await pgQuery(
    `SELECT id, tenant_id as "tenantId", role, content, created_at as "createdAt"
     FROM assistant_messages
     WHERE tenant_id=$1
     ORDER BY created_at DESC
     LIMIT $2`,
    [tenantId, limit],
  )
  return res.rows
}

// ASSISTANT STATE (persistent KV)
const ASSISTANT_STATE_FILE = path.join(process.cwd(), 'data', 'assistant-state.json')

export async function getAssistantState(tenantId: string, key: string) {
  const tid = String(tenantId || '').trim().toLowerCase()
  const k = String(key || '').trim()
  if (!tid || !k) return null

  if (!isPostgresEnabled()) {
    const all = readJsonFile(ASSISTANT_STATE_FILE, []) as any[]
    const row = (Array.isArray(all) ? all : []).find((x) => String(x?.tenantId || '').toLowerCase() === tid && String(x?.key || '') === k)
    return row?.value ?? null
  }

  const res = await pgQuery('SELECT value FROM assistant_state WHERE tenant_id=$1 AND key=$2 LIMIT 1', [tid, k])
  return res.rows?.[0]?.value ?? null
}

export async function setAssistantState(tenantId: string, key: string, value: any) {
  const tid = String(tenantId || '').trim().toLowerCase()
  const k = String(key || '').trim()
  if (!tid || !k) return null

  if (!isPostgresEnabled()) {
    const all = readJsonFile(ASSISTANT_STATE_FILE, []) as any[]
    const idx = (Array.isArray(all) ? all : []).findIndex(
      (x) => String(x?.tenantId || '').toLowerCase() === tid && String(x?.key || '') === k,
    )
    const row = { tenantId: tid, key: k, value, updatedAt: new Date().toISOString() }
    if (idx >= 0) all[idx] = row
    else all.unshift(row)
    writeJsonFile(ASSISTANT_STATE_FILE, all)
    return row
  }

  const res = await pgQuery(
    `INSERT INTO assistant_state (tenant_id, key, value)
     VALUES ($1,$2,$3::jsonb)
     ON CONFLICT (tenant_id, key) DO UPDATE SET
      value=EXCLUDED.value,
      updated_at=now()
     RETURNING tenant_id as "tenantId", key, value, updated_at as "updatedAt"`,
    [tid, k, value == null ? null : JSON.stringify(value)],
  )
  return res.rows?.[0] || null
}

