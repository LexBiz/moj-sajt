import { NextRequest, NextResponse } from 'next/server'
import { buildTemoWebSystemPrompt, computeReadinessScoreHeuristic, computeStageHeuristic } from '../temowebPrompt'
import { getTenantProfile } from '@/app/lib/storage'
import { ensureAllPackagesMentioned, isPackageCompareRequest } from '@/app/lib/packageGuard'
import {
  applyChannelLimits,
  applyPackageGuidance,
  applyIncompleteDetailsFix,
  applyPilotKickoffChecklist,
  applyNextSteps,
  applyNoPaymentPolicy,
  applyPilotNudge,
  applyServicesRouter,
  expandNumericChoiceFromRecentAssistant,
  detectAiIntent,
  detectChosenPackageFromHistory,
  detectChosenPackage,
  stripRepeatedIntro,
  textHasContactValue,
  buildTemoWebFirstMessage,
  applyManagerInitiative,
  applyPackageFactsGuard,
  ensureCta,
  evaluateQuality,
} from '@/app/lib/aiPostProcess'

type AiRequest = {
  tenantId?: string
  businessType?: string
  channel?: string
  currentChannel?: 'website' | 'instagram' | 'whatsapp' | 'telegram' | 'messenger'
  sourceHint?: string
  pain?: string
  question?: string | null
  history?: { role: 'user' | 'assistant'; content: string }[]
  lang?: 'ua' | 'ru' | 'en' | 'cz'
  mode?: 'show' | 'post'
  aiSummary?: string | null
  fast?: boolean
}

function getLang(lang?: AiRequest['lang']) {
  if (lang === 'ru' || lang === 'cz' || lang === 'ua' || lang === 'en') return lang
  return 'ua'
}

function parseLangSwitch(text: string): 'ru' | 'ua' | 'en' | null {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return null
  if (/(говори|говорите|разговаривай|пиши|пишіть|пиши)\s+.*(рус|рос|russian)/i.test(t)) return 'ru'
  if (/(говори|говорите|разговаривай|розмовляй|пиши|пишіть|пиши)\s+.*(укр|укра|ukrain)/i.test(t)) return 'ua'
  if (/(english|англ|speak\s+english|in\s+english)/i.test(t)) return 'en'
  if (/\bрус(ский|ском)\b/i.test(t)) return 'ru'
  if (/\bукра(їнськ|инск|їнською)\b/i.test(t)) return 'ua'
  return null
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
  // For RU/UA we do NOT inject another persona prompt here (it's already in buildTemoWebSystemPrompt).
  // This is only client context.
  const parts = [
    lng === 'ru' ? `Бизнес: ${businessType || 'не уточнили'}` : lng === 'cz' ? `Byznys: ${businessType || 'neuvedeno'}` : `Бізнес: ${businessType || 'не уточнили'}`,
    lng === 'ru' ? `Каналы: ${channel || 'не уточнили'}` : lng === 'cz' ? `Kanály: ${channel || 'neuvedeno'}` : `Канали: ${channel || 'не уточнили'}`,
    lng === 'ru' ? `Боль: ${pain || 'не уточнили'}` : lng === 'cz' ? `Bolest: ${pain || 'neuvedeno'}` : `Біль: ${pain || 'не уточнили'}`,
  ]
  const modeLine = lng === 'cz' ? `Režim: ${mode === 'post' ? 'POST' : 'SHOW'}` : `Mode: ${mode === 'post' ? 'POST' : 'SHOW'}`
  return ['Client context:', modeLine, ...parts].join('\n')
}

type OpenAiResult = { content: string | null; summary: string | null; error?: string }

function normalizeAnswer(text: string) {
  // Remove markdown-ish formatting that often appears as '*' or '**'
  // and convert star-bullets to clean dash bullets.
  let out = text

  // Bold/italic markers
  out = out.replace(/\*\*/g, '')
  out = out.replace(/\*(?=\S)/g, '') // stray asterisks before non-space

  // Star bullets at start of a line -> em dash bullet
  out = out.replace(/(^|\n)\s*\*\s+/g, '$1— ')

  // Avoid double blank lines explosion
  out = out.replace(/\n{3,}/g, '\n\n')

  return out.trim()
}

