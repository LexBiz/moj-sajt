import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const LEADS_FILE = path.join(process.cwd(), 'data', 'leads.json')

type LeadPayload = {
  name?: string
  contact?: string
  businessType?: string
  channel?: string
  pain?: string
  question?: string
  clientMessages?: string[] // only client messages/questions; no AI answers
  aiRecommendation?: string
  aiSummary?: string
  phone?: string // for backward compatibility
}

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([]))
  }
}

function formatTelegramMessage(lead: any) {
  const safe = (v: any, max = 900) => {
    const s = (typeof v === 'string' ? v : v == null ? '' : String(v)).trim()
    if (!s) return '—'
    return s.length > max ? `${s.slice(0, max - 1)}…` : s
  }

  const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text)

  const business = safe(lead.businessType, 160)
  const channels = safe(lead.channel, 220)
  const pain = safe(lead.pain, 420)
  const question = safe(lead.question, 420)
  const name = safe(lead.name, 140)
  const contact = safe(lead.contact || lead.phone, 220)
  const rawClientMessages: unknown = lead.clientMessages
  const clientMessages = (Array.isArray(rawClientMessages) ? rawClientMessages : [])
    .map((x) => (typeof x === 'string' ? x.trim() : String(x ?? '').trim()))
    .filter(Boolean)
    .slice(0, 8)
    .map((m) => clip(m, 240))

  const problemLine = pain !== '—' ? pain : 'Клієнти пишуть — відповідь “вручну” з’їдає час.'

  const parts = [
    '📥 НОВА ЗАЯВКА НА СИСТЕМУ',
    '',
    `👤 Імʼя: ${name}`,
    `📩 Контакт: ${contact}`,
    '',
    `🏷 Бізнес: ${business}`,
    `📡 Канали: ${channels}`,
    '',
    `😤 ПРОБЛЕМА/БІЛЬ: ${problemLine}`,
    '',
    clientMessages.length
      ? ['🗣 ПОВІДОМЛЕННЯ КЛІЄНТА:', ...clientMessages.map((m) => `— ${m}`)].join('\n')
      : `🗣 ПОВІДОМЛЕННЯ КЛІЄНТА: ${question}`,
    '',
    `🕒 Час: ${lead.createdAt}`,
  ]

  // Telegram hard limit is 4096 chars; keep safe margin.
  let out = parts.join('\n')
  if (out.length > 3800) {
    // First: shorten client message block
    const shortMsgs = clientMessages.slice(0, 5).map((m) => clip(m, 160))
    const msgBlock = shortMsgs.length
      ? ['🗣 ПОВІДОМЛЕННЯ КЛІЄНТА:', ...shortMsgs.map((m) => `— ${m}`)].join('\n')
      : `🗣 ПОВІДОМЛЕННЯ КЛІЄНТА: ${clip(question, 220)}`
    const mIdx = parts.findIndex((x) => x.startsWith('🗣'))
    if (mIdx >= 0) parts[mIdx] = msgBlock
    out = parts.join('\n')
  }
  if (out.length > 3800) {
    // last resort: clip pain
    const trimmedPain = clip(problemLine, 220)
    const pIdx = parts.findIndex((x) => x.startsWith('😤'))
    if (pIdx >= 0) parts[pIdx] = `😤 ПРОБЛЕМА/БІЛЬ: ${trimmedPain}`
    out = parts.join('\n')
  }

  return out.trim()
}

async function sendTelegram(lead: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('Telegram is not configured: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID')
    return { attempted: false, ok: false }
  }

  const text = formatTelegramMessage(lead)

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      console.error('Telegram send HTTP error', resp.status, body.slice(0, 500))
      return { attempted: true, ok: false }
    }
    return { attempted: true, ok: true }
  } catch (error) {
    console.error('Telegram send error', error)
    return { attempted: true, ok: false }
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const password = process.env.ADMIN_PASSWORD || 'admin123'

  if (authHeader !== `Bearer ${password}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  ensureDataDir()
  const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'))

  return NextResponse.json(leads)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LeadPayload
    const { name, contact, businessType, channel, pain, question, clientMessages, aiRecommendation, aiSummary, phone } = body

    const resolvedContact = contact || phone
    if (!resolvedContact) {
      return NextResponse.json({ error: 'Contact is required' }, { status: 400 })
    }

    ensureDataDir()
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'))

    const newLead = {
      id: Date.now(),
      name: name || null,
      contact: resolvedContact,
      businessType: businessType || null,
      channel: channel || null,
      pain: pain || null,
      question: question || null,
      clientMessages: Array.isArray(clientMessages) ? clientMessages : null,
      aiRecommendation: aiRecommendation || null,
      aiSummary: aiSummary || null,
      createdAt: new Date().toISOString(),
      status: 'new',
    }

    leads.unshift(newLead)
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2))

    const telegram = await sendTelegram(newLead)

    return NextResponse.json({ success: true, lead: newLead, telegram })
  } catch (error) {
    console.error('Error saving lead:', error)
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
  }
}
