import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { requireAdmin } from '@/app/lib/adminAuth'
import { readJsonFile, writeJsonFile } from '@/app/lib/jsonStore'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export type ChannelType = 'instagram' | 'whatsapp' | 'telegram' | 'website' | 'messenger'

export type ChannelConnection = {
  id: string
  tenantId: string
  channel: ChannelType
  // external identifiers used to route incoming webhooks to tenant
  externalId: string | null
  // for WhatsApp: phone_number_id; for IG: recipient/igUserId; for TG: bot username/token hash; for website: widget key
  meta?: Record<string, any> | null
  status: 'draft' | 'connected' | 'disabled'
  createdAt: string
  updatedAt: string | null
  lastHealthAt: string | null
  lastError: string | null
  notes: string | null
}

const FILE = path.join(process.cwd(), 'data', 'channel-connections.json')

function normalizeId(input: unknown) {
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : ''
  if (!raw) return ''
  const safe = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return safe
}

function normalizeChannel(input: unknown): ChannelType | null {
  const s = String(input || '').trim().toLowerCase()
  if (s === 'instagram' || s === 'whatsapp' || s === 'telegram' || s === 'website' || s === 'messenger') return s
  return null
}

function readAll(): ChannelConnection[] {
  const list = readJsonFile<ChannelConnection[]>(FILE, [])
  return Array.isArray(list) ? list : []
}

function writeAll(list: ChannelConnection[]) {
  writeJsonFile(FILE, list)
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const tenantId = normalizeId(searchParams.get('tenantId'))
  const channel = normalizeChannel(searchParams.get('channel'))
  const all = readAll()
  const filtered = all.filter((c) => {
    if (tenantId && c.tenantId !== tenantId) return false
    if (channel && c.channel !== channel) return false
    return true
  })
  return NextResponse.json({ ok: true, connections: filtered }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as Partial<ChannelConnection> & {
    tenantId?: string
    channel?: string
    externalId?: string | null
  }

  const tenantId = normalizeId(body.tenantId)
  const channel = normalizeChannel(body.channel)
  if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  if (!channel) return NextResponse.json({ error: 'channel is required' }, { status: 400 })

  const now = new Date().toISOString()
  const all = readAll()

  const id =
    normalizeId(body.id) ||
    normalizeId(`${tenantId}-${channel}-${body.externalId || ''}`) ||
    `${tenantId}-${channel}-${String(Date.now()).slice(-6)}`

  const existing = all.find((c) => c.id === id) || null
  const next: ChannelConnection = {
    id,
    tenantId,
    channel,
    externalId: body.externalId == null ? (existing?.externalId ?? null) : String(body.externalId).trim() || null,
    meta: body.meta == null ? (existing?.meta ?? null) : body.meta,
    status: body.status === 'disabled' ? 'disabled' : body.status === 'connected' ? 'connected' : existing?.status || 'draft',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastHealthAt: existing?.lastHealthAt || null,
    lastError: existing?.lastError || null,
    notes: body.notes == null ? existing?.notes || null : String(body.notes).trim() || null,
  }

  const out = [next, ...all.filter((c) => c.id !== id)]
  writeAll(out)
  return NextResponse.json({ ok: true, connection: next }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}

