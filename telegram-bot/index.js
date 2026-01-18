const fs = require('fs')
const path = require('path')
const express = require('express')
const { Telegraf, Markup } = require('telegraf')

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const PUBLIC_URL = process.env.TELEGRAM_PUBLIC_URL || ''
const WEBHOOK_PATH = process.env.TELEGRAM_WEBHOOK_PATH || '/telegram/webhook'
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

const DATA_DIR = path.join(__dirname, 'data')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')
const MAX_HISTORY = 10

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is missing')
  process.exit(1)
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}
if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}))
}

function loadSessions() {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function saveSessions(sessions) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
}

function getSession(chatId) {
  const sessions = loadSessions()
  const existing = sessions[chatId] || {}
  return { sessions, session: existing }
}

function setSession(chatId, data) {
  const { sessions } = getSession(chatId)
  sessions[chatId] = data
  saveSessions(sessions)
}

function normalizeAnswer(text) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .replace(/\*(?=\S)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function buildSystemPrompt(lang) {
  const common = [
    'Ты — AI-ассистент по продажам AI-ассистентов для бизнеса.',
    'Стиль: уверенно, дерзко, остроумно, но без оскорблений личности.',
    'Цель: агрессивная продажа через факты и контраст “как сейчас” vs “как после системы”.',
    'Запрещено: вода, лекции, советы “сделай сам”.',
    'Никогда не задавай вопрос “хочешь/хотите/нужно ли”. Финал — утверждение и действие.',
    'Если оффтоп — 1 короткая колкая связка и сразу к теме заявок/скорости/денег.',
    'Формат: короткие абзацы, можно маркеры, без markdown-звёздочек.',
    'Знания:',
    '- Запуск: обычно 3–7 дней (пилот), сложные интеграции 10–14 дней.',
    '- Пакеты: 600–900 €, 1200–1500 €, 2000–3000 €.',
    '- Пилот: полный пакет за $299 (5 мест).',
  ]

  if (lang === 'ru') return common.join(' ')
  if (lang === 'ua')
    return common
      .join(' ')
      .replace('Ты — AI-ассистент', 'Ти — AI-асистент')
      .replace('агрессивная продажа', 'агресивний продаж')
      .replace('Никогда не задавай вопрос', 'Ніколи не став питання')
  return common.join(' ')
}

function buildWelcome() {
  return [
    'Я AI-ассистент по заказу AI‑ботов для бизнеса.',
    'Расскажу, как это принесёт деньги и срежет ручную работу.',
    '',
    'Выбери язык общения:',
  ].join('\n')
}

function buildLanguageKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback('Українська', 'lang:ua'),
    Markup.button.callback('Русский', 'lang:ru'),
    Markup.button.callback('English', 'lang:en'),
  ])
}

async function callOpenAI(history, lang) {
  if (!OPENAI_API_KEY) {
    return 'Система готова. Пиши суть бизнеса — покажу, как быстро автоматизация продаёт и экономит.'
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(lang) },
    ...history,
  ]

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.9,
      presence_penalty: 0.2,
      frequency_penalty: 0.2,
      max_tokens: 420,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    console.error('OpenAI error', resp.status, text.slice(0, 300))
    return 'Система в онлайне. Дай пару деталей по бизнесу — покажу точную схему и цену.'
  }

  const json = await resp.json()
  const content = json?.choices?.[0]?.message?.content
  return normalizeAnswer(content)
}

const bot = new Telegraf(BOT_TOKEN)

bot.start(async (ctx) => {
  await ctx.reply(buildWelcome(), buildLanguageKeyboard())
})

bot.command('reset', async (ctx) => {
  const chatId = String(ctx.chat.id)
  setSession(chatId, { lang: null, history: [], updatedAt: new Date().toISOString() })
  await ctx.reply('Сессия сброшена. Выбери язык общения:', buildLanguageKeyboard())
})

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery?.data || ''
  if (!data.startsWith('lang:')) return
  const lang = data.split(':')[1]
  const chatId = String(ctx.chat.id)
  const { session } = getSession(chatId)
  const next = {
    ...session,
    lang,
    history: session.history || [],
    updatedAt: new Date().toISOString(),
  }
  setSession(chatId, next)
  await ctx.answerCbQuery(`Язык: ${lang.toUpperCase()}`)
  await ctx.reply('Готов. Пиши свой вопрос — отвечаю по делу.')
})

bot.on('text', async (ctx) => {
  const chatId = String(ctx.chat.id)
  const { session } = getSession(chatId)
  const lang = session.lang || null

  if (!lang) {
    await ctx.reply('Сначала выбери язык общения:', buildLanguageKeyboard())
    return
  }

  const userText = ctx.message.text.trim()
  const history = Array.isArray(session.history) ? session.history : []
  const nextHistory = [...history, { role: 'user', content: userText }].slice(-MAX_HISTORY)

  const reply = await callOpenAI(nextHistory, lang)
  const updated = [...nextHistory, { role: 'assistant', content: reply }].slice(-MAX_HISTORY)

  setSession(chatId, {
    ...session,
    lang,
    history: updated,
    updatedAt: new Date().toISOString(),
  })

  await ctx.reply(reply)
})

const app = express()
app.use(express.json())

if (PUBLIC_URL) {
  bot.telegram.setWebhook(`${PUBLIC_URL}${WEBHOOK_PATH}`, WEBHOOK_SECRET ? { secret_token: WEBHOOK_SECRET } : undefined)
}

app.get('/', (_req, res) => {
  res.json({ ok: true })
})

app.post(WEBHOOK_PATH, (req, res) => {
  const secret = req.headers['x-telegram-bot-api-secret-token']
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ ok: false })
  }
  bot.handleUpdate(req.body, res)
})

const port = Number(process.env.PORT || 3020)
app.listen(port, () => {
  console.log(`Telegram bot listening on ${port}`)
})

