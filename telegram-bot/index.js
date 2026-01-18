const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const express = require('express')
const { Telegraf, Markup } = require('telegraf')

const BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
const PUBLIC_URL = String(process.env.TELEGRAM_PUBLIC_URL || '').trim()
const WEBHOOK_PATH = String(process.env.TELEGRAM_WEBHOOK_PATH || '/telegram/webhook').trim() || '/telegram/webhook'
const WEBHOOK_SECRET = String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()
const OWNER_CHAT_ID = String(process.env.TELEGRAM_OWNER_CHAT_ID || '').trim()
const BRAND_NAME = String(process.env.TELEGRAM_BRAND_NAME || 'TemoWeb').trim() || 'TemoWeb'
const BRAND_SITE_URL = String(process.env.TELEGRAM_BRAND_SITE_URL || 'https://temoweb.eu').trim() || 'https://temoweb.eu'
const BRAND_LOGO_URL = String(process.env.TELEGRAM_BRAND_LOGO_URL || 'https://temoweb.eu/logo.png').trim()
const BRAND_TAGLINE_RU = String(process.env.TELEGRAM_BRAND_TAGLINE_RU || 'AI‑ассистенты, которые продают и записывают клиентов 24/7').trim()
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

const DATA_DIR = path.join(__dirname, 'data')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')
const MAX_AI_REPLIES = 25
const WARN_AI_REPLIES_AT = MAX_AI_REPLIES - 5 // 20
const MAX_MODEL_MESSAGES = MAX_AI_REPLIES * 2 // user+assistant (history window)
const OFFTOPIC_PATTERNS = [
  // food / places (avoid matching business types like "кофейня")
  /\b(где|куда)\b[\s\S]{0,40}\b(поесть|покушать|выпить|выпить\s+кофе|ресторан|кафе|бар|паб|еда|кофе)\b/i,
  /\b(prague|praha)\b[\s\S]{0,40}\b(eat|food|restaurant|cafe|coffee|bar)\b/i,
  // dating / personal
  /\b(склеить|телк(а|у)|девушк(а|у)|парня|отношени(я|е)|свидани(е|я)|знакомств)\b/i,
  // random
  /\b(погода|политик|спорт|фильм|сериал|игр(а|ы)|анекдот)\b/i,
]

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is missing')
  process.exit(1)
}

