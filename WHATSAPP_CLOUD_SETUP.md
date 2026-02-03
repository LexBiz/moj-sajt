## WhatsApp Cloud API — setup template (TemoWeb / mujsajt)

This is a **runbook** for connecting a WhatsApp phone number to this project and making sure:
- webhooks reach `https://temoweb.eu/api/whatsapp/webhook`
- inbound messages are processed
- replies are sent via Cloud API

### Key identifiers

- **Phone Number ID**: shown in WhatsApp Manager → Phone numbers → your number.  
  Used by Cloud API endpoints like `/{PHONE_NUMBER_ID}/messages` and `/{PHONE_NUMBER_ID}/register`.

- **WABA ID** (WhatsApp Business Account ID): **NOT** the Meta Business ID.  
  You can see it in WhatsApp Manager; it is also often visible as `asset_id=...` in the URL.

Common pitfall: using a **Business ID** instead of **WABA ID** breaks `subscribed_apps` and inbound delivery.

### Required server env

On production server (`/var/www/mujsajt/.env`), required keys:

- `WHATSAPP_ACCESS_TOKEN=...`  
  Prefer a long‑lived System User token with permissions:
  - `whatsapp_business_management`
  - `whatsapp_business_messaging`

- `WHATSAPP_PHONE_NUMBER_ID=...`
- `WHATSAPP_WABA_ID=...` (real WABA id)
- `WHATSAPP_VERIFY_TOKEN=...` (for webhook verify)
- `WHATSAPP_APP_SECRET=...` (Meta App secret used to validate webhook signatures)

Optional:
- `WHATSAPP_API_HOST=graph.facebook.com`
- `WHATSAPP_API_VERSION=v22.0`

After changes:

```bash
pm2 restart mujsajt --update-env
```

### Webhook configuration

In Meta Developers (WhatsApp → Configuration / Webhooks):
- Callback URL: `https://temoweb.eu/api/whatsapp/webhook`
- Verify token: must match `WHATSAPP_VERIFY_TOKEN`
- Subscribe to **messages**

Health endpoint:
- `GET https://temoweb.eu/api/whatsapp/health`

### Make sure the app is subscribed to the WABA

If inbound messages do not reach your webhook, ensure the app is subscribed to the WABA:

- `GET /{WABA-ID}/subscribed_apps`
- `POST /{WABA-ID}/subscribed_apps`

Docs: `https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/subscribed-apps-api/#post-version-waba-id-subscribed-apps`

### Phone number registration (Cloud API)

If Cloud API registration fails with “consumer app / not allowed”, the number is still tied to a consumer WhatsApp account.
You must **delete the WhatsApp account** for that number in WhatsApp (phone) to free it.

Typical Graph API steps (if needed):
- `POST /{PHONE_NUMBER_ID}/register` with `messaging_product=whatsapp` and `pin=XXXXXX`
- Two‑step verification PIN can be set via `POST /{PHONE_NUMBER_ID}` with `pin=XXXXXX`

### Troubleshooting checklist

1) **No webhook events at all**
- Check WABA subscription (`subscribed_apps`)
- Check webhook URL is saved in Meta
- Check server is reachable: `curl -I https://temoweb.eu/api/whatsapp/webhook`

2) **Webhook hits but server drops them**
- Logs show: `WA webhook: invalid signature` → fix `WHATSAPP_APP_SECRET` to match the WhatsApp app in Meta Developers.

Temporary emergency switch (NOT recommended long‑term):
- `WHATSAPP_SIGNATURE_BYPASS=true` (accepts inbound without signature validation)

3) **Inbound received but no reply**
- Check server logs for `WhatsApp send error`
- Ensure `WHATSAPP_ACCESS_TOKEN` is valid and has messaging permissions
- Ensure the phone number is registered for Cloud API and not in “pending”

