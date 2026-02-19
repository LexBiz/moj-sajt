## What Meta wants (your rejection reason)

Your request was rejected because the screencast did **not** show the full end-to-end experience:
- **Meta login flow** (Facebook/Meta OAuth)
- **User grants permissions**
- **Select the resource** (Page / Instagram account)
- **Send a message from your app UI in real time**
- **Show the same message delivered** in the native Instagram app

## Use this built-in demo page (already in this repo)

- Open: `https://<your-domain>/admin/integrations`
- It is protected by the same password as `/admin` (env `ADMIN_PASSWORD`)

The page is made specifically for App Review and contains:
- Meta OAuth button
- Resource selection (Facebook Page → connected Instagram Business Account ID)
- Webhook “last sender” display (so you can reply to a real conversation)
- “Send from App” button that sends a DM via API

## Recording script (recommended)

**Important:** Use **English** UI language while recording (Meta asks for it).

### A) Setup (before recording)

- Your Instagram account must be **Professional** and connected to a **Facebook Page**
- In Meta App Dashboard:
  - Add Instagram product / webhooks as needed
  - Subscribe your app/webhook to Instagram **messages** events
  - Make sure webhook verify token matches your server env `INSTAGRAM_VERIFY_TOKEN`
  - Make sure you’re requesting the exact permissions you submitted for review (e.g. `instagram_business_basic`, `instagram_business_manage_messages`)

### B) Screencast steps (end-to-end)

1) **Open** `/admin/integrations` (English UI)
2) Click **Start Meta Login**
3) Complete Meta login and **grant permissions**
4) Back on `/admin/integrations`, click **Load Pages**
5) **Select a Page** that has a connected Instagram account (it auto-fills ig-user-id)
6) Click **Save Selection**
7) On a phone (native Instagram app), send a DM to your business Instagram account:
   - Example message: “Hi, this is App Review test”
8) Back in the browser, show that the demo page displays:
   - **Last sender ID**
   - **Last text preview**
9) Click **Use last sender**
10) Click **Send from App**
11) Show the result JSON (status ok)
12) Switch to the phone and show the received message in the native Instagram app

## Common gotchas (why “it sends nothing”)

- Instagram Messaging API can generally only **reply to users who already messaged you**
- Webhook not configured / not subscribed → you never capture sender id → you cannot reply
- Wrong permission set in OAuth vs what you requested in App Review
- Wrong IG user id (must be the connected professional account id)



