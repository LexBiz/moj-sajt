import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const LEADS_FILE = path.join(process.cwd(), 'data', 'leads.json')

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, JSON.stringify([]))
}

type TelegramLeadPayload = {
  contact: string
  name?: string | null
  businessType?: string | null
  channel?: string | null
  pain?: string | null
  question?: string | null
  clientMessages?: string[] | null
  aiSummary?: string | null
  lang?: string | null
  telegramChatId?: string | null
  telegramUsername?: string | null
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-leads-secret') || ''
  const expected = process.env.TELEGRAM_LEADS_INGEST_SECRET || ''
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as TelegramLeadPayload
    if (!body?.contact) return NextResponse.json({ error: 'Contact is required' }, { status: 400 })

    ensureDataDir()
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'))

    const newLead = {
      id: Date.now(),
      name: body.name || null,
      contact: String(body.contact).trim(),
      businessType: body.businessType || null,
      channel: body.channel || null,
      pain: body.pain || null,
      question: body.question || null,
      clientMessages: Array.isArray(body.clientMessages) ? body.clientMessages.slice(0, 30) : null,
      aiRecommendation: null,
      aiSummary: body.aiSummary || null,
      source: 'telegram',
      lang: body.lang || null,
      notes: null,
      telegramChatId: body.telegramChatId || null,
      telegramUsername: body.telegramUsername || null,
      createdAt: new Date().toISOString(),
      status: 'new',
    }

    leads.unshift(newLead)
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2))

    return NextResponse.json({ success: true, lead: newLead })
  } catch (e) {
    console.error('Telegram lead ingest error:', e)
    return NextResponse.json({ error: 'Failed to ingest lead' }, { status: 500 })
  }
}


