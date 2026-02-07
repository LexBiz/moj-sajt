import { TEMOWEB_PROFILE } from '@/app/api/temowebProfile'
import { ensureAllPackagesMentioned, isPackageCompareRequest } from '@/app/lib/packageGuard'
import type { TemoWebStage } from '@/app/api/temowebPrompt'

export type AiChannel = 'website' | 'flow' | 'instagram' | 'whatsapp' | 'telegram' | 'messenger'
export type AiLang = 'ru' | 'ua'

export function buildTemoWebFirstMessage() {
  // Requirement: first message across ALL channels is a fixed intro (RU),
  // then we default to Ukrainian unless user asks otherwise.
  return [
    'Добрый день! Я персональный AI‑ассистент TemoWeb.',
    '',
    'Мы внедряем AI‑ассистента и автоматизацию заявок (Instagram / WhatsApp / Telegram / сайт) + CRM, чтобы заявки не терялись и ответы приходили быстро.',
    '',
    'По умолчанию дальше отвечаю українською 🇺🇦. Если хотите поменять язык — просто напишите: «русский».',
    '',
    'Если хотите — выберите вариант:',
    '— 1) Расскажите про бизнес и откуда сейчас приходят заявки',
    '— 2) Опишите, что именно хотите автоматизировать (сообщения/лиды/запись/оплата)',
    'Можно ответить цифрой.',
  ].join('\n')
}

export type AiIntent = {
  isPricing: boolean
  isServices: boolean
  isCompare: boolean
  isPilotTrigger: boolean
  isContactIntent: boolean
  isSupport: boolean
}

