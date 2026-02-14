import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/lib/adminAuth'
import {
  appendAssistantMessage,
  createAssistantItem,
  getAssistantState,
  getAssistantItemsByIds,
  getTenantProfile,
  listAssistantItems,
  listAssistantMessages,
  setAssistantState,
  updateAssistantItem,
} from '@/app/lib/storage'

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

type ExecPatch = {
  state?: { mode?: 'capture' | 'ask' | 'plan' | 'review'; overload_level?: number; focus_project_id?: string | null } | null
  ops?: Array<
    | { op: 'create_item'; item: any }
    | { op: 'update_item'; id: number; patch: any }
    | { op: 'close_item'; id: number }
    | { op: 'link_items'; from_id: number; to_id: number; relation: 'blocks' | 'depends_on' | 'related' }
  >
  today_board?: { top3_ids?: number[]; next_move?: { text?: string; duration_min?: number; related_ids?: number[] } } | null
  notes_for_system?: string | null
}

const TEMO_EXEC_ASSISTANT_PROMPT = `You are TEMO Executive Assistant inside a private CRM.

GOAL
Turn the user’s chaotic “brain dump” (often emotional, with slang and swearing) into a reliable operational system:
- capture everything without requiring the user to format
- convert raw input into: Projects, Tasks, Reminders, Meetings, Decisions, Blockers
- maintain a “Today Board” and “Next Moves”
- ask at most 2 clarifying questions, only when absolutely necessary
- keep the user in control: show what you created/changed, allow undo/edit quickly
- do not behave like an archive; behave like an operator/COO

CORE PRINCIPLES
1) Default to EXECUTIVE MODE:
   - First produce a compact Executive Summary (what was said + what changed).
   - Then propose a realistic next action.
   - Keep user-facing output short, structured, action-oriented.
2) The user’s tone can be chaotic; you remain calm, direct, and helpful.
3) Never demand the user to “fill fields”. You infer structure.
4) Don’t spam memory. Create/update structured items only when useful.
5) Every time you create/update/close/shift something, you must report it explicitly (IDs, dates).
6) If overloaded signals are present (stress, “я в ахуе”, “голова кипит”), reduce verbosity, reduce questions, focus on “Top 3 + Next move”.

INPUTS YOU WILL RECEIVE EACH TURN
- user_message (raw text, may include voice transcript)
- recent_chat (last N messages)
- pinned_memory (stable preferences, timezone, etc.)
- relevant_items (retrieved tasks/notes/reminders/projects that likely relate)
- today_context (date, weekday, timezone)

YOUR OUTPUT MUST BE TWO PARTS:
A) USER-FACING MESSAGE (natural language)
B) STRUCTURED JSON PATCH (machine-readable), following the schema below.
If you are not changing anything, output an empty patch with reason.

USER-FACING MESSAGE FORMAT (always):
1) “Окей, понял.” + 1 line summary in user’s language (Russian).
2) TODAY (max 3 bullets) — what matters today/next 24h
3) NEXT (max 3 bullets) — upcoming deadlines/meetings
4) BLOCKERS (optional, max 2 bullets)
5) ONE NEXT MOVE — exactly one concrete next step (15–45 min)
6) If needed: up to 2 clarifying questions, numbered.

IMPORTANT BEHAVIOR RULES
- If the user dumps many things: create an INBOX bundle (items with status=inbox) and propose a quick “разбор инбокса” later.
- Tasks must have a “next_action” that is executable.
- Use separate fields: due_at (deadline) vs remind_at (notification time).
- Meetings: capture date/time, attendees, intent, prep tasks.
- Decisions: capture what was decided + implications + date.
- Prefer moving/splitting tasks over letting them be overdue.
- If the user says “сделай план/раскидай”: immediately generate a 1–3 day plan using open tasks + dates.

MEMORY POLICY
- assistant_messages is raw log: everything.
- assistant_items is executive memory: only structured items.
- Do NOT store emotional text as memory unless it affects operation (e.g., “I’m overloaded this week” -> temporary state for 24–48h).
- When uncertain, store as inbox with low confidence.

QUALITY BAR
Your primary KPI is that the user can dump chaos and immediately feel:
- “everything is captured”
- “I see what matters now”
- “I know the next move”
- “nothing will be forgotten”

Never output only JSON. Always output the user-facing message + then the JSON patch.`

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

