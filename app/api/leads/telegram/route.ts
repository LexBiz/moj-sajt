import { NextRequest, NextResponse } from 'next/server'
import { createLead } from '@/app/lib/storage'
const DEFAULT_TENANT_ID = 'temoweb'

function normalizeTenantId(input: unknown) {
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : ''
  if (!raw) return DEFAULT_TENANT_ID
  const safe = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return safe || DEFAULT_TENANT_ID
}

type TelegramLeadPayload = {
  tenantId?: string | null
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

function getOpenAiKey() {
  const k = process.env.OPENAI_API_KEY
  return typeof k === 'string' && k.trim() ? k.trim() : null
}

async function generateTruthfulSummary(input: {
  lang?: string | null
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
    source: 'telegram',
    contact: input.contact || null,
    business: input.businessType || null,
    channels: input.channel || null,
    pain: input.pain || null,
    question: input.question || null,
    clientMessages: Array.isArray(input.clientMessages) ? input.clientMessages.slice(0, 20) : null,
  }

  try {
    const modelRaw = String(process.env.OPENAI_MODEL || 'gpt-4o-mini')
    const model = modelRaw.trim().replace(/[‐‑‒–—−]/g, '-')
    const modelLower = model.toLowerCase()
    const messages = [
      {
        role: 'system',
        content: [
          langLine,
          'Сделай короткое, ПРАВДИВОЕ резюме лида для CRM.',
          'Можно использовать только данные из JSON (ничего не выдумывать).',
          'Если данных нет — пиши “не уточнили”.',
          'Формат: 4–7 строк, каждая начинается с эмодзи: 🏷 📡 😤 💬 🧩',
          'Не используй markdown (#, **).',
        ].join(' '),
      },
      { role: 'user', content: JSON.stringify(payload) },
    ]

    const isGpt5 = modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')
    const maxKey = isGpt5 ? 'max_completion_tokens' : 'max_tokens'
    const body: any = { model, messages }
    if (!isGpt5) body.temperature = 0.2
    body[maxKey] = 220

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
    if (!resp.ok) return null
    const json = await resp.json()
    const content =
      typeof json?.output_text === 'string'
        ? json.output_text
        : typeof json?.choices?.[0]?.message?.content === 'string'
          ? json.choices[0].message.content
          : null
    const s = typeof content === 'string' ? content.trim() : ''
    return s ? s.slice(0, 1200) : null
  } catch {
    return null
  }
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

    const summaryFromUser = typeof body.aiSummary === 'string' ? body.aiSummary.trim() : ''
    const shouldGenerate = !summaryFromUser || summaryFromUser.length < 40
    const generatedSummary = shouldGenerate
      ? await generateTruthfulSummary({
          lang: body.lang || null,
          contact: String(body.contact).trim(),
          businessType: body.businessType || null,
          channel: body.channel || null,
          pain: body.pain || null,
          question: body.question || null,
          clientMessages: Array.isArray(body.clientMessages) ? body.clientMessages : null,
        })
      : null

    const newLead = {
      id: Date.now(),
      tenantId: normalizeTenantId(body.tenantId),
      name: body.name || null,
      contact: String(body.contact).trim(),
      businessType: body.businessType || null,
      channel: body.channel || null,
      pain: body.pain || null,
      question: body.question || null,
      clientMessages: Array.isArray(body.clientMessages) ? body.clientMessages.slice(0, 30) : null,
      aiRecommendation: null,
      aiSummary: generatedSummary || summaryFromUser || null,
      source: 'telegram',
      lang: body.lang || null,
      notes: null,
      telegramChatId: body.telegramChatId || null,
      telegramUsername: body.telegramUsername || null,
      createdAt: new Date().toISOString(),
      status: 'new',
    }
    const saved = await createLead(newLead)

    return NextResponse.json({ success: true, lead: saved })
  } catch (e) {
    console.error('Telegram lead ingest error:', e)
    return NextResponse.json({ error: 'Failed to ingest lead' }, { status: 500 })
  }
}


