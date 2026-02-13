import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { appendAssistantMessage, createAssistantItem, getTenantProfile, listAssistantItems, updateAssistantItem } from '@/app/lib/storage'

function normalizeTenantId(input: unknown) {
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : ''
  if (!raw) return 'temoweb'
  const safe = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return safe || 'temoweb'
}

function normalizeModel(model: string) {
  return String(model || '').trim().replace(/[‐‑‒–—−]/g, '-')
}

function safeTextFromChatCompletion(json: any) {
  const cc = json?.choices?.[0]?.message?.content
  const content =
    typeof json?.output_text === 'string'
      ? json.output_text
      : typeof cc === 'string'
        ? cc
        : Array.isArray(cc)
          ? cc
              .map((p: any) =>
                typeof p === 'string' ? p : typeof p?.text === 'string' ? p.text : typeof p?.text?.value === 'string' ? p.text.value : '',
              )
              .filter(Boolean)
              .join('')
          : null
  return typeof content === 'string' ? content : ''
}

type AssistantAction =
  | { type: 'save_note'; title?: string | null; body?: string | null; tags?: string[]; priority?: number | null }
  | { type: 'create_task'; title: string; body?: string | null; dueAt?: string | null; priority?: number | null; tags?: string[] }
  | { type: 'create_reminder'; title: string; body?: string | null; remindAt: string | null; tags?: string[] }
  | { type: 'complete_item'; id: number | string }
  | { type: 'reschedule_reminder'; id: number | string; remindAt: string | null }

function tryParseJsonObject(text: string) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end < 0 || end <= start) return null
  const slice = raw.slice(start, end + 1)
  try {
    return JSON.parse(slice)
  } catch {
    return null
  }
}

