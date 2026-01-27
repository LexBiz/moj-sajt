export type TemoWebProfile = {
  brandName: string
  siteUrl: string
  taglineRu: string
  taglineUa: string
  packages: {
    start: {
      setupEur: number
      supportEurPerMonth: number
      supportMinMonths: number
      channelsUpTo: number
    }
    business: {
      setupEur: number
      supportEurPerMonth: number
      supportMinMonths: number
      channelsUpTo: number
    }
    pro: {
      setupEur: number
      supportEurPerMonth: number
      supportMinMonths: number
      channelsUpTo: number
    }
    launchTime: { start: string; business: string; pro: string }
  }
  baseIncluded: { ru: string[]; ua: string[] }
  addons: Array<{
    key: string
    setupEur: number
    supportEurPerMonth: number
    titleRu: string
    titleUa: string
    includesRu: string[]
    includesUa: string[]
  }>
  faq: Array<{ qRu: string; aRu: string; qUa: string; aUa: string }>
  conditions: { ru: string[]; ua: string[] }
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
    start: { setupEur: 990, supportEurPerMonth: 220, supportMinMonths: 3, channelsUpTo: 2 },
    business: { setupEur: 1900, supportEurPerMonth: 390, supportMinMonths: 6, channelsUpTo: 3 },
    pro: { setupEur: 3900, supportEurPerMonth: 790, supportMinMonths: 6, channelsUpTo: 5 },
    launchTime: { start: '5–7 рабочих дней', business: '7–14 дней', pro: 'от 14 дней' },
  },
  baseIncluded: {
    ru: ['Сбор заявок из подключённых каналов', 'Уведомления о лидах', 'Фиксация в CRM', 'Мониторинг работоспособности', 'Поддержка интеграций (токены/подписки/обновления)'],
    ua: ['Збір заявок із підключених каналів', 'Сповіщення про ліди', 'Фіксація в CRM', 'Моніторинг працездатності', 'Підтримка інтеграцій (токени/підписки/оновлення)'],
  },
  addons: [
    {
      key: 'extra_channel',
      setupEur: 200,
      supportEurPerMonth: 60,
      titleRu: 'Дополнительный канал (сверх лимита пакета)',
      titleUa: 'Додатковий канал (понад ліміт пакета)',
      includesRu: ['Подключение ещё одного канала (например WhatsApp)', 'Мониторинг и поддержка канала'],
      includesUa: ['Підключення ще одного каналу (наприклад WhatsApp)', 'Моніторинг та підтримка каналу'],
    },
    {
      key: 'stripe',
      setupEur: 390,
      supportEurPerMonth: 40,
      titleRu: 'Подключение оплат (Stripe / онлайн‑платежи)',
      titleUa: 'Підключення оплат (Stripe / онлайн‑платежі)',
      includesRu: ['Stripe Checkout', 'Статусы оплаты в CRM', 'Уведомления о платежах', 'Сценарии “оплата прошла / не прошла”'],
      includesUa: ['Stripe Checkout', 'Статуси оплати в CRM', 'Сповіщення про платежі', 'Сценарії “оплата пройшла / не пройшла”'],
    },
    {
      key: 'calendar',
      setupEur: 290,
      supportEurPerMonth: 30,
      titleRu: 'Онлайн‑запись / календарь (Calendly / Google Calendar)',
      titleUa: 'Онлайн‑запис / календар (Calendly / Google Calendar)',
      includesRu: ['Запись/бронь через календарь', 'Подтверждения/напоминания', 'Фиксация записи в CRM'],
      includesUa: ['Запис/бронь через календар', 'Підтвердження/нагадування', 'Фіксація запису в CRM'],
    },
    {
      key: 'reminders',
      setupEur: 220,
      supportEurPerMonth: 25,
      titleRu: 'Авто‑напоминания и рассылки (возврат лидов)',
      titleUa: 'Авто‑нагадування та розсилки (повернення лідів)',
      includesRu: ['Напоминания “вы оставляли заявку”', 'Догон “не ответили / не записались”', 'Повторные касания по шаблону'],
      includesUa: ['Нагадування “ви залишали заявку”', 'Догон “не відповіли / не записались”', 'Повторні дотики за шаблоном'],
    },
    {
      key: 'analytics',
      setupEur: 250,
      supportEurPerMonth: 35,
      titleRu: 'Расширенная аналитика (отчёты по каналам и конверсии)',
      titleUa: 'Розширена аналітика (звіти по каналах і конверсії)',
      includesRu: ['Отчёты по источникам лидов', 'Конверсия по статусам', 'Выгрузка/дашборд (по шаблону)'],
      includesUa: ['Звіти по джерелах лідів', 'Конверсія по статусах', 'Вивантаження/дашборд (за шаблоном)'],
    },
    {
      key: 'external_crm',
      setupEur: 450,
      supportEurPerMonth: 60,
      titleRu: 'Интеграция с внешней CRM (HubSpot / Pipedrive и т.п.)',
      titleUa: 'Інтеграція із зовнішньою CRM (HubSpot / Pipedrive тощо)',
      includesRu: ['Синхронизация лидов и статусов', 'Сопоставление полей', 'Базовая автоматизация'],
      includesUa: ['Синхронізація лідів і статусів', 'Зіставлення полів', 'Базова автоматизація'],
    },
    {
      key: 'ai_training',
      setupEur: 350,
      supportEurPerMonth: 40,
      titleRu: 'Обучение AI под ваш бизнес (контент/FAQ/тон общения)',
      titleUa: 'Навчання AI під ваш бізнес (контент/FAQ/тон спілкування)',
      includesRu: ['Настройка тона и логики под бизнес', 'Подключение FAQ/материалов', 'Улучшение качества ответов'],
      includesUa: ['Налаштування тону та логіки під бізнес', 'Підключення FAQ/матеріалів', 'Покращення якості відповідей'],
    },
    {
      key: 'multilang',
      setupEur: 180,
      supportEurPerMonth: 15,
      titleRu: 'Мультиязычность (за язык)',
      titleUa: 'Мультимовність (за мову)',
      includesRu: ['Добавление языка в сценарии и ответы', 'Проверка качества/терминов'],
      includesUa: ['Додавання мови в сценарії та відповіді', 'Перевірка якості/термінів'],
    },
    {
      key: 'priority_support',
      setupEur: 0,
      supportEurPerMonth: 120,
      titleRu: 'Приоритетная поддержка (ускоренная реакция)',
      titleUa: 'Пріоритетна підтримка (швидша реакція)',
      includesRu: ['Быстрее реакция и фиксы', 'Приоритет в очереди'],
      includesUa: ['Швидша реакція та фікси', 'Пріоритет у черзі'],
    },
  ],
  faq: [
    {
      qRu: 'Почему есть ежемесячная оплата, если система уже настроена?',
      aRu: 'Система зависит от внешних платформ (Meta/WhatsApp/Telegram/Stripe), у которых меняются токены, правила и API. Поддержка — это мониторинг, обновления доступов и исправления сбоев, чтобы “не сломалось и забыли”.',
      qUa: 'Чому є щомісячна оплата, якщо система вже налаштована?',
      aUa: 'Система залежить від зовнішніх платформ (Meta/WhatsApp/Telegram/Stripe), де змінюються токени, правила та API. Підтримка — це моніторинг, оновлення доступів і виправлення збоїв, щоб “не зламалось і забули”.',
    },
    {
      qRu: 'Можно ли заказать только внедрение, без подписки?',
      aRu: 'Нет. Мы берём проекты только с сопровождением — иначе нельзя гарантировать стабильность интеграций и результат. Минимальный срок сопровождения указан в пакете.',
      qUa: 'Чи можна замовити лише впровадження без підписки?',
      aUa: 'Ні. Ми беремо проєкти лише із супроводом — інакше неможливо гарантувати стабільність інтеграцій та результат. Мінімальний строк супроводу вказаний у пакеті.',
    },
    {
      qRu: 'Почему цены фиксированные?',
      aRu: 'Фиксированные цены = понятный объём работ, чёткие сроки и отсутствие скрытых доплат. Это защищает и клиента, и нас от недоразумений.',
      qUa: 'Чому ціни фіксовані?',
      aUa: 'Фіксовані ціни = зрозумілий обсяг робіт, чіткі строки та відсутність прихованих доплат. Це захищає і клієнта, і нас від непорозумінь.',
    },
    {
      qRu: 'Сколько времени занимает запуск?',
      aRu: 'Start: 5–7 рабочих дней. Business: 7–14 дней. Pro: от 14 дней. Срок зависит от скорости предоставления доступов со стороны клиента.',
      qUa: 'Скільки часу займає запуск?',
      aUa: 'Start: 5–7 робочих днів. Business: 7–14 днів. Pro: від 14 днів. Строк залежить від швидкості надання доступів з боку клієнта.',
    },
  ],
  conditions: {
    ru: [
      'Подключение каналов Meta (Instagram/Facebook/WhatsApp) требует выдачи доступов и ролей со стороны клиента — мы даём чек‑лист.',
      'Поддержка оплачивается ежемесячно, потому что интеграции требуют контроля (токены/изменения платформ/сбои).',
      'Разовые работы вне пакета: 70 € / час (минимум 1 час).',
    ],
    ua: [
      'Підключення каналів Meta (Instagram/Facebook/WhatsApp) потребує видачі доступів і ролей з боку клієнта — ми даємо чек‑лист.',
      'Підтримка оплачується щомісяця, бо інтеграції потребують контролю (токени/зміни платформ/збої).',
      'Разові роботи поза пакетом: 70 € / год (мінімум 1 година).',
    ],
  },
  shortAboutRu: 'TemoWeb делает AI‑ассистентов и автоматизацию заявок/продаж для бизнеса (Instagram/WhatsApp/Telegram/Website) + CRM и интеграции.',
  shortAboutUa: 'TemoWeb робить AI‑асистентів і автоматизацію заявок/продажів для бізнесу (Instagram/WhatsApp/Telegram/Website) + CRM та інтеграції.',
}


