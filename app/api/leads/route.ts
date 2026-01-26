import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const LEADS_FILE = path.join(process.cwd(), 'data', 'leads.json')

type LeadPayload = {
  name?: string
  contact?: string
  email?: string
  businessType?: string
  channel?: string
  pain?: string
  question?: string
  clientMessages?: string[] // only client messages/questions; no AI answers
  aiRecommendation?: string
  aiSummary?: string
  source?: string
  lang?: string
  notes?: string
  phone?: string // for backward compatibility
}

function getOpenAiKey() {
  const k = process.env.OPENAI_API_KEY
  return typeof k === 'string' && k.trim() ? k.trim() : null
}

async function generateTruthfulSummary(input: {
  lang?: string | null
  source?: string | null
  contact?: string | null
  businessType?: string | null
  channel?: string | null
  pain?: string | null
  question?: string | null
  clientMessages?: string[] | null
}) {
  const apiKey = getOpenAiKey()
  if (!apiKey) return null

  const lang = (input.lang || 'ru').toLowerCase()
  const langLine =
    lang === 'ua' ? 'Пиши українською.' : lang === 'cz' ? 'Piš česky.' : 'Пиши по‑русски.'

  const payload = {
    source: input.source || null,
    contact: input.contact || null,
    business: input.businessType || null,
    channels: input.channel || null,
    pain: input.pain || null,
    question: input.question || null,
    clientMessages: Array.isArray(input.clientMessages) ? input.clientMessages.slice(0, 20) : null,
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content: [
              langLine,
              'Сделай короткое, ПРАВДИВОЕ резюме лида для CRM.',
              'Можно использовать только данные из JSON (ничего не выдумывать).',
              'Если данных нет — пиши “не уточнили”.',
              'Формат: 4–7 строк, каждая начинается с эмодзи:',
              '🏷 бизнес, 📡 каналы, 😤 боль, 💬 запрос/вопрос, 🧩 что хочет/следующий шаг',
              'Не используй markdown (#, **).',
            ].join(' '),
          },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      }),
    })
    if (!resp.ok) return null
    const json = await resp.json()
    const content = json?.choices?.[0]?.message?.content
    const s = typeof content === 'string' ? content.trim() : ''
    return s ? s.slice(0, 1200) : null
  } catch {
    return null
  }
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
  const source = safe(lead.source, 80)
  const lang = safe(lead.lang, 20)
  const summary = safe(lead.aiSummary, 900)
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
    `🧭 Джерело: ${source}${lang !== '—' ? ` (${lang})` : ''}`,
    '',
    `🏷 Бізнес: ${business}`,
    `📡 Канали: ${channels}`,
    '',
    `😤 ПРОБЛЕМА/БІЛЬ: ${problemLine}`,
    '',
    summary !== '—' ? `🧠 ПІДСУМОК:\n${summary}` : '',
    summary !== '—' ? '' : '',
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

  // Avoid loops/duplication: Telegram-originated leads are already notified by the Telegram bot.
  if (String(lead?.source || '').toLowerCase() === 'telegram') {
    return { attempted: false, ok: true }
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
    const { name, contact, email, businessType, channel, pain, question, clientMessages, aiRecommendation, aiSummary, source, lang, notes, phone } = body

    const resolvedContact = contact || phone
    if (!resolvedContact) {
      return NextResponse.json({ error: 'Contact is required' }, { status: 400 })
    }

    ensureDataDir()
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'))

    const summaryFromUser = typeof aiSummary === 'string' ? aiSummary.trim() : ''
    const shouldGenerate = !summaryFromUser || summaryFromUser.length < 40
    const generatedSummary = shouldGenerate
      ? await generateTruthfulSummary({
          lang: lang || null,
          source: source || 'flow',
          contact: resolvedContact,
          businessType: businessType || null,
          channel: channel || null,
          pain: pain || null,
          question: question || null,
          clientMessages: Array.isArray(clientMessages) ? clientMessages : null,
        })
      : null
    
    const newLead = {
      id: Date.now(),
      name: name || null,
      contact: resolvedContact,
      email: typeof email === 'string' && email.trim() ? email.trim() : null,
      businessType: businessType || null,
      channel: channel || null,
      pain: pain || null,
      question: question || null,
      clientMessages: Array.isArray(clientMessages) ? clientMessages : null,
      aiRecommendation: aiRecommendation || null,
      aiSummary: generatedSummary || summaryFromUser || null,
      source: source || 'flow',
      lang: lang || null,
      notes: notes || null,
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