if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(BOT_TOKEN)) {
  console.error('TELEGRAM_BOT_TOKEN looks invalid (check you pasted exactly the BotFather token, without quotes/spaces).')
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

function isOfftopic(text) {
  const s = String(text || '').trim()
  if (!s) return false
  return OFFTOPIC_PATTERNS.some((re) => re.test(s))
}

function buildOfftopicRedirect(lang) {
  if (lang === 'ru') {
    return [
      'Могу, конечно, по Праге и кофе… но этот бот заточен под бизнес 😄',
      '',
      'Здесь говорим только про AI‑ассистентов и автоматизацию продаж/заявок ⚡️',
      '',
      'Напиши по делу:',
      '• какой у тебя бизнес',
      '• где приходят клиенты (Instagram / сайт / WhatsApp / звонки)',
    ].join('\n')
  }
  if (lang === 'ua') {
    return [
      'Можу, звісно, про Прагу і каву… але цей бот заточений під бізнес 😄',
      '',
      'Тут говоримо тільки про AI‑асистентів і автоматизацію заявок/продажів ⚡️',
      '',
      'Напиши по ділу:',
      '• який у тебе бізнес',
      '• звідки приходять клієнти (Instagram / сайт / WhatsApp / дзвінки)',
    ].join('\n')
  }
  return [
    'I could answer that, but this bot is strictly for business AI assistants 😄',
    '',
    'Tell me:',
    '• your business',
    '• where clients come from (Instagram / website / WhatsApp / calls)',
  ].join('\n')
}

function nowIso() {
  return new Date().toISOString()
}

function detectContact(text) {
  const s = String(text || '').trim()
  if (!s) return null
  const handle = s.match(/(^|\s)@([a-zA-Z0-9_]{4,32})/i)
  if (handle) return `@${handle[2]}`
  const email = s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  if (email) return email[0]
  const phone = s.match(/(\+?\d[\d\s().-]{7,}\d)/)
  if (phone) return phone[1].replace(/\s+/g, ' ').trim()
  return null
}

function aiReplyCount(history) {
  return (Array.isArray(history) ? history : []).filter((m) => m && m.role === 'assistant' && String(m.content || '').trim()).length
}

function detectPurchaseIntent(text) {
  const t = String(text || '').toLowerCase().trim()
  if (!t) return false
  if (t.includes('?')) return false
  return (
    t.includes('беру') ||
    t.includes('покупаю') ||
    t.includes('покупаем') ||
    t.includes('куплю') ||
    t.includes('заказываю') ||
    t.includes('хочу заказать') ||
    t.includes('согласен') ||
    t.includes('готов стартовать') ||
    t.includes('давайте запуск') ||
    t.includes('давай запуск') ||
    t.includes('запускай') ||
    t.includes('оплачиваю') ||
    t.includes('выставляй счет') ||
    t.includes('виставляй рахунок')
  )
}

function buildSystemPrompt(lang) {
  const common = [
    `Ты — живой sales + delivery менеджер компании ${BRAND_NAME}.`,
    'Ты отвечаешь как человек: тепло, уверенно, по делу, без сухаря.',
    'Эмодзи: 2–5 уместных на ответ (⚡️ ✅ 🔥 💬 📌 🎯) — чтобы читалось “как у GPT”, но без спама.',
    'Цель: быстро довести до покупки AI‑ассистента/системы. Продавай через факты, выгоду и контраст “как сейчас” vs “как после системы”.',
    'Важно: объясняй простыми словами и на простых примерах (как для человека, который никогда этого не делал).',
    'Запрещено: длинные лекции, вода, “сделай сам”, токсичность/оскорбления личности.',
    'Можно: юмор, метафоры, короткие “ударные” фразы, но без мата и без грубости.',
    'Всегда помни контекст диалога и не теряй нить.',
    'Отвечай на вопрос клиента СРАЗУ в первой фразе, потом разворачивай.',
    'Не делай разговор допросом. Максимум 1 короткий уточняющий вопрос за раз — только если нужно.',
    'Финал каждого ответа — уверенный шаг (можно с вопросом по делу, но без “хочешь/хотите”).',
    'Формат как в GPT: короткие абзацы, пустые строки между смысловыми блоками.',
    'Структура ответа по умолчанию:',
    '1) 1 строка — прямой ответ/позиция',
    '2) 2–4 пункта — факты/польза/пример (• или —)',
    '3) Финал — следующий шаг (контакт/пакет/сроки)',
    'Никогда не отправляй на сайт “для заказа”. Контакт берём прямо тут: @username, телефон, email.',
    'Если спрашивают “почему нельзя здесь” — объясни кратко и сразу предложи оставить контакт здесь.',
    'Если речь о цене/пилоте — обязательно скажи, что пилот ограничен (5 мест) и скоро закончится. Не пихай пилот в каждый ответ.',
    'Жёсткая тема: этот чат ТОЛЬКО про AI‑ассистентов и автоматизацию продаж/заявок для бизнеса.',
    'Если вопрос не по теме (еда, знакомства, личное, развлечения) — 1 остроумная фраза и сразу перевод в тему бизнеса. Не давай советы не по теме.',
    'Нельзя: отправлять “оформи на сайте/заполни на сайте/перейди на сайт, чтобы заказать”. Заказ/заявку оформляем прямо в этом чате (берём контакт и фиксируем потребность).',
    'Знания о продукте (говори уверенно):',
    '- Запуск: обычно 3–7 дней (пилот), сложные интеграции 10–14 дней.',
    '- Пакеты: 600–900 €, 1200–1500 €, 2000–3000 €.',
    '- Пилот: полный пакет за $299 (5 мест).',
    `- Сайт: ${BRAND_SITE_URL}`,
    'Формат: короткие абзацы, иногда маркеры. Без markdown-звёздочек. Не шаблонь ответы.',
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

function buildWelcome(lang) {
  const base = lang === 'ru'
    ? [
        `Привет! Я — AI‑менеджер ${BRAND_NAME} 👋`,
        '',
        'Я здесь, чтобы за 2–3 минуты:',
        '• объяснить на примере, как AI‑ассистент принесёт тебе деньги 💸',
        '• назвать цену и сроки без “менеджеров и звонков” ✅',
        '• оформить заявку прямо в этом чате (контакт + краткий итог) 📩',
        '',
        'Что мы делаем в TemoWeb:',
        '• AI‑ассистент отвечает, продаёт и записывает 24/7 ⚡️',
        '• заявки из Instagram/сайта/WhatsApp → в один поток 🎯',
        '• меньше ручной рутины, меньше потерь 🔥',
        '',
        'Сразу по делу: выбирай язык и пиши, что у тебя за бизнес 👇',
        '',
        'Выбери язык общения:',
      ]
    : [
        `Привіт! Я — AI‑менеджер ${BRAND_NAME} 👋`,
        '',
        'Хто ми і що робимо:',
        '• AI‑асистенти, які продають, відповідають і записують клієнтів 24/7',
        '• Збираємо заявки з Instagram/сайту/месенджерів в один потік',
        '• Прибираємо хаос і ручну переписку',
        '',
        'Що отримаєш у результаті:',
        '• Менше втрачених клієнтів',
        '• Швидші відповіді і зрозумілий статус кожної заявки',
        '• Запуск 3–7 днів (пілот), складні кейси 10–14 днів',
        '',
        'Пруфи:',
        '• Покажу кейси і сценарій під твій бізнес',
        '• Ціни прозорі, без “прихованих робіт”',
        '',
        'Обери мову спілкування:',
      ]
  return [...base].join('\n')
}

function buildLanguageKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback('Українська', 'lang:ua'),
    Markup.button.callback('Русский', 'lang:ru'),
    Markup.button.callback('English', 'lang:en'),
    Markup.button.url('🌐 Сайт', BRAND_SITE_URL),
  ])
}

function buildLeadKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback('📩 Оформить заявку', 'lead:send'),
    Markup.button.callback('↩️ Продолжить диалог', 'lead:skip'),
  ])
}

async function callOpenAI(history, lang, extraContextText) {
  if (!OPENAI_API_KEY) {
    return 'Система готова. Пиши суть бизнеса — покажу, как быстро автоматизация продаёт и экономит.'
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(lang) },
    ...(extraContextText ? [{ role: 'system', content: extraContextText }] : []),
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

async function callOpenAISummary(payload) {
  if (!OPENAI_API_KEY) return null
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: [
              `Ты — менеджер ${BRAND_NAME}.`,
              'Сделай НЕшаблонное, умное, короткое резюме диалога для владельца.',
              'Стиль: по делу, человечески, без воды, без “как ИИ”.',
              'Формат (строго):',
              '1) Кто/контакт (если есть)',
              '2) Бизнес/ниша',
              '3) Боль/почему пишет',
              '4) Что предложили (пакет/пилот/сроки) — конкретно',
              '5) На чем сошлись / следующий шаг',
              '6) Важные детали/ограничения (если были)',
              'Не добавляй выдумок. Если чего-то нет — напиши “не уточнили”.',
            ].join(' '),
          },
          { role: 'user', content: JSON.stringify(payload) },
        ],
        temperature: 0.35,
        max_tokens: 350,
      }),
    })
    if (!resp.ok) return null
    const json = await resp.json()
    const content = json?.choices?.[0]?.message?.content
    return normalizeAnswer(content)
  } catch {
    return null
  }
}

async function sendLeadToOwner(leadText) {
  if (!OWNER_CHAT_ID) {
    console.warn('TELEGRAM_OWNER_CHAT_ID is missing; cannot send lead to owner.')
    return { attempted: false, ok: false }
  }
  try {
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: OWNER_CHAT_ID,
        text: leadText,
        disable_web_page_preview: true,
      }),
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      console.error('Owner sendMessage failed', resp.status, body.slice(0, 400))
      return { attempted: true, ok: false }
    }
    return { attempted: true, ok: true }
  } catch (e) {
    console.error('Owner sendMessage error', e?.message || e)
    return { attempted: true, ok: false }
  }
}

