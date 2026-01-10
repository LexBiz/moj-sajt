import { NextRequest, NextResponse } from 'next/server'

type AiRequest = {
  businessType?: string
  channel?: string
  pain?: string
  question?: string | null
  history?: { role: 'user' | 'assistant'; content: string }[]
  lang?: 'ua' | 'ru' | 'cz'
  mode?: 'show' | 'post'
  aiSummary?: string | null
}

const FALLBACK_RESPONSE =
  'Рекомендація: простий конвеєр — форми + автопередача в Telegram, швидкий автоответ у Instagram та трекінг джерел. Запускаємо за 3 дні, далі масштабуємо.'

function buildPrompt({ businessType, channel, pain, question, lang, mode }: AiRequest) {
  const parts = [
    `Бізнес: ${businessType || 'не вказано'}`,
    `Канали: ${channel || 'не вказано'}`,
    `Біль: ${pain || 'не вказано'}`,
    `Питання: ${question || 'без питання'}`,
  ]

  return [
    'Ти — інтерфейс готової системи прийому/фіксації/маршрутизації заявок. Не консультант, не продавець.',
    lang === 'ru' ? 'Язык ответа: русский.' : lang === 'cz' ? 'Jazyk odpovědi: čeština.' : 'Мова відповіді: українська.',
    'Система вже налаштована і працює. Жодних порад, жодних “потрібно/варто/рекомендую/вам слід”. Емодзі можна, але доречно і небагато.',
    'Говори просто, впевнено, коротко. Тільки про те, що система вже робить автоматично. Без теорії та навчання.',
    'Твоя мета — підтримати рішення купити/запустити систему, але без продавання: показуй цінність, впевнено і по фактам, без тиску.',
    'Якщо питання поза темою — мʼяко поверни до того, як система це закриває автоматично.',
    'Якщо питають про гроші/дорого/страх — не переконуй і не продавай. Дай коротку різницю “як є зараз” vs “як система вже прибирає хаос/ручну роботу/дзвінки”. Не повторюй канали, якщо вже згадував.',
    'Якщо кажуть “дорого/не бачу сенсу” — дай 2–3 короткі факти, чому це вигідно: швидше без дзвінків, мінус ручна робота, прозорий статус, менше втрат. Без тиску, але впевнено.',
    'Якщо питання дивне/провокативне/не по темі — відповідай мʼяко, без моралі, і поверни до логіки системи (процес замість хаосу).',
    'Режими:',
    'MODE=SHOW_SOLUTION: спрацьовує лише один раз. Поясни стисло, як система вже працює в цьому бізнесі. Не повторюй у майбутньому.',
    'MODE=POST_SOLUTION_DIALOG: відповідай тільки на нове питання. Не повторюй рішення, не повторюй канали/маршрути/“підтвердження”.',
    'Заборона повторів: не копіюй і не перефразовуй свої попередні відповіді. Якщо питання повторюється — дай 1–2 нові фрази або вкажи, що це вже показано, і додай нову деталь без дублювання.',
    'Уникай однакових вступів і структурованих списків, якщо їх уже давав. Кожна відповідь має бути новою, контекстною і короткою.',
    'Якщо відповідь ризикує повторити попередню: не повторюй канали/маршрути/підтвердження. Дай 2–3 нові маркери (SLA часу, відсутність дзвінків, скорочення ручної роботи) і вкажи, що базова конфігурація вже показана.',
    mode === 'post'
      ? [
          'MODE=POST_SOLUTION_DIALOG активний: дай 2–4 речення або 2–3 короткі маркери з новими деталями щодо питання. Не повторюй структуру рішення.',
          'Не повторюй “Клієнт залишає заявку…”, “Система збирає…”. Замість цього: відповідай по суті запиту (вартість/сумнів/оф-топ) і додай нову деталь про результат (час, відсутність дзвінків, мінус ручна робота).',
        ].join('\n')
      : [
          'MODE=SHOW_SOLUTION: дай структуровану відповідь один раз.',
          'Структура відповіді:',
          'Заголовок: "Як система працює у твоєму бізнесі"',
          'Блок 1 — Що робить клієнт: 1–2 речення (без фантазій).',
          'Блок 2 — Що робить система: 3–5 маркерів, тільки автоматичні дії, можна з емодзі та роздільниками (тире/двокрапка).',
          'Блок 3 — Результат: 2–3 короткі речення, факт, без емоцій.',
          'Фінал: підкресли, що це одна цілісна система (сторінка + логіка + автоматизація + AI).',
        ].join('\n'),
    '',
    parts.join('\n'),
  ].join('\n')
}

async function callOpenAI(prompt: string, history?: { role: 'user' | 'assistant'; content: string }[]) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Ти — інтерфейс готової системи прийому заявок. Не консультуєш, не продаєш. Якщо режим SHOW_SOLUTION — даєш структуру один раз. Якщо режим POST_SOLUTION_DIALOG — без списків, 2–4 речення, не повторюєш конфігурацію, лише нові деталі по питанню. Без слів типу "потрібно/варто/рекомендую", без порад робити самому. Емодзі можна трохи. Коротко, просто, спокійно. Уникай повторів маркерів і вступів. Мета — підтверджувати цінність і знімати сумніви фактами (SLA, мінус хаос, без дзвінків), але без тиску.',
        },
        ...(history || []),
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      presence_penalty: 1.2,
      frequency_penalty: 1.2,
      max_tokens: 240,
    }),
  })

  if (!response.ok) return null

  const json = (await response.json()) as any
  const content = json?.choices?.[0]?.message?.content?.trim()
  let summary: string | null = null
  if (content) {
    const sentences = content.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').trim()
    summary = sentences || null
  }
  return { content: content || null, summary }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AiRequest
    const prompt = buildPrompt(body)

    const aiResult = await callOpenAI(prompt, body.history)
    const answer = aiResult?.content || FALLBACK_RESPONSE
    const summary = aiResult?.summary || null

    return NextResponse.json({
      answer,
      recommendation: answer,
      summary,
      provider: aiResult?.content ? 'openai' : 'fallback',
    })
  } catch (error) {
    console.error('AI route error', error)
    return NextResponse.json(
      { answer: FALLBACK_RESPONSE, recommendation: FALLBACK_RESPONSE, summary: null, provider: 'fallback' },
      { status: 200 }
    )
  }
}



