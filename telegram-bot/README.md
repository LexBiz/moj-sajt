# Telegram AI Bot

This is a standalone Telegram bot service for AI sales conversations.

## Setup

1) Install dependencies:
```
cd telegram-bot
npm install
```

2) Create `telegram-bot/.env` with:
```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_PUBLIC_URL=https://temoweb.eu
TELEGRAM_WEBHOOK_PATH=/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=optional-secret

OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

3) Start:
```
npm start
```

## Webhook

Set webhook to:
```
https://temoweb.eu/telegram/webhook
```

If you use a separate domain or path, update `TELEGRAM_PUBLIC_URL` and `TELEGRAM_WEBHOOK_PATH`.

## Notes

- Bot avatar and description are configured in BotFather.
- The bot stores minimal session state in `telegram-bot/data/sessions.json`.

