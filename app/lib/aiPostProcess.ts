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
  if (!intent.isPilotTrigger) return text
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