const CONTACT_HINT_RE =
  /(телефон|email|почт|контакт|зв[ʼ']?яз|связ|call|созвон|зустріч|встреч|демо|demo|оплат|счет|рахунок|invoice|договор|контракт|старт|запуск|подключ|підключ)/i
const CONTACT_VALUE_RE = /\S+@\S+\.\S+|(^|\s)@([a-zA-Z0-9_]{4,32})\b|(\+?\d[\d\s().-]{7,}\d)/i
const SUPPORT_RE =
  /(не\s+работ|не\s+працю|сбой|збій|ошибк|помил|не\s+отправ|не\s+відправ|поддержк|підтримк|support|помогите|допомож|сломал|зламал|не\s+приход|не\s+приход|интеграц|інтеграц|token|токен|webhook|підписк|подписк|оплат.*не|оплата\s+не|ошибка\s+api|error\s+api)/i
const SERVICES_RE =
  /(услуг|услуги|послуг|послуги|service|services|offerings|what\s+do\s+you\s+offer|что\s+вы\s+предлагаете|що\s+ви\s+пропонуєте|прайс|каталог)/i
const PRICING_RE = /(цена|ціна|стоим|сколько|вартість|скільки|пакет|тариф|pricing|price)/i
const PILOT_RE = /(пілот|пилот|pilot|попробовать|спробуват|тест|быстро|швидко|дешевле|дешевш|дорого|дорога|дороговато|малый\s+бюджет|малий\s+бюджет)/i
// IMPORTANT: do NOT block normal discussion of payments as a module ("оплата/Stripe"),
// only block direct "pay now / invoice / send payment link" requests.
const PAYMENT_ASK_RE =
  /\b(оплат(ите|ить)\b|оплата\s+сейчас|pay\s+now|payment\s+link|ссылк\w*\s+на\s+оплат\w*|счет(\s+на\s+оплату)?|рахунок|invoice|внести\s+оплат\w*)\b/i
const PACKAGE_CHOICE_RE =
  /\b(беру|берем|выбираю|обираю|хочу|хочемо|хотим|нужен|потрібен|потрібна|нужно|надо|мой|мій|нам|для\s+нас|для\s+меня|ок|окей)\b[\s\S]*\b(START|BUSINESS|PRO)\b/i

const NEXT_STEPS_HEADER_RE = /(если\s+хотите|якщо\s+хочете)\s*[—–-]?\s*(выберите|оберіть)\s*(вариант|варіант)/i
const NEXT_STEPS_OPT_RE = /(^|\n)\s*[—–-]\s*([1-2])\)\s*([^\n]+)\s*(?=\n|$)/g
const DIGIT_ONLY_RE = /^\s*([1-2])\s*$/

const DETAILS_STUB_RE = /(мен[іi]\s+потр[іi]бно\s+зібрати\s+кілька\s+деталей|мне\s+нужно\s+собрать\s+несколько\s+детал)/i

function looksTooDry(out: string) {
  const t = String(out || '').trim()
  if (!t) return true
  const lines = t.split('\n').map((x) => x.trim()).filter(Boolean)
  // Very short answer with no structure often feels like an AI brush-off.
  if (t.length < 260) return true
  if (lines.length < 4) return true
  return false
}

export function applyManagerInitiative(params: {
  text: string
  lang: AiLang
  stage: TemoWebStage
  intent: AiIntent
  userText: string
}) {
  if (params.intent.isSupport) return params.text
  const out = String(params.text || '').trim()
  if (!out) return out

  const user = String(params.userText || '')
  const oneChannel = /(1\s*канал|один\s+канал|1\s*channel)/i.test(user)
  const mentionsModules = /(оплат|stripe|календар|calendar|crm|аналітик|аналитик|module|модул)/i.test(user)
  const offerMoment = params.stage === 'OFFER' || params.intent.isPricing || params.intent.isServices || (oneChannel && mentionsModules)
  if (!offerMoment) return out
  if (!looksTooDry(out)) return out

  // Don’t add if already has a concrete mini-plan block.
  if (/(что\s+дальше|наступн\w*\s+крок|план\s+запуска|план\s+внедрения|дальше\s+сделаем)/i.test(out)) return out

  const plan =
    params.lang === 'ua'
      ? [
          'Щоб це виглядало “під ключ” і без сюрпризів, я зроблю так:',
          '— Підключимо 1 канал для старту і налаштуємо сценарій діалогу (питання → кваліфікація → контакт).',
          '— Додамо модулі, які вам потрібні (оплата/аналітика/CRM) як доп. блоки.',
          '— Протестуємо на реальних повідомленнях і перевіримо, що заявки фіксуються в CRM та приходять вам у Telegram.',
          '',
          'Один момент: який саме канал беремо першим — Instagram Direct чи Messenger?',
        ].join('\n')
      : [
          'Чтобы это выглядело “под ключ” и без сюрпризов, я сделаю так:',
          '— Подключим 1 канал для старта и настроим сценарий диалога (вопросы → квалификация → контакт).',
          '— Добавим нужные модули (оплата/аналитика/CRM) как доп. блоки.',
          '— Протестируем на реальных сообщениях и проверим, что заявки фиксируются в CRM и приходят вам в Telegram.',
          '',
          'Один момент: какой канал берём первым — Instagram Direct или Messenger?',
        ].join('\n')

  return `${out}\n\n${plan}`.trim()
}

export function applyPackageFactsGuard(text: string, lang: AiLang) {
  let out = String(text || '').trim()
  if (!out) return out

  // START channels: must be "до 2" per TEMOWEB_PROFILE.packages.start.channelsUpTo
  if (/\bSTART\b/i.test(out)) {
    out = out.replace(/(до)\s*1\s*(канал(а|ов)?|каналів|channel(s)?)/gi, (m) => {
      // Preserve "до" and language word form.
      if (/каналів/i.test(m)) return 'до 2 каналів'
      if (/channels?/i.test(m)) return 'up to 2 channels'
      return 'до 2 каналов'
    })
    // If model wrote a too-narrow channel list like "(Instagram Direct або WhatsApp)" — widen it.
    if (/(канал[ауів]*\s*\()\s*instagram\s+direct\s+або\s+whatsapp\s*\)/i.test(out)) {
      out = out.replace(
        /(канал[ауів]*\s*\()\s*instagram\s+direct\s+або\s+whatsapp\s*\)/i,
        lang === 'ua'
          ? 'каналу (Instagram Direct / Facebook Messenger / WhatsApp / Telegram / сайт)'
          : 'канала (Instagram Direct / Facebook Messenger / WhatsApp / Telegram / сайт)',
      )
    }
  }

  // PILOT channels: must be "1–2" (never "only 1").
  if (/PILOT/i.test(out)) {
    out = out.replace(/(включено|каналы|канали|канал)\s*:\s*1\s*(канал(а|ов)?|каналів)/gi, (m) => {
      if (lang === 'ua') return 'Канали: 1–2 канали'
      return 'Каналы: 1–2 канала'
    })
  }

  return out.trim()
}

const INTRO_RE =
  /(^|\n)\s*(я\s*[—-]\s*)?(персонал(ьный|ний)\s+ai[\s-]*асистент\s+temoweb|personal\s+ai\s+assistant\s+of\s+temoweb)\.?\s*(\n|$)/i
const LANG_LINE_RE =
  /(^|\n)\s*(можно\s+написать,\s+на\s+каком\s+языке\s+удобно|можете\s+написати,\s+якою\s+мовою\s+зручно|you\s+can\s+tell\s+me\s+your\s+preferred\s+language)[\s\S]{0,120}(\n|$)/i

function stripNextStepsBlock(text: string) {
  const t = String(text || '').trim()
  if (!t) return t
  const lines = t.split('\n')
  const idx = lines.findIndex((l) => NEXT_STEPS_HEADER_RE.test(String(l || '')))
  if (idx < 0) return t
  const kept = lines.slice(0, idx).join('\n').trim()
  return kept || t
}

export function stripRepeatedIntro(text: string, isFirstAssistant: boolean) {
  const t = String(text || '').trim()
  if (!t) return t
  if (isFirstAssistant) return t
  let out = t
  // Remove common intro lines if model repeats them after first message.
  out = out.replace(INTRO_RE, '\n')
  out = out.replace(LANG_LINE_RE, '\n')
  out = out.replace(/\n{3,}/g, '\n\n')
  return out.trim()
}

export function applyIncompleteDetailsFix(text: string, lang: AiLang) {
  const t = String(text || '').trim()
  if (!t) return t
  if (!DETAILS_STUB_RE.test(t)) return t

  // If model ended with a colon and no list, append a concrete checklist.
  const endsWithColon = /:\s*$/.test(t)
  const hasBulletsAfter = /\n\s*[—-]\s*\d+\)/.test(t) || /\n\s*[—-]\s*/.test(t)
  if (!endsWithColon && hasBulletsAfter) return t

  const checklist =
    lang === 'ua'
      ? [
          '— 1) 1–2 канали для старту (Instagram / WhatsApp / Telegram / сайт)',
          '— 2) Ніша + що продаєте (1 речення)',
          '— 3) Як зараз приходять заявки (коротко)',
        ].join('\n')
      : [
          '— 1) 1–2 канала для старта (Instagram / WhatsApp / Telegram / сайт)',
          '— 2) Ниша + что продаёте (1 предложение)',
          '— 3) Откуда сейчас приходят заявки (коротко)',
        ].join('\n')

  // Also ask for contact (final action) in the same message.
  const contactLine =
    lang === 'ua'
      ? 'І щоб зафіксувати заявку — надішліть, будь ласка, телефон або email.'
      : 'И чтобы зафиксировать заявку — пришлите, пожалуйста, телефон или email.'

  const base = endsWithColon ? t : `${t}\n`
  return `${base}\n${checklist}\n\n${contactLine}`.trim()
}

