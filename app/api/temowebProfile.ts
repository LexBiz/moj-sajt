export type TemoWebProfile = {
  brandName: string
  siteUrl: string
  taglineRu: string
  taglineUa: string
  packages: { basic: string; standard: string; pro: string }
  pilot: { price: string; slots: number; note: string }
  shortAboutRu: string
  shortAboutUa: string
}

// This is the single place to customize "niche/offer" later.
// For future clients, we will create another profile object and reuse the same prompt engine.
export const TEMOWEB_PROFILE: TemoWebProfile = {
  brandName: 'TemoWeb',
  siteUrl: 'https://temoweb.eu',
  taglineRu: 'AI‑ассистенты, которые продают и записывают клиентов 24/7',
  taglineUa: 'AI‑асистенти, які продають і записують клієнтів 24/7',
  packages: {
    basic: '600–900 €',
    standard: '1200–1500 €',
    pro: '2000–3000 €',
  },
  pilot: {
    price: '$299',
    slots: 5,
    note: 'limited forever',
  },
  shortAboutRu: 'TemoWeb делает AI‑ассистентов и автоматизацию заявок/продаж для бизнеса (Instagram/WhatsApp/Telegram/Website) + CRM и интеграции.',
  shortAboutUa: 'TemoWeb робить AI‑асистентів і автоматизацію заявок/продажів для бізнесу (Instagram/WhatsApp/Telegram/Website) + CRM та інтеграції.',
}


