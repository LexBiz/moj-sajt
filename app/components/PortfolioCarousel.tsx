'use client'

import Image from 'next/image'
import { useMemo, useRef, useState } from 'react'
import type { Lang } from '@/app/translations'

type ChannelKey = 'website' | 'whatsapp' | 'telegram' | 'instagram' | 'messenger'

type PortfolioItem = {
  id: string
  title: string
  url: string
  tagline: { ru: string; en: string; cz: string }
  channels: ChannelKey[]
  aiManagerLabel: { ru: string; en: string; cz: string }
  outcome: { ru: string; en: string; cz: string }
}

const channelMeta: Record<
  ChannelKey,
  {
    label: string
    cls: string
    icon: React.ReactNode
  }
> = {
  website: {
    label: 'Website',
    cls: 'border-white/[0.10] bg-white/[0.03] text-[#CBD5E1]',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  whatsapp: {
    label: 'WhatsApp',
    cls: 'border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-200',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
      </svg>
    ),
  },
  telegram: {
    label: 'Telegram',
    cls: 'border-sky-500/30 bg-sky-500/[0.07] text-sky-200',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    cls: 'border-pink-500/30 bg-pink-500/[0.07] text-pink-200',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  messenger: {
    label: 'Messenger',
    cls: 'border-indigo-500/30 bg-indigo-500/[0.07] text-indigo-200',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.1l3.131 3.26 5.887-3.26-6.559 6.863z" />
      </svg>
    ),
  },
}

function getThumb(url: string, mode: 'card' | 'modal' = 'card') {
  // External thumbnail service (fast + stable enough for portfolio previews).
  const width = mode === 'card' ? 960 : 1280
  return `https://image.thum.io/get/width/${width}/${url}`
}