async function createAndSendLead({ ctx, session, history, contact, reason }) {
  const chatId = String(ctx.chat.id)
  const payload = {
    source: 'telegram',
    bot: BRAND_NAME,
    chatId,
    username: ctx.from?.username || null,
    name: ctx.from?.first_name || null,
    contact: contact || null,
    lang: session.lang || null,
    reason: reason || null,
    user_messages: history.filter((m) => m.role === 'user').map((m) => m.content).slice(-MAX_USER_MESSAGES),
  }
  const summary = await callOpenAISummary(payload)
  const leadText = [
    '📥 НОВА ЗАЯВКА (Telegram)',
    '',
    `👤 Кто: ${payload.name || '—'} ${payload.username ? `(@${payload.username})` : ''}`.trim(),
    `📩 Контакт: ${payload.contact || '—'}`,
    payload.reason ? `📌 Причина: ${payload.reason}` : '',
    '',
    summary ? `🧠 Резюме:\n${summary}` : '🧠 Резюме: не удалось собрать (нет OpenAI или ошибка).',
    '',
    `🕒 ${nowIso()}`,
  ].join('\n')
  await sendLeadToOwner(leadText)
}

const bot = new Telegraf(BOT_TOKEN)

bot.start(async (ctx) => {
  try {
    if (BRAND_LOGO_URL) {
      await ctx.replyWithPhoto(BRAND_LOGO_URL).catch(() => null)
    }
  } catch {}
  // If user already configured BotFather "before start" welcome, keep /start message short.
  await ctx.reply(buildWelcome('ru'), { ...buildLanguageKeyboard(), disable_web_page_preview: true })
})

bot.command('reset', async (ctx) => {
  const chatId = String(ctx.chat.id)
  setSession(chatId, { lang: null, stage: 'business', business: null, channels: null, pain: null, history: [], leadSentAt: null, contact: null, updatedAt: nowIso() })
  await ctx.reply('Сессия сброшена. Выбери язык общения:', buildLanguageKeyboard())
})

