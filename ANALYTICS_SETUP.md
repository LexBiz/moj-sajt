# Analytics setup (easy mode)

This project supports **Plausible** (pageviews + conversion events) and **Microsoft Clarity** (heatmaps + session recordings).

## 1) Create `.env.local`

Create a file `.env.local` in the project root and add:

```env
# Plausible (recommended)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=temoweb.eu
# If you self-host Plausible, change the script URL:
NEXT_PUBLIC_PLAUSIBLE_SRC=https://plausible.io/js/script.js

# Microsoft Clarity (free)
NEXT_PUBLIC_CLARITY_ID=YOUR_CLARITY_ID

# Optional: Cloudflare Web Analytics (pageviews only)
NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN=YOUR_CF_TOKEN
```

## 2) What gets tracked (automatically)

Plausible events (only when Plausible is enabled):
- `contact_tel` — click on `tel:...`
- `contact_email` — click on `mailto:...`
- `contact_whatsapp` — click on `wa.me/...`
- `contact_telegram` — click on `t.me/...`
- `nav_contact` — click `#contact`
- `nav_cases` — click `#cases`
- `nav_services` — click `#services`
- `nav_projects` — click `#projects`
- `scroll_75` — user scrolled 75% of the page

## 3) Where to view results

- Plausible dashboard: in your Plausible account (site `temoweb.eu`)
- Clarity dashboard: in Microsoft Clarity project
- Cloudflare Web Analytics: Cloudflare → Web Analytics



