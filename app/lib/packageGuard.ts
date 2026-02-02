import { TEMOWEB_PROFILE } from '@/app/api/temowebProfile'

function fmtMoneyEur(n: number) {
  try {
    return `${n.toLocaleString('ru-RU')} €`
  } catch {
    return `${n} €`
  }
}

export function isPackageCompareRequest(text: string) {
  const t = String(text || '').toLowerCase()
  if (!t) return false
  return /(сравн|порівн|compare|пакет|тариф|прайс|цена|ціна|стоим|сколько|вартість|скільки|услуг|услуги|послуг|послуги|service|services|offerings|what\s+do\s+you\s+offer|choose|выбрат|обрат|определ|help\s+choose|що\s+краще|что\s+лучше)/i.test(
    t,
  )
}

export function ensureAllPackagesMentioned(text: string, lang: 'ru' | 'ua') {
  const hasStart = /\bSTART\b/i.test(text)
  const hasBusiness = /\bBUSINESS\b/i.test(text)
  const hasPro = /\bPRO\b/i.test(text)
  if (hasStart && hasBusiness && hasPro) return text

  const p = TEMOWEB_PROFILE.packages
  const lines: string[] = []
  if (!hasStart) {
    lines.push(
      lang === 'ua'
        ? `— START: для 1 каналу та швидкого запуску. ${fmtMoneyEur(p.start.setupEur)} + ${fmtMoneyEur(p.start.supportEurPerMonth)}/міс, до ${p.start.channelsUpTo} каналів.`
        : `— START: для 1 канала и быстрого запуска. ${fmtMoneyEur(p.start.setupEur)} + ${fmtMoneyEur(p.start.supportEurPerMonth)}/мес, до ${p.start.channelsUpTo} каналов.`,
    )
  }
  if (!hasBusiness) {
    lines.push(
      lang === 'ua'
        ? `— BUSINESS: для 2–3 каналів + інтеграції/CRM/оплати. ${fmtMoneyEur(p.business.setupEur)} + ${fmtMoneyEur(p.business.supportEurPerMonth)}/міс, до ${p.business.channelsUpTo} каналів.`
        : `— BUSINESS: для 2–3 каналов + интеграции/CRM/оплаты. ${fmtMoneyEur(p.business.setupEur)} + ${fmtMoneyEur(p.business.supportEurPerMonth)}/мес, до ${p.business.channelsUpTo} каналов.`,
    )
  }
  if (!hasPro) {
    lines.push(
      lang === 'ua'
        ? `— PRO: для масштабування (багато каналів/складні інтеграції/вищі вимоги). ${fmtMoneyEur(p.pro.setupEur)} + ${fmtMoneyEur(p.pro.supportEurPerMonth)}/міс, до ${p.pro.channelsUpTo} каналів.`
        : `— PRO: для масштабирования (много каналов/сложные интеграции/высокие требования). ${fmtMoneyEur(p.pro.setupEur)} + ${fmtMoneyEur(p.pro.supportEurPerMonth)}/мес, до ${p.pro.channelsUpTo} каналов.`,
    )
  }

  if (!lines.length) return text
  const header = lang === 'ua' ? 'Коротко по пакетах (щоб легше обрати):' : 'Коротко по пакетам (чтобы легче выбрать):'
  const helper =
    lang === 'ua'
      ? 'Скажіть 2 речі: скільки каналів стартуємо і чи потрібні платежі/календар/CRM — і я чітко порекомендую 1 пакет та план запуску.'
      : 'Скажите 2 вещи: сколько каналов запускаем и нужны ли платежи/календарь/CRM — и я чётко порекомендую 1 пакет и план запуска.'
  return `${text}\n\n${header}\n${lines.join('\n')}\n${helper}`.trim()
}

