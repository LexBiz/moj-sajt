import { TEMOWEB_PROFILE } from '@/app/api/temowebProfile'
import { ensureAllPackagesMentioned, isPackageCompareRequest } from '@/app/lib/packageGuard'
import type { TemoWebStage } from '@/app/api/temowebPrompt'

export type AiChannel = 'website' | 'flow' | 'instagram' | 'whatsapp' | 'telegram' | 'messenger'
export type AiLang = 'ru' | 'ua'

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
const SUPPORT_RE =
  /(не\s+работ|не\s+працю|сбой|збій|ошибк|помил|не\s+отправ|не\s+відправ|поддержк|підтримк|support|помогите|допомож|сломал|зламал|не\s+приход|не\s+приход|интеграц|інтеграц|token|токен|webhook|підписк|подписк|оплат.*не|оплата\s+не|ошибка\s+api|error\s+api)/i
const SERVICES_RE =
  /(услуг|услуги|послуг|послуги|service|services|offerings|what\s+do\s+you\s+offer|что\s+вы\s+предлагаете|що\s+ви\s+пропонуєте|прайс|каталог)/i
const PRICING_RE = /(цена|ціна|стоим|сколько|вартість|скільки|пакет|тариф|pricing|price)/i
const PILOT_RE = /(пілот|пилот|pilot|попробовать|спробуват|тест|быстро|швидко|дешевле|дешевш|дорого|дорога|дороговато|малый\s+бюджет|малий\s+бюджет)/i
const PAYMENT_ASK_RE =
  /(оплат|оплач|счет|рахунок|invoice|pay\s+now|payment\s+link|оплата\s+сейчас|оплатить|внести\s+оплат)/i
const PACKAGE_CHOICE_RE =
  /\b(беру|берем|выбираю|обираю|хочу|хочемо|хотим|нужен|потрібен|потрібна|нужно|надо|мой|мій|нам|для\s+нас|для\s+меня|ок|окей)\b[\s\S]*\b(START|BUSINESS|PRO)\b/i

const NEXT_STEPS_HEADER_RE = /(если\s+хотите|якщо\s+хочете)\s*[—-]?\s*(выберите|оберіть)\s*(вариант|варіант)/i
const NEXT_STEPS_OPT_RE = /(^|\n)\s*[—-]\s*([1-3])\)\s*([^\n]+)\s*(?=\n|$)/g
const DIGIT_ONLY_RE = /^\s*([1-3])\s*$/

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

export function applyPilotNudge(text: string, lang: AiLang, intent: AiIntent) {
  // Offer pilot not only when explicitly asked, but also on pricing interest (common entry point).
  if (!intent.isPilotTrigger && !intent.isPricing) return text
  if (/pilot|пилот|пілот/i.test(text)) return text
  const p = TEMOWEB_PROFILE.pilot
  const line =
    lang === 'ua'
      ? `Можна почати з PILOT PROGRAM (2 місяці): ${fmtMoneyEur(p.setupEur)} + ${fmtMoneyEur(p.supportEurPerMonth)}/міс ×${p.durationMonths}, 1–${p.includedChannelsUpTo} канали на вибір.`
      : `Можно начать с PILOT PROGRAM (2 месяца): ${fmtMoneyEur(p.setupEur)} + ${fmtMoneyEur(p.supportEurPerMonth)}/мес ×${p.durationMonths}, 1–${p.includedChannelsUpTo} канала на выбор.`
  return `${text}\n\n${line}`.trim()
}

