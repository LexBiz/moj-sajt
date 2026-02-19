'use client'
import { useState } from 'react'
import type { Lang } from '../translations'

interface CalculatorProps {
  lang: Lang
  onComplete?: (data: CalculatorData) => void
}

export interface CalculatorData {
  serviceType: string
  businessType: string
  region: string
  features: string[]
  support: string
  priceMin: number
  priceMax: number
}

const services = {
  bot: { base: 500, name: { ru: 'Telegram-бот (классика)', ua: 'Telegram bot (klasika)', en: 'Telegram bot (classic)' }, icon: '🤖' },
  website: { base: 400, name: { ru: 'Сайт-визитка / Лендинг', ua: 'Web prezentace / Landing', en: 'Business card / Landing' }, icon: '🌐' },
  package: { base: 1000, name: { ru: 'Готовый пакет (сайт + бот + CRM)', ua: 'Hotovy balicek (web + bot + CRM)', en: 'Ready package (site + bot + CRM)' }, icon: '📦' },
  aiBot: { base: 1500, name: { ru: 'AI-бот с памятью клиента', ua: 'AI bot s pameti klienta', en: 'AI bot with client memory' }, icon: '🧠' },
  aiSite: { base: 1800, name: { ru: 'AI-система (голос/фото)', ua: 'AI system (hlas/foto)', en: 'AI system (voice/photo)' }, icon: '🎙️' },
  aiEnterprise: { base: 3000, name: { ru: 'ENTERPRISE — Полный AI-цикл', ua: 'ENTERPRISE - plna AI infrastruktura', en: 'ENTERPRISE — Full AI cycle' }, icon: '⚡' },
}

const regions = {
  ukraine: { coef: 1.0, name: { ru: 'Украина', ua: 'Cesko', en: 'Czech Republic' } },
  eu: { coef: 1.2, name: { ru: 'Чехия / ЕС', ua: 'EU', en: 'EU' } },
  international: { coef: 1.4, name: { ru: 'Дубай / Международный', ua: 'Mezinarodni', en: 'International' } },
}

const features = {
  form: { price: 50, name: { ru: 'Форма заявок', ua: 'Kontaktni formular', en: 'Contact form' } },
  booking: { price: 150, name: { ru: 'Онлайн-запись', ua: 'Online rezervace', en: 'Online booking' } },
  payment: { price: 200, name: { ru: 'Оплата онлайн', ua: 'Online platba', en: 'Online payment' } },
  multilang: { price: 100, name: { ru: 'Мультиязычность', ua: 'Vicejazycnost', en: 'Multi-language' } },
  telegram: { price: 80, name: { ru: 'Интеграция Telegram', ua: 'Telegram integrace', en: 'Telegram integration' } },
  crm: { price: 120, name: { ru: 'Интеграция CRM', ua: 'CRM integrace', en: 'CRM integration' } },
  analytics: { price: 50, name: { ru: 'Аналитика', ua: 'Analytika', en: 'Analytics' } },
}

const support = {
  none: { price: 0, name: { ru: 'Без поддержки', ua: 'Bez podpory', en: 'No support' } },
  month1: { price: 100, name: { ru: '1 месяц', ua: '1 mesic', en: '1 month' } },
  month3: { price: 250, name: { ru: '3 месяца', ua: '3 mesice', en: '3 months' } },
}

