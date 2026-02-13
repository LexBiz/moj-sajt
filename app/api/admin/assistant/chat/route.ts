import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import { appendAssistantMessage, createAssistantItem, listAssistantItems, updateAssistantItem } from '@/app/lib/storage'

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

  const body = (await request.json().catch(() => ({}))) as any
  const tenantId = normalizeTenantId(body?.tenantId)
  const message = String(body?.message || '').trim()
  if (!message) return NextResponse.json({ error: 'missing_message' }, { status: 400 })

  const apiKey = String(process.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) return NextResponse.json({ error: 'missing_openai_key' }, { status: 500 })

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

  const model =
    normalizeModel(String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT || process.env.OPENAI_MODEL_ASSISTANT || ''))
  const fallbackModel = normalizeModel(String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_FALLBACK || 'gpt-4o-mini'))
  const explicitModel = model
  let usedPrimaryModel = explicitModel || normalizeModel(String(process.env.OPENAI_MODEL || 'gpt-4o'))
  // Stability: if no explicit assistant model was configured and OPENAI_MODEL is gpt-5, use gpt-4o by default.
  if (!explicitModel) {
    const ml = usedPrimaryModel.toLowerCase()
    if (ml.startsWith('gpt-5') || ml.startsWith('gpt5')) usedPrimaryModel = 'gpt-4o'
  }

  const nowIso = new Date().toISOString()
  const today = nowIso.slice(0, 10)
  const system = [
    'Ты — личный executive-assistant владельца TemoWeb внутри CRM.',
    'Цель: удерживать контекст на месяцы/годы, превращать хаос в план, ничего важного не терять.',
    'Всегда действуй как профессиональный менеджер: кратко, по делу, с конкретным следующим шагом.',
    'Ты можешь сохранять: заметки, задачи, напоминания (время), факты, проекты.',
    'Если времени/даты нет — уточни 1 вопрос, но всё равно сохрани как черновик/заметку.',
    '',
    `СЕГОДНЯ/СЕЙЧАС (UTC): ${nowIso}`,
    `Сегодня (YYYY-MM-DD): ${today}`,
    'Относительные даты ("сегодня/завтра/в понедельник") интерпретируй, опираясь на это время.',
    '',
    'ОБЯЗАТЕЛЬНЫЙ ФОРМАТ ВЫХОДА: верни ТОЛЬКО JSON без markdown и без пояснений вокруг.',
    'JSON-форма:',
    '{ "reply": string, "actions": [ ... ] }',
    'actions возможны:',
    '- save_note: {type:"save_note", title?, body?, tags?, priority?}',
    '- create_task: {type:"create_task", title, body?, dueAt?, priority?, tags?}',
    '- create_reminder: {type:"create_reminder", title, body?, remindAt, tags?}',
    '- complete_item: {type:"complete_item", id}',
    '- reschedule_reminder: {type:"reschedule_reminder", id, remindAt}',
    'Даты: используй ISO-8601 (например "2026-02-13T16:00:00Z"). Если не уверен — ставь null.',
    '',
    'Память (релевантное):',
    relevantText || '(пока пусто)',
  ].join('\n')

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: message },
  ]

  let outText = ''
  let usedModel = usedPrimaryModel
  try {
    const json = await callOpenAi({ apiKey, model: usedPrimaryModel, messages, max: 520, temperature: 0.4 })
    outText = safeTextFromChatCompletion(json).trim()
  } catch (e) {
    usedModel = fallbackModel
    try {
      const json = await callOpenAi({ apiKey, model: fallbackModel, messages, max: 520, temperature: 0.4 })
      outText = safeTextFromChatCompletion(json).trim()
    } catch (e2) {
      const msg = String((e2 as any)?.message || e2)
      return NextResponse.json({ error: 'assistant_openai_failed', detail: msg.slice(0, 300) }, { status: 502 })
    }
  }

  const parsed = tryParseJsonObject(outText) as any
  const reply = typeof parsed?.reply === 'string' ? parsed.reply.trim() : ''
  const actionsRaw = Array.isArray(parsed?.actions) ? parsed.actions : []

  const created: any[] = []
  // Hard guarantee: ALWAYS store the user's message in long-term memory (even if the model didn't emit actions).
  if (!actionsRaw.length) {
    const item = await createAssistantItem({
      tenantId,
      kind: 'note',
      title: message.length <= 80 ? message : null,
      body: message,
      status: 'open',
      meta: { source: 'assistant_chat_default_note', model: usedModel },
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
        status: 'open',
        priority: a?.priority ?? null,
        tags: Array.isArray(a?.tags) ? a.tags : null,
        meta: { source: 'assistant_chat', model: usedModel, action: 'save_note' },
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
        meta: { source: 'assistant_chat', model: usedModel, action: 'create_task' },
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
        meta: { source: 'assistant_chat', model: usedModel, action: 'create_reminder' },
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

  const finalReply = reply || `Принял. Я сохранил это в память и разложу по шагам. Что из этого самое срочное на сегодня?`
  await appendAssistantMessage({ tenantId, role: 'assistant', content: finalReply })

  return NextResponse.json({
    ok: true,
    tenantId,
    model: usedModel,
    reply: finalReply,
    created,
  })
}

