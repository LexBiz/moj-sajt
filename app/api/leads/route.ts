import { NextRequest, NextResponse } from 'next/server'
import { createLead, deleteAllLeads, deleteLeadById, deleteLeadsByIds, deleteLeadsByTenant, listLeads } from '@/app/lib/storage'
import { requireAdmin } from '@/app/lib/adminAuth'
const DEFAULT_TENANT_ID = 'temoweb'

function normalizeTenantId(input: unknown) {
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : ''
  if (!raw) return DEFAULT_TENANT_ID
  const safe = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return safe || DEFAULT_TENANT_ID
}

type LeadPayload = {
  tenantId?: string
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
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const modelLower = model.toLowerCase().trim()
    const messages = [
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
    ]

    const resp = await fetch(modelLower.startsWith('gpt-5') ? 'https://api.openai.com/v1/responses' : 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(
        modelLower.startsWith('gpt-5')
          ? { model, temperature: 0.2, input: messages.map((m) => ({ role: m.role, content: String(m.content || '') })), max_output_tokens: 220 }
          : { model, temperature: 0.2, messages, max_tokens: 220 },
      ),
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
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tenantId = normalizeTenantId(searchParams.get('tenantId'))

  const leadsArr = await listLeads()
  const leads = (Array.isArray(leadsArr) ? leadsArr : [])
    .map((l: any) => ({
      ...l,
      tenantId: l?.tenantId ? normalizeTenantId(l.tenantId) : l?.tenant_id ? normalizeTenantId(l.tenant_id) : DEFAULT_TENANT_ID,
      createdAt: l?.createdAt || l?.created_at || l?.createdAt || null,
    }))
    .filter((l: any) => {
      if (tenantId === DEFAULT_TENANT_ID) return l.tenantId === DEFAULT_TENANT_ID
      return l.tenantId === tenantId
    })
  
  return NextResponse.json(leads)
}

export async function DELETE(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const idRaw = searchParams.get('id')
  const idsRaw = searchParams.get('ids')
  // IMPORTANT: for DELETE we must NOT default tenantId to temoweb.
  // Only delete by tenant when tenantId was explicitly provided.
  const tenantIdRaw = searchParams.get('tenantId')
  const tenantId = tenantIdRaw != null ? normalizeTenantId(tenantIdRaw) : null
  const all = searchParams.get('all')

  if (idRaw) {
    const id = Number(idRaw)
    const ok = await deleteLeadById(id)
    return NextResponse.json({ success: ok })
  }
  if (idsRaw) {
    const ids = idsRaw
      .split(',')
      .map((x) => Number(String(x || '').trim()))
      .filter((n) => Number.isFinite(n))
    const removed = await deleteLeadsByIds(ids)
    return NextResponse.json({ success: true, removed })
  }
  if (all === 'true') {
    const removed = await deleteAllLeads()
    return NextResponse.json({ success: true, removed })
  }
  if (tenantId) {
    const removed = await deleteLeadsByTenant(tenantId)
    return NextResponse.json({ success: true, removed })
  }
  return NextResponse.json({ error: 'Specify id, tenantId, or all=true' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LeadPayload
    const { tenantId, name, contact, email, businessType, channel, pain, question, clientMessages, aiRecommendation, aiSummary, source, lang, notes, phone } = body

    const resolvedContact = contact || phone
    if (!resolvedContact) {
      return NextResponse.json({ error: 'Contact is required' }, { status: 400 })
    }

    const resolvedTenantId = normalizeTenantId(tenantId)

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
      tenantId: resolvedTenantId,
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
    const saved = await createLead(newLead)
    const telegram = await sendTelegram(saved)

    return NextResponse.json({ success: true, lead: saved, telegram })
  } catch (error) {
    console.error('Error saving lead:', error)
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
  }
}
