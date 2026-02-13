import { listTenants, listDueAssistantReminders, updateAssistantItem } from '@/app/lib/storage'

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

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return { attempted: false as const, ok: false as const }
  try {
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: clip(text, 3800),
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
    const due = await listDueAssistantReminders({ tenantId, dueWithinMs: DUE_WITHIN_MS, limit: 12 }).catch(() => [])
    if (!Array.isArray(due) || !due.length) continue

    for (const r of due.slice(0, 12)) {
      const msg = formatReminder(r)
      const sent = await sendTelegram(msg)
      if (sent.attempted && sent.ok) {
        await updateAssistantItem(Number(r?.id), { remindedAt: new Date().toISOString() }).catch(() => null)
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