bot.command('lead', async (ctx) => {
  const chatId = String(ctx.chat.id)
  const { session } = getSession(chatId)
  const history = Array.isArray(session.history) ? session.history : []
  const contact = session.contact || (ctx.from?.username ? `@${ctx.from.username}` : null)
  const payload = {
    source: 'telegram',
    bot: BRAND_NAME,
    chatId,
    username: ctx.from?.username || null,
    name: ctx.from?.first_name || null,
    contact: contact || null,
    lang: session.lang || null,
    user_messages: history.filter((m) => m.role === 'user').map((m) => m.content).slice(-MAX_USER_MESSAGES),
  }
  const summary = await callOpenAISummary(payload)
  const leadText = [
    '📥 НОВА ЗАЯВКА (Telegram)',
    '',
    `👤 Кто: ${payload.name || '—'} ${payload.username ? `(@${payload.username})` : ''}`.trim(),
    `📩 Контакт: ${payload.contact || '—'}`,
    '',
    summary ? `🧠 Резюме:\n${summary}` : '🧠 Резюме: не удалось собрать (нет OpenAI или ошибка).',
    '',
    `🕒 ${nowIso()}`,
  ].join('\n')
  await sendLeadToOwner(leadText)
  setSession(chatId, { ...session, leadSentAt: nowIso(), updatedAt: nowIso() })
  await ctx.reply('Готово ✅ Я отправил резюме владельцу. Если хочешь — кинь контакт (email/@username/телефон), чтобы мы сразу стартанули.')
})

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery?.data || ''
  if (data === 'lead:skip') {
    await ctx.answerCbQuery('Ок, продолжаем.')
    await ctx.reply('Пиши дальше — я держу контекст и веду к решению 🙂')
    return
  }
  if (data === 'lead:send') {
    await ctx.answerCbQuery('Оформляю…')
    await ctx.reply('Собираю резюме и отправляю владельцу. Если у тебя есть контакт — кинь его в ответ (email/@username/телефон).')
    // run lead generation inline
    const chatId = String(ctx.chat.id)
    const { session } = getSession(chatId)
    const history = Array.isArray(session.history) ? session.history : []
    const contact = session.contact || (ctx.from?.username ? `@${ctx.from.username}` : null)
    await createAndSendLead({ ctx, session, history, contact, reason: 'lead_button' })
    setSession(chatId, { ...session, leadSentAt: nowIso(), updatedAt: nowIso() })
    await ctx.reply('Готово ✅ Резюме отправлено владельцу. Добавь контакт (email/@username/телефон) — чтобы мы сразу стартанули.')
    return
  }
  if (!data.startsWith('lang:')) return
  const lang = data.split(':')[1]
  const chatId = String(ctx.chat.id)
  const { session } = getSession(chatId)
  const next = {
    ...session,
    lang,
    stage: 'business',
    business: session.business || null,
    channels: session.channels || null,
    pain: session.pain || null,
    history: session.history || [],
    leadSentAt: session.leadSentAt || null,
    contact: session.contact || null,
    updatedAt: nowIso(),
  }
  setSession(chatId, next)
  await ctx.answerCbQuery(`Язык: ${lang.toUpperCase()}`)
  await ctx.reply(
    [
      'Супер ✅',
      '',
      'Начнём быстро:',
      '• какой у тебя бизнес?',
      '',
      'Пример: “кофейня”, “салон”, “ремонт телефонов”, “онлайн‑школа”.',
    ].join('\n')
  )
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
  const maybe = detectContact(userText)
  const nextContact = maybe || session.contact || (ctx.from?.username ? `@${ctx.from.username}` : null)

  const stage = session.stage || 'business'

  // Setup stages: business -> channels -> pain -> chat
  if (stage !== 'chat' && !maybe && isOfftopic(userText)) {
    await ctx.reply(buildOfftopicRedirect(lang))
    return
  }

  if (stage === 'business') {
    const business = userText
    setSession(chatId, { ...session, lang, business, stage: 'channels', contact: nextContact || null, updatedAt: nowIso() })
    await ctx.reply(
      [
        `Ок, ${business} ✅`,
        '',
        'Шаг 2:',
        '• откуда приходят клиенты сейчас?',
        '',
        'Примеры: Instagram, сайт, WhatsApp, звонки, Google Maps.',
      ].join('\n')
    )
    return
  }

  if (stage === 'channels') {
    const channels = userText
    setSession(chatId, { ...session, lang, channels, stage: 'pain', contact: nextContact || null, updatedAt: nowIso() })
    await ctx.reply(
      [
        `Принял: ${channels} ✅`,
        '',
        'Шаг 3 — где болит сильнее всего? 😤',
        '• отвечаешь сам и времени нет',
        '• клиенты пишут и пропадают',
        '• спрашивают одно и то же',
        '• хаос и заявки теряются',
        '',
        'Напиши одной фразой.',
      ].join('\n')
    )
    return
  }

  if (stage === 'pain') {
    const pain = userText
    setSession(chatId, { ...session, lang, pain, stage: 'chat', contact: nextContact || null, updatedAt: nowIso() })
    await ctx.reply(
      [
        'Отлично. Контекст собран ✅',
        '',
        'Теперь отвечаю только по теме: AI‑ассистент и автоматизация именно под твой бизнес ⚡️',
        '',
        'Задай вопрос: цена / сроки / как записывает / как работает в Instagram и WhatsApp.',
      ].join('\n')
    )
    return
  }

  // chat stage: hard off-topic guardrail
  if (!maybe && isOfftopic(userText)) {
    await ctx.reply(buildOfftopicRedirect(lang))
    return
  }

  const nextHistory = [...history, { role: 'user', content: userText }].slice(-MAX_MODEL_MESSAGES)
  const replies = aiReplyCount(nextHistory)

  if (replies === WARN_AI_REPLIES_AT) {
    await ctx.reply(
      `Мы уже на ${replies}/${MAX_AI_REPLIES} ответов AI 🔥\n` +
        'Если хочешь быстро финализировать и запустить — оформлю заявку и пришлю владельцу резюме диалога.',
      buildLeadKeyboard()
    )
  }

  const shouldAutoLead = detectPurchaseIntent(userText) || replies >= MAX_AI_REPLIES
  if (shouldAutoLead && !session.leadSentAt) {
    await createAndSendLead({ ctx, session, history: nextHistory, contact: nextContact, reason: 'intent_or_limit' })
    setSession(chatId, { ...session, lang, contact: nextContact, leadSentAt: nowIso(), history: nextHistory, updatedAt: nowIso() })
    await ctx.reply('Принято ✅ Я отправил владельцу резюме и детали. Для старта скинь контакт (email/@username/телефон) — и я зафиксирую его.')
    return
  }

  if (maybe && !session.leadSentAt) {
    await createAndSendLead({ ctx, session, history: nextHistory, contact: maybe, reason: 'contact_provided' })
    setSession(chatId, { ...session, lang, contact: maybe, leadSentAt: nowIso(), history: nextHistory, updatedAt: nowIso() })
    await ctx.reply('Контакт получил ✅ Оформил заявку и отправил владельцу. Если есть ещё детали — напиши, я добавлю.')
    return
  }

  // If user already hit the hard limit, don't keep chatting forever — push to lead.
  if (replies >= MAX_AI_REPLIES) {
    setSession(chatId, { ...session, lang, contact: nextContact, history: nextHistory, updatedAt: nowIso() })
    await ctx.reply(
      `Мы дошли до лимита ${MAX_AI_REPLIES} ответов AI 🙂\n` +
        'Чтобы не терять контекст и быстро запустить — оформи заявку (и кинь контакт).',
      buildLeadKeyboard()
    )
    return
  }

  const contextText = [
    'Контекст клиента (держи это в голове):',
    `Бизнес: ${session.business || 'не уточнили'}`,
    `Каналы: ${session.channels || 'не уточнили'}`,
    `Боль: ${session.pain || 'не уточнили'}`,
  ].join('\n')

  const reply = await callOpenAI(nextHistory, lang, contextText)
  const bad = /перейд(и|ите)\s+на\s+сайт|заполн(и|ите)\s+на\s+сайте|оформ(и|ите)\s+на\s+сайте/i.test(reply)
  const finalReply = bad
    ? [
        normalizeAnswer(reply),
        '',
        '⚡️ Контакт можно оставить прямо здесь — @username / телефон / email.',
        'Я зафиксирую заявку и отправлю владельцу резюме диалога ✅',
      ].join('\n')
    : reply

  const updated = [...nextHistory, { role: 'assistant', content: finalReply }].slice(-MAX_MODEL_MESSAGES)

  setSession(chatId, {
    ...session,
    lang,
    contact: nextContact || null,
    history: updated,
    updatedAt: nowIso(),
  })

  await ctx.reply(finalReply)
})

