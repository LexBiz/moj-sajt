# Enterprise CRM (3-Wave Pipeline)

Production-oriented CRM foundation for high-volume lead processing.

## Core capabilities

- Public intake from web form and email channel.
- 3-wave lead lifecycle with commercial and execution stages.
- PostgreSQL as primary storage (JSON fallback only for local/dev).
- Detailed lead cards, manager comments, pipeline statuses.
- Commercial cases and supplier/subcontractor module.
- AI-assisted commercial case creation from form text/PDF.
- WhatsApp and email automation.
- Fakturoid API endpoint for invoice create + send flow.
- Health endpoint and backup/restore runbook.

## Quick start

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - create `.env` with required variables (see list below).
3. Apply DB migrations:
   - `npm run migrate`
4. Start service:
   - `npm run dev`
5. Open:
   - `http://127.0.0.1:3099`

## Required environment variables (production)

- `CRM_DATABASE_URL` (or `DATABASE_URL`) - PostgreSQL connection string.
- `CRM_JWT_SECRET` - JWT signing secret for CRM auth.
- `CRM_ADMIN_EMAIL` - initial admin login.
- `CRM_ADMIN_PASSWORD` - initial admin password.
- `CRM_REQUIRE_AUTH=true` to enforce auth middleware on protected routes.

## Integrations

### WhatsApp Cloud API
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TARGET_NUMBER`
- `WHATSAPP_TEMPLATE_NAME` (default `new_lead_notification_v1`)
- `WHATSAPP_TEMPLATE_LANG` (default `en`)

### Resend
- `RESEND_API_KEY`
- `RESEND_FROM`
- `CLIENT_FORM_URL` (public brief URL)
- `BRIEF_FORM_TO` (owner inbox for completed brief forms)

### Fakturoid (optional)
- `FAKTUROID_ACCOUNT_SLUG`
- `FAKTUROID_API_TOKEN`
- `FAKTUROID_USER_AGENT` (example: `TemoWebCRM (info@temoweb.eu)`)

### OpenAI (optional for AI case creation)
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default `gpt-4.1-mini`)

## Operations

- Health check:
  - `GET /api/ops/status`
- Backup runbook:
  - `RUNBOOK_BACKUP.md`
- Scripts:
  - `scripts/backup_db.sh`
  - `scripts/restore_db.sh`

## Notes

- In production, PostgreSQL is mandatory.
- Local JSON files are only for fallback/dev scenarios.
