import {
  getAssistantState,
  getTenantProfile,
  listAssistantItems,
  listDueAssistantReminders,
  listTenants,
  setAssistantState,
  updateAssistantItem,
} from '@/app/lib/storage'

const ENABLED = (process.env.ASSISTANT_REMINDERS_ENABLED || 'true').trim() !== 'false'
const POLL_MS = Number(process.env.ASSISTANT_REMINDERS_POLL_MS || '') || 30 * 1000
const DUE_WITHIN_MS = Number(process.env.ASSISTANT_REMINDERS_DUE_WITHIN_MS || '') || 90 * 1000

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim()

function clip(text: string, max: number) {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

async function sendTelegram(params: { chatId: string; text: string }) {
  const chatId = String(params.chatId || '').trim()
  if (!TELEGRAM_BOT_TOKEN || !chatId) return { attempted: false as const, ok: false as const }
  try {
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: clip(params.text, 3800),
        disable_web_page_preview: true,
      }),
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      console.error('Telegram reminder send error', resp.status, body.slice(0, 400))
      return { attempted: true as const, ok: false as const }
    }
    return { attempted: true as const, ok: true as const }
  } catch (e) {
    console.error('Telegram reminder send exception', e)
    return { attempted: true as const, ok: false as const }
  }
}

function tzLocalDateKey(timeZone: string, d = new Date()) {
  const tz = String(timeZone || '').trim() || 'UTC'
  try {
    const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    return dtf.format(d) // YYYY-MM-DD
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function tzLocalHourMinute(timeZone: string, d = new Date()) {
  const tz = String(timeZone || '').trim() || 'UTC'
  try {
    const dtf = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
    return dtf.format(d) // HH:MM
  } catch {
    const iso = new Date().toISOString()
    return iso.slice(11, 16)
  }
}

function formatDigest(params: { tz: string; tenantId: string; inbox: any[]; open: any[] }) {
  const now = new Date()
  const localDay = tzLocalDateKey(params.tz, now)
  const hhmm = tzLocalHourMinute(params.tz, now)

  const getWhen = (x: any) => {
    const t = x?.remindAt || x?.dueAt || x?.createdAt || null
    const ms = t ? Date.parse(String(t)) : NaN
    return Number.isFinite(ms) ? ms : null
  }
  const nowMs = Date.now()
  const openTasks = params.open.filter((x) => String(x?.kind || '') === 'task' && String(x?.status || '') === 'open')
  const openReminders = params.open.filter((x) => String(x?.kind || '') === 'reminder' && String(x?.status || '') === 'open')
  const overdue = params.open.filter((x) => {
    const when = getWhen(x)
    if (!when) return false
    if (String(x?.status || '') !== 'open') return false
    if (String(x?.kind || '') === 'note') return false
    return when < nowMs
  })

  const top = (arr: any[], n: number) =>
    arr
      .slice()
      .sort((a, b) => (getWhen(a) || 0) - (getWhen(b) || 0))
      .slice(0, n)
      .map((x) => `— #${x?.id} ${String(x?.title || '(без назви)')}`.slice(0, 220))

  const lines = [
    `🧠 AI Assistant • Дайджест (${localDay} ${hhmm})`,
    '',
    `📥 Inbox: ${params.inbox.length}`,
    `✅ Задачи (open): ${openTasks.length}`,
    `⏰ Напоминания (open): ${openReminders.length}`,
    `⚠️ Просрочено: ${overdue.length}`,
    '',
    params.inbox.length ? ['📥 Топ Inbox:', ...top(params.inbox, 3), ''].join('\n') : '',
    overdue.length ? ['⚠️ Просрочено (топ):', ...top(overdue, 3), ''].join('\n') : '',
    openReminders.length ? ['⏰ Ближайшие напоминания:', ...top(openReminders, 3), ''].join('\n') : '',
    'Команды: “разбери inbox”, “закрой #id”, “перенеси #id на завтра 12:00”.',
  ]
  return lines.filter(Boolean).join('\n').trim()
}

function formatReminder(r: any) {
  const title = String(r?.title || '').trim() || '(без назви)'
  const body = String(r?.body || '').trim()
  const when = String(r?.remindAt || r?.dueAt || '').trim()
  const lines = [
    '⏰ НАГАДУВАННЯ (AI Assistant)',
    '',
    `🧩 ${title}`,
    body ? `📝 ${clip(body, 900)}` : null,
    when ? `🕒 ${when}` : null,
    '',
    'Якщо хочете — напишіть в /admin/assistant: “закрий нагадування” або “перенеси на завтра 10:00”.',
  ].filter(Boolean)
  return lines.join('\n')
}

async function tickOnce() {
  const tenants = await listTenants().catch(() => [])
  const list = Array.isArray(tenants) && tenants.length ? tenants : [{ id: 'temoweb' }]

  for (const t of list) {
    const tenantId = String((t as any)?.id || '').trim().toLowerCase() || 'temoweb'
    const profile = await getTenantProfile(tenantId).catch(() => null)
    const tz =
      profile && typeof (profile as any)?.timezone === 'string' && String((profile as any).timezone).trim()
        ? String((profile as any).timezone).trim()
        : 'Europe/Prague'
    const chatId =
      profile && typeof (profile as any)?.managerTelegramId === 'string' && String((profile as any).managerTelegramId).trim()
        ? String((profile as any).managerTelegramId).trim()
        : TELEGRAM_CHAT_ID

    const due = await listDueAssistantReminders({ tenantId, dueWithinMs: DUE_WITHIN_MS, limit: 12 }).catch(() => [])
    if (Array.isArray(due) && due.length) {
      for (const r of due.slice(0, 12)) {
        const msg = formatReminder(r)
        const sent = await sendTelegram({ chatId, text: msg })
        if (sent.attempted && sent.ok) {
          await updateAssistantItem(Number(r?.id), { remindedAt: new Date().toISOString() }).catch(() => null)
        }
      }
    }

    // Daily digest: send at local 09:00 and 19:00 (±2 min) once per day per slot.
    const hhmm = tzLocalHourMinute(tz)
    const slot = hhmm >= '08:58' && hhmm <= '09:02' ? 'morning' : hhmm >= '18:58' && hhmm <= '19:02' ? 'evening' : null
    if (slot) {
      const day = tzLocalDateKey(tz)
      const stateKey = `digest_${slot}_last_day`
      const last = await getAssistantState(tenantId, stateKey).catch(() => null)
      if (String(last || '') !== day) {
        const inbox = await listAssistantItems({ tenantId, status: 'inbox', limit: 200 }).catch(() => [])
        const open = await listAssistantItems({ tenantId, status: 'open', limit: 200 }).catch(() => [])
        const text = formatDigest({ tz, tenantId, inbox: Array.isArray(inbox) ? inbox : [], open: Array.isArray(open) ? open : [] })
        const sent = await sendTelegram({ chatId, text })
        if (sent.attempted && sent.ok) {
          await setAssistantState(tenantId, stateKey, day).catch(() => null)
        }
      }
    }
  }
}

export function startAssistantReminderScheduler() {
  if (!ENABLED) return
  const g = globalThis as any
  if (g.__assistantReminderStarted) return
  g.__assistantReminderStarted = true

  console.log('Assistant reminders scheduler: enabled', { pollMs: POLL_MS, dueWithinMs: DUE_WITHIN_MS })
  setInterval(() => {
    void tickOnce()
  }, POLL_MS)
  void tickOnce()
}

