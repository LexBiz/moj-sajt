## Пакеты START / BUSINESS / PRO → как это выглядит в системе

Ваши пакеты — это не “три разных бота”, а **один бот + ограничения/фичи**.

### 1) Лимиты
- maxChannels: 2 / 3 / 5
- maxUsers (если клиенту даём аккаунты менеджерам)
- maxScenarios (если захотите ограничивать)

### 2) Фичи (feature flags)
Примеры:
- instagramCommentsReply
- instagramPlusToDM
- followUp3h
- analyticsBasic / analyticsAdvanced
- crmPipelineBasic / crmAdvanced
- integrationsStripe
- integrationsCalendar
- externalCrmSync
- multilingual
- prioritySupport

### 3) Привязка к оплате/плану
У tenant хранится:
- plan: START|BUSINESS|PRO
- features: {...}
- limits: {...}
- supportContract: {...} (минимальный срок, SLA, и т.п.)

### 4) Важно: “Ваш пакет” ≠ “пакет клиента SaaS”
Ваши пакеты — это коммерческий продукт TemoWeb.
Технически это набор фич/лимитов, который Вы назначаете клиенту после оплаты.


