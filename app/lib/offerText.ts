import { TEMOWEB_PROFILE } from '@/app/api/temowebProfile'

export function isOfferCompareIntent(text: string) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return false
  return /(сравн|порівн|пакет|тариф|прайс|price|цена|ціна|стоим|сколько|вартість|скільки|что\s+лучше|який\s+краще|выбрат|обрати|определ|допоможи\s+обрат|help\s+choose)/i.test(
    t,
  )
}

export function buildOfferCompareText(opts: { lang: 'ru' | 'ua'; includePilot?: boolean }) {
  const lang = opts.lang
  const includePilot = Boolean(opts.includePilot)

  const money = (n: number) => `${n.toLocaleString('ru-RU')} €`
  const p = TEMOWEB_PROFILE.packages
  const pilot = TEMOWEB_PROFILE.pilot

  const pilotTotal = pilot.setupEur + pilot.supportEurPerMonth * pilot.durationMonths

  const lines: string[] = []
  if (includePilot) {
    lines.push(lang === 'ua' ? 'PILOT PROGRAM (2 місяці):' : 'PILOT PROGRAM (2 месяца):')
    lines.push(
      lang === 'ua'
        ? `— ${money(pilot.setupEur)} впровадження + ${money(pilot.supportEurPerMonth)}/міс ×${pilot.durationMonths} (разом ${money(pilotTotal)})`
        : `— ${money(pilot.setupEur)} внедрение + ${money(pilot.supportEurPerMonth)}/мес ×${pilot.durationMonths} (итого ${money(pilotTotal)})`,
    )
    lines.push(lang === 'ua' ? '— 1–2 канали на вибір + CRM + Telegram сповіщення' : '— 1–2 канала на выбор + CRM + уведомления в Telegram')
    lines.push(
      lang === 'ua'
        ? '— Модулі (оплата/календар/аналітика/зовнішня CRM) можна додати окремо як доп. роботу'
        : '— Модули (оплата/календарь/аналитика/внешняя CRM) можно добавить отдельно как доп. работу',
    )
    lines.push('')
  }

  lines.push(lang === 'ua' ? 'Пакети (порівняння):' : 'Пакеты (сравнение):')

  // START
  lines.push('1) START')
  lines.push(
    lang === 'ua'
      ? `— ${money(p.start.setupEur)} + ${money(p.start.supportEurPerMonth)}/міс (мін. ${p.start.supportMinMonths} міс), до ${p.start.channelsUpTo} каналів`
      : `— ${money(p.start.setupEur)} + ${money(p.start.supportEurPerMonth)}/мес (мин. ${p.start.supportMinMonths} мес), до ${p.start.channelsUpTo} каналов`,
  )
  lines.push(
    lang === 'ua'
      ? '— Для кого: 1–2 канали, треба перестати втрачати заявки і швидко навести порядок'
      : '— Для кого: 1–2 канала, нужно перестать терять заявки и быстро навести порядок',
  )

  // BUSINESS
  lines.push('')
  lines.push('2) BUSINESS')
  lines.push(
    lang === 'ua'
      ? `— ${money(p.business.setupEur)} + ${money(p.business.supportEurPerMonth)}/міс (мін. ${p.business.supportMinMonths} міс), до ${p.business.channelsUpTo} каналів`
      : `— ${money(p.business.setupEur)} + ${money(p.business.supportEurPerMonth)}/мес (мин. ${p.business.supportMinMonths} мес), до ${p.business.channelsUpTo} каналов`,
  )
  lines.push(
    lang === 'ua'
      ? '— Для кого: є потік лідів, потрібні сценарії під задачі + CRM‑воронка і контроль'
      : '— Для кого: есть поток лидов, нужны сценарии под задачи + CRM‑воронка и контроль',
  )

  // PRO
  lines.push('')
  lines.push('3) PRO')
  lines.push(
    lang === 'ua'
      ? `— ${money(p.pro.setupEur)} + ${money(p.pro.supportEurPerMonth)}/міс (мін. ${p.pro.supportMinMonths} міс), до ${p.pro.channelsUpTo} каналів`
      : `— ${money(p.pro.setupEur)} + ${money(p.pro.supportEurPerMonth)}/мес (мин. ${p.pro.supportMinMonths} мес), до ${p.pro.channelsUpTo} каналов`,
  )
  lines.push(
    lang === 'ua'
      ? '— Для кого: простій = втрата грошей, потрібні інтеграції (оплати/календар/зовн. CRM) і пріоритет'
      : '— Для кого: простой = потеря денег, нужны интеграции (оплата/календарь/внешн. CRM) и приоритет',
  )

  lines.push('')
  lines.push(
    lang === 'ua'
      ? 'Щоб порадити точно: Вам потрібно 1–2 канали чи 3+ (і чи потрібні оплати/календар)?'
      : 'Чтобы порекомендовать точно: вам нужно 1–2 канала или 3+ (и нужны ли оплаты/календарь)?',
  )

  return lines.join('\n')
}