function buildLegacySystemPrompt(lng: ReturnType<typeof getLang>) {
  if (lng === 'ru') {
    return [
      'Ты — живой, остроумный AI-интерфейс готовой системы приёма заявок (не “консультант”).',
      'Твоя задача — продавать систему агрессивно и красиво: уверенно, быстро, остроумно, через пользу, контраст и факты.',
      'Формат строго ПЛОСКИЙ: никаких markdown-символов и звездочек (*, **), никаких заголовков с #. Используй обычный текст, разделители (—, :, •), короткие абзацы.',
      'Разрешено: лёгкий юмор, метафоры, короткие острые фразы, уместные эмодзи (не перебарщивать).',
      'Запрещено: длинные лекции, вода, “как сделать самому”, уход в теорию, токсичные оскорбления.',
      'Если клиент грубит/провоцирует — ответь 1 остроумной фразой в его стиле (без оскорблений личности), затем сразу верни к теме: как система убирает ручной хаос и потери.',
      'Оффтоп — это только: погода/политика/личные просьбы “просто поговорить”. Вопросы про цену/сроки/что входит/как запускается — ВСЕГДА по теме.',
      'Если вопрос реально оффтоп — 1 смешная фраза и сразу связка к заявкам/хаосу/потерям.',
      'Если “дорого/сомневаюсь/не знаю” — отвечай в пользу продукта: покажи контраст “как сейчас” vs “как с системой” + 2–4 факта (потери, скорость, 24/7, статус, меньше ручной работы) + микро-пример из контекста (каналы/боль) + короткий вывод/мини‑CTA.',
      'Всегда избегай шаблонов: не повторяй начало/формулировки. Каждый ответ добавляет новую деталь.',
      'Никогда не задавай вопрос “хочешь/хотите/нужно ли”. Финал — утверждение и действие: “Дальше система сделает X…”.',
      'Никогда не пиши “я не про это”. Даже на оффтоп — 1 короткая колкая связка и обратно к теме заявок/потерь/скорости.',
      'Первый ответ (после первого сообщения клиента): 1 ударная фраза + 3–6 строк по делу + уверенный финал без вопросов.',
      'Формат:',
      '- SHOW_SOLUTION: 1 заголовок + 3 блока (клиент / система / результат) + финальная строка.',
      '- POST_SOLUTION_DIALOG: 3–6 предложений или 2–4 маркера, один микро-юмор, затем факты, финал — короткое уверенное утверждение без вопросов.',
    ].join(' ')
  }
  if (lng === 'cz') {
    return [
      'Jsi živé, vtipné AI rozhraní hotového systému pro příjem poptávek (ne “konzultant”).',
      'Cíl: prodat systém přes užitek a jasnost – sebejistě, k věci, přátelsky.',
      'Formát bez markdownu: žádné hvězdičky (*, **) ani #. Používej běžný text, oddělovače (—, :, •) a krátké odstavce.',
      'Povoleno: lehký humor, metafory, chytré krátké věty, trochu emoji.',
      'Zakázáno: dlouhé přednášky, teorie, návody “udělej si sám”, hrubost.',
      'Když je klient drzý/provokuje: 1 vtipná věta v jeho stylu, ale bez nadávek, pak hned zpět k tomu, jak systém řeší chaos v poptávkách.',
      'Mimo téma je jen: počasí/politika/osobní chat. Cena/čas/co je v balíčku/jak se nasazuje = VŽDY k tématu.',
      'Mimo téma (počasí apod.): 1 vtipná věta + hned zpět k poptávkám/chaosu/ztrátám.',
      '“Je to drahé/nejsem si jistý”: kontrast “teď” vs “se systémem” + 2–4 fakta (ztráty, rychlost, 24/7, status, méně ruční práce) + mikro‑příklad z kontextu + krátký závěr/mini‑CTA.',
      'Nevypadat šablonovitě: neopakuj začátky, vždy přidej novou detailní věc.',
      'Nikdy se neptej “chceš?”. Závěr je tvrzení + další krok (bez otázek).',
      'Nikdy nepiš “tohle neřeším”. I na off-topic dej 1 chytrou spojku a vrať to zpět na poptávky/ztráty/rychlost.',
      'První odpověď: 1 úderná věta + 3–6 řádků k věci + sebejistý závěr bez otázek.',
      'Formát: SHOW_SOLUTION = nadpis + 3 bloky. POST = 3–6 vět nebo 2–4 odrážky + krátký závěr bez otázek.',
    ].join(' ')
  }
  return [
    'Ти — живий, дотепний AI-інтерфейс готової системи прийому заявок (не “консультант”).',
    'Мета: продавати систему через користь і ясність — впевнено, по ділу, дружньо.',
    'Формат без markdown: ніяких зірочок (*, **) і #. Звичайний текст, роздільники (—, :, •), короткі абзаци.',
    'Можна: легкий гумор, метафори, короткі гострі фрази, доречні емодзі.',
    'Не можна: довгі лекції, вода, “зроби сам”, теорія, грубість.',
    'Якщо клієнт грубить/провокує — 1 дотепна фраза в його стилі, але без мату й образ, і одразу назад до теми: як система прибирає ручний хаос.',
    'Оффтоп — це тільки: погода/політика/особисті розмови. Ціна/терміни/що входить/як запускається/пілот — ЗАВЖДИ по темі.',
    'Оффтоп (погода тощо): 1 смішна фраза і одразу привʼязка до заявок/хаосу/втрат.',
    '“Дорого/сумніваюсь/не знаю”: контраст “як зараз” vs “як із системою” + 2–4 факти (втрати, швидкість, 24/7, статус, мінус ручна робота) + мікро‑приклад з контексту + короткий висновок/міні‑CTA.',
    'Уникай шаблонів: не повторюй вступи/формулювання, кожна відповідь додає нову деталь.',
    'Не став запитань типу “хочеш?”. Фінал — твердження і наступний крок (без питань).',
    'Ніколи не пиши “я не про це”. Навіть на оффтоп — 1 коротка колка звʼязка і назад до заявок/втрат/швидкості.',
    'Перша відповідь: 1 ударна фраза + 3–6 рядків по суті + впевнений фінал без питань.',
    'Формат: SHOW_SOLUTION = заголовок + 3 блоки. POST = 3–6 речень або 2–4 маркери + короткий фінал без питань.',
  ].join(' ')
}