function clip(text: string, max = 1200) {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function pickQueryTerms(message: string) {
  const t = String(message || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, ' ')
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
  const stop = new Set(['и', 'а', 'но', 'что', 'это', 'как', 'я', 'мы', 'ты', 'вы', 'на', 'в', 'по', 'для', 'до', 'из', 'за', 'у'])
  const words = t.filter((w) => w.length >= 4 && !stop.has(w)).slice(0, 8)
  return words.join(' ')
}

function localNowString(timeZone: string) {
  const tz = String(timeZone || '').trim() || 'UTC'
  try {
    const dtf = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    const parts = dtf.formatToParts(new Date())
    const get = (t: string) => parts.find((p) => p.type === t)?.value || ''
    const y = get('year')
    const m = get('month')
    const d = get('day')
    const hh = get('hour')
    const mm = get('minute')
    const ss = get('second')
    return `${y}-${m}-${d} ${hh}:${mm}:${ss} (${tz})`
  } catch {
    return `${new Date().toISOString()} (UTC)`
  }
}

function looksMemoryWorthy(text: string) {
  const t = String(text || '').trim()
  if (!t) return false
  // Explicit intent words
  if (/(запомни|зафиксир|фиксируй|сохрани|заметка|идея|план|дедлайн|срок|важно|срочно|напомни|встреч|созвон|позвонить)/i.test(t)) {
    return true
  }
  // Dates/times patterns
  if (/\b\d{1,2}[:.]\d{2}\b/.test(t)) return true
  if (/\b\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?\b/.test(t)) return true
  if (/(сегодня|завтра|послезавтра|в\s+понедельник|во\s+вторник|в\s+среду|в\s+четверг|в\s+пятниц|в\s+суббот|в\s+воскрес)/i.test(t)) return true
  return false
}

async function transcribeAudio(params: { apiKey: string; buf: Buffer; mime?: string | null }) {
  const key = String(params.apiKey || '').trim()
  if (!key) return null
  const buf = params.buf
  if (!buf || buf.length === 0) return null
  const model = String(process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1').trim()
  const timeoutMs = Math.max(3000, Math.min(25_000, Number(process.env.OPENAI_TRANSCRIBE_TIMEOUT_MS || 12_000) || 12_000))
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const form = new FormData()
    form.append('model', model)
    const mime = params.mime && params.mime.includes('/') ? params.mime : 'audio/mpeg'
    form.append('file', new Blob([new Uint8Array(buf)], { type: mime }), 'audio.mp3')
    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: ac.signal,
    })
    if (!resp.ok) return null
    const json = (await resp.json().catch(() => ({}))) as any
    const text = typeof json?.text === 'string' ? json.text.trim() : ''
    return text || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function callOpenAi(params: { apiKey: string; model: string; messages: any[]; max: number; temperature?: number }) {
  const model = normalizeModel(params.model)
  const modelLower = model.toLowerCase()
  const isGpt5 = modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')
  const maxKey = isGpt5 ? 'max_completion_tokens' : 'max_tokens'
  const body: any = { model, messages: params.messages }
  if (!isGpt5 && typeof params.temperature === 'number') body.temperature = params.temperature
  body[maxKey] = params.max

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${params.apiKey}` },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    throw new Error(`openai_http_${resp.status}:${t.slice(0, 200)}`)
  }
  return (await resp.json().catch(() => ({}))) as any
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = String(process.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) return NextResponse.json({ error: 'missing_openai_key' }, { status: 500 })

  const contentType = String(request.headers.get('content-type') || '').toLowerCase()
  let tenantId = 'temoweb'
  let message = ''
  let isVoice = false

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null)
    const tid = form ? normalizeTenantId(form.get('tenantId')) : 'temoweb'
    tenantId = tid
    const audio = form ? (form.get('audio') as any) : null
    if (audio && typeof audio?.arrayBuffer === 'function') {
      const buf = Buffer.from(await audio.arrayBuffer())
      const mime = typeof audio?.type === 'string' ? audio.type : null
      const transcript = await transcribeAudio({ apiKey, buf, mime })
      message = transcript ? `[Voice]: ${transcript}` : '[Voice message]'
      isVoice = true
    }
  } else {
    const body = (await request.json().catch(() => ({}))) as any
    tenantId = normalizeTenantId(body?.tenantId)
    message = String(body?.message || '').trim()
  }
  if (!message) return NextResponse.json({ error: 'missing_message' }, { status: 400 })

  // Persist user's message.
  await appendAssistantMessage({ tenantId, role: 'user', content: message })

  // Retrieval: pull a few relevant memory items by simple keyword match.
  const q = pickQueryTerms(message)
  const relevant = await listAssistantItems({ tenantId, q, limit: 10 }).catch(() => [])
  const relevantText = Array.isArray(relevant)
    ? relevant
        .slice(0, 10)
        .map((x: any) => {
          const id = x?.id != null ? String(x.id) : ''
          const k = String(x?.kind || '')
          const st = String(x?.status || '')
          const title = String(x?.title || '').trim()
          const b = String(x?.body || '').trim()
          const due = x?.dueAt || x?.remindAt || null
          return `- #${id} [${k}/${st}] ${title || '(без назви)'}${due ? ` (${due})` : ''}\n  ${clip(b, 240)}`
        })
        .join('\n')
    : ''

  const chatModel = normalizeModel(
    String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_CHAT || process.env.OPENAI_MODEL_ADMIN_ASSISTANT || process.env.OPENAI_MODEL_ASSISTANT || process.env.OPENAI_MODEL || 'gpt-4o'),
  )
  const extractorModel = normalizeModel(String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_EXTRACTOR || 'gpt-4o-mini'))
  const fallbackModel = normalizeModel(String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_FALLBACK || 'gpt-4o-mini'))

  const nowIso = new Date().toISOString()
  const today = nowIso.slice(0, 10)
  const profile = await getTenantProfile(tenantId).catch(() => null)
  const tz =
    profile && typeof (profile as any)?.timezone === 'string' && String((profile as any).timezone).trim()
      ? String((profile as any).timezone).trim()
      : 'Europe/Prague'
  // 1) Generate a high-quality reply (no JSON constraints).
  const replySystem = [
    'Ты — личный executive-assistant владельца TemoWeb.',
    'Общайся как живой профессиональный помощник: коротко, по делу, уверенно.',
    'Твоя задача: помочь принять решение, предложить следующий шаг, и при необходимости уточнить 1 вопрос.',
    'НЕ пиши канцелярит. НЕ пиши шаблоны вроде “Если есть вопросы”.',
    '',
    `Now UTC: ${nowIso}`,
    `Timezone: ${tz}`,
    `Local time: ${localNowString(tz)}`,
    'Относительные даты интерпретируй по Local time.',
    '',
    'Память (релевантное):',
    relevantText || '(пока пусто)',
  ].join('\n')
  const replyMessages = [{ role: 'system', content: replySystem }, { role: 'user', content: message }]

  let assistantReply = ''
  let usedReplyModel = chatModel
  try {
    const json = await callOpenAi({ apiKey, model: chatModel, messages: replyMessages, max: 700, temperature: 0.5 })
    assistantReply = safeTextFromChatCompletion(json).trim()
  } catch {
    usedReplyModel = fallbackModel
    try {
      const json = await callOpenAi({ apiKey, model: fallbackModel, messages: replyMessages, max: 700, temperature: 0.5 })
      assistantReply = safeTextFromChatCompletion(json).trim()
    } catch {
      assistantReply = ''
    }
  }

  // 2) Extract structured actions with a stable model (strict JSON).
  const extractSystem = [
    'Return ONLY JSON. No markdown, no extra text.',
    '{ "actions": [ ... ] }',
    'Allowed actions:',
    '- save_note: {type:"save_note", title?, body?, tags?, priority?}',
    '- create_task: {type:"create_task", title, body?, dueAt?, priority?, tags?}',
    '- create_reminder: {type:"create_reminder", title, body?, remindAt, tags?}',
    '- complete_item: {type:"complete_item", id}',
    '- reschedule_reminder: {type:"reschedule_reminder", id, remindAt}',
    'Dates: ISO-8601 or null.',
    '',
    `Now UTC: ${nowIso}`,
    `Timezone: ${tz}`,
    `Local time: ${localNowString(tz)}`,
    '',
    'Memory (relevant):',
    relevantText || '(empty)',
  ].join('\n')
  const extractPayload = { userMessage: message, assistantReply: assistantReply || null, isVoice }
  const extractMessages = [{ role: 'system', content: extractSystem }, { role: 'user', content: JSON.stringify(extractPayload) }]

  let actionsRaw: any[] = []
  try {
    const json = await callOpenAi({ apiKey, model: extractorModel, messages: extractMessages, max: 520, temperature: 0.2 })
    const text = safeTextFromChatCompletion(json).trim()
    const parsed = tryParseJsonObject(text) as any
    actionsRaw = Array.isArray(parsed?.actions) ? parsed.actions : []
  } catch {
    actionsRaw = []
  }

  const created: any[] = []
  // Keep the "not lose anything" guarantee via assistant_messages log.
  // Only create extracted items when the message is memory-worthy or the model returned actions.
  const shouldCreateDefaultNote = !actionsRaw.length && looksMemoryWorthy(message)
  if (shouldCreateDefaultNote) {
    const item = await createAssistantItem({
      tenantId,
      kind: 'note',
      title: message.length <= 80 ? message : null,
      body: message,
      status: 'inbox',
      meta: { source: 'assistant_chat_default_note', model: usedReplyModel },
    }).catch(() => null)
    if (item) created.push(item)
  }
  for (const a of actionsRaw) {
    const t = String(a?.type || '').trim()
    if (t === 'save_note') {
      const item = await createAssistantItem({
        tenantId,
        kind: 'note',
        title: a?.title || null,
        body: a?.body || message,
        status: 'inbox',
        priority: a?.priority ?? null,
        tags: Array.isArray(a?.tags) ? a.tags : null,
        meta: { source: 'assistant_chat', model: usedReplyModel, action: 'save_note' },
      }).catch(() => null)
      if (item) created.push(item)
    }
    if (t === 'create_task') {
      const title = String(a?.title || '').trim()
      if (!title) continue
      const item = await createAssistantItem({
        tenantId,
        kind: 'task',
        title,
        body: a?.body || null,
        status: 'open',
        priority: a?.priority ?? null,
        dueAt: a?.dueAt || null,
        tags: Array.isArray(a?.tags) ? a.tags : null,
        meta: { source: 'assistant_chat', model: usedReplyModel, action: 'create_task' },
      }).catch(() => null)
      if (item) created.push(item)
    }
    if (t === 'create_reminder') {
      const title = String(a?.title || '').trim()
      if (!title) continue
      const item = await createAssistantItem({
        tenantId,
        kind: 'reminder',
        title,
        body: a?.body || null,
        status: 'open',
        remindAt: a?.remindAt || null,
        tags: Array.isArray(a?.tags) ? a.tags : null,
        meta: { source: 'assistant_chat', model: usedReplyModel, action: 'create_reminder' },
      }).catch(() => null)
      if (item) created.push(item)
    }
    if (t === 'complete_item') {
      const id = Number(a?.id)
      if (!Number.isFinite(id)) continue
      const item = await updateAssistantItem(id, { status: 'done' }).catch(() => null)
      if (item) created.push(item)
    }
    if (t === 'reschedule_reminder') {
      const id = Number(a?.id)
      if (!Number.isFinite(id)) continue
      const item = await updateAssistantItem(id, { remindAt: a?.remindAt || null, status: 'open' }).catch(() => null)
      if (item) created.push(item)
    }
  }

  const finalReply =
    assistantReply ||
    `Принял. Если коротко: что сейчас важнее — зафиксировать план на сегодня или поставить напоминание/дедлайн?`
  await appendAssistantMessage({ tenantId, role: 'assistant', content: finalReply })

  return NextResponse.json({
    ok: true,
    tenantId,
    model: usedReplyModel,
    reply: finalReply,
    created,
  })
}

