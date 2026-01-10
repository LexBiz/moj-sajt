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
  return [
    '📥 Нова заявка на систему',
    `Бізнес: ${lead.businessType || '—'}`,
    `Канали: ${lead.channel || '—'}`,
    `Біль: ${lead.pain || '—'}`,
    `Питання: ${lead.question || '—'}`,
    `AI-відповідь: ${lead.aiRecommendation || '—'}`,
    `AI-висновок: ${lead.aiSummary || '—'}`,
    `Імʼя: ${lead.name || '—'}`,
    `Контакт: ${lead.contact || lead.phone || '—'}`,
    `Час: ${lead.createdAt}`,
  ].join('\n')
}

async function sendTelegram(lead: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const text = formatTelegramMessage(lead)

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
  } catch (error) {
    console.error('Telegram send error', error)
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
    const { name, contact, businessType, channel, pain, question, aiRecommendation, aiSummary, phone } = body

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
      aiRecommendation: aiRecommendation || null,
      aiSummary: aiSummary || null,
      createdAt: new Date().toISOString(),
      status: 'new',
    }

    leads.unshift(newLead)
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2))

    sendTelegram(newLead).catch(() => null)

    return NextResponse.json({ success: true, lead: newLead })
  } catch (error) {
    console.error('Error saving lead:', error)
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
  }
}
