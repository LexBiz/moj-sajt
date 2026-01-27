'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Zap, CheckCircle2, Users, Calendar, TrendingUp, Scissors, Car, GraduationCap, Wrench, Briefcase } from 'lucide-react'

type Lang = 'ua' | 'ru' | 'cz'

type Dict = {
  badge: string
  headerSubtitle: string
  heroTitle: string
  heroSubtitle: string
  ctaPrimary: string
  ctaSecondary: string
  ctaNote: string
  howTitle: string
  howSteps: { title: string; text: string; icon: string }[]
  howCta: string
  whoTitle: string
  whoList: string[]
  whoText: string
  whoCta: string
  resultTitle: string
  resultBullets: { text: string; stat?: string }[]
  resultCta: string
  packagesTitle: string
  packages: { name: string; price: string; desc: string; cta: string }[]
  addonsTitle: string
  addons: { name: string; price: string; desc: string }[]
  faqTitle: string
  faq: { q: string; a: string }[]
  formTitle: string
  formSubtitle: string
  name: string
  contact: string
  comment: string
  formCta: string
  formSuccess: string
  formError: string
  fieldRequired: string
  trustBadge: string
  footerAbout: string
}

const dict: Record<Lang, Dict> = {
  ua: {
    badge: 'Система прийому клієнтів',
    headerSubtitle: 'Система прийому клієнтів',
    heroTitle: 'Клієнт або записався — або пішов до конкурента',
    heroSubtitle:
      'Я будую системи, які автоматично приймають заявки, відповідають клієнтам і фіксують їх без менеджерів і дзвінків',
    ctaPrimary: 'Показати, як це працює',
    ctaSecondary: 'Демо для мого бізнесу',
    ctaNote: 'Просто подивись. Ніяких дзвінків. 30 секунд.',
    howTitle: 'Що відбувається насправді',
    howSteps: [
      { title: 'Клієнт пише або натискає', text: 'Instagram, сайт, реклама — байдуже', icon: '💬' },
      { title: 'Система одразу реагує', text: 'Задає питання, фільтрує і формує заявку', icon: '⚡' },
      { title: 'Ви отримуєте готового клієнта', text: 'Telegram / таблиця / CRM — без хаосу', icon: '✓' },
    ],
    howCta: 'Подивитись рішення для мого бізнесу',
    whoTitle: 'Кому це потрібно',
    whoList: ['Барбершопи і салони', 'Автосервіси', 'Курси і школи', 'Сервісні бізнеси', 'Малий та середній бізнес'],
    whoText: 'Якщо клієнти пишуть, дзвонять і губляться — це для вас',
    whoCta: 'Перевірити під свій бізнес',
    resultTitle: 'Що змінюється після впровадження',
    resultBullets: [
      { text: 'Клієнти не губляться', stat: '+70% заявок без ручної відповіді' },
      { text: 'Немає дзвінків і ручної переписки', stat: '24/7 прийом без людини' },
      { text: 'Ви бачите всі заявки', stat: 'Прозорий статус кожної заявки' },
      { text: 'Система працює 24/7', stat: 'Навіть вночі та у вихідні' },
      { text: 'Менше хаосу — більше продажів', stat: 'Мінус ручна робота' },
    ],
    resultCta: 'Побачити це в дії',
    packagesTitle: 'Пакети',
    packages: [
      { name: 'START', price: '990 € + 220 €/міс', desc: 'До 2 каналів. AI‑асистент відповідає + уточнює. Збір заявки + базова CRM + Telegram‑сповіщення.', cta: '⚡️ Замовити' },
      { name: 'BUSINESS', price: '1 900 € + 390 €/міс', desc: 'До 3 каналів. Сценарії: запис/FAQ/кваліфікація/контакти/заперечення. CRM‑воронка + базова аналітика.', cta: '⚡️ Замовити' },
      { name: 'PRO', price: '3 900 € + 790 €/міс', desc: 'До 5 каналів. Інтеграції (оплати/календар/звітність) + пріоритет. Щомісячні покращення конверсії.', cta: '⚡️ Замовити' },
    ],
    addonsTitle: 'Додаткові модулі',
    addons: [
      { name: 'Додатковий канал', price: '+200 € + 60 €/міс', desc: 'Понад ліміт пакета (наприклад WhatsApp).' },
      { name: 'Оплати Stripe', price: '+390 € + 40 €/міс', desc: 'Checkout + статуси оплати в CRM + сповіщення.' },
      { name: 'Онлайн‑запис / календар', price: '+290 € + 30 €/міс', desc: 'Calendly/Google Calendar + підтвердження/нагадування.' },
      { name: 'Авто‑нагадування / розсилки', price: '+220 € + 25 €/міс', desc: 'Повернення лідів: “не відповіли / не записались”.' },
      { name: 'Аналітика (розширена)', price: '+250 € + 35 €/міс', desc: 'Звіти по каналах і конверсії.' },
      { name: 'Зовнішня CRM (HubSpot/Pipedrive)', price: '+450 € + 60 €/міс', desc: 'Синхронізація лідів і статусів.' },
      { name: 'Мультимовність', price: '+180 € / мова + 15 €/міс', desc: 'Додаткові мови у сценаріях і відповідях.' },
      { name: 'Пріоритетна підтримка', price: '+120 €/міс', desc: 'Швидша реакція та фікси.' },
    ],
    faqTitle: 'FAQ',
    faq: [
      {
        q: 'Чому є щомісячна оплата?',
        a: 'Платформи (Meta/WhatsApp/Telegram) регулярно змінюють токени/правила. Підтримка = моніторинг, оновлення доступів і фікси збоїв.',
      },
      { q: 'Можна лише впровадження без підписки?', a: 'Ні. Беремо проєкти тільки із супроводом — інакше не гарантуємо стабільність.' },
      { q: 'Скільки часу запуск?', a: 'Start: 5–7 роб. днів. Business: 7–14 днів. Pro: від 14 днів (залежить від доступів).' },
    ],
    formTitle: 'Хочеш рішення прямо зараз?',
    formSubtitle: 'Я покажу, як це може працювати у вашому бізнесі',
    name: 'Імʼя',
    contact: 'Контакт (email або Telegram)',
    comment: 'Короткий коментар (необовʼязково)',
    formCta: 'Отримати рішення',
    formSuccess: 'Запит прийнято. Якщо система підходить — наступний крок реалізація.',
    formError: 'Перевірте контакт і спробуйте ще раз',
    fieldRequired: 'Заповніть поле',
    trustBadge: 'Система працює 24/7, автоматично звʼязує заявки і веде їх у Telegram / CRM',
    footerAbout: 'Про мене',
  },
  ru: {
    badge: 'Система приёма клиентов',
    headerSubtitle: 'Система приёма клиентов',
    heroTitle: 'Клиент либо записался — либо ушёл к конкуренту',
    heroSubtitle:
      'Я строю системы, которые автоматически принимают заявки, отвечают клиентам и фиксируют их без менеджеров и звонков',
    ctaPrimary: 'Показать, как это работает',
    ctaSecondary: 'Демо для моего бизнеса',
    ctaNote: 'Просто посмотри. Без звонков. 30 секунд.',
    howTitle: 'Что происходит на самом деле',
    howSteps: [
      { title: 'Клиент пишет или нажимает', text: 'Instagram, сайт, реклама — не важно', icon: '💬' },
      { title: 'Система сразу реагирует', text: 'Задает вопросы, фильтрует и формирует заявку', icon: '⚡' },
      { title: 'Вы получаете готового клиента', text: 'Telegram / таблица / CRM — без хаоса', icon: '✓' },
    ],
    howCta: 'Посмотреть решение для моего бизнеса',
    whoTitle: 'Кому это нужно',
    whoList: ['Барбершопы и салоны', 'Автосервисы', 'Курсы и школы', 'Сервисные бизнесы', 'Малый и средний бизнес'],
    whoText: 'Если клиенты пишут, звонят и теряются — это для вас',
    whoCta: 'Проверить под свой бизнес',
    resultTitle: 'Что меняется после внедрения',
    resultBullets: [
      { text: 'Клиенты не теряются', stat: '+70% заявок без ручной работы' },
      { text: 'Нет звонков и ручной переписки', stat: '24/7 приём без человека' },
      { text: 'Вы видите все заявки', stat: 'Прозрачный статус каждой заявки' },
      { text: 'Система работает 24/7', stat: 'Даже ночью и в выходные' },
      { text: 'Меньше хаоса — больше продаж', stat: 'Минус ручная работа' },
    ],
    resultCta: 'Увидеть это в действии',
    packagesTitle: 'Пакеты',
    packages: [
      { name: 'START', price: '990 € + 220 €/мес', desc: 'До 2 каналов. AI‑ассистент отвечает + уточняет. Сбор заявки + базовая CRM + Telegram‑уведомления.', cta: '⚡️ Заказать' },
      { name: 'BUSINESS', price: '1 900 € + 390 €/мес', desc: 'До 3 каналов. Сценарии: запись/FAQ/квалификация/контакты/возражения. CRM‑воронка + базовая аналитика.', cta: '⚡️ Заказать' },
      { name: 'PRO', price: '3 900 € + 790 €/мес', desc: 'До 5 каналов. Интеграции (оплаты/календарь/отчёты) + приоритет. Ежемесячные улучшения конверсии.', cta: '⚡️ Заказать' },
    ],
    addonsTitle: 'Дополнительные модули',
    addons: [
      { name: 'Дополнительный канал', price: '+200 € + 60 €/мес', desc: 'Сверх лимита пакета (например WhatsApp).' },
      { name: 'Оплаты Stripe', price: '+390 € + 40 €/мес', desc: 'Checkout + статусы оплаты в CRM + уведомления.' },
      { name: 'Онлайн‑запись / календарь', price: '+290 € + 30 €/мес', desc: 'Calendly/Google Calendar + подтверждения/напоминания.' },
      { name: 'Авто‑напоминания / рассылки', price: '+220 € + 25 €/мес', desc: 'Возврат лидов: “не ответили / не записались”.' },
      { name: 'Аналитика (расширенная)', price: '+250 € + 35 €/мес', desc: 'Отчёты по каналам и конверсии.' },
      { name: 'Внешняя CRM (HubSpot/Pipedrive)', price: '+450 € + 60 €/мес', desc: 'Синхронизация лидов и статусов.' },
      { name: 'Мультиязычность', price: '+180 € / язык + 15 €/мес', desc: 'Дополнительные языки в сценариях и ответах.' },
      { name: 'Приоритетная поддержка', price: '+120 €/мес', desc: 'Ускоренная реакция и фиксы.' },
    ],
    faqTitle: 'FAQ',
    faq: [
      {
        q: 'Почему есть ежемесячная оплата?',
        a: 'Платформы (Meta/WhatsApp/Telegram) регулярно меняют токены/правила. Поддержка = мониторинг, обновление доступов и фиксы сбоев.',
      },
      { q: 'Можно только внедрение без подписки?', a: 'Нет. Берём проекты только с сопровождением — иначе не гарантируем стабильность.' },
      { q: 'Сколько времени запуск?', a: 'Start: 5–7 раб. дней. Business: 7–14 дней. Pro: от 14 дней (зависит от доступов).' },
    ],
    formTitle: 'Хочешь решение прямо сейчас?',
    formSubtitle: 'Я покажу, как это может работать в вашем бизнесе',
    name: 'Имя',
    contact: 'Контакт (email или Telegram)',
    comment: 'Короткий комментарий (необязательно)',
    formCta: 'Получить решение',
    formSuccess: 'Запрос принят. Если система подходит — следующий шаг внедрение.',
    formError: 'Проверьте контакт и попробуйте снова',
    fieldRequired: 'Заполните поле',
    trustBadge: 'Система работает 24/7, автоматически связывает заявки и ведёт их в Telegram / CRM',
    footerAbout: 'Обо мне',
  },
  cz: {
    badge: 'Systém pro příjem klientů',
    headerSubtitle: 'Systém pro příjem klientů',
    heroTitle: 'Klient se buď objednal — nebo odešel ke konkurenci',
    heroSubtitle:
      'Stavím systémy, které automaticky přijímají poptávky, odpovídají klientům a ukládají je bez manažerů a hovorů',
    ctaPrimary: 'Ukázat, jak to funguje',
    ctaSecondary: 'Demo pro můj byznys',
    ctaNote: 'Jen se podívej. Bez hovorů. 30 sekund.',
    howTitle: 'Co se děje ve skutečnosti',
    howSteps: [
      { title: 'Klient píše nebo kliká', text: 'Instagram, web, reklama — je to jedno', icon: '💬' },
      { title: 'Systém hned reaguje', text: 'Ptá se, filtruje a vytváří poptávku', icon: '⚡' },
      { title: 'Dostanete připraveného klienta', text: 'Telegram / tabulka / CRM — bez chaosu', icon: '✓' },
    ],
    howCta: 'Podívat se na řešení pro můj byznys',
    whoTitle: 'Komu se to hodí',
    whoList: ['Barbershopy a salony', 'Autoservisy', 'Kurzy a školy', 'Servisní byznysy', 'Malý a střední byznys'],
    whoText: 'Když klienti píšou, volají a ztrácí se — je to pro vás',
    whoCta: 'Prověřit pro můj byznys',
    resultTitle: 'Co se změní po nasazení',
    resultBullets: [
      { text: 'Klienti se neztrácí', stat: '+70% poptávek bez ruční práce' },
      { text: 'Bez hovorů a ruční komunikace', stat: '24/7 příjem bez člověka' },
      { text: 'Vidíte všechny poptávky', stat: 'Transparentní status každé poptávky' },
      { text: 'Systém běží 24/7', stat: 'I v noci a o víkendech' },
      { text: 'Méně chaosu — více prodejů', stat: 'Minus ruční práce' },
    ],
    resultCta: 'Uvidět to v akci',
    packagesTitle: 'Balíčky',
    packages: [
      { name: 'START', price: '990 € + 220 €/m', desc: 'Up to 2 channels. AI replies + asks clarifying questions. Lead capture + basic CRM + Telegram alerts.', cta: '⚡️ Objednat' },
      { name: 'BUSINESS', price: '1 900 € + 390 €/m', desc: 'Up to 3 channels. Scenarios: booking/FAQ/qualification/contacts. CRM pipeline + basic analytics.', cta: '⚡️ Objednat' },
      { name: 'PRO', price: '3 900 € + 790 €/m', desc: 'Up to 5 channels. Integrations (payments/calendar/reports) + priority. Monthly improvements.', cta: '⚡️ Objednat' },
    ],
    addonsTitle: 'Extra moduly',
    addons: [
      { name: 'Extra channel', price: '+200 € + 60 €/m', desc: 'Beyond plan limit (e.g. WhatsApp).' },
      { name: 'Stripe payments', price: '+390 € + 40 €/m', desc: 'Checkout + payment status in CRM + alerts.' },
      { name: 'Booking / calendar', price: '+290 € + 30 €/m', desc: 'Calendly/Google Calendar + confirmations.' },
      { name: 'Reminders / follow-ups', price: '+220 € + 25 €/m', desc: 'Lead recovery sequences.' },
      { name: 'Advanced analytics', price: '+250 € + 35 €/m', desc: 'Channel/conversion reports.' },
      { name: 'External CRM sync', price: '+450 € + 60 €/m', desc: 'HubSpot/Pipedrive sync.' },
      { name: 'Multilingual', price: '+180 € / lang + 15 €/m', desc: 'Additional languages.' },
      { name: 'Priority support', price: '+120 €/m', desc: 'Faster response and fixes.' },
    ],
    faqTitle: 'FAQ',
    faq: [
      { q: 'Why monthly support?', a: 'Platforms change tokens/rules. Support = monitoring and fixes so it keeps working.' },
      { q: 'Can I buy setup only?', a: 'No. Projects are delivered with ongoing support to guarantee stability.' },
      { q: 'How long to launch?', a: 'Start: 5–7 work days. Business: 7–14 days. Pro: 14+ days.' },
    ],
    formTitle: 'Chceš řešení hned teď?',
    formSubtitle: 'Ukážu, jak to může fungovat ve tvém byznysu',
    name: 'Jméno',
    contact: 'Kontakt (email nebo Telegram)',
    comment: 'Krátký komentář (nepovinné)',
    formCta: 'Získat řešení',
    formSuccess: 'Poptávka přijata. Pokud systém sedí — další krok je implementace.',
    formError: 'Zkontroluj kontakt a zkus znovu',
    fieldRequired: 'Vyplň toto pole',
    trustBadge: 'Systém běží 24/7, automaticky propojuje poptávky a vede je v Telegram / CRM',
    footerAbout: 'O mně',
  },
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('ua')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set())
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([])

  const t = dict[lang]
  const ctaHref = '/flow?src=site'
  const aboutHref = 'https://t.me/temoxa_1'

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = sectionsRef.current.indexOf(entry.target as HTMLDivElement)
          if (entry.isIntersecting && idx >= 0) {
            setVisibleSections((prev) => new Set(prev).add(idx))
          }
        })
      },
      { threshold: 0.1 }
    )

    sectionsRef.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess('')
    setError('')
    if (!contact.trim()) {
      setError(t.fieldRequired)
      return
    }
    setLoading(true)
    try {
      // DEMO MODE: keep the form for video/visuals, but do NOT send anything anywhere.
      await new Promise((r) => setTimeout(r, 350))

      setName('')
      setContact('')
      setComment('')
      setSuccess(t.formSuccess)
    } catch (err) {
      setError(t.formError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10%, 10%) scale(1.05); }
          66% { transform: translate(-8%, 12%) scale(0.98); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-25px); }
        }
        .animate-gradient { animation: gradient-shift 25s ease-in-out infinite; }
        .animate-float { animation: float 8s ease-in-out infinite; }
      `}</style>

      <main className="relative min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white overflow-x-hidden">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Hex grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 52px'
          }} />
          {/* Subtle glow */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-3xl" />
          </div>

        <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0f172a]/80 border-b border-white/5 shadow-lg shadow-black/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <img src="/logo.png" alt="TemoWeb" className="h-10 w-10 rounded-xl border border-white/10 shadow-lg transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white font-bold">TemoWeb</p>
                <p className="text-[11px] text-white/60">{t.headerSubtitle}</p>
            </div>
            </div>
            <div className="flex items-center gap-2">
              {(['ua', 'ru', 'cz'] as Lang[]).map((lng) => (
            <button
                  key={lng}
                  onClick={() => setLang(lng)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${
                    lang === lng
                      ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:scale-105'
                  }`}
                >
                  {lng.toUpperCase()}
            </button>
              ))}
          </div>
        </div>
      </header>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-16 sm:space-y-24">
          {/* HERO */}
          <div
            ref={(el) => { sectionsRef.current[0] = el }}
            className={`relative transition-all duration-1000 ${visibleSections.has(0) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 sm:p-12 lg:p-16 shadow-[0_20px_80px_rgba(0,0,0,0.3)] overflow-hidden group hover:border-white/20 hover:shadow-[0_25px_100px_rgba(0,0,0,0.4)] transition-all duration-500">
              {/* TWO-COLUMN LAYOUT: text left, image right */}
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                {/* LEFT: TEXT CONTENT */}
                <div className="space-y-6 lg:pr-8">
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/30 px-4 py-2 text-xs text-blue-400 uppercase tracking-[0.2em] font-bold">
                    ⚡ {t.badge}
                </span>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-[1.05] text-white" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
                {t.heroTitle}
              </h1>
                  <p className="text-base sm:text-lg lg:text-xl text-white/70 leading-relaxed">
                    {t.heroSubtitle}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <a
                      href={ctaHref}
                      className="group/btn relative inline-flex items-center justify-center rounded-2xl bg-blue-500 px-8 py-4 text-base sm:text-lg font-bold text-white shadow-[0_20px_50px_rgba(59,130,246,0.3)] transition-all duration-300 hover:bg-blue-400 hover:shadow-[0_25px_60px_rgba(59,130,246,0.4)] hover:scale-105 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-blue-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      <span className="relative flex items-center gap-2">
                        <span>{t.ctaPrimary}</span>
                        <span className="text-xl">→</span>
                      </span>
                </a>
                <a
                      href={ctaHref}
                      className="inline-flex items-center justify-center rounded-2xl px-6 py-4 text-base sm:text-lg font-bold text-white bg-white/5 border-2 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
                >
                      {t.ctaSecondary}
                </a>
              </div>
                  <p className="text-xs sm:text-sm text-white/50 font-medium">{t.ctaNote}</p>
            </div>
            
                {/* RIGHT: SORA IMAGE */}
                <div className="relative aspect-[4/3] lg:aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.4)] group-hover:shadow-[0_30px_80px_rgba(59,130,246,0.3)] transition-all order-first lg:order-last">
                  <img 
                    src="/hero-ai.jpg" 
                    alt="AI automation system" 
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/60 to-transparent" />
                  {/* Glow behind image */}
                  <div className="absolute -inset-4 bg-blue-500/20 blur-2xl opacity-50 -z-10" />
                    </div>
                      </div>
                    </div>
                  </div>
                  
          {/* HOW */}
          <div
            ref={(el) => { sectionsRef.current[1] = el }}
            className={`transition-all duration-1000 delay-150 ${visibleSections.has(1) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-[0_25px_100px_rgba(0,0,0,0.12)] transition-all duration-500">
              {/* ИЗОБРАЖЕНИЕ №2 (21:9) — Sora flow background */}
              <div className="absolute inset-0 opacity-20">
                <img src="/flow-bg.jpg" alt="" className="w-full h-full object-cover" />
                        </div>
              <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/60 via-[#1e293b]/80 to-[#0f172a]/90" />
              
              <div className="relative space-y-10">
                <h2 className="text-3xl sm:text-5xl font-black text-white text-center">
                  {t.howTitle}
            </h2>
                <div className="grid gap-8 sm:grid-cols-3">
                  {t.howSteps.map((step, idx) => {
                    const icons = [MessageSquare, Zap, CheckCircle2]
                    const Icon = icons[idx]
                    return (
                      <div
                        key={idx}
                        className="group relative bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8 shadow-md transition-all duration-500 hover:border-white/20 hover:shadow-[0_20px_60px_rgba(59,130,246,0.2)] hover:-translate-y-2 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative space-y-4 text-center">
                          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="w-8 h-8 text-white/80" strokeWidth={1.5} />
          </div>
                          <div className="w-12 mx-auto h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                          <h3 className="text-xl font-black text-white leading-snug">{step.title}</h3>
                          <p className="text-sm text-white/70 leading-relaxed">{step.text}</p>
                </div>
              </div>
                    )
                  })}
            </div>
                <div className="text-center pt-4">
                  <a
                    href={ctaHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-500 px-10 py-5 text-lg font-black text-white shadow-[0_15px_50px_rgba(99,102,241,0.4)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:scale-110"
                  >
                    {t.howCta}
                  </a>
                </div>
              </div>
            </div>
                </div>

          {/* WHO */}
          <div
            ref={(el) => { sectionsRef.current[2] = el }}
            className={`transition-all duration-1000 delay-300 ${visibleSections.has(2) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.3)] overflow-hidden hover:border-white/20 hover:shadow-[0_25px_100px_rgba(0,0,0,0.4)] transition-all duration-500">
              <div className="space-y-10">
                <h2 className="text-3xl sm:text-5xl font-black text-white text-center">
                  {t.whoTitle}
            </h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {t.whoList.map((item, idx) => {
                    const whoIcons = [Scissors, Car, GraduationCap, Wrench, Briefcase]
                    const Icon = whoIcons[idx] || Briefcase
                    return (
                      <div
                        key={idx}
                        className="group relative bg-white/5 backdrop-blur border border-white/10 rounded-2xl px-6 py-5 shadow-sm transition-all duration-300 hover:border-white/20 hover:bg-blue-500/10 hover:shadow-md hover:-translate-y-1 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative flex items-center gap-4">
                          <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon className="w-5 h-5 text-white/80" strokeWidth={1.5} />
                          </span>
                          <span className="text-base font-bold text-white/80 group-hover:text-white transition-colors">{item}</span>
                        </span>
              </div>
                    )
                  })}
              </div>
                <p className="text-lg text-white/70 leading-relaxed text-center italic">{t.whoText}</p>
                <div className="text-center pt-4">
                  <a
                    href={ctaHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-500 px-10 py-5 text-lg font-black text-white shadow-[0_15px_50px_rgba(99,102,241,0.4)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:scale-110"
                  >
                    {t.whoCta}
                  </a>
              </div>
            </div>
              </div>
              </div>

          {/* RESULT */}
          <div
            ref={(el) => { sectionsRef.current[3] = el }}
            className={`transition-all duration-1000 delay-[450ms] ${visibleSections.has(3) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-[0_25px_100px_rgba(0,0,0,0.12)] transition-all duration-500">
              <div className="space-y-10">
                <h2 className="text-3xl sm:text-5xl font-black text-white text-center">
                  {t.resultTitle}
            </h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {t.resultBullets.map((item, idx) => (
                    <div
                      key={idx}
                      className="group relative bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-400/30 rounded-2xl p-6 shadow-sm transition-all duration-300 hover:border-emerald-400/50 hover:bg-emerald-500/15 hover:shadow-md hover:-translate-y-1"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-base font-black shadow-md">
                            ✓
                          </span>
                          <div className="space-y-1">
                            <p className="text-base font-bold text-white">{item.text}</p>
                            {item.stat && (
                              <p className="text-sm text-emerald-300 font-semibold">{item.stat}</p>
                            )}
          </div>
              </div>
              </div>
              </div>
                  ))}
              </div>
                <div className="text-center pt-6">
                  <a
                    href={ctaHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-500 px-10 py-5 text-lg font-black text-white shadow-[0_15px_50px_rgba(99,102,241,0.4)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:scale-110"
                  >
                    {t.resultCta}
                  </a>
              </div>

                {/* PACKAGES + ADDONS + FAQ */}
                <div className="pt-10 border-t border-white/10 space-y-10">
                  {/* PACKAGES */}
                  <div className="space-y-6">
                    <h4 className="text-xl sm:text-3xl font-black text-white text-center">
                      {t.packagesTitle}
                    </h4>

                    <div className="grid gap-5 lg:grid-cols-3">
                      {t.packages.map((p) => (
                        <div
                          key={p.name}
                          className="group relative bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-7 shadow-sm transition-all duration-300 hover:border-white/20 hover:shadow-md hover:-translate-y-1"
                        >
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                <div>
                                <p className="text-xs font-bold text-white/60 uppercase tracking-[0.18em]">{p.name}</p>
                                <p className="text-3xl font-black text-white leading-tight">{p.price}</p>
                </div>
                              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white/70 shadow-inner">
                                ⚡
                  </div>
                </div>
                            <p className="text-sm text-white/70 leading-relaxed">{p.desc}</p>
                            <a
                              href={ctaHref}
                              className="inline-flex w-full items-center justify-center rounded-2xl bg-white/10 border border-white/10 px-6 py-4 text-base font-black text-white/80 hover:bg-white/15 hover:border-white/20 transition-all"
                            >
                              {p.cta}
                </a>
              </div>
            </div>
            ))}
          </div>
        </div>

                  {/* ADDONS */}
                  <div className="space-y-6">
                    <h4 className="text-xl sm:text-3xl font-black text-white text-center">{t.addonsTitle}</h4>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {t.addons.map((a) => (
                        <div
                          key={a.name}
                          className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-base font-black text-white">{a.name}</p>
                              <p className="text-sm text-blue-300 font-bold">{a.price}</p>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white/70 shadow-inner">
                              ✨
                            </div>
                          </div>
                          <p className="text-sm text-white/70 leading-relaxed pt-3">{a.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FAQ */}
                  <div className="space-y-6">
                    <h4 className="text-xl sm:text-3xl font-black text-white text-center">{t.faqTitle}</h4>
                    <div className="grid gap-4">
                      {t.faq.map((x) => (
                        <div key={x.q} className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all">
                          <p className="text-base font-black text-white">{x.q}</p>
                          <p className="text-sm text-white/70 leading-relaxed pt-2">{x.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
          </div>
              </div>
              </div>
            </div>

          {/* FORM */}
          <div
            ref={(el) => { sectionsRef.current[4] = el }}
            className={`transition-all duration-1000 delay-[600ms] ${visibleSections.has(4) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="relative bg-white/5 backdrop-blur-xl border-2 border-white/10 rounded-[32px] p-10 sm:p-14 shadow-[0_30px_100px_rgba(99,102,241,0.12)] overflow-hidden hover:border-white/20 hover:shadow-[0_35px_120px_rgba(99,102,241,0.18)] transition-all duration-500">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-blue-400/10 rounded-full blur-3xl" />
              
              <div className="relative space-y-10">
                <div className="space-y-4 text-center">
                  <h2 className="text-3xl sm:text-5xl font-black text-white">
                    {t.formTitle}
                  </h2>
                  <p className="text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">{t.formSubtitle}</p>
          </div>
                <form className="space-y-6 max-w-2xl mx-auto" onSubmit={onSubmit}>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm text-white/80 font-bold">{t.name}</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl bg-white/5 backdrop-blur border border-white/20 px-5 py-4 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm text-base"
                        placeholder={t.name}
                        type="text"
                      />
            </div>
                    <div className="space-y-2">
                      <label className="text-sm text-white/80 font-bold">{t.contact}</label>
                      <input
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full rounded-xl bg-white/5 backdrop-blur border border-white/20 px-5 py-4 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm text-base"
                        placeholder={t.contact}
                        type="text"
                        required
                      />
            </div>
            </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/80 font-bold">{t.comment}</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl bg-white/5 backdrop-blur border border-white/20 px-5 py-4 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm resize-none text-base"
                      placeholder={t.comment}
                    />
            </div>

                  {error && <p className="text-sm text-red-300 font-bold flex items-center justify-center gap-2">⚠️ {error}</p>}
                  {success && <p className="text-sm text-emerald-300 font-bold flex items-center justify-center gap-2">✓ {success}</p>}

                  <div className="text-center pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group/btn relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-12 py-6 text-xl font-black text-white shadow-[0_20px_60px_rgba(99,102,241,0.5)] transition-all duration-300 hover:shadow-[0_25px_70px_rgba(99,102,241,0.7)] hover:scale-110 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-400 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      <span className="relative">{loading ? '...' : t.formCta}</span>
                    </button>
                      </div>
                </form>
                
                <div className="flex items-center justify-center gap-3 pt-6 text-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
                  <p className="text-sm text-white/70 italic max-w-2xl">{t.trustBadge}</p>
                  </div>
                      </div>
                    </div>
                  </div>

          {/* ОПЦИОНАЛЬНО: ИЗОБРАЖЕНИЕ №3 (1:1) — брендовый акцент */}
          {/* 
          <div className="flex justify-center py-16">
            <div className="relative w-48 h-48 rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <img src="/brand-square.jpg" alt="" className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                      </div>
                    </div>
          */}

          <footer className="py-12 text-center">
            <a
              href={aboutHref}
                target="_blank"
                rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-all duration-300 group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:animate-pulse" />
              {t.footerAbout}
            </a>
          </footer>
      </div>
    </main>
    </>
  )
}
