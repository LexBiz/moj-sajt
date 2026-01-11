'use client'

import { useState } from 'react'

type Lang = 'ua' | 'ru' | 'cz'

type Dict = {
  badge: string
  headerSubtitle: string
  heroTitle: string
  heroSubtitle: string
  ctaPrimary: string
  ctaSecondary: string
  note: string
  howTitle: string
  howSteps: { title: string; text: string }[]
  howCta: string
  whoTitle: string
  whoList: string[]
  whoText: string
  whoCta: string
  resultTitle: string
  resultBullets: string[]
  resultCta: string
  formTitle: string
  formSubtitle: string
  name: string
  contact: string
  comment: string
  formCta: string
  formSuccess: string
  formError: string
  fieldRequired: string
  footerAbout: string
}

const dict: Record<Lang, Dict> = {
  ua: {
    badge: 'Система прийому клієнтів',
    headerSubtitle: 'Система прийому клієнтів',
    heroTitle: 'Клієнт або записався — або пішов до конкурента',
    heroSubtitle:
      'Я будую системи, які автоматично приймають заявки, відповідають клієнтам і фіксують їх без менеджерів і дзвінків',
    ctaPrimary: 'Показати, як це працює (30 секунд)',
    ctaSecondary: 'Демо: як це працює',
    note: 'Це не консультація. Це жива система.',
    howTitle: 'Що відбувається насправді',
    howSteps: [
      { title: 'Клієнт пише або натискає', text: 'Instagram, сайт, реклама — байдуже' },
      { title: 'Система одразу реагує', text: 'Задає питання, фільтрує і формує заявку' },
      { title: 'Ви отримуєте готового клієнта', text: 'Telegram / таблиця / CRM — без хаосу' },
    ],
    howCta: 'Подивитись рішення для мого бізнесу',
    whoTitle: 'Кому це потрібно',
    whoList: ['Барбершопи і салони', 'Автосервіси', 'Курси і школи', 'Сервісні бізнеси', 'Малий та середній бізнес'],
    whoText: 'Якщо клієнти пишуть, дзвонять і губляться — це для вас',
    whoCta: 'Перевірити під свій бізнес',
    resultTitle: 'Що змінюється після впровадження',
    resultBullets: [
      'Клієнти не губляться',
      'Немає дзвінків і ручної переписки',
      'Ви бачите всі заявки',
      'Система працює 24/7',
      'Менше хаосу — більше продажів',
    ],
    resultCta: 'Побачити це в дії',
    formTitle: 'Не хочете розбиратись — напишіть',
    formSubtitle: 'Я покажу, як це може працювати у вас',
    name: 'Імʼя',
    contact: 'Контакт (email або Telegram)',
    comment: 'Короткий коментар (необовʼязково)',
    formCta: 'Отримати рішення',
    formSuccess: 'Запит прийнято. Якщо система підходить — наступний крок реалізація.',
    formError: 'Перевірте контакт і спробуйте ще раз',
    fieldRequired: 'Заповніть поле',
    footerAbout: 'Про мене',
  },
  ru: {
    badge: 'Система приёма клиентов',
    headerSubtitle: 'Система приёма клиентов',
    heroTitle: 'Клиент либо записался — либо ушёл к конкуренту',
    heroSubtitle:
      'Я строю системы, которые автоматически принимают заявки, отвечают клиентам и фиксируют их без менеджеров и звонков',
    ctaPrimary: 'Показать, как это работает (30 секунд)',
    ctaSecondary: 'Демо: как это работает',
    note: 'Это не консультация. Это живая система.',
    howTitle: 'Что происходит на самом деле',
    howSteps: [
      { title: 'Клиент пишет или нажимает', text: 'Instagram, сайт, реклама — не важно' },
      { title: 'Система сразу реагирует', text: 'Задает вопросы, фильтрует и формирует заявку' },
      { title: 'Вы получаете готового клиента', text: 'Telegram / таблица / CRM — без хаоса' },
    ],
    howCta: 'Посмотреть решение для моего бизнеса',
    whoTitle: 'Кому это нужно',
    whoList: ['Барбершопы и салоны', 'Автосервисы', 'Курсы и школы', 'Сервисные бизнесы', 'Малый и средний бизнес'],
    whoText: 'Если клиенты пишут, звонят и теряются — это для вас',
    whoCta: 'Проверить под свой бизнес',
    resultTitle: 'Что меняется после внедрения',
    resultBullets: [
      'Клиенты не теряются',
      'Нет звонков и ручной переписки',
      'Вы видите все заявки',
      'Система работает 24/7',
      'Меньше хаоса — больше продаж',
    ],
    resultCta: 'Увидеть это в действии',
    formTitle: 'Не хотите разбираться — напишите',
    formSubtitle: 'Я покажу, как это может работать у вас',
    name: 'Имя',
    contact: 'Контакт (email или Telegram)',
    comment: 'Короткий комментарий (необязательно)',
    formCta: 'Получить решение',
    formSuccess: 'Запрос принят. Если система подходит — следующий шаг внедрение.',
    formError: 'Проверьте контакт и попробуйте снова',
    fieldRequired: 'Заполните поле',
    footerAbout: 'Обо мне',
  },
  cz: {
    badge: 'Systém pro příjem klientů',
    headerSubtitle: 'Systém pro příjem klientů',
    heroTitle: 'Klient se buď objednal — nebo odešel ke konkurenci',
    heroSubtitle:
      'Stavím systémy, které automaticky přijímají poptávky, odpovídají klientům a ukládají je bez manažerů a hovorů',
    ctaPrimary: 'Ukázat, jak to funguje (30 sekund)',
    ctaSecondary: 'Demo: jak to funguje',
    note: 'Toto není konzultace. Je to hotový systém.',
    howTitle: 'Co se děje ve skutečnosti',
    howSteps: [
      { title: 'Klient píše nebo kliká', text: 'Instagram, web, reklama — je to jedno' },
      { title: 'Systém hned reaguje', text: 'Ptá se, filtruje a vytváří poptávku' },
      { title: 'Dostanete připraveného klienta', text: 'Telegram / tabulka / CRM — bez chaosu' },
    ],
    howCta: 'Podívat se na řešení pro můj byznys',
    whoTitle: 'Komu se to hodí',
    whoList: ['Barbershopy a salony', 'Autoservisy', 'Kurzy a školy', 'Servisní byznysy', 'Malý a střední byznys'],
    whoText: 'Když klienti píšou, volají a ztrácí se — je to pro vás',
    whoCta: 'Prověřit pro můj byznys',
    resultTitle: 'Co se změní po nasazení',
    resultBullets: [
      'Klienti se neztrácí',
      'Bez hovorů a ruční komunikace',
      'Vidíte všechny poptávky',
      'Systém běží 24/7',
      'Méně chaosu — více prodejů',
    ],
    resultCta: 'Uvidět to v akci',
    formTitle: 'Nechceš to řešit? Napiš',
    formSubtitle: 'Ukážu, jak to může fungovat u tebe',
    name: 'Jméno',
    contact: 'Kontakt (email nebo Telegram)',
    comment: 'Krátký komentář (nepovinné)',
    formCta: 'Získat řešení',
    formSuccess: 'Poptávka přijata. Pokud systém sedí — další krok je implementace.',
    formError: 'Zkontroluj kontakt a zkus znovu',
    fieldRequired: 'Vyplň toto pole',
    footerAbout: 'O mně',
  },
}