export default function Calculator({ lang, onComplete }: CalculatorProps) {
  const [step, setStep] = useState(1)
  const [serviceType, setServiceType] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [region, setRegion] = useState('')
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [selectedSupport, setSelectedSupport] = useState('')

  const totalSteps = 6

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    )
  }

  const calculatePrice = () => {
    if (!serviceType || !region) return { min: 0, max: 0 }

    const basePrice = services[serviceType as keyof typeof services]?.base || 0
    const regionCoef = regions[region as keyof typeof regions]?.coef || 1.0
    const featuresPrice = selectedFeatures.reduce((sum, f) => sum + (features[f as keyof typeof features]?.price || 0), 0)
    const supportPrice = support[selectedSupport as keyof typeof support]?.price || 0

    const totalBase = (basePrice + featuresPrice + supportPrice) * regionCoef
    const min = Math.round(totalBase)
    const max = Math.round(totalBase * 1.3) // диапазон +30%

    return { min, max }
  }

  const { min, max } = calculatePrice()

  const t = {
    ru: {
      step: 'Шаг',
      of: 'из',
      whatNeed: 'Что вам нужно?',
      businessType: 'Тип бизнеса',
      region: 'Где планируете работать?',
      features: 'Что должно быть?',
      support: 'Поддержка после запуска',
      result: 'Ваш расчёт',
      next: 'Далее',
      back: 'Назад',
      calculate: 'Рассчитать',
      getQuote: 'Получить точный расчёт',
      orientPrice: 'Ориентировочная стоимость',
      disclaimer: 'Итоговая цена зависит от деталей и дополнительных задач',
      localBusiness: 'Локальный бизнес',
      onlineService: 'Онлайн-сервис',
      expertServices: 'Услуги / Эксперт',
      ecommerce: 'Интернет-магазин',
      startup: 'Стартап',
      selectOne: 'Выберите один вариант',
      selectMultiple: 'Выберите нужные опции',
      optional: 'Опционально',
      from: 'от',
      to: 'до',
      yourSelections: 'Ваш выбор:',
    },
    ua: {
      step: 'Krok',
      of: 'z',
      whatNeed: 'Co potrebujete?',
      businessType: 'Typ podnikani',
      region: 'Kde budete pusobit?',
      features: 'Jake funkce potrebujete?',
      support: 'Podpora po spusteni',
      result: 'Vas odhad',
      next: 'Dale',
      back: 'Zpet',
      calculate: 'Spocitat',
      getQuote: 'Ziskat presny odhad',
      orientPrice: 'Orientacni cena',
      disclaimer: 'Finalni cena zavisi na detailu a rozsahu projektu',
      localBusiness: 'Lokalni podnikani',
      onlineService: 'Online sluzba',
      expertServices: 'Sluzby / Expert',
      ecommerce: 'E-commerce',
      startup: 'Startup',
      selectOne: 'Vyberte jednu moznost',
      selectMultiple: 'Vyberte potrebne moznosti',
      optional: 'Volitelne',
      from: 'od',
      to: 'do',
      yourSelections: 'Vas vyber:',
    },
    en: {
      step: 'Step',
      of: 'of',
      whatNeed: 'What do you need?',
      businessType: 'Business type',
      region: 'Where will you work?',
      features: 'What should it have?',
      support: 'Post-launch support',
      result: 'Your estimate',
      next: 'Next',
      back: 'Back',
      calculate: 'Calculate',
      getQuote: 'Get exact quote',
      orientPrice: 'Estimated cost',
      disclaimer: 'Final price depends on details and additional tasks',
      localBusiness: 'Local business',
      onlineService: 'Online service',
      expertServices: 'Services / Expert',
      ecommerce: 'E-commerce',
      startup: 'Startup',
      selectOne: 'Select one option',
      selectMultiple: 'Select needed options',
      optional: 'Optional',
      from: 'from',
      to: 'to',
      yourSelections: 'Your selections:',
    }
  }

  const text = t[lang]

  const selBtn = (active: boolean) =>
    `rounded-xl border px-4 py-3.5 text-left text-[14px] transition-all duration-200 active:scale-[0.98] ${
      active
        ? 'border-[#2563EB]/50 bg-[#2563EB]/10 text-white'
        : 'border-white/[0.07] bg-white/[0.03] text-[#94A3B8] hover:border-white/[0.14] hover:text-white'
    }`

  const backBtn =
    'flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] px-5 py-3 text-[13px] text-[#64748B] transition hover:border-white/20 hover:text-white'

  const nextBtn =
    'flex-1 rounded-xl bg-[#2563EB] px-5 py-3 text-[13px] font-medium text-white shadow-[0_4px_20px_-4px_rgba(37,99,235,0.4)] transition hover:bg-[#1d4ed8] active:scale-[0.97]'

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-white/[0.07] bg-[#0F1318] p-6 sm:p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[12px] text-[#475569]">
              {text.step} {step} {text.of} {totalSteps}
            </span>
            <span className="font-mono text-[12px] text-[#2563EB]">
              {Math.round((step / totalSteps) * 100)}%
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[#2563EB] transition-all duration-500 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-xl font-semibold text-white">{text.whatNeed}</h3>
              <p className="mt-1 text-[13px] text-[#475569]">{text.selectOne}</p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {Object.entries(services).map(([key, service]) => (
                <button
                  key={key}
                  onClick={() => { setServiceType(key); setStep(2) }}
                  className={selBtn(serviceType === key)}
                >
                  <div className="font-medium text-white">{service.name[lang]}</div>
                  <div className="mt-1 font-mono text-[11px] text-[#475569]">{text.from} {service.base} €</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-xl font-semibold text-white">{text.businessType}</h3>
              <p className="mt-1 text-[13px] text-[#475569]">{text.selectOne}</p>
            </div>
            <div className="grid gap-2.5">
              {['localBusiness', 'onlineService', 'expertServices', 'ecommerce', 'startup'].map((type) => (
                <button
                  key={type}
                  onClick={() => { setBusinessType(type); setStep(3) }}
                  className={selBtn(businessType === type)}
                >
                  <span className="font-medium">{text[type as keyof typeof text]}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className={`w-full ${backBtn}`}>← {text.back}</button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-xl font-semibold text-white">{text.region}</h3>
              <p className="mt-1 text-[13px] text-[#475569]">{text.selectOne}</p>
            </div>
            <div className="grid gap-2.5">
              {Object.entries(regions).map(([key, reg]) => (
                <button
                  key={key}
                  onClick={() => { setRegion(key); setStep(4) }}
                  className={selBtn(region === key)}
                >
                  <span className="font-medium">{reg.name[lang]}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className={`w-full ${backBtn}`}>← {text.back}</button>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-xl font-semibold text-white">{text.features}</h3>
              <p className="mt-1 text-[13px] text-[#475569]">{text.selectMultiple}</p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {Object.entries(features).map(([key, feature]) => (
                <button
                  key={key}
                  onClick={() => toggleFeature(key)}
                  className={selBtn(selectedFeatures.includes(key))}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{feature.name[lang]}</span>
                    <span className="font-mono text-[11px] text-[#475569]">+{feature.price}€</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setStep(3)} className={backBtn}>← {text.back}</button>
              <button onClick={() => setStep(5)} className={nextBtn}>{text.next} →</button>
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-xl font-semibold text-white">{text.support}</h3>
              <p className="mt-1 text-[13px] text-[#475569]">{text.optional}</p>
            </div>
            <div className="grid gap-2.5">
              {Object.entries(support).map(([key, sup]) => (
                <button
                  key={key}
                  onClick={() => { setSelectedSupport(key); setStep(6) }}
                  className={selBtn(selectedSupport === key)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{sup.name[lang]}</span>
                    {sup.price > 0 && <span className="font-mono text-[11px] text-[#475569]">+{sup.price}€</span>}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(4)}
              className={`w-full ${backBtn}`}
            >
              ← {text.back}
            </button>
          </div>
        )}

        {/* Step 6: Result */}
        {step === 6 && (
          <div className="space-y-5 animate-fadeIn">
            <h3 className="text-xl font-semibold text-white">{text.result}</h3>

            {/* Summary */}
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#334155]">
                {text.yourSelections}
              </p>
              <div className="space-y-1.5 text-[13px] text-[#94A3B8]">
                <div>— {services[serviceType as keyof typeof services]?.name[lang]}</div>
                <div>— {regions[region as keyof typeof regions]?.name[lang]}</div>
                {selectedFeatures.map((f) => (
                  <div key={f}>— {features[f as keyof typeof features]?.name[lang]}</div>
                ))}
                {selectedSupport && selectedSupport !== 'none' && (
                  <div>
                    — {lang === 'ru' ? 'Поддержка: ' : lang === 'ua' ? 'Podpora: ' : 'Support: '}
                    {support[selectedSupport as keyof typeof support]?.name[lang]}
                  </div>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="relative overflow-hidden rounded-2xl border border-[#2563EB]/25 bg-[#2563EB]/[0.07] p-7">
              <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[#2563EB]/50 to-transparent" />
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2563EB]/70">
                {text.orientPrice}
              </p>
              <p className="mt-3 text-[42px] font-semibold tracking-tight text-white">
                {text.from} {min} — {max} €
              </p>
              <p className="mt-3 text-[12px] text-[#475569]">{text.disclaimer}</p>
            </div>

            <div className="flex gap-2.5">
              <button onClick={() => setStep(5)} className={backBtn}>← {text.back}</button>
              <button
                onClick={() => {
                  onComplete?.({ serviceType, businessType, region, features: selectedFeatures, support: selectedSupport, priceMin: min, priceMax: max })
                  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={nextBtn}
              >
                {text.getQuote} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