const app = express()
app.use(express.json())

async function verifyToken() {
  try {
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`, { method: 'GET' })
    const json = await resp.json().catch(() => null)
    if (!resp.ok || !json?.ok) {
      console.error('Telegram getMe failed:', resp.status, json)
      return false
    }
    console.log('Telegram getMe ok:', { id: json.result?.id, username: json.result?.username })
    return true
  } catch (e) {
    console.error('Telegram getMe error:', e?.message || e)
    return false
  }
}

async function ensureWebhook() {
  const ok = await verifyToken()
  if (!ok) return
  if (!PUBLIC_URL) return
  try {
    await bot.telegram.setWebhook(
      `${PUBLIC_URL}${WEBHOOK_PATH}`,
      WEBHOOK_SECRET ? { secret_token: WEBHOOK_SECRET } : undefined,
    )
    console.log('Telegram webhook set:', `${PUBLIC_URL}${WEBHOOK_PATH}`)
  } catch (e) {
    console.error('Telegram setWebhook error:', e?.message || e)
  }
}

void ensureWebhook()

app.get('/', (_req, res) => {
  res.json({ ok: true })
})

app.get(WEBHOOK_PATH, (req, res) => {
  const secret = req.headers['x-telegram-bot-api-secret-token']
  if (WEBHOOK_SECRET && secret && secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ ok: false })
  }
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