export function applyPilotKickoffChecklist(params: { text: string; lang: AiLang; intent: AiIntent }) {
  const out = String(params.text || '').trim()
  if (!out) return out
  // Only for pilot-start moments: user chose pilot / wants to start, and we should move to contact + kickoff details.
  if (!params.intent.isPilotTrigger) return out

  const hasContactAsk = CONTACT_HINT_RE.test(out)
  const contactLine =
    params.lang === 'ua'
      ? 'Будь ласка, надішліть телефон або email — зафіксую заявку і узгодимо старт.'
      : 'Пожалуйста, пришлите телефон или email — зафиксирую заявку и согласуем старт.'

  // Avoid duplicating if checklist already present.
  if (/(1–2\s+канал|1-2\s+канал|ніша|ниша|заявк|джерел|источник)/i.test(out) && /—\s*1\)/.test(out)) return out

  const checklist =
    params.lang === 'ua'
      ? [
          '— 1) 1–2 канали для старту (Instagram / WhatsApp / Telegram / сайт)',
          '— 2) Ніша + що продаєте (1 речення)',
          '— 3) Як зараз приходять заявки (коротко)',
        ].join('\n')
      : [
          '— 1) 1–2 канала для старта (Instagram / WhatsApp / Telegram / сайт)',
          '— 2) Ниша + что продаёте (1 предложение)',
          '— 3) Откуда сейчас приходят заявки (коротко)',
        ].join('\n')

  // If contact isn't asked yet, add it first (final action), then checklist.
  if (!hasContactAsk) return `${out}\n\n${contactLine}\n\n${checklist}`.trim()
  return `${out}\n\n${checklist}`.trim()
}

function fmtMoneyEur(n: number) {
  try {
    return `${n.toLocaleString('ru-RU')} €`
  } catch {
    return `${n} €`
  }
}

export function detectAiIntent(text: string): AiIntent {
  const t = String(text || '').trim().toLowerCase()
  return {
    isPricing: PRICING_RE.test(t),
    isServices: SERVICES_RE.test(t),
    isCompare: isPackageCompareRequest(t),
    isPilotTrigger: PILOT_RE.test(t),
    isContactIntent: CONTACT_HINT_RE.test(t),
    isSupport: SUPPORT_RE.test(t),
  }
}

export function textHasContactValue(text: string) {
  const t = String(text || '').trim()
  if (!t) return false
  return CONTACT_VALUE_RE.test(t)
}

