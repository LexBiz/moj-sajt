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
  website: { base: 50, name: { ru: 'Веб-визитка', ua: 'Веб-візитка', en: 'Business card website' }, icon: '🌐' },
  landing: { base: 400, name: { ru: 'Лендинг', ua: 'Лендінг', en: 'Landing page' }, icon: '🚀' },
  bot: { base: 500, name: { ru: 'Telegram-бот', ua: 'Telegram-бот', en: 'Telegram bot' }, icon: '🤖' },
  crm: { base: 800, name: { ru: 'CRM / Автоматизация', ua: 'CRM / Автоматизація', en: 'CRM / Automation' }, icon: '⚙️' },
  package: { base: 1200, name: { ru: 'Готовый пакет', ua: 'Готовий пакет', en: 'Ready package' }, icon: '📦' },
}

const regions = {
  ukraine: { coef: 1.0, name: { ru: 'Украина', ua: 'Україна', en: 'Ukraine' } },
  eu: { coef: 1.2, name: { ru: 'Чехия / ЕС', ua: 'Чехія / ЄС', en: 'Czech / EU' } },
  international: { coef: 1.4, name: { ru: 'Дубай / Международный', ua: 'Дубай / Міжнародний', en: 'Dubai / International' } },
}

const features = {
  form: { price: 50, name: { ru: 'Форма заявок', ua: 'Форма заявок', en: 'Contact form' } },
  booking: { price: 150, name: { ru: 'Онлайн-запись', ua: 'Онлайн-запис', en: 'Online booking' } },
  payment: { price: 200, name: { ru: 'Оплата онлайн', ua: 'Оплата онлайн', en: 'Online payment' } },
  multilang: { price: 100, name: { ru: 'Мультиязычность', ua: 'Мультимовність', en: 'Multi-language' } },
  telegram: { price: 80, name: { ru: 'Интеграция Telegram', ua: 'Інтеграція Telegram', en: 'Telegram integration' } },
  crm: { price: 120, name: { ru: 'Интеграция CRM', ua: 'Інтеграція CRM', en: 'CRM integration' } },
  analytics: { price: 50, name: { ru: 'Аналитика', ua: 'Аналітика', en: 'Analytics' } },
}