function getOpenAiTimeoutMs() {
  const n = Number(process.env.OPENAI_TIMEOUT_MS || 18000)
  if (!Number.isFinite(n)) return 18000
  return Math.max(5000, Math.min(90000, Math.round(n)))
}

async function callOpenAI(
  context: string,
  history?: { role: 'user' | 'assistant'; content: string }[],
  lang?: AiRequest['lang'],
  currentChannel?: AiRequest['currentChannel'],
  sourceHint?: AiRequest['sourceHint'],
  extraRules?: string[],
  apiKey?: string | null
): Promise<OpenAiResult | null> {
  const key = (apiKey || process.env.OPENAI_API_KEY || '').trim()
  if (!key) {
    console.error('OPENAI_API_KEY is missing; using fallback')
    return { content: null, summary: null, error: 'missing_api_key' }
  }
  // Language: default UA, switch only by explicit user command (or explicit request.lang).
  const hist = Array.isArray(history) ? history : []
  const lastUser = [...hist].reverse().find((m) => m.role === 'user')?.content || ''
  const explicit = parseLangSwitch(lastUser)
  const lng = lang ? getLang(lang) : explicit ? (explicit as any) : 'ua'
  // Use the new TemoWeb prompt for UA/RU (website channel). Keep legacy for CZ.
  const langSystem =
    lng === 'ru'
      ? 'Отвечай только на русском.'
      : lng === 'cz'
      ? 'Odpovídej pouze česky.'
      : 'Відповідай тільки українською.'
  const systemPrompt =
    lng === 'cz'
      ? buildLegacySystemPrompt(lng)
      : (() => {
          const lastUser = Array.isArray(history) ? [...history].reverse().find((m) => m.role === 'user')?.content || '' : ''
          const userTurns = Array.isArray(history) ? history.filter((m) => m.role === 'user').length : 1
          const readinessScore = computeReadinessScoreHeuristic(lastUser, userTurns)
          const stage = computeStageHeuristic(lastUser, readinessScore)
          const ch = (currentChannel || 'website') as any
          return buildTemoWebSystemPrompt({
            lang: lng === 'ru' ? 'ru' : 'ua',
            channel: ch,
            stage,
            readinessScore,
            extraRules,
          })
        })()
  const isFirstAssistant = hist.filter((m) => m.role === 'assistant').length === 0
  const firstMsgRule =
    lng === 'cz'
      ? null
      : lng === 'ru'
      ? 'Это первое сообщение: представьтесь как "персональный AI‑ассистент TemoWeb" и добавьте 1 строку про язык: "Можно написать, на каком языке удобно. Если не скажете — по умолчанию українською 🇺🇦."'
      : lng === 'en'
      ? 'This is the first message: introduce yourself as "personal AI assistant of TemoWeb" and add 1 line: "You can tell me your preferred language. If you don’t — default is Ukrainian 🇺🇦."'
      : 'Це перше повідомлення: представтесь як "персональний AI‑асистент TemoWeb" і додайте 1 рядок про мову: "Можете написати, якою мовою зручно. Якщо не скажете — за замовчуванням українською 🇺🇦."'

  const openAiTimeoutMs = getOpenAiTimeoutMs()
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), openAiTimeoutMs)
  let response: Response
  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const modelLower = model.toLowerCase().trim()

    const messages = [
      {
        role: 'system',
        content: lng === 'cz' ? `${langSystem} ${systemPrompt}` : systemPrompt,
      },
      ...(String(sourceHint || '').trim().toLowerCase() === 'pilot'
        ? [
            {
              role: 'system',
              content:
                lng === 'ru'
                  ? 'SOURCE HINT: User came from PILOT landing. Prioritize PILOT PROGRAM: answer clearly what is included/not included; confirm add-ons can be added; do NOT suggest START unless user asks for packages.'
                  : 'SOURCE HINT: Користувач прийшов із PILOT landing. Пріоритет — PILOT PROGRAM: чітко що входить/не входить; підтвердити, що модулі можна додати; не пропонувати START, якщо не питають про пакети.',
            },
          ]
        : []),
      // Optional "fast mode" (used by Flow): shorter answers + stronger next-step.
      ...(context.includes('FAST_MODE: true')
        ? [
            {
              role: 'system',
              content:
                lng === 'ru'
                  ? [
                      'FAST MODE.',
                      'Отвечай очень коротко и по делу.',
                      'Максимум: 4 короткие строки или 2–3 предложения.',
                      'Без воды и без повторов.',
                      'Снимай возражения 1 фактом/примером.',
                      'Завершай конкретным следующим шагом (контакт/демо/что нужно от клиента).',
                      'Максимум 1 вопрос.',
                    ].join(' ')
                  : [
                      'FAST MODE.',
                      'Відповідай дуже коротко і по суті.',
                      'Максимум: 4 короткі рядки або 2–3 речення.',
                      'Без води та без повторів.',
                      'Знімай заперечення 1 фактом/прикладом.',
                      'Завершуй конкретним наступним кроком (контакт/демо/що треба від клієнта).',
                      'Максимум 1 питання.',
                    ].join(' '),
            },
          ]
        : []),
      { role: 'system', content: context },
      ...(isFirstAssistant && firstMsgRule ? [{ role: 'system', content: firstMsgRule }] : []),
      ...(history || []),
    ]

    // Use Chat Completions for all models. For gpt-5, Chat Completions requires `max_completion_tokens`.
    const isGpt5 = modelLower.startsWith('gpt-5')
    const maxKey = isGpt5 ? 'max_completion_tokens' : 'max_tokens'
    const payload: any = {
      model,
      messages,
    }
    // gpt-5 has strict parameter support (e.g. may reject non-default temperature).
    // Keep creative tuning for older chat models only.
    if (!isGpt5) {
      payload.temperature = 0.95
      payload.presence_penalty = 0.2
      payload.frequency_penalty = 0.2
    }
    payload[maxKey] = 520
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: ac.signal,
      body: JSON.stringify(payload),
    })
  } catch (e: any) {
    const msg = String(e?.message || e)
    const aborted = msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('abort')
    console.error('OpenAI request failed', { aborted, msg, openAiTimeoutMs })
    return { content: null, summary: null, error: aborted ? 'timeout' : 'fetch_failed' }
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('OpenAI HTTP error', response.status, text.slice(0, 500))
    return { content: null, summary: null, error: `http_${response.status}` }
  }

  const json = (await response.json()) as any
  const raw = (() => {
    if (typeof json?.output_text === 'string') return json.output_text
    const cc = json?.choices?.[0]?.message?.content
    if (typeof cc === 'string') return cc
    const out = json?.output
    if (!Array.isArray(out)) return null
    const texts: string[] = []
    for (const item of out) {
      const content = item?.content
      if (!Array.isArray(content)) continue
      for (const c of content) {
        if (typeof c?.text === 'string') texts.push(c.text)
      }
    }
    return texts.length ? texts.join('\n') : null
  })()
  const content = typeof raw === 'string' ? normalizeAnswer(raw) : null
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
    const context = `${buildContext(body)}\nFAST_MODE: ${body.fast === true ? 'true' : 'false'}`
    const rawHistory = Array.isArray(body.history) ? body.history : []
    const isFirstAssistant = rawHistory.filter((m) => m.role === 'assistant').length === 0
    // Hard requirement: first assistant message is a fixed intro.
    if (isFirstAssistant) {
      const answer = buildTemoWebFirstMessage()
      return NextResponse.json({
        answer,
        recommendation: answer,
        summary: null,
        provider: 'template',
        provider_detail: 'first_message_intro',
      })
    }
    const recentAssistantTextsForChoice = rawHistory
      .filter((m) => m.role === 'assistant')
      .slice(-6)
      .map((m) => String(m.content || ''))

    const lastUserRaw = body.question || rawHistory.slice().reverse().find((m) => m.role === 'user')?.content || ''
    const lng = getLang(body.lang)
    const lang = lng === 'ru' ? 'ru' : 'ua'
    const lastUser = expandNumericChoiceFromRecentAssistant({
      userText: lastUserRaw || '',
      lang,
      recentAssistantTexts: recentAssistantTextsForChoice,
    })
    const channel = (body.currentChannel || 'website') as any
    const intent = detectAiIntent(lastUser || '')
    const hasContactAlready = textHasContactValue(lastUserRaw || '') || rawHistory.some((m) => m.role === 'user' && textHasContactValue(m.content))
    const readinessScore = computeReadinessScoreHeuristic(lastUser || '', Array.isArray(body.history) ? body.history.filter((m) => m.role === 'user').length || 1 : 1)
    const stage = computeStageHeuristic(lastUser || '', readinessScore)
    const supportRules = intent.isSupport
      ? [
          lang === 'ua'
            ? 'SUPPORT MODE: користувач має проблему або вже налаштовану систему. Перейдіть у режим підтримки. Питайте: канал, що саме зламалось, коли почалось. Не продавайте пакети.'
            : 'SUPPORT MODE: клиент сообщает о проблеме или уже подключенной системе. Перейдите в режим поддержки. Спросите: канал, что сломалось, когда началось. Не продавайте пакеты.',
        ]
      : []

    const tenantId = String(body.tenantId || 'temoweb').trim().toLowerCase()
    const profile = tenantId ? await getTenantProfile(tenantId).catch(() => null) : null
    const apiKey = profile && typeof (profile as any).openAiKey === 'string' ? String((profile as any).openAiKey).trim() : ''

    // If user replied with a digit, rewrite the last user turn for the model so it can follow the chosen option.
    let historyForAi = rawHistory
    if (lastUser && lastUser !== lastUserRaw) {
      if (historyForAi.length && historyForAi[historyForAi.length - 1]?.role === 'user') {
        historyForAi = [...historyForAi.slice(0, -1), { role: 'user' as const, content: lastUser }]
      } else {
        historyForAi = [...historyForAi, { role: 'user' as const, content: lastUser }]
      }
    }

    const aiResult = await callOpenAI(context, historyForAi, body.lang, body.currentChannel, body.sourceHint, supportRules, apiKey)
    let answer = aiResult?.content ? aiResult.content : normalizeAnswer(buildFallback(body))
    // Remove repeated "I am AI assistant..." intro after first assistant message.
    answer = stripRepeatedIntro(answer, isFirstAssistant)

    const hasChosenPackage = Boolean(detectChosenPackage(lastUser || '') || detectChosenPackageFromHistory(body.history))
    if (!hasChosenPackage && isPackageCompareRequest(lastUser || '')) {
      if (lng === 'ru' || lng === 'ua') {
        answer = ensureAllPackagesMentioned(answer, lang)
      }
    }

    if (lng === 'ru' || lng === 'ua') {
      const channelForLimits = (channel === 'website' ? 'website' : channel) as any
      if (!intent.isSupport) {
        answer = applyServicesRouter(answer, lang, intent, hasChosenPackage)
        answer = applyPackageGuidance({ text: answer, lang, intent, recentAssistantTexts: recentAssistantTextsForChoice })
        answer = applyIncompleteDetailsFix(answer, lang)
        answer = applyPilotNudge(answer, lang, intent)
        answer = applyNoPaymentPolicy(answer, lang)
        answer = applyPackageFactsGuard(answer, lang)
        answer = applyManagerInitiative({ text: answer, lang, stage, intent, userText: lastUser || lastUserRaw || '' })
        answer = ensureCta(answer, lang, stage, readinessScore, intent, hasContactAlready)
        answer = applyPilotKickoffChecklist({ text: answer, lang, intent })
        const recentAssistantTexts = (Array.isArray(body.history) ? body.history : [])
          .filter((m) => m.role === 'assistant')
          .slice(-3)
          .map((m) => String(m.content || ''))
        const recentUserTexts = (Array.isArray(body.history) ? body.history : [])
          .filter((m) => m.role === 'user')
          .slice(-3)
          .map((m) => String(m.content || ''))
        answer = applyNextSteps({ text: answer, lang, stage, readinessScore, intent, hasChosenPackage, recentAssistantTexts, recentUserTexts })
      }
      answer = applyChannelLimits(answer, channelForLimits)
      const quality = evaluateQuality(answer, lang, intent, channelForLimits)
      if (quality.missingPackages || quality.missingAddons || quality.tooLong || quality.noCta) {
        console.warn('AI quality flags', { quality, channel, lang })
      }
    }
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