type BlockProps = { children: React.ReactNode }
const Block = ({ children }: BlockProps) => (
  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">{children}</div>
)

export default function Home() {
  const [lang, setLang] = useState<Lang>('ua')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const t = dict[lang]
  const ctaHref = '/flow?src=site'
  const aboutHref = 'https://t.me/temoxa_1'

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
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          question: comment.trim(),
          aiRecommendation: 'site-form',
        }),
      })
      if (!res.ok) throw new Error('submit')
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
    <main className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950" />
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-purple-500/20 blur-3xl rounded-full" />
          </div>

      <header className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="TemoWeb" className="h-9 w-9 rounded-md border border-white/10" />
            <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200 font-semibold">TemoWeb</p>
            <p className="text-sm text-slate-400">{t.headerSubtitle}</p>
            </div>
            </div>
        <div className="flex items-center gap-2">
          {(['ua', 'ru', 'cz'] as Lang[]).map((lng) => (
            <button
              key={lng}
              onClick={() => setLang(lng)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                lang === lng
                  ? 'bg-white/10 border-white/20 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                  : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
              }`}
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pb-16 space-y-10">
        {/* HERO */}
        <Block>
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-400/30 px-3 py-1 text-xs text-indigo-100 uppercase tracking-[0.18em]">
              {t.badge}
                </span>
            <h1 className="text-3xl sm:text-4xl font-black leading-tight text-white">{t.heroTitle}</h1>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed">{t.heroSubtitle}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3 text-sm sm:text-base font-semibold text-white shadow-lg hover:from-indigo-600 hover:to-purple-600 transition-all"
              >
                {t.ctaPrimary}
                </a>
                <a
                href={ctaHref}
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm sm:text-base font-semibold text-white bg-white/10 border border-white/10 hover:bg-white/15 transition-all"
                >
                {t.ctaSecondary}
                </a>
              </div>
            <p className="text-xs text-slate-400">{t.note}</p>
            </div>
        </Block>

        {/* HOW */}
        <Block>
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{t.howTitle}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {t.howSteps.map((step, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                  <p className="text-sm text-indigo-200 uppercase tracking-[0.15em]">0{idx + 1}</p>
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="text-sm text-slate-200">{step.text}</p>
                    </div>
              ))}
                      </div>
            <a
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-xl bg-white/10 border border-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-all"
            >
              {t.howCta}
            </a>
              </div>
        </Block>

        {/* WHO */}
        <Block>
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{t.whoTitle}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {t.whoList.map((item, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-slate-200">
                  {item}
              </div>
              ))}
              </div>
            <p className="text-sm text-slate-300">{t.whoText}</p>
            <a
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-600 hover:to-purple-600 transition-all"
            >
              {t.whoCta}
            </a>
            </div>
        </Block>

        {/* RESULT */}
        <Block>
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{t.resultTitle}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {t.resultBullets.map((item, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-slate-200">
                  {item}
              </div>
              ))}
              </div>
            <a
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-xl bg-white/10 border border-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-all"
            >
              {t.resultCta}
                </a>
          </div>
        </Block>

        {/* FORM */}
        <Block>
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{t.formTitle}</h2>
              <p className="text-sm sm:text-base text-slate-200">{t.formSubtitle}</p>
        </div>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">{t.name}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                    placeholder={t.name}
                    type="text"
                  />
            </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">{t.contact}</label>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                    placeholder={t.contact}
                    type="text"
                    required
                  />
                        </div>
                      </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">{t.comment}</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 resize-none"
                  placeholder={t.comment}
                />
          </div>

              {error && <p className="text-sm text-amber-300">{error}</p>}
              {success && <p className="text-sm text-emerald-300">{success}</p>}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-60"
                >
                  {loading ? '...' : t.formCta}
                </button>
                <span className="text-xs text-slate-400">{t.note}</span>
            </div>
            </form>
              </div>
        </Block>

        <footer className="py-8 text-center text-sm text-slate-500">
          <a href={aboutHref} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            {t.footerAbout}
          </a>
        </footer>
      </div>
    </main>
  )
}