export function detectChosenPackage(text: string) {
  const t = String(text || '').trim()
  if (!t) return null
  if (!/\b(START|BUSINESS|PRO)\b/i.test(t)) return null
  return PACKAGE_CHOICE_RE.test(t) ? (t.match(/\b(START|BUSINESS|PRO)\b/i)?.[1]?.toUpperCase() || null) : null
}

export function detectChosenPackageFromHistory(history?: Array<{ role: 'user' | 'assistant'; content: string }>) {
  const list = Array.isArray(history) ? history : []
  const lastUser = [...list].reverse().find((m) => m.role === 'user')?.content || ''
  const direct = detectChosenPackage(lastUser)
  if (direct) return direct
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const m = list[i]
    if (m.role !== 'user') continue
    const choice = detectChosenPackage(m.content)
    if (choice) return choice
  }
  return null
}

export function buildAddonsList(lang: AiLang) {
  const title = lang === 'ua' ? 'Додаткові модулі:' : 'Дополнительные модули:'
  const rows = TEMOWEB_PROFILE.addons.map((a) => {
    const name = lang === 'ua' ? a.titleUa : a.titleRu
    const setup =
      a.setupEur > 0
        ? lang === 'ua'
          ? `+${fmtMoneyEur(a.setupEur)} підключення`
          : `+${fmtMoneyEur(a.setupEur)} подключение`
        : lang === 'ua'
        ? 'без разового підключення'
        : 'без разового подключения'
    const monthly =
      a.supportEurPerMonth > 0
        ? lang === 'ua'
          ? `+${fmtMoneyEur(a.supportEurPerMonth)}/міс`
          : `+${fmtMoneyEur(a.supportEurPerMonth)}/мес`
        : lang === 'ua'
        ? `+0 €/міс`
        : `+0 €/мес`
    return `— ${name}: ${setup}, ${monthly}`
  })
  return [title, ...rows].join('\n')
}

export function applyServicesRouter(text: string, lang: AiLang, intent: AiIntent, hasChosenPackage: boolean) {
  let out = text
  if (!hasChosenPackage && (intent.isCompare || intent.isPricing || intent.isServices)) {
    out = ensureAllPackagesMentioned(out, lang)
  }
  if (!hasChosenPackage && intent.isServices) {
    const addons = buildAddonsList(lang)
    if (!out.includes(addons.split('\n')[0])) {
      out = `${out}\n\n${addons}`.trim()
    }
  }
  return out
}

function buildPackageGuidance(lang: AiLang) {
  if (lang === 'ua') {
    return [
      'Щоб не гадати: START — коли 1 канал і треба швидко; BUSINESS — коли 2–3 канали + інтеграції/CRM/платежі; PRO — коли багато каналів і складні сценарії.',
      'Скажіть 2 речі: скільки каналів стартуємо і чи потрібні платежі/календар/CRM — і я чітко порекомендую 1 пакет.',
    ].join('\n')
  }
  return [
    'Чтобы не гадать: START — когда 1 канал и нужно быстро; BUSINESS — когда 2–3 канала + интеграции/CRM/платежи; PRO — когда много каналов и сложные сценарии.',
    'Скажите 2 вещи: сколько каналов запускаем и нужны ли платежи/календарь/CRM — и я чётко порекомендую 1 пакет.',
  ].join('\n')
}

export function applyPackageGuidance(params: { text: string; lang: AiLang; intent: AiIntent; recentAssistantTexts?: string[] }) {
  const { text, lang, intent } = params
  const out = String(text || '').trim()
  if (!out) return out
  // Only when it's actually relevant (services/pricing/compare). Otherwise it reads like a шаблон.
  if (!(intent.isPricing || intent.isCompare || intent.isServices)) return out
  // Only when packages are mentioned in the answer (otherwise we don't spam).
  if (!/\bSTART\b/i.test(out) && !/\bBUSINESS\b/i.test(out) && !/\bPRO\b/i.test(out)) return out

  // If there is already an explicit recommendation, do nothing.
  if (/(рекоменд|пропон|предлож|я\s+бы\s+выбрал|я\s+бы\s+предложил|подойд[её]т|підійде)\b/i.test(out)) return out

  // Avoid repeating the same guidance back-to-back.
  const recent = Array.isArray(params.recentAssistantTexts) ? params.recentAssistantTexts.filter(Boolean).slice(-2).join('\n') : ''
  if (recent && /чтобы\s+не\s+гадать|щоб\s+не\s+гадати/i.test(recent)) return out

  const guide = buildPackageGuidance(lang)
  if (out.includes(guide.split('\n')[0])) return out
  return `${out}\n\n${guide}`.trim()
}