export function ensureCta(text: string, lang: AiLang, stage: TemoWebStage, readinessScore: number, intent: AiIntent) {
  if (intent.isSupport) return text
  const hasQuestion = /\?/.test(text)
  const hasContactAsk = CONTACT_HINT_RE.test(text)
  let out = text

  if ((stage === 'ASK_CONTACT' || readinessScore >= 55 || intent.isContactIntent) && !hasContactAsk) {
    const line =
      lang === 'ua'
        ? 'Якщо зручно, залиште телефон або email — підкажу наступний крок.'
        : 'Если удобно, оставьте телефон или email — подскажу следующий шаг.'
    out = `${out}\n\n${line}`.trim()
    return out
  }

  if (stage === 'OFFER' && !hasContactAsk) {
    const line =
      lang === 'ua'
        ? 'Підберу пакет після 1 уточнення: ніша і звідки зараз йдуть заявки.'
        : 'Подберу пакет после 1 уточнения: ниша и откуда сейчас идут заявки.'
    if (!out.includes(line)) out = `${out}\n\n${line}`.trim()
    return out
  }

  if (!hasQuestion) {
    const line =
      lang === 'ua'
        ? 'Щоб порадити точніше, потрібні 2 речі: ніша і джерело заявок.'
        : 'Чтобы посоветовать точнее, нужны 2 вещи: ниша и источник заявок.'
    if (!out.includes(line)) out = `${out}\n\n${line}`.trim()
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

  const hasContact = /\S+@\S+\.\S+/.test(users) || /(^|\s)@([a-zA-Z0-9_]{4,32})\b/.test(users) || /(\+?\d[\d\s().-]{7,}\d)/.test(users)
  const contactAskedRecently = /\b(телефон|email|почт|контакт|скиньте|надішліть|залиште)\b/i.test(asst)

  const discussedPackages = /\bSTART\b/i.test(all) || /\bBUSINESS\b/i.test(all) || /\bPRO\b/i.test(all)
  const comparedPackages = /(сравн|порівн|что\s+лучше|що\s+краще|choose|help\s+choose)/i.test(all)
  const discussedModules = /(модул|module|stripe|календар|calendar|аналітик|аналитик|crm|hubspot|pipedrive)/i.test(all)
  const discussedPrice = /(цена|ціна|стоим|сколько|вартість|скільки|pricing|price|\d+\s?€)/i.test(all)
  const discussedPilot = /(pilot|пилот|пілот)/i.test(all)

  const needsContactNow = (params.stage === 'ASK_CONTACT' || params.readinessScore >= 55 || params.intent.isContactIntent) && !hasContact

  return {
    hasContact,
    contactAskedRecently,
    discussedPackages,
    comparedPackages,
    discussedModules,
    discussedPrice,
    discussedPilot,
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
        ? 'Підкажу, які модулі варто додати (оплати/календар/аналітика/CRM).'
        : 'Подскажу, какие модули стоит добавить (оплаты/календарь/аналитика/CRM).',
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

  // Trim to 3 items max, keep stable numbering and no question marks.
  const uniq = Array.from(new Set(lines)).slice(0, 3)
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
  if (!Number.isFinite(choice) || choice < 1 || choice > 3) return raw

  const recent = Array.isArray(params.recentAssistantTexts) ? params.recentAssistantTexts.filter(Boolean).slice(-6) : []
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const opts = extractNextStepsOptionsFromText(recent[i])
    if (!opts) continue
    const picked = opts[choice]
    if (!picked) continue
    return params.lang === 'ua'
      ? `Клієнт відповів цифрою "${choice}" — це вибір з попереднього блоку "Якщо хочете". Обраний пункт: "${picked}". Продовжуйте саме по цьому пункту.`
      : `Клиент ответил цифрой "${choice}" — это выбор из предыдущего блока "Если хотите". Выбранный пункт: "${picked}". Продолжайте именно по этому пункту.`
  }
  return raw
}

export function applyChannelLimits(text: string, channel: AiChannel) {
  if (channel === 'instagram' || channel === 'messenger' || channel === 'telegram') return String(text || '').trim()
  const limits: Record<AiChannel, { maxChars: number; maxLines: number }> = {
    website: { maxChars: 1200, maxLines: 10 },
    flow: { maxChars: 1000, maxLines: 8 },
    instagram: { maxChars: 1400, maxLines: 12 },
    messenger: { maxChars: 1200, maxLines: 10 },
    telegram: { maxChars: 1100, maxLines: 10 },
    whatsapp: { maxChars: 900, maxLines: 8 },
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
  const sliced = lines.slice(0, maxLines).join('\n')
  return `${sliced}…`
}