function detectOverloadLevel(text: string) {
  const t = String(text || '').toLowerCase()
  if (!t) return 0
  if (/(я\s+в\s+ахуе|голова\s+кипит|перегруз|перегруж|пиздец|заебал|устал|не\s+вывожу|стресс)/i.test(t)) return 3
  if (/(очень\s+много|слишком\s+много|капец|нерв|паник)/i.test(t)) return 2
  return 0
}

function clip(text: string, max = 1200) {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function hasCyrillic(text: string) {
  return /[А-Яа-яЁёІіЇїЄє]/.test(String(text || ''))
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

function formatInTz(iso: string, timeZone: string) {
  const s = String(iso || '').trim()
  if (!s) return ''
  const t = Date.parse(s)
  if (!Number.isFinite(t)) return s
  const tz = String(timeZone || '').trim() || 'UTC'
  try {
    const dtf = new Intl.DateTimeFormat('ru-RU', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return `${dtf.format(new Date(t))} (${tz})`
  } catch {
    return new Date(t).toISOString()
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

function wantsPlan(text: string) {
  const t = String(text || '').toLowerCase()
  if (!t) return false
  if (/(сделай|составь|раскидай|распиши|зафиксируй)\s+план|план\s+на|планир|раскидай/i.test(t)) return true
  // English triggers (useful when voice transcript or accidental EN input)
  if (/\b(plan|schedule|roadmap|to-?do|todo)\b/.test(t)) return true
  if (/(break|split).*(steps|tasks)/.test(t)) return true
  return false
}

function isPatchUseful(p: any) {
  if (!p || typeof p !== 'object') return false
  if (p?.today_board && (Array.isArray(p.today_board?.top3_ids) || p.today_board?.next_move)) return true
  if (Array.isArray(p?.ops) && p.ops.length) return true
  if (p?.state && (p.state.mode || typeof p.state.overload_level === 'number')) return true
  return false
}

function preferGpt52(model: string) {
  const m = normalizeModel(model)
  const low = m.toLowerCase()
  if (low === 'gpt-5' || low === 'gpt-5.0' || (low.startsWith('gpt-5') && !low.startsWith('gpt-5.2'))) return 'gpt-5.2'
  return m
}

function normalizeRuText(v: any) {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
  return s || null
}

async function translateFieldsToRussian(params: {
  apiKey: string
  model: string
  fallbackModel: string
  title: string | null
  body: string | null
  next_action: string | null
}) {
  const input = { title: params.title || '', body: params.body || '', next_action: params.next_action || '' }
  const sys = [
    'Translate to Russian.',
    'Return ONLY JSON: {"title":"...","body":"...","next_action":"..."}',
    'Keep title short (<= 80 chars). Keep meaning. Do not add extra info.',
  ].join('\n')
  const run = async (model: string) => {
    const json = await callOpenAi({
      apiKey: params.apiKey,
      model,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify(input) }],
      max: 220,
      temperature: 0.2,
    })
    const txt = safeTextFromChatCompletion(json).trim()
    const parsed = tryParseJsonObject(txt) as any
    const title = normalizeRuText(parsed?.title) || params.title
    const body = normalizeRuText(parsed?.body) || params.body
    const next_action = normalizeRuText(parsed?.next_action) || params.next_action
    return { title, body, next_action }
  }
  try {
    return await run(params.model)
  } catch {
    try {
      return await run(params.fallbackModel)
    } catch {
      return { title: params.title, body: params.body, next_action: params.next_action }
    }
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

async function callOpenAiText(params: { apiKey: string; model: string; messages: any[]; max: number; temperature?: number }) {
  const json = await callOpenAi(params)
  return safeTextFromChatCompletion(json).trim()
}

async function streamOpenAiText(params: { apiKey: string; model: string; messages: any[]; max: number }) {
  const model = normalizeModel(params.model)
  const modelLower = model.toLowerCase()
  const isGpt5 = modelLower.startsWith('gpt-5') || modelLower.startsWith('gpt5')
  const maxKey = isGpt5 ? 'max_completion_tokens' : 'max_tokens'
  const body: any = { model, messages: params.messages, stream: true }
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
  if (!resp.body) throw new Error('openai_no_body')

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buf = ''
  let done = false
  let full = ''

  async function* gen() {
    while (!done) {
      const r = await reader.read()
      if (r.done) break
      buf += decoder.decode(r.value, { stream: true })
      const parts = buf.split('\n')
      buf = parts.pop() || ''
      for (const line of parts) {
        const s = line.trim()
        if (!s.startsWith('data:')) continue
        const data = s.slice(5).trim()
        if (!data) continue
        if (data === '[DONE]') {
          done = true
          break
        }
        try {
          const j = JSON.parse(data)
          const delta = j?.choices?.[0]?.delta?.content
          if (typeof delta === 'string' && delta) {
            full += delta
            yield delta
          }
        } catch {
          // ignore malformed chunk
        }
      }
    }
  }

  return { gen, getFull: () => full }
}

async function updateGptMemorySummary(params: { apiKey: string; tenantId: string; model: string; fallbackModel: string; user: string; assistant: string }) {
  const prev = (await getAssistantState(params.tenantId, 'gpt_memory_summary').catch(() => null)) as any
  const prevText = typeof prev === 'string' ? prev : prev && typeof prev?.text === 'string' ? prev.text : ''
  const sys = [
    'Ты ведёшь долговременную память о пользователе (владельце CRM).',
    'Обнови краткую сводку памяти на русском: факты о человеке, предпочтения, проекты, договорённости, важные контексты.',
    'НЕ добавляй лишнее. НЕ придумывай. Если нет факта — не добавляй.',
    'Ответ: только текст (до 1200 символов).',
  ].join('\n')
  const userPayload = {
    prev_summary: prevText || null,
    last_exchange: { user: params.user, assistant: params.assistant },
  }
  let next = ''
  try {
    next = await callOpenAiText({ apiKey: params.apiKey, model: params.model, messages: [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify(userPayload) }], max: 260, temperature: 0.2 })
  } catch {
    try {
      next = await callOpenAiText({
        apiKey: params.apiKey,
        model: params.fallbackModel,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify(userPayload) }],
        max: 260,
        temperature: 0.2,
      })
    } catch {
      next = ''
    }
  }
  if (next) await setAssistantState(params.tenantId, 'gpt_memory_summary', next).catch(() => null)
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = String(process.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) return NextResponse.json({ error: 'missing_openai_key' }, { status: 500 })

  const contentType = String(request.headers.get('content-type') || '').toLowerCase()
  const url = new URL(request.url)
  const wantsStream = url.searchParams.get('stream') === '1'
  let tenantId = 'temoweb'
  let message = ''
  let isVoice = false
  let mode: 'gpt' | 'exec' = 'gpt'

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null)
    const tid = form ? normalizeTenantId(form.get('tenantId')) : 'temoweb'
    tenantId = tid
    const m = form ? String(form.get('mode') || '').trim().toLowerCase() : ''
    if (m === 'exec') mode = 'exec'
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
    const m = String(body?.mode || '').trim().toLowerCase()
    if (m === 'exec') mode = 'exec'
  }
  if (!message) return NextResponse.json({ error: 'missing_message' }, { status: 400 })

  // Persist user's message.
  await appendAssistantMessage({ tenantId, role: 'user', content: message })

  // GPT MODE: "raw ChatGPT-like" assistant with memory + (optional) streaming
  if (mode === 'gpt') {
    const profile = await getTenantProfile(tenantId).catch(() => null)
    const tz =
      profile && typeof (profile as any)?.timezone === 'string' && String((profile as any).timezone).trim()
        ? String((profile as any).timezone).trim()
        : 'Europe/Prague'
    const nowIso = new Date().toISOString()
    const memorySummary = (await getAssistantState(tenantId, 'gpt_memory_summary').catch(() => null)) as any
    const memoryText = typeof memorySummary === 'string' ? memorySummary : ''
    const recentChat = await listAssistantMessages({ tenantId, limit: 22 }).catch(() => [])
    const history = Array.isArray(recentChat)
      ? recentChat
          .slice()
          .reverse()
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
          .map((m: any) => ({ role: m.role, content: String(m.content || '') }))
      : []

    const chatModelRaw =
      String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_CHAT || '').trim() ||
      String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT || '').trim() ||
      String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_MODEL || '').trim() ||
      String(process.env.OPENAI_MODEL_ASSISTANT || '').trim() ||
      String(process.env.OPENAI_MODEL || '').trim() ||
      'gpt-5.2'
    const chatModel = preferGpt52(chatModelRaw) || 'gpt-5.2'
    const fallbackModel = normalizeModel(String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_FALLBACK || 'gpt-4o'))
    const memoryModel = normalizeModel(String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_MEMORY || 'gpt-4o-mini'))

    const system = [
      'Ты — личный ChatGPT ассистент пользователя внутри private CRM.',
      'Говори как в приложении ChatGPT: естественно, по-человечески, без шаблонов.',
      'Язык: русский.',
      'Память: запоминай важные факты о пользователе и проектах. Ничего не забывай.',
      'Не создавай задачи/напоминания автоматически — только если пользователь явно просит (например: "создай задачу", "поставь напоминание", "зафиксируй").',
      '',
      `Now UTC: ${nowIso}`,
      `Timezone: ${tz}`,
      `Local time: ${localNowString(tz)}`,
      '',
      'Сводка долговременной памяти (обновляется автоматически):',
      memoryText ? memoryText : '(пока пусто)',
    ].join('\n')

    const messages = [{ role: 'system', content: system }, ...history]

    if (wantsStream && !isVoice) {
      const { gen, getFull } = await streamOpenAiText({ apiKey, model: chatModel, messages, max: 900 })
      const encoder = new TextEncoder()
      let fullText = ''
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of gen()) {
              fullText += chunk
              controller.enqueue(encoder.encode(chunk))
            }
          } catch (e: any) {
            const msg = typeof e?.message === 'string' ? e.message : 'stream_error'
            controller.enqueue(encoder.encode(`\n\n[error: ${msg}]`))
          } finally {
            const final = fullText || getFull() || ''
            if (final.trim()) {
              await appendAssistantMessage({ tenantId, role: 'assistant', content: final.trim() }).catch(() => null)
              await updateGptMemorySummary({ apiKey, tenantId, model: memoryModel, fallbackModel, user: message, assistant: final.trim() }).catch(
                () => null,
              )
            }
            controller.close()
          }
        },
      })
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
          'X-Model': chatModel,
        },
      })
    }

    let reply = ''
    let used = chatModel
    try {
      reply = await callOpenAiText({ apiKey, model: chatModel, messages, max: 900, temperature: 0.4 })
    } catch {
      used = fallbackModel
      try {
        reply = await callOpenAiText({ apiKey, model: fallbackModel, messages, max: 900, temperature: 0.4 })
      } catch {
        reply = ''
      }
    }
    if (!reply) reply = 'Окей. Напиши, что именно нужно сделать первым шагом — я подхвачу.'
    await appendAssistantMessage({ tenantId, role: 'assistant', content: reply }).catch(() => null)
    await updateGptMemorySummary({ apiKey, tenantId, model: memoryModel, fallbackModel, user: message, assistant: reply }).catch(() => null)
    return NextResponse.json({ ok: true, tenantId, mode, model: used, reply, applied: [], patch: null })
  }

  // Retrieval: pull a few relevant memory items by simple keyword match.
  const q = pickQueryTerms(message)
  const relevant = await listAssistantItems({ tenantId, q, limit: 10 }).catch(() => [])
  const recentChat = await listAssistantMessages({ tenantId, limit: 14 }).catch(() => [])
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

  const chatModelRaw =
    String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_CHAT || '').trim() ||
    String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT || '').trim() ||
    String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_MODEL || '').trim() ||
    String(process.env.OPENAI_MODEL_ASSISTANT || '').trim() ||
    String(process.env.OPENAI_MODEL || '').trim() ||
    'gpt-5.2'
  const extractorModelRaw = String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_EXTRACTOR || '').trim() || 'gpt-5.2'

  // If the global OPENAI_MODEL is set to gpt-5 (older), prefer gpt-5.2 for the assistant unless explicitly overridden.
  const chatModel = preferGpt52(chatModelRaw)
  const extractorModel = preferGpt52(extractorModelRaw)
  const extractorFallbackModel = normalizeModel(String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_EXTRACTOR_FALLBACK || 'gpt-4o-mini'))
  const fallbackModel = normalizeModel(String(process.env.OPENAI_MODEL_ADMIN_ASSISTANT_FALLBACK || 'gpt-4o'))

  const nowIso = new Date().toISOString()
  const today = nowIso.slice(0, 10)
  const profile = await getTenantProfile(tenantId).catch(() => null)
  const tz =
    profile && typeof (profile as any)?.timezone === 'string' && String((profile as any).timezone).trim()
      ? String((profile as any).timezone).trim()
      : 'Europe/Prague'
  // Build inputs bundle for the extractor/replier.
  const pinnedMemory = {
    timezone: tz,
    managerTelegramId: profile && typeof (profile as any)?.managerTelegramId === 'string' ? (profile as any).managerTelegramId : null,
  }
  const todayContext = { utc: nowIso, timezone: tz, local: localNowString(tz) }

  // 1) Extract JSON PATCH (stable model). This is the “operator” layer.
  const overloadLevel = detectOverloadLevel(message)
  const planIntent = wantsPlan(message)
  const forceRussian = true
  const lastState = await getAssistantState(tenantId, 'exec_state').catch(() => null)
  const extractorSystem = [
    TEMO_EXEC_ASSISTANT_PROMPT,
    '',
    'SYSTEM OVERRIDE FOR THIS CALL:',
    '- You must output ONLY part B: STRUCTURED JSON PATCH.',
    '- Do NOT output any user-facing message here.',
    '- Return ONLY a single JSON object (no markdown, no code fences, no extra text).',
    '- Output language: Russian. All item.title/body/next_action must be Russian (translate if needed).',
    '- NEVER answer with an empty ops[] if the user message contains tasks/meetings/deadlines OR plan intent.',
    '- If user asked for a plan ("план/раскидай/зафиксируй план"), set state.mode="plan" and create 3–8 tasks with executable next_action.',
    '- Always fill today_board.top3_ids and today_board.next_move (15–45 min) when plan intent or overload_level >= 2.',
    '',
    'SCHEMA:',
    '{',
    '  "state": {"mode":"capture|ask|plan|review","overload_level":0,"focus_project_id":"optional"},',
    '  "ops": [',
    '    {"op":"create_item","item":{...}},',
    '    {"op":"update_item","id":123,"patch":{...}},',
    '    {"op":"close_item","id":123},',
    '    {"op":"link_items","from_id":123,"to_id":456,"relation":"blocks|depends_on|related"}',
    '  ],',
    '  "today_board": {"top3_ids":[123,456,789],"next_move":{"text":"...","duration_min":30,"related_ids":[123]}},',
    '  "notes_for_system":"short internal note"',
    '}',
    '',
    'ITEM SHAPE inside create_item:',
    '{',
    '  "type":"task|reminder|note|project|meeting|decision|blocker|contact|reference",',
    '  "title":"short",',
    '  "body":"optional",',
    '  "status":"inbox|open|waiting|done|archived",',
    '  "priority":"P0|P1|P2|P3",',
    '  "area":"work|money|health|family|other",',
    '  "due_at":"ISO8601 or null",',
    '  "remind_at":"ISO8601 or null",',
    '  "next_action":"one executable step",',
    '  "tags":["optional"],',
    '  "confidence":0.0',
    '}',
    '',
    `today_context: ${JSON.stringify(todayContext)}`,
    `pinned_memory: ${JSON.stringify(pinnedMemory)}`,
    `last_state: ${JSON.stringify(lastState)}`,
  ].join('\n')

  const extractorPayload = {
    user_message: message,
    is_voice: isVoice,
    recent_chat: Array.isArray(recentChat) ? recentChat.slice().reverse().map((m: any) => ({ role: m.role, content: String(m.content || '') })) : [],
    relevant_items: Array.isArray(relevant) ? relevant : [],
    overload_level_hint: overloadLevel,
    plan_intent: planIntent,
    output_language: forceRussian ? 'ru' : 'auto',
  }

  let patch: ExecPatch = {}
  const runExtractor = async (model: string) => {
    const json = await callOpenAi({
      apiKey,
      model,
      messages: [{ role: 'system', content: extractorSystem }, { role: 'user', content: JSON.stringify(extractorPayload) }],
      max: 900,
      temperature: 0.2,
    })
    const txt = safeTextFromChatCompletion(json).trim()
    const parsed = tryParseJsonObject(txt) as any
    return (parsed || {}) as ExecPatch
  }
  try {
    patch = await runExtractor(extractorModel)
    if (!isPatchUseful(patch)) patch = await runExtractor(extractorFallbackModel)
  } catch {
    try {
      patch = await runExtractor(extractorFallbackModel)
    } catch {
      patch = {}
    }
  }

  const ops = Array.isArray(patch?.ops) ? patch.ops : []
  const applied: Array<{ kind: string; id?: number; title?: string; note?: string }> = []
  const idMap = new Map<string, number>()
  const createdIds: number[] = []

  const parseIsoOrNull = (v: any) => {
    const s = typeof v === 'string' ? v.trim() : ''
    if (!s) return null
    const t = Date.parse(s)
    if (!Number.isFinite(t)) return null
    return new Date(t).toISOString()
  }
  const mapPriority = (p: any) => {
    const s = String(p || '').toUpperCase()
    if (s === 'P0') return 0
    if (s === 'P1') return 1
    if (s === 'P2') return 2
    if (s === 'P3') return 3
    return null
  }
  const mapStatus = (s: any) => {
    const v = String(s || '').toLowerCase()
    if (v === 'inbox') return 'inbox'
    if (v === 'waiting') return 'waiting'
    if (v === 'done') return 'done'
    if (v === 'archived') return 'archived'
    return 'open'
  }
  const mapTypeToKind = (t: any) => {
    const v = String(t || '').toLowerCase()
    if (
      v === 'task' ||
      v === 'reminder' ||
      v === 'note' ||
      v === 'project' ||
      v === 'meeting' ||
      v === 'decision' ||
      v === 'blocker' ||
      v === 'contact' ||
      v === 'reference'
    )
      return v === 'note' ? 'note' : v
    return 'note'
  }

  for (const op of ops) {
    const k = String((op as any)?.op || '').trim()
    if (k === 'create_item') {
      const item = (op as any)?.item || {}
      // Always store content in Russian for the owner-facing assistant.
      let titleRu = normalizeRuText(item?.title)
      let bodyRu = normalizeRuText(item?.body)
      let nextActionRu = normalizeRuText(item?.next_action)
      if (forceRussian) {
        const hay = `${titleRu || ''}\n${bodyRu || ''}\n${nextActionRu || ''}`.trim()
        const hasLat = /[A-Za-z]/.test(hay)
        if (hay && hasLat && !hasCyrillic(hay)) {
          const t = await translateFieldsToRussian({
            apiKey,
            model: chatModel,
            fallbackModel,
            title: titleRu,
            body: bodyRu,
            next_action: nextActionRu,
          })
          titleRu = t.title
          bodyRu = t.body
          nextActionRu = t.next_action
        }
      }
      const createdItem = await createAssistantItem({
        tenantId,
        kind: mapTypeToKind(item?.type),
        title: titleRu,
        body: bodyRu,
        status: mapStatus(item?.status || 'inbox'),
        priority: mapPriority(item?.priority),
        dueAt: parseIsoOrNull(item?.due_at),
        remindAt: parseIsoOrNull(item?.remind_at),
        tags: Array.isArray(item?.tags) ? item.tags : null,
        meta: {
          ...((typeof item?.project === 'object' && item?.project) || {}),
          area: item?.area || null,
          next_action: nextActionRu,
          confidence: typeof item?.confidence === 'number' ? item.confidence : null,
          source: 'exec_patch',
        },
      }).catch(() => null)
      if (createdItem?.id != null) {
        const idNum = Number(createdItem.id)
        applied.push({ kind: 'create', id: idNum, title: createdItem.title || createdItem.kind })
        createdIds.push(idNum)
        // If extractor referenced temporary ids as strings, we could map later. (optional)
        if (typeof item?.id === 'string') idMap.set(String(item.id), idNum)
      }
    }
    if (k === 'update_item') {
      const id = Number((op as any)?.id)
      if (!Number.isFinite(id)) continue
      const pch = (op as any)?.patch || {}
      const updated = await updateAssistantItem(id, {
        title: pch?.title,
        body: pch?.body,
        status: pch?.status ? mapStatus(pch.status) : undefined,
        priority: pch?.priority ? mapPriority(pch.priority) : undefined,
        dueAt: pch?.due_at !== undefined ? parseIsoOrNull(pch.due_at) : undefined,
        remindAt: pch?.remind_at !== undefined ? parseIsoOrNull(pch.remind_at) : undefined,
        tags: pch?.tags,
        meta: pch?.meta,
      } as any).catch(() => null)
      if (updated) applied.push({ kind: 'update', id, title: updated.title || updated.kind })
    }
    if (k === 'close_item') {
      const id = Number((op as any)?.id)
      if (!Number.isFinite(id)) continue
      const updated = await updateAssistantItem(id, { status: 'done' } as any).catch(() => null)
      if (updated) applied.push({ kind: 'close', id, title: updated.title || updated.kind })
    }
    if (k === 'link_items') {
      const fromId = Number((op as any)?.from_id)
      const toId = Number((op as any)?.to_id)
      const rel = String((op as any)?.relation || 'related')
      if (!Number.isFinite(fromId) || !Number.isFinite(toId)) continue
      const cur = await updateAssistantItem(fromId, {
        meta: { link: { to: toId, relation: rel }, source: 'exec_patch' },
      } as any).catch(() => null)
      if (cur) applied.push({ kind: 'link', id: fromId, title: cur.title || cur.kind, note: `${rel} -> #${toId}` })
    }
  }

  // Safety net: if extractor produced nothing but the message looks memory-worthy, capture it as inbox note.
  if (!applied.length && looksMemoryWorthy(message)) {
    const item = await createAssistantItem({
      tenantId,
      kind: planIntent ? 'task' : 'note',
      title: planIntent ? 'Сделать план (из Inbox)' : message.length <= 80 ? message : 'Inbox',
      body: message,
      status: 'inbox',
      meta: { source: 'exec_patch_fallback', overloadLevel, planIntent, next_action: planIntent ? 'Собрать 3 главные цели на 24 часа' : null, confidence: 0.4 },
    }).catch(() => null)
    if (item?.id != null) applied.push({ kind: 'create', id: Number(item.id), title: item.title || item.kind, note: 'fallback' })
  }

  // Persist state + today board.
  const nextState = {
    mode: patch?.state?.mode || 'capture',
    overload_level: typeof patch?.state?.overload_level === 'number' ? patch.state.overload_level : overloadLevel,
    focus_project_id: patch?.state?.focus_project_id || null,
  }
  await setAssistantState(tenantId, 'exec_state', nextState).catch(() => null)
  if (patch?.today_board) await setAssistantState(tenantId, 'today_board', patch.today_board).catch(() => null)

  // 2) Build user-facing message deterministically from patch/state/items
  const todayBoardRaw = (patch?.today_board || (await getAssistantState(tenantId, 'today_board').catch(() => null)) || {}) as any
  const top3IdsRaw: number[] = Array.isArray(todayBoardRaw?.top3_ids)
    ? todayBoardRaw.top3_ids.map((x: any) => Number(x)).filter((x: any) => Number.isFinite(x))
    : []
  // If user asked for a plan and we created fresh tasks, prefer those for Today Board.
  const top3Ids =
    planIntent && createdIds.length
      ? createdIds.slice(0, 3)
      : top3IdsRaw.length
        ? top3IdsRaw
        : []
  const todayBoard =
    planIntent && createdIds.length
      ? {
          ...todayBoardRaw,
          top3_ids: top3Ids,
          next_move: todayBoardRaw?.next_move
            ? {
                ...todayBoardRaw.next_move,
                related_ids:
                  Array.isArray(todayBoardRaw?.next_move?.related_ids) && todayBoardRaw.next_move.related_ids.length
                    ? todayBoardRaw.next_move.related_ids
                    : [createdIds[0]],
              }
            : todayBoardRaw?.next_move,
        }
      : todayBoardRaw
  if (planIntent && createdIds.length) await setAssistantState(tenantId, 'today_board', todayBoard).catch(() => null)
  const move = todayBoard?.next_move || null
  const changeIds = applied.map((x) => Number(x.id)).filter((x) => Number.isFinite(x))
  const fetchIds = Array.from(new Set([...top3Ids, ...changeIds])).slice(0, 30)
  const fetched = await getAssistantItemsByIds({ tenantId, ids: fetchIds }).catch(() => [])
  const byId = new Map<number, any>()
  for (const it of Array.isArray(fetched) ? fetched : []) byId.set(Number(it?.id), it)

  // If we have English items in the board, translate them once and persist (so UI stops showing English).
  if (forceRussian) {
    const translateIds = fetchIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id))
      .filter((id) => {
        const it = byId.get(id)
        if (!it) return false
        const title = String(it?.title || '')
        const na = String(it?.meta?.next_action || '')
        const hay = `${title}\n${na}`.trim()
        if (!hay) return false
        const hasLat = /[A-Za-z]/.test(hay)
        return hasLat && !hasCyrillic(hay)
      })
      .slice(0, 8)
    for (const id of translateIds) {
      const it = byId.get(id)
      if (!it) continue
      const title = normalizeRuText(it?.title)
      const body = normalizeRuText(it?.body)
      const next_action = normalizeRuText(it?.meta?.next_action)
      const tr = await translateFieldsToRussian({
        apiKey,
        model: chatModel,
        fallbackModel,
        title,
        body,
        next_action,
      })
      // Persist translation to storage for future UI rendering.
      const nextMeta = { ...(it?.meta || {}), next_action: tr.next_action }
      const updated = await updateAssistantItem(id, { title: tr.title, body: tr.body, meta: nextMeta } as any).catch(() => null)
      if (updated) byId.set(id, updated)
    }
  }

  const changeLine = applied.length
    ? applied
        .slice(0, 10)
        .map((a) => {
          const it = a.id != null ? byId.get(Number(a.id)) : null
          const when = it?.remindAt || it?.dueAt || null
          const whenText = when ? ` • ${formatInTz(String(when), tz)}` : ''
          return `${a.kind.toUpperCase()}: #${a.id} ${String(a.title || it?.title || it?.kind || '').trim()}${whenText}`
        })
        .join(' | ')
    : 'ничего не менял'

  const summarySystem = [
    'Сделай ОДНУ строку-резюме на русском (10–18 слов). Без шаблонов и без вопросов.',
    'Учитывай, что ассистент — COO/оператор, помогает превратить хаос в план.',
    `Сегодня/контекст: ${todayContext.local}`,
    `Изменения: ${changeLine}`,
  ].join('\n')
  let summaryLine = ''
  let usedReplyModel = chatModel
  try {
    const json = await callOpenAi({
      apiKey,
      model: chatModel,
      messages: [{ role: 'system', content: summarySystem }, { role: 'user', content: message }],
      max: 120,
      temperature: 0.4,
    })
    summaryLine = safeTextFromChatCompletion(json).trim()
  } catch {
    usedReplyModel = fallbackModel
    try {
      const json = await callOpenAi({
        apiKey,
        model: fallbackModel,
        messages: [{ role: 'system', content: summarySystem }, { role: 'user', content: message }],
        max: 120,
        temperature: 0.4,
      })
      summaryLine = safeTextFromChatCompletion(json).trim()
    } catch {
      summaryLine = ''
    }
  }
  if (!summaryLine) summaryLine = planIntent ? 'Зафиксировал запрос на план и превратил входящее в понятные шаги.' : 'Зафиксировал и разложил по задачам/напоминаниям.'

  const renderItemBullet = (id: number) => {
    const it = byId.get(Number(id))
    if (!it) return `— #${id}`
    const title = String(it?.title || it?.kind || '').trim() || '(без названия)'
    const nextAction = String(it?.meta?.next_action || '').trim()
    const when = it?.remindAt || it?.dueAt || null
    const whenText = when ? ` • ${formatInTz(String(when), tz)}` : ''
    const na = nextAction ? ` — шаг: ${nextAction}` : ''
    return `— #${id} ${title}${whenText}${na}`
  }

  const todayBullets = (top3Ids.length ? top3Ids : changeIds).slice(0, 3).map(renderItemBullet)
  const seenNext = new Set<number>()
  const nextCandidates = fetchIds
    .map((id) => byId.get(Number(id)))
    .filter((it) => it && (it.dueAt || it.remindAt))
    .filter((it) => {
      const id = Number(it?.id)
      if (!Number.isFinite(id)) return false
      if (seenNext.has(id)) return false
      seenNext.add(id)
      return true
    })
    .sort((a, b) => Date.parse(String(a.remindAt || a.dueAt)) - Date.parse(String(b.remindAt || b.dueAt)))
  const nextBullets = nextCandidates
    .filter((it) => {
      const d = Date.parse(String(it.remindAt || it.dueAt))
      if (!Number.isFinite(d)) return false
      const now = Date.now()
      return d > now + 6 * 60 * 60 * 1000
    })
    .slice(0, 3)
    .map((it) => renderItemBullet(Number(it.id)))

  const blockers = fetchIds
    .map((id) => byId.get(Number(id)))
    .filter((it) => it && (String(it.kind) === 'blocker' || String(it.status) === 'waiting'))
    .slice(0, 2)
    .map((it) => renderItemBullet(Number(it.id)))

  const nextMoveText =
    (move && typeof move?.text === 'string' && move.text.trim()) ||
    (top3Ids[0] ? String(byId.get(Number(top3Ids[0]))?.meta?.next_action || '').trim() : '') ||
    (planIntent ? '15–30 мин: выписать 3 главные цели на завтра и разложить на шаги' : '15–30 мин: разбор Inbox — выбрать Top‑3 на сегодня')
  const duration = move && Number.isFinite(Number(move?.duration_min)) ? Math.max(15, Math.min(45, Number(move.duration_min))) : 30

  const finalReply = [
    `Окей, понял. ${summaryLine}`,
    `Изменения: ${changeLine}`,
    '',
    'СЕГОДНЯ',
    ...(todayBullets.length ? todayBullets : ['— (пока пусто)']),
    '',
    'ДАЛЕЕ',
    ...(nextBullets.length ? nextBullets : ['— (пока без дат/встреч)']),
    ...(blockers.length
      ? [
          '',
          'БЛОКЕРЫ',
          ...blockers,
        ]
      : []),
    '',
    'СЛЕДУЮЩИЙ ШАГ',
    `— ${duration} мин: ${nextMoveText}`,
  ].join('\n')

  await appendAssistantMessage({ tenantId, role: 'assistant', content: finalReply })

  return NextResponse.json({ ok: true, tenantId, model: usedReplyModel, reply: finalReply, applied, patch })
}