export function applyPilotNudge(text: string, lang: AiLang, intent: AiIntent) {
  // Offer pilot not only when explicitly asked, but also on pricing interest (common entry point).
  const oneChannel = /(1\s*канал|один\s+канал|1\s*channel)/i.test(text)
  const mentionsModules = /(оплат|stripe|календар|calendar|crm|аналітик|аналитик|module|модул)/i.test(text)
  const pilotRelevant = intent.isPilotTrigger || intent.isPricing || (oneChannel && mentionsModules)
  if (!pilotRelevant) return text
  if (/pilot|пилот|пілот/i.test(text)) return text
  const p = TEMOWEB_PROFILE.pilot
  const line =
    lang === 'ua'
      ? `Можна почати з PILOT PROGRAM (2 місяці): ${fmtMoneyEur(p.setupEur)} + ${fmtMoneyEur(p.supportEurPerMonth)}/міс ×${p.durationMonths}, 1–${p.includedChannelsUpTo} канали на вибір.`
      : `Можно начать с PILOT PROGRAM (2 месяца): ${fmtMoneyEur(p.setupEur)} + ${fmtMoneyEur(p.supportEurPerMonth)}/мес ×${p.durationMonths}, 1–${p.includedChannelsUpTo} канала на выбор.`
  return `${text}\n\n${line}`.trim()
}

export function ensureCta(
  text: string,
  lang: AiLang,
  stage: TemoWebStage,
  readinessScore: number,
  intent: AiIntent,
  hasContactAlready = false
) {
  if (intent.isSupport) return text
  const hasQuestion = /\?/.test(text)
  const hasContactAsk = CONTACT_HINT_RE.test(text)
  let out = text

  if (stage === 'ASK_CONTACT' && hasContactAlready) {
    const confirmLine =
      lang === 'ua'
        ? 'Дякую, контакт отримав — заявку зафіксував.'
        : 'Спасибо, контакт получил — заявку зафиксировал.'
    if (!/(зафикс|зафікс|заявк\w*\s+принят|заявк\w*\s+прийнят|contact\s+received)/i.test(out)) {
      out = `${confirmLine}\n\n${out}`.trim()
    }
  }

  if (!hasContactAlready && (stage === 'ASK_CONTACT' || readinessScore >= 55 || intent.isContactIntent) && !hasContactAsk) {
    const line =
      lang === 'ua'
        ? 'Якщо зручно, залиште телефон або email — підкажу наступний крок.'
        : 'Если удобно, оставьте телефон или email — подскажу следующий шаг.'
    out = `${out}\n\n${line}`.trim()
    return out
  }

  // Avoid adding templated "2 вещи" CTA too often — it makes the assistant sound like a bot.
  // Only add a soft CTA if the answer is very short and contains no question.
  if (!hasQuestion && String(out || '').trim().length < 220) {
    const line =
      lang === 'ua'
        ? 'Щоб підказати точніше, напишіть нішу і звідки зараз йдуть заявки (Instagram/сайт/реклама тощо).'
        : 'Чтобы подсказать точнее, напишите нишу и откуда сейчас идут заявки (Instagram/сайт/реклама и т.д.).'
    if (!out.includes(line) && !NEXT_STEPS_HEADER_RE.test(out)) out = `${out}\n\n${line}`.trim()
  }
  return out
}

export function applyNoPaymentPolicy(text: string, lang: AiLang) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return text
  const kept: string[] = []
  let removed = false
  for (const line of lines) {
    if (PAYMENT_ASK_RE.test(line)) {
      removed = true
      continue
    }
    kept.push(line)
  }
  let out = kept.join('\n').trim()
  if (!out) out = text
  if (removed) {
    const line =
      lang === 'ua'
        ? 'Оплата обговорюється після погодження. Зараз фіксую заявку і підкажу наступний крок.'
        : 'Оплата обсуждается после согласования. Сейчас фиксирую заявку и подскажу следующий шаг.'
    if (!out.includes(line)) out = `${out}\n\n${line}`.trim()
  }
  return out
}

function hasRecentNextStepsBlock(recentAssistantTexts: string[]) {
  const joined = recentAssistantTexts.join('\n').toLowerCase()
  return joined.includes('если хотите') || joined.includes('якщо хочете') || joined.includes('если удобно') || joined.includes('якщо зручно')
}

