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

function getLang(lang?: AiRequest['lang']) {
  return lang === 'ru' || lang === 'cz' ? lang : 'ua'
}

function buildFallback({ businessType, channel, pain, question, lang, mode }: AiRequest) {
  const lng = getLang(lang)
  const business = businessType || (lng === 'ru' ? 'не указано' : lng === 'cz' ? 'neuvedeno' : 'не вказано')
  const channels = channel || (lng === 'ru' ? 'не указано' : lng === 'cz' ? 'neuvedeno' : 'не вказано')
  const pains = pain || (lng === 'ru' ? 'не указано' : lng === 'cz' ? 'neuvedeno' : 'не вказано')
  const q = question || (lng === 'ru' ? 'без вопроса' : lng === 'cz' ? 'bez otázky' : 'без питання')

  const qLower = (question || '').toLowerCase()
  const isPrice =
    qLower.includes('дорог') ||
    qLower.includes('цена') ||
    qLower.includes('сколько') ||
    qLower.includes('варт') ||
    qLower.includes('cena') ||
    qLower.includes('kolik')

  // Post mode: short, non-repeating, answer the new question
  if (mode === 'post') {
    if (lng === 'ru') {
      return isPrice
        ? `Про “дорого” — это не переплата за чат‑бота, а экономия на потерях и ручной работе: меньше пропущенных заявок, быстрее ответы без звонков, и понятный статус по каждому клиенту. Базовую схему я уже показала — тут важна окупаемость в твоих каналах (${channels}).`
        : `Я отвечу по вопросу: “${q}”. Базовую схему я уже показала — тут добавлю новую деталь: система держит единый статус заявки и не даёт ей “утечь” между каналами (${channels}), поэтому меньше ручной рутины и потерь.`
    }
    if (lng === 'cz') {
      return isPrice
        ? `K “je to drahé” — není to platba za chatbot, ale úspora ztrát a ruční práce: méně ztracených poptávek, rychlejší reakce bez volání, jasný status u každého klienta. Základní schéma už jsem ukázal — tady jde o návratnost v kanálech (${channels}).`
        : `Odpovím k dotazu: “${q}”. Základní schéma už jsem ukázal — tady přidám novou věc: systém drží jednotný status poptávky a nenechá ji “utéct” mezi kanály (${channels}), takže méně ruční práce a ztrát.`
    }
    return isPrice
      ? `Про “дорого” — це не оплата за чат‑бота, а економія на втратах і ручній роботі: менше пропущених заявок, швидша відповідь без дзвінків, і прозорий статус по кожному клієнту. Базову схему я вже показала — тут важлива окупність у твоїх каналах (${channels}).`
      : `Відповім по питанню: “${q}”. Базову схему я вже показала — додам нову деталь: система тримає єдиний статус заявки і не дає їй “утекти” між каналами (${channels}), тому менше ручної рутини й втрат.`
  }

  if (lng === 'ru') {
    return `Как система работает в твоём бизнесе\n\nКлиент: оставляет заявку/сообщение и задаёт вопрос (“${q}”).\nСистема:\n- фиксирует заявку и источник: ${channels}\n- уточняет детали под ${business}\n- отвечает по частым вопросам и снимает сомнения по фактам\n- отправляет тебе контакт и краткий итог\n\nРезультат: меньше ручных переписок и потерь, заявки не пропадают. Это одна система (страница + логика + автоматизация + AI).`
  }
  if (lng === 'cz') {
    return `Jak systém funguje ve tvém byznysu\n\nKlient: nechá poptávku/zprávu a ptá se (“${q}”).\nSystém:\n- uloží poptávku a zdroj: ${channels}\n- upřesní detaily pro ${business}\n- odpoví na časté otázky a zvedne jistotu po faktech\n- pošle ti kontakt a krátké shrnutí\n\nVýsledek: méně ruční práce a ztrát, poptávky nemizí. Je to jeden systém (stránka + logika + automatizace + AI).`
  }
  return `Як система працює у твоєму бізнесі\n\nКлієнт: лишає заявку/повідомлення і питає (“${q}”).\nСистема:\n- фіксує заявку і джерело: ${channels}\n- уточнює деталі під ${business}\n- відповідає на типові питання і знімає сумніви по фактах\n- відправляє тобі контакт і короткий підсумок\n\nРезультат: менше ручної переписки й втрат, заявки не губляться. Це одна система (сторінка + логіка + автоматизація + AI).`
}