const support = {
  none: { price: 0, name: { ru: 'Без поддержки', ua: 'Без підтримки', en: 'No support' } },
  month1: { price: 100, name: { ru: '1 месяц', ua: '1 місяць', en: '1 month' } },
  month3: { price: 250, name: { ru: '3 месяца', ua: '3 місяці', en: '3 months' } },
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
      step: 'Крок',
      of: 'з',
      whatNeed: 'Що вам потрібно?',
      businessType: 'Тип бізнесу',
      region: 'Де плануєте працювати?',
      features: 'Що має бути?',
      support: 'Підтримка після запуску',
      result: 'Ваш розрахунок',
      next: 'Далі',
      back: 'Назад',
      calculate: 'Розрахувати',
      getQuote: 'Отримати точний розрахунок',
      orientPrice: 'Орієнтовна вартість',
      disclaimer: 'Підсумкова ціна залежить від деталей та додаткових завдань',
      localBusiness: 'Локальний бізнес',
      onlineService: 'Онлайн-сервіс',
      expertServices: 'Послуги / Експерт',
      ecommerce: 'Інтернет-магазин',
      startup: 'Стартап',
      selectOne: 'Оберіть один варіант',
      selectMultiple: 'Оберіть потрібні опції',
      optional: 'Опціонально',
      from: 'від',
      to: 'до',
      yourSelections: 'Ваш вибір:',
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-slate-900 rounded-3xl border-2 border-slate-700 p-6 sm:p-8 shadow-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">
              {text.step} {step} {text.of} {totalSteps}
            </span>
            <span className="text-sm font-medium text-indigo-400">
              {Math.round((step / totalSteps) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Service Type */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{text.whatNeed}</h3>
              <p className="text-slate-400 text-sm">{text.selectOne}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(services).map(([key, service]) => (
                <button
                  key={key}
                  onClick={() => {
                    setServiceType(key)
                    setStep(2)
                  }}
                  className={`group relative p-6 rounded-2xl border-2 transition-all hover:scale-105 ${
                    serviceType === key
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="text-4xl mb-3">{service.icon}</div>
                  <div className="text-lg font-bold text-white mb-1">{service.name[lang]}</div>
                  <div className="text-sm text-slate-400">{text.from} {service.base} €</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Business Type */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{text.businessType}</h3>
              <p className="text-slate-400 text-sm">{text.selectOne}</p>
            </div>

            <div className="grid gap-3">
              {['localBusiness', 'onlineService', 'expertServices', 'ecommerce', 'startup'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setBusinessType(type)
                    setStep(3)
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-[1.02] ${
                    businessType === type
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="font-semibold text-white">{text[type as keyof typeof text]}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
            >
              ← {text.back}
            </button>
          </div>
        )}

        {/* Step 3: Region */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{text.region}</h3>
              <p className="text-slate-400 text-sm">{text.selectOne}</p>
            </div>

            <div className="grid gap-3">
              {Object.entries(regions).map(([key, reg]) => (
                <button
                  key={key}
                  onClick={() => {
                    setRegion(key)
                    setStep(4)
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-[1.02] ${
                    region === key
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="font-semibold text-white">{reg.name[lang]}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
            >
              ← {text.back}
            </button>
          </div>
        )}

        {/* Step 4: Features */}
        {step === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{text.features}</h3>
              <p className="text-slate-400 text-sm">{text.selectMultiple}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(features).map(([key, feature]) => (
                <button
                  key={key}
                  onClick={() => toggleFeature(key)}
                  className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-[1.02] ${
                    selectedFeatures.includes(key)
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-white">{feature.name[lang]}</div>
                    <div className="text-sm text-slate-400">+{feature.price}€</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
              >
                ← {text.back}
              </button>
              <button
                onClick={() => setStep(5)}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all shadow-lg"
              >
                {text.next} →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Support */}
        {step === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{text.support}</h3>
              <p className="text-slate-400 text-sm">{text.optional}</p>
            </div>

            <div className="grid gap-3">
              {Object.entries(support).map(([key, sup]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedSupport(key)
                    setStep(6)
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-[1.02] ${
                    selectedSupport === key
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-white">{sup.name[lang]}</div>
                    {sup.price > 0 && <div className="text-sm text-slate-400">+{sup.price}€</div>}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
            >
              ← {text.back}
            </button>
          </div>
        )}

        {/* Step 6: Result */}
        {step === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 mb-4">
                <span className="text-3xl">✨</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{text.result}</h3>
            </div>

            {/* Selections Summary */}
            <div className="bg-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-sm font-semibold text-slate-400 mb-3">{text.yourSelections}</div>
              <div className="space-y-1 text-sm text-slate-300">
                <div>• {services[serviceType as keyof typeof services]?.name[lang]}</div>
                <div>• {regions[region as keyof typeof regions]?.name[lang]}</div>
                {selectedFeatures.map(f => (
                  <div key={f}>• {features[f as keyof typeof features]?.name[lang]}</div>
                ))}
                {selectedSupport && selectedSupport !== 'none' && (
                  <div>• {lang === 'ru' ? 'Поддержка: ' : lang === 'ua' ? 'Підтримка: ' : 'Support: '}{support[selectedSupport as keyof typeof support]?.name[lang]}</div>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-6 border-2 border-indigo-500/30">
              <div className="text-center">
                <div className="text-sm font-semibold text-indigo-300 mb-2">{text.orientPrice}</div>
                <div className="text-4xl sm:text-5xl font-bold text-white mb-3">
                  {text.from} {min} {text.to} {max} €
                </div>
                <div className="text-xs text-slate-400">
                  {Math.round(min * 40)} — {Math.round(max * 40)} ₴ / {Math.round(min * 25)} — {Math.round(max * 25)} CZK
                </div>
                <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                  {text.disclaimer}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(5)}
                className="flex-1 py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
              >
                ← {text.back}
              </button>
              <button
                onClick={() => {
                  const data: CalculatorData = {
                    serviceType,
                    businessType,
                    region,
                    features: selectedFeatures,
                    support: selectedSupport,
                    priceMin: min,
                    priceMax: max,
                  }
                  onComplete?.(data)
                  // Scroll to contact form
                  const contactSection = document.getElementById('contact')
                  contactSection?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
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