function extractConversationSignals(params: {
  lang: AiLang
  stage: TemoWebStage
  intent: AiIntent
  hasChosenPackage: boolean
  readinessScore: number
  recentUserTexts?: string[]
  recentAssistantTexts?: string[]
}) {
  const users = (Array.isArray(params.recentUserTexts) ? params.recentUserTexts : []).join('\n')
  const asst = (Array.isArray(params.recentAssistantTexts) ? params.recentAssistantTexts : []).join('\n')
  const all = `${users}\n${asst}`
  const userTurnsApprox = Array.isArray(params.recentUserTexts) ? params.recentUserTexts.filter(Boolean).length : 0

  const hasContact = /\S+@\S+\.\S+/.test(users) || /(^|\s)@([a-zA-Z0-9_]{4,32})\b/.test(users) || /(\+?\d[\d\s().-]{7,}\d)/.test(users)
  const contactAskedRecently = /\b(телефон|email|почт|контакт|скиньте|надішліть|залиште)\b/i.test(asst)

  const discussedPackages = /\bSTART\b/i.test(all) || /\bBUSINESS\b/i.test(all) || /\bPRO\b/i.test(all)
  const comparedPackages = /(сравн|порівн|что\s+лучше|що\s+краще|choose|help\s+choose)/i.test(all)
  const discussedModules = /(модул|module|stripe|календар|calendar|аналітик|аналитик|crm|hubspot|pipedrive)/i.test(all)
  const discussedPrice = /(цена|ціна|стоим|сколько|вартість|скільки|pricing|price|\d+\s?€)/i.test(all)
  const discussedPilot = /(pilot|пилот|пілот)/i.test(all)
  const hasReadySignals = /(ок(ей)?|ok|понял|зрозуміл|супер|класс|топ|подходит|підходить|давай|домовились|домовилися|поехали|поїхали|хочу|хочемо|готов|готові|беру|берем)/i.test(
    users,
  )

  // "Golden middle" for contact ask:
  // - not on the very first turn
  // - earlier when offer/pricing/packages were discussed and user shows readiness signals
  const isNotFirst = userTurnsApprox >= 2
  const warmedByOffer = (discussedPrice || discussedPackages || comparedPackages || discussedPilot) && params.readinessScore >= 45 && isNotFirst
  const warmedByConfirm = hasReadySignals && params.readinessScore >= 40 && isNotFirst
  const needsContactNow =
    !hasContact &&
    (params.stage === 'ASK_CONTACT' || params.intent.isContactIntent || params.readinessScore >= 55 || warmedByOffer || warmedByConfirm)

  return {
    hasContact,
    contactAskedRecently,
    discussedPackages,
    comparedPackages,
    discussedModules,
    discussedPrice,
    discussedPilot,
    userTurnsApprox,
    hasReadySignals,
    needsContactNow,
  }
}