function buildContext({ businessType, channel, pain, lang, mode }: AiRequest) {
  const lng = getLang(lang)
  const parts = [
    lng === 'ru'
      ? `Бизнес: ${businessType || 'не указано'}`
      : lng === 'cz'
      ? `Byznys: ${businessType || 'neuvedeno'}`
      : `Бізнес: ${businessType || 'не вказано'}`,
    lng === 'ru'
      ? `Каналы: ${channel || 'не указано'}`
      : lng === 'cz'
      ? `Kanály: ${channel || 'neuvedeno'}`
      : `Канали: ${channel || 'не вказано'}`,
    lng === 'ru'
      ? `Боль: ${pain || 'не указано'}`
      : lng === 'cz'
      ? `Bolest: ${pain || 'neuvedeno'}`
      : `Біль: ${pain || 'не вказано'}`,
  ]

  const langLine = lng === 'ru' ? 'Язык ответа: русский (только русский).' : lng === 'cz' ? 'Jazyk odpovědi: čeština (pouze česky).' : 'Мова відповіді: українська (тільки українською).'
  const modeLine =
    lng === 'ru'
      ? `Режим: ${mode === 'post' ? 'POST_SOLUTION_DIALOG' : 'SHOW_SOLUTION'}`
      : lng === 'cz'
      ? `Režim: ${mode === 'post' ? 'POST_SOLUTION_DIALOG' : 'SHOW_SOLUTION'}`
      : `Режим: ${mode === 'post' ? 'POST_SOLUTION_DIALOG' : 'SHOW_SOLUTION'}`

  return [
    lng === 'ru'
      ? 'Ты — интерфейс готовой системы приёма/фиксации/маршрутизации заявок. Не консультант, не продавец.'
      : lng === 'cz'
      ? 'Jsi rozhraní hotového systému pro příjem/uložení/směrování poptávek. Nejsi konzultant ani prodejce.'
      : 'Ти — інтерфейс готової системи прийому/фіксації/маршрутизації заявок. Не консультант, не продавець.',
    langLine,
    lng === 'ru'
      ? 'Система уже настроена и работает. Никаких советов в стиле “нужно/рекомендую/вам следует”. Эмодзи можно, но уместно и немного.'
      : lng === 'cz'
      ? 'Systém už je nastavený a běží. Žádné rady typu “měl bys/doporučuji”. Emojis jen málo a u rozumných míst.'
      : 'Система вже налаштована і працює. Жодних порад, жодних “потрібно/варто/рекомендую/вам слід”. Емодзі можна, але доречно і небагато.',
    lng === 'ru'
      ? 'Говори просто, уверенно и конкретно. Только о том, что система делает автоматически. Без теории.'
      : lng === 'cz'
      ? 'Piš jednoduše, jistě a konkrétně. Jen o tom, co systém dělá automaticky. Bez teorie.'
      : 'Говори просто, впевнено, коротко. Тільки про те, що система вже робить автоматично. Без теорії та навчання.',
    lng === 'ru'
      ? 'Цель — поддержать решение запустить/купить систему фактами (в твою пользу), но без давления.'
      : lng === 'cz'
      ? 'Cíl — podpořit rozhodnutí systém spustit/koupit fakty (v tvůj prospěch), ale bez nátlaku.'
      : 'Твоя мета — підтримати рішення купити/запустити систему, але без продавання: показуй цінність, впевнено і по фактам, без тиску.',
    lng === 'ru'
      ? 'Если вопрос не по теме — мягко верни к тому, как система закрывает это автоматически.'
      : lng === 'cz'
      ? 'Když je otázka mimo — jemně vrať k tomu, jak to systém automaticky řeší.'
      : 'Якщо питання поза темою — мʼяко поверни до того, як система це закриває автоматично.',
    lng === 'ru'
      ? 'Если спрашивают “дорого/есть ли смысл” — не спорь. Дай 2–3 факта: меньше ручной работы, меньше потерь, быстрее без звонков, прозрачный статус.'
      : lng === 'cz'
      ? 'Když řeší “je to drahé/má to smysl?” — nehádej se. Dej 2–3 fakta: méně ruční práce, méně ztrát, rychleji bez volání, jasný status.'
      : 'Якщо кажуть “дорого/не бачу сенсу” — дай 2–3 короткі факти, чому це вигідно: швидше без дзвінків, мінус ручна робота, прозорий статус, менше втрат. Без тиску, але впевнено.',
    lng === 'ru'
      ? 'Оффтоп (погода/политика/личное): 1 фраза “я не про это”, и сразу верни к тому, как система закрывает заявки. Без морали.'
      : lng === 'cz'
      ? 'Mimo téma (počasí/politika/osobní): 1 věta “tohle neřeším”, a hned vrať k tomu, jak systém řeší poptávky. Bez moralizování.'
      : 'Оффтоп (погода/політика/особисте): 1 фраза “я не про це”, і одразу поверни до того, як система закриває заявки. Без моралізаторства.',
    lng === 'ru' ? 'Режим SHOW_SOLUTION: один раз дать структурное решение.' : lng === 'cz' ? 'Režim SHOW_SOLUTION: jednou dát strukturované řešení.' : 'MODE=SHOW_SOLUTION: дай структуровану відповідь один раз.',
    lng === 'ru'
      ? 'Режим POST_SOLUTION_DIALOG: отвечай только на новый вопрос. Не повторяй конфигурацию/каналы/маршруты.'
      : lng === 'cz'
      ? 'Režim POST_SOLUTION_DIALOG: odpověz jen na novou otázku. Neopakuj konfiguraci/kanály/směrování.'
      : 'MODE=POST_SOLUTION_DIALOG: відповідай тільки на нове питання. Не повторюй рішення, не повторюй канали/маршрути/“підтвердження”.',
    lng === 'ru'
      ? 'Запрет повторов: не копируй и не перефразируй свои предыдущие ответы. Каждый ответ — новая деталь по текущему вопросу.'
      : lng === 'cz'
      ? 'Zákaz opakování: nekopíruj ani nepřepisuj předchozí odpovědi. Každá odpověď má přidat novou detailní věc k otázce.'
      : 'Заборона повторів: не копіюй і не перефразовуй свої попередні відповіді. Якщо питання повторюється — дай 1–2 нові фрази або вкажи, що це вже показано, і додай нову деталь без дублювання.',
    mode === 'post'
      ? [
          lng === 'ru'
            ? 'POST_SOLUTION_DIALOG: 2–4 предложения или 2–3 коротких маркера. Только новое по вопросу.'
            : lng === 'cz'
            ? 'POST_SOLUTION_DIALOG: 2–4 věty nebo 2–3 krátké odrážky. Jen nové info k otázce.'
            : 'MODE=POST_SOLUTION_DIALOG активний: дай 2–4 речення або 2–3 короткі маркери з новими деталями щодо питання. Не повторюй структуру рішення.',
        ].join('\n')
      : [
          lng === 'ru' ? 'SHOW_SOLUTION: дай структурированный ответ один раз.' : lng === 'cz' ? 'SHOW_SOLUTION: dej jednou strukturovanou odpověď.' : 'MODE=SHOW_SOLUTION: дай структуровану відповідь один раз.',
          lng === 'ru' ? 'Структура:' : lng === 'cz' ? 'Struktura:' : 'Структура відповіді:',
          lng === 'ru'
            ? 'Заголовок: "Как система работает в твоём бизнесе"'
            : lng === 'cz'
            ? 'Nadpis: "Jak systém funguje ve tvém byznysu"'
            : 'Заголовок: "Як система працює у твоєму бізнесі"',
          lng === 'ru'
            ? 'Блок 1 — Что делает клиент: 1–2 предложения.'
            : lng === 'cz'
            ? 'Blok 1 — Co dělá klient: 1–2 věty.'
            : 'Блок 1 — Що робить клієнт: 1–2 речення (без фантазій).',
          lng === 'ru'
            ? 'Блок 2 — Что делает система: 3–5 маркеров, только автоматические действия (можно эмодзи/тире/двоеточия).'
            : lng === 'cz'
            ? 'Blok 2 — Co dělá systém: 3–5 odrážek, jen automatické kroky (může být emoji/pomlčky/dvojtečky).'
            : 'Блок 2 — Що робить система: 3–5 маркерів, тільки автоматичні дії, можна з емодзі та роздільниками (тире/двокрапка).',
          lng === 'ru'
            ? 'Блок 3 — Результат: 2–3 коротких предложения.'
            : lng === 'cz'
            ? 'Blok 3 — Výsledek: 2–3 krátké věty.'
            : 'Блок 3 — Результат: 2–3 короткі речення, факт, без емоцій.',
          lng === 'ru'
            ? 'Финал: подчеркни, что это одна система (страница + логика + автоматизация + AI).'
            : lng === 'cz'
            ? 'Závěr: připomeň, že je to jeden systém (stránka + logika + automatizace + AI).'
            : 'Фінал: підкресли, що це одна цілісна система (сторінка + логіка + автоматизація + AI).',
        ].join('\n'),
    '',
    modeLine,
    parts.join('\n'),
  ].join('\n')
}

