import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

type IgWebhookMessage = {
  sender?: { id?: string }
  recipient?: { id?: string }
  message?: { text?: string; is_echo?: boolean }
}

type IgWebhookPayload = {
  object?: string
  entry?: Array<{
    id?: string
    time?: number
    messaging?: IgWebhookMessage[]
  }>
}

const IG_VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || ''
const IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || ''
const IG_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || ''
const IG_USER_ID = process.env.INSTAGRAM_IG_USER_ID || ''

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const BOOKING_URL = process.env.BOOKING_URL || ''
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

function verifySignature(rawBody: string, signatureHeader: string | null) {
  if (!IG_APP_SECRET) {
    console.warn('INSTAGRAM_APP_SECRET is missing; signature verification skipped')
    return true
  }
  if (!signatureHeader) return false
  const expected = `sha256=${crypto.createHmac('sha256', IG_APP_SECRET).update(rawBody, 'utf8').digest('hex')}`
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
}

function clip(text: string, max = 1000) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function detectBookingIntent(text: string) {
  return /(запис|запиш|брон|бронь|встреч|созвон|консультац|демо|demo|call|appointment)/i.test(text)
}

function detectLeadIntent(text: string) {
  return /(купит|цена|стоим|пакет|сколько|интерес|нужно|хочу|подключ|заказ|демо|созвон|запис)/i.test(text)
}

function extractContact(text: string) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  if (email) return email
  const phone = text.match(/\+?\d[\d\s().-]{7,}/)?.[0]
  if (phone) return phone.replace(/\s+/g, ' ').trim()
  const tg = text.match(/@[\w\d_]{3,}/)?.[0]
  if (tg) return tg
  return null
}

function buildSystemPrompt() {
  return [
    'Ты — AI-менеджер по продажам систем автоматизации заявок.',
    'Стиль: уверенно, дерзко, остроумно, но без оскорблений личности.',
    'Цель: агрессивная продажа через факты и контраст “как сейчас” vs “как после системы”.',
    'Запрещено: вода, лекции, советы “сделай сам”.',
    'Никогда не задавай вопрос “хочешь/хотите/нужно ли”.',
    'Если оффтоп — 1 короткая колкая связка и сразу к теме заявок/потерь/скорости.',
    'Если спрашивают цену/сроки/пакеты — это всегда по теме, отвечай прямо.',
    'Формат: короткие абзацы или маркеры, без markdown-звёздочек.',
    'Знания:',
    '- Запуск: обычно 3–7 дней (пилот), сложные интеграции 10–14 дней.',
    '- Пакеты: 600–900 €, 1200–1500 €, 2000–3000 €.',
    '- Пилот: полный пакет за $299 (5 мест).',
  ].join(' ')
}

async function generateAiReply(userText: string) {
  if (!OPENAI_API_KEY) {
    return 'Система в онлайне. Напиши пару деталей про бизнес и каналы — покажу, как автоматизация закроет заявки.'
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: userText },
      ],
      temperature: 0.9,
      presence_penalty: 0.2,
      frequency_penalty: 0.2,
      max_tokens: 350,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('OpenAI error', response.status, text.slice(0, 400))
    return 'Система работает. Дай 1–2 детали по бизнесу — покажу, как закроем заявки без ручного хаоса.'
  }

  const json = (await response.json()) as any
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    return 'Система работает. Дай 1–2 детали по бизнесу — покажу, как закроем заявки без ручного хаоса.'
  }
  return clip(content.trim(), 1000)
}

async function sendInstagramMessage(recipientId: string, text: string) {
  if (!IG_ACCESS_TOKEN || !IG_USER_ID) {
    console.error('Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_IG_USER_ID')
    return
  }
  const url = `https://graph.facebook.com/v19.0/${IG_USER_ID}/messages?access_token=${IG_ACCESS_TOKEN}`
  const body = {
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: { text: clip(text, 1000) },
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const respText = await resp.text().catch(() => '')
    console.error('Instagram send error', resp.status, respText.slice(0, 400))
  }
}

async function sendTelegramLead({
  senderId,
  messageText,
  contactHint,
}: {
  senderId: string
  messageText: string
  contactHint: string | null
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram is not configured for IG leads')
    return
  }

  const parts = [
    '📥 НОВА ЗАЯВКА З INSTAGRAM',
    '',
    `🧾 Контакт (IG): ${senderId}`,
    contactHint ? `☎️ Контакт клієнта: ${contactHint}` : '☎️ Контакт клієнта: —',
    '',
    '🗣 Повідомлення клієнта:',
    `— ${clip(messageText, 800)}`,
    '',
    `🕒 Час: ${new Date().toISOString()}`,
  ]

  const text = parts.join('\n')
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  })
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    console.error('Telegram send error (IG lead)', resp.status, body.slice(0, 400))
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token && token === IG_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  console.log('IG webhook: received', {
    hasSignature: Boolean(signature),
    length: rawBody.length,
  })

  if (!verifySignature(rawBody, signature)) {
    console.warn('IG webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let payload: IgWebhookPayload | null = null
  try {
    payload = JSON.parse(rawBody)
  } catch (error) {
    console.error('Invalid JSON payload', error)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('IG webhook: parsed payload', {
    hasEntry: Boolean(payload?.entry?.length),
    object: payload?.object || null,
  })

  const entries = payload?.entry || []
  for (const entry of entries) {
    const messages = entry.messaging || []
    for (const msg of messages) {
      if (msg.message?.is_echo) continue
      const senderId = msg.sender?.id
      const text = msg.message?.text?.trim()
      if (!senderId || !text) continue

      const contactHint = extractContact(text)
      if (contactHint || detectLeadIntent(text)) {
        await sendTelegramLead({ senderId, messageText: text, contactHint })
      }

      let reply = ''
      if (BOOKING_URL && detectBookingIntent(text)) {
        reply = `Запись открыта. Выбери слот здесь: ${BOOKING_URL}\nЕсли удобнее без ссылки — напиши день и время, я закреплю.`
      } else {
        reply = await generateAiReply(text)
      }
      await sendInstagramMessage(senderId, reply)
    }
  }

  return NextResponse.json({ ok: true })
}