export function applyNextSteps(params: {
  text: string
  lang: AiLang
  stage: TemoWebStage
  readinessScore: number
  intent: AiIntent
  hasChosenPackage: boolean
  recentAssistantTexts?: string[]
  recentUserTexts?: string[]
}) {
  const { text, lang, stage, readinessScore, intent, hasChosenPackage } = params
  if (intent.isSupport) return text
  const out = String(text || '').trim()
  if (!out) return out

  // If we are already asking for contact (final action), do NOT show "next steps" options.
  // This avoids offering extra choices/questions when the user should just leave phone/email.
  const hasContactAsk = CONTACT_HINT_RE.test(out)
  if (stage === 'ASK_CONTACT' || hasContactAsk) {
    // If model produced a next-steps block, strip it. Otherwise keep as-is.
    let fixed = stripNextStepsBlock(out)
    // Fix accidental double numbering defensively even after stripping.
    fixed = fixed.replace(/(\b\d+\)\s+)\1/g, '$1')
    fixed = fixed.replace(/—\s*(\d+\)\s+)\1/g, '— $1')
    return fixed.trim()
  }

  // If model already produced next-step options, only normalize formatting (no templated injection).
  if (NEXT_STEPS_HEADER_RE.test(out)) {
    let fixed = out
    // Fix accidental double numbering like "1) 1)"
    fixed = fixed.replace(/(\b\d+\)\s+)\1/g, '$1')
    // Also handle "— 1) 1)" cases defensively
    fixed = fixed.replace(/—\s*(\d+\)\s+)\1/g, '— $1')
    return fixed.trim()
  }

  // Avoid showing this block twice in a row, but do not "skip every other" message.
  const recent = Array.isArray(params.recentAssistantTexts) ? params.recentAssistantTexts.filter(Boolean).slice(-1) : []
  if (recent.length && hasRecentNextStepsBlock(recent)) return out
  if (hasRecentNextStepsBlock([out])) return out

  const sig = extractConversationSignals({
    lang,
    stage,
    intent,
    hasChosenPackage,
    readinessScore,
    recentUserTexts: params.recentUserTexts,
    recentAssistantTexts: params.recentAssistantTexts,
  })

  const header = lang === 'ua' ? 'Якщо хочете — оберіть варіант:' : 'Если хотите — выберите вариант:'
  const lines: string[] = []

  // Priority 1: lead capture (only when warm/hot and not spammed recently)
  if (sig.needsContactNow && !sig.contactAskedRecently) {
    lines.push(
      lang === 'ua'
        ? 'Залиште телефон або email — я зафіксую заявку і передам менеджеру.'
        : 'Оставьте телефон или email — я зафиксирую заявку и передам менеджеру.',
    )
  }

  // Priority 2: offer/pricing guidance, but avoid repeating if already discussed
  if ((intent.isPricing || intent.isCompare || intent.isServices) && !sig.comparedPackages && !hasChosenPackage) {
    lines.push(
      lang === 'ua'
        ? 'Я коротко порівняю START / BUSINESS / PRO під вашу задачу.'
        : 'Я коротко сравню START / BUSINESS / PRO под вашу задачу.',
    )
  }

  // Priority 3: modules/add-ons (only if not already discussed)
  if ((intent.isServices || intent.isPricing) && !sig.discussedModules) {
    lines.push(
      lang === 'ua'
        ? 'Підкажу, які модулі варто додати (платежі/календар/аналітика/CRM).'
        : 'Подскажу, какие модули стоит добавить (платежи/календарь/аналитика/CRM).',
    )
  }

  // Pilot as a next step when pricing/budget/quick start is relevant and not yet discussed.
  if ((intent.isPricing || intent.isPilotTrigger) && !sig.discussedPilot) {
    lines.push(
      lang === 'ua'
        ? 'Поясню, чи підійде вам PILOT PROGRAM (запуск 48–72 год, 2 місяці).'
        : 'Поясню, подойдёт ли вам PILOT PROGRAM (запуск 48–72 часа, 2 месяца).',
    )
  }

  // General progression suggestions (stage-based), but avoid duplicating price/modules/topics.
  if (lines.length < 2) {
    if (stage === 'DISCOVERY') {
      lines.push(lang === 'ua' ? 'Я складу план запуску по кроках під ваш бізнес.' : 'Составлю план запуска по шагам под ваш бизнес.')
      lines.push(lang === 'ua' ? 'Підкажу, який сценарій продажів потрібен саме вам.' : 'Подскажу, какой сценарий продаж нужен именно вам.')
    } else if (stage === 'TRUST') {
      lines.push(lang === 'ua' ? 'Поясню процес і терміни запуску дуже просто.' : 'Объясню процесс и сроки запуска очень просто.')
      lines.push(lang === 'ua' ? 'Покажу, як ми не втрачаємо заявки і як це контролюється.' : 'Покажу, как мы не теряем заявки и как это контролируется.')
    } else {
      lines.push(lang === 'ua' ? 'Підкажу оптимальний наступний крок для вашої ситуації.' : 'Подскажу оптимальный следующий шаг для вашей ситуации.')
      lines.push(lang === 'ua' ? 'Дам короткий приклад, як виглядатиме діалог із клієнтом.' : 'Дам короткий пример, как будет выглядеть диалог с клиентом.')
    }
  }

  // Trim to 2 items max (as requested): keep stable numbering and no question marks.
  const uniq = Array.from(new Set(lines)).slice(0, 2)
  if (!uniq.length) return out
  const numbered = uniq.map((x, i) => `${i + 1}) ${x}`)
  const footer = lang === 'ua' ? 'Можна відповісти цифрою.' : 'Можно ответить цифрой.'
  return `${out}\n\n${header}\n${numbered.map((x) => `— ${x}`).join('\n')}\n${footer}`.trim()
}

function extractNextStepsOptionsFromText(text: string) {
  const t = String(text || '').trim()
  if (!t) return null
  if (!NEXT_STEPS_HEADER_RE.test(t)) return null
  const map: Record<number, string> = {}
  // Reset global regex state to avoid flaky parsing across calls.
  NEXT_STEPS_OPT_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = NEXT_STEPS_OPT_RE.exec(t))) {
    const idx = Number(m[2])
    const body = String(m[3] || '').trim()
    if (!Number.isFinite(idx) || idx < 1 || idx > 3) continue
    if (body) map[idx] = body
  }
  return Object.keys(map).length ? map : null
}