export function PortfolioCarousel({ lang }: { lang: Lang }) {
  const lng = lang === 'ru' ? 'ru' : lang === 'ua' ? 'cz' : 'en'
  const t = (x: { ru: string; en: string; cz: string }) => x[lng]

  const items: PortfolioItem[] = useMemo(
    () => [
      {
        id: 'bossdetaling',
        title: 'Boss of Detailing',
        url: 'https://bossdetaling.eu/',
        tagline: { ru: 'Премиальный detailing‑сервис', en: 'Premium detailing studio', cz: 'Prémiové detailing studio' },
        channels: ['website', 'telegram', 'whatsapp'],
        aiManagerLabel: { ru: 'AI‑менеджер: 3 канала', en: 'AI manager: 3 channels', cz: 'AI manažer: 3 kanály' },
        outcome: {
          ru: 'Сократили “пинг‑понг” в переписке: авто‑квалификация, сбор фото/деталей и запись без потерь.',
          en: 'Reduced back-and-forth: auto qualification, details capture and booking without lead loss.',
          cz: 'Méně ping‑pongu: auto kvalifikace, sběr detailů a objednání bez ztrát.',
        },
      },
      {
        id: 'turboservise',
        title: 'TURBOSERVIS',
        url: 'https://turboservise.cz/',
        tagline: { ru: 'Автосервис: диагностика и ремонт', en: 'Auto service: diagnostics & repair', cz: 'Autoservis: diagnostika a opravy' },
        channels: ['website'],
        aiManagerLabel: { ru: 'AI‑менеджер: 1 канал', en: 'AI manager: 1 channel', cz: 'AI manažer: 1 kanál' },
        outcome: {
          ru: 'Убрали ручные уточнения: заявка сразу собирает модель/симптомы/время и уходит менеджеру.',
          en: 'Removed manual clarifications: lead captures car + symptoms + time and hands off to manager.',
          cz: 'Bez ručních dotazů: lead vezme auto + symptomy + čas a předá managerovi.',
        },
      },
      {
        id: 'karenfinance',
        title: 'KAREN Finance CZ',
        url: 'https://karenfinance.cz/',
        tagline: { ru: 'Финтех‑лендинг + калькулятор', en: 'Fintech landing + calculator', cz: 'Fintech web + kalkulačka' },
        channels: ['website', 'whatsapp', 'telegram', 'instagram'],
        aiManagerLabel: { ru: 'AI‑менеджер: 4 канала', en: 'AI manager: 4 channels', cz: 'AI manažer: 4 kanály' },
        outcome: {
          ru: 'Системно ведём лида: от расчёта → к заявке → в WhatsApp, с понятным следующим шагом.',
          en: 'System lead flow: from calculator → to application → to WhatsApp, with clear next step.',
          cz: 'Systémový flow: kalkulačka → žádost → WhatsApp, jasný další krok.',
        },
      },
      {
        id: 'karelbadura',
        title: 'Karel Badura',
        url: 'https://karelbadura.cz/',
        tagline: { ru: 'Личный бренд: финансы/ипотека', en: 'Personal brand: finance', cz: 'Osobní značka: finance' },
        channels: ['website', 'whatsapp', 'instagram'],
        aiManagerLabel: { ru: 'AI‑менеджер: 3 канала', en: 'AI manager: 3 channels', cz: 'AI manažer: 3 kanály' },
        outcome: {
          ru: 'Фильтруем входящие и фиксируем контакты: меньше “пустых” созвонов, больше релевантных заявок.',
          en: 'Filters inbound and captures contacts: fewer empty calls, more qualified leads.',
          cz: 'Filtruje inbound a chytá kontakty: méně prázdných hovorů, více kvalifikovaných leadů.',
        },
      },
      {
        id: 'lanaboost',
        title: 'TikTok Boost',
        url: 'https://lanaboost.com/',
        tagline: { ru: 'Онлайн‑курс + оплата + Telegram', en: 'Online course + payments', cz: 'Online kurz + platby' },
        channels: ['website', 'telegram', 'instagram'],
        aiManagerLabel: { ru: 'AI‑менеджер: 3 канала', en: 'AI manager: 3 channels', cz: 'AI manažer: 3 kanály' },
        outcome: {
          ru: 'Авто‑ответы и “next step” вокруг оплаты/доступа: меньше вопросов, больше завершённых оплат.',
          en: 'Auto replies + next step around payment/access: fewer questions, more completed checkouts.',
          cz: 'Auto odpovědi + další krok kolem platby/přístupu: méně dotazů, více dokončených plateb.',
        },
      },
    ],
    []
  )

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const active = activeId ? items.find((x) => x.id === activeId) || null : null

  const scrollByCards = (dir: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-portfolio-card="1"]')
    const cardW = card ? card.offsetWidth : 520
    el.scrollBy({ left: dir * (cardW + 18), behavior: 'smooth' })
  }

  return (
    <div className="reveal">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#2563EB]">
            {lang === 'ru' ? 'Работы' : lang === 'ua' ? 'Reference' : 'Selected work'}
          </p>
          <h3 className="mt-3 text-[22px] font-semibold tracking-tight text-[#0F172A] sm:text-[26px]">
            {lang === 'ru' ? 'Реальные сайты, которые продают' : lang === 'ua' ? 'Reálné weby, které prodávají' : 'Real websites that convert'}
          </h3>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#64748B]">
            {lang === 'ru'
              ? 'Кликните по карточке, чтобы открыть предпросмотр и посмотреть, сколько каналов подключили для AI‑менеджера.'
              : lang === 'ua'
                ? 'Klikněte na kartu pro náhled a uvidíte, kolik kanálů jsme připojili pro AI‑manažera.'
                : 'Click a card for preview and see how many channels were connected for the AI manager.'}
          </p>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            className="rounded-xl border border-[#DDE3EB] bg-white px-3 py-2 text-[12px] font-medium text-[#0F172A] transition hover:border-[#2563EB]/30 hover:shadow-[0_10px_30px_-14px_rgba(37,99,235,0.35)] active:scale-[0.98]"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            className="rounded-xl border border-[#DDE3EB] bg-white px-3 py-2 text-[12px] font-medium text-[#0F172A] transition hover:border-[#2563EB]/30 hover:shadow-[0_10px_30px_-14px_rgba(37,99,235,0.35)] active:scale-[0.98]"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 pr-5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((p) => (
          <button
            key={p.id}
            type="button"
            data-portfolio-card="1"
            onClick={() => setActiveId(p.id)}
            className="group w-[86%] shrink-0 snap-start rounded-2xl border border-[#DDE3EB] bg-white p-4 text-left transition hover:border-[#2563EB]/30 hover:shadow-[0_14px_50px_-18px_rgba(37,99,235,0.35)] sm:w-[520px]"
          >
            {/* Browser frame */}
            <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#0B1220]">
              <div className="flex items-center justify-between border-b border-white/10 bg-[#0A0D12] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                  <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                </div>
                <div className="hidden max-w-[320px] truncate rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70 sm:block">
                  {p.url.replace(/^https?:\/\//, '')}
                </div>
                <div className="w-8" />
              </div>

              <div className="relative aspect-[16/10] bg-[#0A0D12]">
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent" />
                <Image
                  src={getThumb(p.url, 'card')}
                  alt={p.title}
                  fill
                  sizes="(max-width: 640px) 86vw, 520px"
                  className="object-cover opacity-[0.98] transition duration-300 group-hover:scale-[1.015]"
                  unoptimized
                  onLoadingComplete={() => {
                    const el = scrollerRef.current?.querySelector('.animate-pulse')
                    if (el) el.classList.remove('animate-pulse')
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              </div>
            </div>

            {/* Meta */}
            <div className="mt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-[#0F172A]">{p.title}</p>
                  <p className="mt-1 text-[12px] text-[#64748B]">{t(p.tagline)}</p>
                </div>
                <span className="rounded-full border border-[#2563EB]/25 bg-[#2563EB]/[0.07] px-2.5 py-1 text-[11px] font-medium text-[#1D4ED8]">
                  {t(p.aiManagerLabel)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {p.channels.map((c) => (
                  <span
                    key={c}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${channelMeta[c].cls}`}
                  >
                    <span className="opacity-90">{channelMeta[c].icon}</span>
                    {channelMeta[c].label}
                  </span>
                ))}
              </div>

              <p className="mt-3 text-[12px] leading-relaxed text-[#475569]">{t(p.outcome)}</p>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#2563EB]">
                  {lang === 'ru' ? 'Открыть предпросмотр →' : lang === 'ua' ? 'Otevřít náhled →' : 'Open preview →'}
                </span>
                <span className="text-[11px] text-[#94A3B8]">{p.url.replace(/^https?:\/\//, '')}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
      {active ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveId(null)}
        >
          <div
            className="w-full max-w-[980px] overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0A0D12]/95 shadow-[0_28px_120px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div>
                <p className="text-[13px] font-semibold text-white">{active.title}</p>
                <p className="mt-0.5 max-w-[70vw] truncate text-[12px] text-[#64748B] sm:max-w-[520px]">{active.url}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="rounded-xl border border-white/[0.10] bg-white/[0.03] px-3 py-2 text-[12px] text-[#CBD5E1] transition hover:border-white/[0.18] hover:bg-white/[0.05]"
              >
                {lang === 'ru' ? 'Закрыть' : lang === 'ua' ? 'Zavřít' : 'Close'}
              </button>
            </div>

            <div className="grid gap-0 xl:grid-cols-[1.45fr_0.55fr]">
              <div className="relative h-[48vh] min-h-[320px] bg-black sm:h-[56vh]">
                <Image
                  src={getThumb(active.url, 'modal')}
                  alt={active.title}
                  fill
                  sizes="(max-width: 1280px) 100vw, 980px"
                  className="object-contain"
                  priority
                  unoptimized
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#475569]">
                    {lang === 'ru' ? 'AI‑менеджер' : lang === 'ua' ? 'AI manažer' : 'AI manager'}
                  </p>
                  <p className="mt-2 text-[14px] font-semibold text-white">{t(active.aiManagerLabel)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {active.channels.map((c) => (
                      <span
                        key={c}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${channelMeta[c].cls}`}
                      >
                        <span className="opacity-90">{channelMeta[c].icon}</span>
                        {channelMeta[c].label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#475569]">
                    {lang === 'ru' ? 'Эффект' : lang === 'ua' ? 'Efekt' : 'Impact'}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#CBD5E1]">{t(active.outcome)}</p>
                </div>

                <a
                  href={active.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl bg-[#2563EB] px-4 py-3 text-center text-[13px] font-semibold text-white transition hover:bg-[#1d4ed8] active:scale-[0.99]"
                >
                  {lang === 'ru' ? 'Открыть сайт' : lang === 'ua' ? 'Otevřít web' : 'Open website'}
                </a>
                <p className="text-[11px] text-[#475569]">
                  {lang === 'ru'
                    ? 'Превью — это скриншот страницы, чтобы сразу увидеть стиль и структуру.'
                    : lang === 'ua'
                      ? 'Náhled je screenshot stránky pro rychlý dojem ze stylu a struktury.'
                      : 'Preview is a screenshot for quick style & structure check.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