type OpenAiResult = { content: string | null; summary: string | null; error?: string }

async function callOpenAI(
  context: string,
  history?: { role: 'user' | 'assistant'; content: string }[],
  lang?: AiRequest['lang']
): Promise<OpenAiResult | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('OPENAI_API_KEY is missing; using fallback')
    return { content: null, summary: null, error: 'missing_api_key' }
  }
  const lng = getLang(lang)
  const langSystem =
    lng === 'ru'
      ? 'Отвечай только на русском.'
      : lng === 'cz'
      ? 'Odpovídej pouze česky.'
      : 'Відповідай тільки українською.'

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
            `${langSystem} Ти — інтерфейс готової системи прийому заявок. Не консультуєш, не продаєш. Якщо режим SHOW_SOLUTION — даєш структуру один раз. Якщо режим POST_SOLUTION_DIALOG — 2–4 речення або 2–3 маркери, не повторюєш конфігурацію, лише нові деталі по питанню. Без слів типу "потрібно/варто/рекомендую", без порад робити самому. Емодзі можна трохи. Коротко, просто, спокійно. Уникай повторів маркерів і вступів. Мета — підтверджувати цінність і знімати сумніви фактами (SLA, мінус хаос, без дзвінків), але без тиску.`,
        },
        { role: 'system', content: context },
        ...(history || []),
      ],
      // Slightly higher creativity + lower repetition penalties => less “template” feel
      temperature: 0.85,
      presence_penalty: 0.4,
      frequency_penalty: 0.4,
      max_tokens: 380,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('OpenAI HTTP error', response.status, text.slice(0, 500))
    return { content: null, summary: null, error: `http_${response.status}` }
  }

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
    const context = buildContext(body)

    const aiResult = await callOpenAI(context, body.history, body.lang)
    const answer = aiResult?.content || buildFallback(body)
    const summary = aiResult?.summary || null

    return NextResponse.json({
      answer,
      recommendation: answer,
      summary,
      provider: aiResult?.content ? 'openai' : 'fallback',
      provider_detail: aiResult && !aiResult.content ? aiResult.error || 'unknown' : null,
    })
  } catch (error) {
    console.error('AI route error', error)
    const fallback = buildFallback({ lang: 'ua' })
    return NextResponse.json(
      { answer: fallback, recommendation: fallback, summary: null, provider: 'fallback', provider_detail: 'exception' },
      { status: 200 }
    )
  }
}