export function expandNumericChoiceFromRecentAssistant(params: {
  userText: string
  lang: AiLang
  recentAssistantTexts?: string[]
}) {
  const raw = String(params.userText || '').trim()
  const m = raw.match(DIGIT_ONLY_RE)
  if (!m) return raw
  const choice = Number(m[1])
  if (!Number.isFinite(choice) || choice < 1 || choice > 2) return raw

  const recent = Array.isArray(params.recentAssistantTexts) ? params.recentAssistantTexts.filter(Boolean).slice(-6) : []
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const opts = extractNextStepsOptionsFromText(recent[i])
    if (!opts) continue
    const picked = opts[choice]
    if (!picked) continue
    const isPilotPick = /(pilot|пілот|пилот|запустити\s+пілот|пілотн)/i.test(picked)
    if (isPilotPick) {
      return params.lang === 'ua'
        ? [
            `Клієнт відповів цифрою "${choice}" — це вибір з попереднього блоку "Якщо хочете". Обраний пункт: "${picked}".`,
            'Клієнт готовий залишити телефон або email, щоб зафіксувати заявку.',
            'КРИТИЧНО: це кінцевий крок до старту. Попросіть контакт (телефон або email) щоб зафіксувати заявку.',
            'Далі коротко (без води) дайте чек‑лист 3 пунктів, що треба зібрати: 1–2 канали для старту; ніша/послуга; звідки зараз йдуть заявки.',
            'Не додавайте блок "Якщо хочете — оберіть варіант" у цьому повідомленні.',
          ].join('\n')
        : [
            `Клиент ответил цифрой "${choice}" — это выбор из предыдущего блока "Если хотите". Выбранный пункт: "${picked}".`,
            'Клиент готов оставить телефон или email, чтобы зафиксировать заявку.',
            'КРИТИЧНО: это конечный шаг к старту. Попросите контакт (телефон или email), чтобы зафиксировать заявку.',
            'Дальше коротко (без воды) дайте чек‑лист из 3 пунктов, что нужно: 1–2 канала старта; ниша/услуга; откуда сейчас идут заявки.',
            'Не добавляйте блок "Если хотите — выберите вариант" в этом сообщении.',
          ].join('\n')
    }
    return params.lang === 'ua'
      ? `Клієнт відповів цифрою "${choice}" — це вибір з попереднього блоку "Якщо хочете". Обраний пункт: "${picked}". Продовжуйте саме по цьому пункту.`
      : `Клиент ответил цифрой "${choice}" — это выбор из предыдущего блока "Если хотите". Выбранный пункт: "${picked}". Продолжайте именно по этому пункту.`
  }
  return raw
}

export function applyChannelLimits(text: string, channel: AiChannel) {
  const limits: Record<AiChannel, { maxChars: number; maxLines: number }> = {
    website: { maxChars: 1700, maxLines: 14 },
    flow: { maxChars: 1500, maxLines: 12 },
    // Keep under IG common message limits; server-side sending may still split by byte-size if needed.
    instagram: { maxChars: 2400, maxLines: 18 },
    messenger: { maxChars: 2000, maxLines: 16 },
    telegram: { maxChars: 2000, maxLines: 16 },
    // WhatsApp supports longer messages; server sender can split if needed.
    whatsapp: { maxChars: 1600, maxLines: 14 },
  }
  const { maxChars, maxLines } = limits[channel]
  const trimmed = trimToMaxLines(text, maxLines)
  return clip(trimmed, maxChars)
}

export function evaluateQuality(text: string, lang: AiLang, intent: AiIntent, channel: AiChannel) {
  const hasStart = /\bSTART\b/i.test(text)
  const hasBusiness = /\bBUSINESS\b/i.test(text)
  const hasPro = /\bPRO\b/i.test(text)
  const missingPackages = (intent.isServices || intent.isPricing || intent.isCompare) && !(hasStart && hasBusiness && hasPro)
  const addonNames = TEMOWEB_PROFILE.addons.map((a) => (lang === 'ua' ? a.titleUa : a.titleRu))
  const addonsCovered = addonNames.filter((name) => text.includes(name)).length
  const missingAddons = intent.isServices && addonsCovered < addonNames.length
  const tooLong = text.length > (channel === 'whatsapp' ? 900 : channel === 'flow' ? 1000 : 1200)
  const noCta = !CONTACT_HINT_RE.test(text) && !/(наступн|следующ|далі|далее)/i.test(text)
  return { missingPackages, missingAddons, tooLong, noCta }
}

export function clip(text: string, max = 1000) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function trimToMaxLines(text: string, maxLines: number) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length <= maxLines) return text.trim()

  // Preserve the entire "next steps" block at the end, if present.
  const idx = lines.findIndex((l) => NEXT_STEPS_HEADER_RE.test(l))
  if (idx >= 0) {
    const block = lines.slice(idx)
    const leadBudget = maxLines - block.length
    if (leadBudget <= 0) return block.slice(-maxLines).join('\n').trim()
    const lead = lines.slice(0, Math.min(idx, leadBudget))
    return [...lead, ...block].join('\n').trim()
  }

  const sliced = lines.slice(0, maxLines).join('\n')
  return `${sliced}…`
}
