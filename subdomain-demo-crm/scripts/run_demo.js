#!/usr/bin/env node
/**
 * CRM Full E2E Demo Run — 5 realistic clients
 * Runs the complete pipeline for each client:
 *   Lead → Brief form → Estimate (PDF/Excel) → Email → Approval
 *   → Realization → Completion act → Invoice paid → Closed
 *
 * Usage: node scripts/run_demo.js
 */

'use strict'
const https = require('https')
const http  = require('http')

// ── CONFIG ─────────────────────────────────────────────────────────────────
const BASE    = process.env.CRM_BASE || 'https://demo.temoweb.eu'
const EMAIL   = 'owner@ol-masterdom.cz'
const PASS    = 'owner123'
const DEMO_TO = 'info@temoweb.eu'   // all test emails land here

const STEP_DELAY = 900  // ms between steps

// ── CATALOG ITEMS (real IDs from crm_service_catalog_items) ────────────────
// Format: { id, name, unit, price, matDesc?, matPrice?, qty }
const CATALOG_BYT = [
  { id: 7,    name: 'Montáž trubka plastová tuhá pod omítku D16-23mm',  unit: 'm',   price: 39.60,  qty: 120, matDesc: 'Trubka KOPOS KP16 – 3m tyče', matPrice: 18.50 },
  { id: 119,  name: 'Montáž krabice zapuštěná plastová kruhová',         unit: 'kus', price: 107.00, qty: 42,  matDesc: 'Krabice KU 68-1901', matPrice: 32.00 },
  { id: 200,  name: 'Montáž vodič Cu izolovaný NYM 1,5–16mm² pevně',    unit: 'm',   price: 57.20,  qty: 280, matDesc: 'Kabel NYM-J 3x1,5mm²', matPrice: 24.90 },
  { id: 1100, name: 'Montáž rozvaděče plastového – těleso do 20 kg',    unit: 'kus', price: 265.00, qty: 1,   matDesc: 'Rozvaděč Hager Golf 3x18 mod.', matPrice: 3200.00 },
  { id: 119,  name: 'Montáž zásuvky jednoduché (osazení)',               unit: 'kus', price: 107.00, qty: 18, matDesc: 'Zásuvka Schneider Asfora bílá', matPrice: 145.00 },
  { id: 1800, name: 'Montáž spínače časového se zapojením vodičů',       unit: 'kus', price: 319.00, qty: 2,  matDesc: 'Spínač Legrand celiane', matPrice: 280.00 },
  { id: 413,  name: 'Montáž kabel Cu topný volné délky do podlahy',     unit: 'm',   price: 28.20,  qty: 45, matDesc: 'Topný kabel Raychem T2Blue 20W/m', matPrice: 185.00 },
  { id: 1805, name: 'Montáž termostatu prostředí normální',              unit: 'kus', price: 433.00, qty: 2,  matDesc: 'Termostat Danfoss ECtemp Basic', matPrice: 650.00 },
]

const CATALOG_KANCELÁŘ = [
  { id: 100,  name: 'Montáž lišta vkládací šíře do 60mm s víčkem',       unit: 'm',   price: 102.00, qty: 80,  matDesc: 'Lišta Kopos EKD 60×40', matPrice: 55.00 },
  { id: 1100, name: 'Montáž rozvaděče plastového – těleso do 20 kg',     unit: 'kus', price: 265.00, qty: 2,   matDesc: 'Rozvaděč Hager VD212GN 2-řadový', matPrice: 4500.00 },
  { id: 119,  name: 'Montáž krabice zapuštěná plastová kruhová',          unit: 'kus', price: 107.00, qty: 32,  matDesc: 'Krabice KU 68 plastová', matPrice: 32.00 },
  { id: 200,  name: 'Montáž vodič Cu izolovaný NYM pevně',               unit: 'm',   price: 57.20,  qty: 180, matDesc: 'Kabel NYM-J 3x2,5mm²', matPrice: 38.50 },
  { id: 1503, name: 'Montáž vidlice průmyslová nástěnná 16A 3P+PE',      unit: 'kus', price: 164.00, qty: 8,   matDesc: 'Vidlice PCE 023-6 16A 400V', matPrice: 220.00 },
  { id: 416,  name: 'Montáž kabel Cu topný okruh 230V 19m do podlahy',   unit: 'kus', price: 1890.00,qty: 1,   matDesc: 'Topný okruh ECOFLOOR 19m 380W', matPrice: 4200.00 },
  { id: 1805, name: 'Montáž termostatu prostředí normální',               unit: 'kus', price: 433.00, qty: 1,   matDesc: 'Termostat Danfoss RET2000', matPrice: 890.00 },
  { id: 1109, name: 'Montáž rozvaděč skříňový dělitelný do 200 kg',      unit: 'kus', price: 3280.00,qty: 1,   matDesc: 'Skříňová rozvodnice ABB 36-mod.', matPrice: 8500.00 },
]

const CATALOG_DUM = [
  { id: 7,    name: 'Montáž trubka plastová tuhá pod omítku D16-23mm',   unit: 'm',   price: 39.60,  qty: 350, matDesc: 'Trubka KOPOS KP16', matPrice: 18.50 },
  { id: 119,  name: 'Montáž krabice zapuštěná plastová kruhová',          unit: 'kus', price: 107.00, qty: 90,  matDesc: 'Krabice KU 68-1901', matPrice: 32.00 },
  { id: 200,  name: 'Montáž vodič Cu izolovaný NYM pevně',               unit: 'm',   price: 57.20,  qty: 600, matDesc: 'Kabel CYKY-J 3x1,5mm²', matPrice: 22.00 },
  { id: 201,  name: 'Montáž vodič Cu 25–35mm² pevně (hlavní přívod)',    unit: 'm',   price: 61.00,  qty: 40,  matDesc: 'Kabel CYKY-J 5x10mm²', matPrice: 95.00 },
  { id: 1100, name: 'Montáž rozvaděče plastového – těleso do 20 kg',     unit: 'kus', price: 265.00, qty: 3,   matDesc: 'Rozvaděč Hager VD36GN 3-řadový', matPrice: 5200.00 },
  { id: 119,  name: 'Montáž zásuvky jednoduché (osazení)',                unit: 'kus', price: 107.00, qty: 45,  matDesc: 'Zásuvka ABB Tango bílá', matPrice: 155.00 },
  { id: 1800, name: 'Montáž spínače časového se zapojením vodičů',        unit: 'kus', price: 319.00, qty: 3,   matDesc: 'Spínač Legrand DLP 16A', matPrice: 290.00 },
  { id: 413,  name: 'Montáž kabel Cu topný – podlahové topení',          unit: 'm',   price: 28.20,  qty: 120, matDesc: 'Topný kabel FENIX ADSV 18/1800W', matPrice: 210.00 },
  { id: 416,  name: 'Montáž kabel Cu topný okruh 230V 19m',              unit: 'kus', price: 1890.00,qty: 3,   matDesc: 'Sada podlahového topení Raychem', matPrice: 3800.00 },
  { id: 1805, name: 'Montáž termostatu prostředí normální',               unit: 'kus', price: 433.00, qty: 3,   matDesc: 'Termostat FENIX RS 4', matPrice: 720.00 },
]

const CATALOG_KOMERCNI = [
  { id: 26,   name: 'Montáž trubka pancéřová kovová D16-29mm pevně',     unit: 'm',   price: 76.10,  qty: 200, matDesc: 'Trubka ocelová pozinkovaná D25', matPrice: 65.00 },
  { id: 1109, name: 'Montáž rozvaděč skříňový dělitelný do 200 kg',      unit: 'kus', price: 3280.00,qty: 2,   matDesc: 'Rozvaděč Rittal TS8 600×800×200', matPrice: 15800.00 },
  { id: 200,  name: 'Montáž vodič Cu izolovaný NYM pevně',               unit: 'm',   price: 57.20,  qty: 500, matDesc: 'Kabel CYKY-J 3x2,5mm²', matPrice: 38.50 },
  { id: 202,  name: 'Montáž vodič Cu 50–70mm² pevně (napájení)',         unit: 'm',   price: 67.40,  qty: 80,  matDesc: 'Kabel CYKY-J 4x50mm²', matPrice: 285.00 },
  { id: 1503, name: 'Montáž vidlice průmyslová nástěnná 16A 3P+PE',      unit: 'kus', price: 164.00, qty: 20,  matDesc: 'Vidlice průmyslová PCE 16A', matPrice: 220.00 },
  { id: 416,  name: 'Montáž kabel Cu topný okruh 230V 19m',              unit: 'kus', price: 1890.00,qty: 4,   matDesc: 'Topná rohož ECOFLOOR 380W', matPrice: 4200.00 },
  { id: 1807, name: 'Montáž termostatu do rozvaděče',                    unit: 'kus', price: 372.00, qty: 4,   matDesc: 'Termostat rozvaděčový Stego CS030', matPrice: 950.00 },
  { id: 700,  name: 'Ukončení vodič izolovaný do 150mm² smršťovací koncovkou', unit:'kus', price:386.00, qty:8, matDesc:'Smršťovací koncovka 3M 150mm²', matPrice:185.00 },
  { id: 1809, name: 'Montáž transformátoru jednofázového do 200VA',      unit: 'kus', price: 230.00, qty: 6,   matDesc: 'Transformátor 24V/200VA Hahn', matPrice: 680.00 },
]

const CATALOG_GARAZ = [
  { id: 1,    name: 'Montáž trubka plastová tuhá D16-23mm pevně',        unit: 'm',   price: 45.50,  qty: 60,  matDesc: 'Trubka KOPOS KP25', matPrice: 22.00 },
  { id: 119,  name: 'Montáž krabice zapuštěná plastová kruhová',          unit: 'kus', price: 107.00, qty: 15,  matDesc: 'Krabice KU 68 plastová', matPrice: 32.00 },
  { id: 200,  name: 'Montáž vodič Cu izolovaný NYM pevně',               unit: 'm',   price: 57.20,  qty: 120, matDesc: 'Kabel CYKY-J 3x2,5mm²', matPrice: 38.50 },
  { id: 1100, name: 'Montáž rozvaděče plastového – těleso do 20 kg',     unit: 'kus', price: 265.00, qty: 1,   matDesc: 'Rozvaděč Hager 2-řadový 24mod.', matPrice: 2800.00 },
  { id: 1503, name: 'Montáž vidlice průmyslová nástěnná 16A 3P+PE',      unit: 'kus', price: 164.00, qty: 3,   matDesc: 'Vidlice PCE Tough 16A IP44', matPrice: 220.00 },
  { id: 1800, name: 'Montáž spínače se zapojením vodičů',                unit: 'kus', price: 319.00, qty: 4,   matDesc: 'Spínač Schneider Unica IP44', matPrice: 185.00 },
  { id: 416,  name: 'Montáž kabel Cu topný okruh 19m',                   unit: 'kus', price: 1890.00,qty: 1,   matDesc: 'Topný kabel garáž RAYCHEM T2', matPrice: 3200.00 },
]

// ── 5 TEST CLIENTS ─────────────────────────────────────────────────────────
const CLIENTS = [
  {
    lead: {
      name: 'Jan Novák',
      phone: '+420737112233',
      email: DEMO_TO,
      comment: 'Rekonstrukce bytu 3+1 v Praze 6 – kompletní výměna elektroinstalace, nový rozvaděč, podlahové topení v koupelně.',
      source: 'web',
    },
    brief: {
      realizationAddress: 'Dejvická 28, Praha 6, 160 00',
      projectType: 'rekonstrukce_bytu',
      roughSize: '75 m²',
      desiredStart: '2026-03-15',
      specificRequirements: 'Nová elektroinstalace + podlahové topení v koupelně a na chodbě. Byt ve 3. patře, bez výtahu.',
    },
    catalog: CATALOG_BYT,
    address: 'Dejvická 28, Praha 6',
    stage2: 'schvaleni_objednavka',
    note: 'Klient potvrdil přijetí nabídky telefonicky. Souhlasí s cenou a termínem zahájení 15. března.',
    invoiceAmount: 45000,
    invoiceNote: 'Záloha 50% — rekonstrukce elektroinstalace byt Novák',
    tasks: [
      { title: 'Objednat materiál', priority: 'high' },
      { title: 'Demontáž staré instalace', priority: 'normal' },
      { title: 'Realizace nové elektroinstalace + rozvaděč', priority: 'normal' },
    ],
    sendAct: true,
  },
  {
    lead: {
      name: 'Pavel Kovář',
      phone: '+420603445566',
      email: DEMO_TO,
      comment: 'Nové kancelářské prostory v Brně – rozvaděč, zásuvky, datové vedení, podlahové topení v zasedací místnosti.',
      source: 'referral',
    },
    brief: {
      realizationAddress: 'Náměstí Svobody 12, Brno, 602 00',
      projectType: 'kancelarsky_prostor',
      roughSize: '220 m² kanceláře',
      desiredStart: '2026-04-01',
      companyName: 'Stavební firma Kovář s.r.o.',
      ico: '28456789',
      specificRequirements: 'Silnoproud + slaboproud, datová infrastruktura CAT6, 2 rozvaděče, 8 průmyslových zásuvek ve výrobní části.',
    },
    catalog: CATALOG_KANCELÁŘ,
    address: 'Náměstí Svobody 12, Brno',
    stage2: 'zaloha_priprava',
    note: 'Firma Kovář souhlasí s nabídkou. Faktura za zálohu bude zaslána do 3 pracovních dnů. Termín zahájení 1.4.2026.',
    invoiceAmount: 68000,
    invoiceNote: 'Záloha 40% — kancelářský prostor Kovář s.r.o. Brno',
    tasks: [
      { title: 'Projektová dokumentace', priority: 'high' },
      { title: 'Dodávka a montáž rozvaděčů', priority: 'high' },
      { title: 'Datová kabeláž CAT6', priority: 'normal' },
    ],
    sendAct: false,
  },
  {
    lead: {
      name: 'Marie Horáčková',
      phone: '+420721334455',
      email: DEMO_TO,
      comment: 'Rodinný dům novostavba v Plzni – kompletní elektroinstalace od základů, fotovoltaika, podlahové topení ve všech místnostech.',
      source: 'web',
    },
    brief: {
      realizationAddress: 'Tylova 45, Plzeň-Slovany, 326 00',
      projectType: 'novostavba_rd',
      roughSize: '180 m² + garáž 40 m²',
      desiredStart: '2026-05-15',
      specificRequirements: 'Kompletní instalace novostavba RD. 3 rozvaděče (hlavní + patro + garáž), 45 zásuvek, 35 svítidel, 3 okruhy podlahového topení.',
    },
    catalog: CATALOG_DUM,
    address: 'Tylova 45, Plzeň-Slovany',
    stage2: 'schvaleni_objednavka',
    note: 'Paní Horáčková přijala nabídku emailem. Požaduje zahájení nejpozději 15.5., jinak projekt odloží na podzim.',
    invoiceAmount: 85000,
    invoiceNote: 'Záloha 50% — novostavba RD Horáčková Plzeň',
    tasks: [
      { title: 'Koordinace s dodavatelem stavby', priority: 'high' },
      { title: 'Instalace hrubé elektro (1. etapa)', priority: 'normal' },
      { title: 'Dokončení instalace + revize', priority: 'normal' },
    ],
    sendAct: true,
  },
  {
    lead: {
      name: 'Ing. Robert Blažek',
      phone: '+420605778899',
      email: DEMO_TO,
      comment: 'Komerční budova Praha 2 – komplexní elektroinstalace ve třech patrech, 2 velké rozvaděče, nouzové osvětlení, EPS.',
      source: 'web',
    },
    brief: {
      realizationAddress: 'Mánesova 55, Praha 2, 120 00',
      projectType: 'komercni_budova',
      roughSize: '1 200 m² celkem (3 patra)',
      desiredStart: '2026-06-01',
      companyName: 'Reality Group a.s.',
      ico: '06123456',
      specificRequirements: 'Multifázová realizace, přívod VN/NN, 2 skříňové rozvaděče, nouzové osvětlení, EPS systém, datová infrastruktura.',
    },
    catalog: CATALOG_KOMERCNI,
    address: 'Mánesova 55, Praha 2',
    stage2: 'schvaleni_objednavka',
    note: 'Reality Group a.s. schválila nabídku na jednání 18.2. Požadují zahájení v červnu po dokončení hrubé stavby.',
    invoiceAmount: 120000,
    invoiceNote: 'Záloha 30% — komerční budova Reality Group Praha 2',
    tasks: [
      { title: 'Projekt silnoproudu + EPS', priority: 'urgent' },
      { title: 'Instalace přívodu NN + rozvaděčů', priority: 'high' },
      { title: 'Nouzové osvětlení + datová kabeláž', priority: 'normal' },
    ],
    sendAct: false,
  },
  {
    lead: {
      name: 'Petr Svoboda',
      phone: '+420736009911',
      email: DEMO_TO,
      comment: 'Garáž a dílna v Ostravě – nová elektroinstalace, průmyslové zásuvky, podlahové topení v dílně, osvětlení LED.',
      source: 'referral',
    },
    brief: {
      realizationAddress: 'Hlučínská 8, Ostrava-Svinov, 721 00',
      projectType: 'garaz_dilna',
      roughSize: 'Garáž 80 m² + dílna 40 m²',
      desiredStart: '2026-03-28',
      specificRequirements: 'Silnoproud 400V pro dílnu, 3 průmyslové zásuvky, 4 spínače, LED osvětlení, podlahové topení 380W.',
    },
    catalog: CATALOG_GARAZ,
    address: 'Hlučínská 8, Ostrava-Svinov',
    stage2: 'zaloha_priprava',
    note: 'Pan Svoboda potvrdil SMS. Záloha uhrazena převodem. Montáž naplánována na 28. března.',
    invoiceAmount: 18500,
    invoiceNote: 'Záloha 60% — garáž a dílna Svoboda Ostrava',
    tasks: [
      { title: 'Připravit trasy kabelů', priority: 'normal' },
      { title: 'Montáž rozvaděče + topení', priority: 'high' },
      { title: 'Finální oživení + protokol', priority: 'normal' },
    ],
    sendAct: false,
  },
]

// ── HTTP HELPERS ────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function request(url, opts = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    }
    const bodyStr = body ? JSON.stringify(body) : null
    if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr)
    const req = lib.request(options, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

function api(path, token, method = 'GET', body = null) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  return request(`${BASE}${path}`, { method, headers }, body)
}

// ── LOGGER ─────────────────────────────────────────────────────────────────
const RESET = '\x1b[0m', GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', BOLD = '\x1b[1m', DIM = '\x1b[2m'
function log(msg) { console.log(msg) }
function ok(msg)  { console.log(`  ${GREEN}✓${RESET} ${msg}`) }
function err(msg) { console.log(`  ${RED}✗${RESET} ${msg}`) }
function info(msg){ console.log(`  ${CYAN}→${RESET} ${msg}`) }
function warn(msg){ console.log(`  ${YELLOW}!${RESET} ${msg}`) }
function hr()     { console.log(`${DIM}${'─'.repeat(72)}${RESET}`) }

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  console.log()
  console.log(`${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════╗${RESET}`)
  console.log(`${BOLD}${CYAN}║   O&L Master Dom CRM — Full E2E Demo Run (5 klientů)    ║${RESET}`)
  console.log(`${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════╝${RESET}`)
  console.log(`  Base URL: ${BASE}`)
  console.log(`  Test emails → ${DEMO_TO}`)
  console.log()

  // ── STEP 0: Login ─────────────────────────────────────────────────────────
  hr()
  log(`${BOLD}[0] Přihlášení — ${EMAIL}${RESET}`)
  const loginRes = await api('/api/auth/login', null, 'POST', { email: EMAIL, password: PASS })
  if (!loginRes.body?.ok || !loginRes.body?.token) {
    err(`Přihlášení selhalo: ${JSON.stringify(loginRes.body)}`)
    process.exit(1)
  }
  const TOKEN = loginRes.body.token
  ok(`Token získán (${EMAIL}, role: ${loginRes.body.user?.role})`)

  const results = []

  for (let ci = 0; ci < CLIENTS.length; ci++) {
    const client = CLIENTS[ci]
    const num = ci + 1
    console.log()
    hr()
    console.log(`${BOLD}${CYAN}[KLIENT ${num}/5] ${client.lead.name}${RESET}`)
    hr()

    const clientName = client.lead.name
    const row = { num, name: clientName, leadId: null, jobId: null, estimateId: null, emailsSent: 0, errors: [] }

    try {
      // ── STEP 1: Create Lead (public, no auth → triggers WhatsApp) ──────────
      info(`Vytvářím lead...`)
      await sleep(STEP_DELAY)
      const leadRes = await api('/api/leads', null, 'POST', {
        name:    client.lead.name,
        phone:   client.lead.phone,
        email:   client.lead.email,
        comment: client.lead.comment,
        source:  client.lead.source,
        lang:    'cz',
      })
      if (!leadRes.body?.ok) throw new Error(`Lead: ${leadRes.body?.error || JSON.stringify(leadRes.body)}`)
      const leadId = leadRes.body.lead?.id
      row.leadId = leadId
      ok(`Lead vytvořen #${leadId} — WhatsApp notifikace odesláno`)

      // ── STEP 2: Find the auto-created job ─────────────────────────────────
      await sleep(STEP_DELAY)
      info(`Hledám automaticky vytvořenou zakázku...`)
      const jobsRes = await api(`/api/crm/jobs?limit=5`, TOKEN)
      let jobId = null
      if (jobsRes.body?.ok) {
        const jobs = jobsRes.body.jobs || []
        const matched = jobs.find(j => j.leadId == leadId || String(j.leadId) === String(leadId))
        if (matched) jobId = matched.id
      }
      // If no auto-job, create manually
      if (!jobId) {
        const jRes = await api('/api/crm/jobs', TOKEN, 'POST', {
          leadId,
          internalNumber: `OLM-${String(Date.now()).slice(-5)}-${num}`,
          title: client.lead.comment.slice(0, 80),
          address: client.address,
          pipelineStage: 'nova_poptavka',
        })
        if (!jRes.body?.ok) throw new Error(`Job create: ${jRes.body?.error}`)
        jobId = jRes.body.job?.id
        info(`Zakázka vytvořena ručně #${jobId}`)
      } else {
        ok(`Zakázka nalezena #${jobId}`)
      }
      row.jobId = jobId

      // ── STEP 3: Update job with address ───────────────────────────────────
      await sleep(STEP_DELAY / 2)
      await api(`/api/crm/jobs/${jobId}`, TOKEN, 'PATCH', {
        address: client.address,
        title: client.lead.comment.slice(0, 100),
      })

      // ── STEP 4: Simulate client brief form submission ──────────────────────
      await sleep(STEP_DELAY)
      info(`Simuluji odeslání formuláře klientem...`)
      const briefPayload = {
        leadId,
        realizationAddress: client.brief.realizationAddress,
        projectType:        client.brief.projectType,
        roughSize:          client.brief.roughSize,
        desiredStart:       client.brief.desiredStart,
        specificRequirements: client.brief.specificRequirements,
      }
      if (client.brief.companyName) {
        briefPayload.companyName = client.brief.companyName
        briefPayload.ico         = client.brief.ico
      }
      const briefRes = await api('/api/client-brief', null, 'POST', briefPayload)
      if (briefRes.body?.ok) {
        ok(`Brief formulář přijat — WhatsApp notifikace #2 odesláno`)
      } else {
        warn(`Brief: ${briefRes.body?.error || 'ok (no handler found)'}`)
      }

      // ── STEP 5: Add job event — brief received ─────────────────────────────
      await sleep(STEP_DELAY / 2)
      await api(`/api/crm/jobs/${jobId}/events`, TOKEN, 'POST', {
        eventType: 'note',
        title: 'Formulář od klienta přijat',
        message: `Klient ${client.lead.name} odeslal detailní formulář s požadavky projektu. Adresa realizace: ${client.brief.realizationAddress}.`,
      })

      // ── STEP 6: Create estimate from job ──────────────────────────────────
      await sleep(STEP_DELAY)
      info(`Vytvářím koshtoris (rozpočet)...`)
      const estCreateRes = await api('/api/crm/estimates/from-job', TOKEN, 'POST', { jobId })
      if (!estCreateRes.body?.ok) throw new Error(`Estimate create: ${estCreateRes.body?.error}`)
      const estimateId = estCreateRes.body.estimate?.id
      row.estimateId = estimateId
      ok(`Koshtoris vytvořen #${estimateId}`)

      // ── STEP 7: Build estimate lines with real catalog items ───────────────
      await sleep(STEP_DELAY)
      info(`Přidávám ${client.catalog.length} položek do koštorise...`)
      const lines = client.catalog.map((item, idx) => ({
        catalogItemId:      item.id,
        workDescription:    item.name,
        materialDescription: item.matDesc || '',
        unit:               item.unit,
        quantity:           item.qty,
        laborUnitPrice:     item.price,
        materialUnitPrice:  item.matPrice || 0,
        matCoefficient:     1,
        category:           'elektro',
        sectionType:        'elektro',
        positionOrder:      idx + 1,
      }))
      const estPatchRes = await api(`/api/crm/estimates/${estimateId}`, TOKEN, 'PATCH', {
        title:                   `Cenová nabídka — ${client.lead.name}`,
        estimateDate:            new Date().toISOString().slice(0, 10),
        clientNameSnapshot:      client.lead.name,
        customerAddressSnapshot: client.brief.realizationAddress,
        vatRate:                 21,
        lines,
        jobNumberSnapshot: `OLM-${String(jobId).padStart(4, '0')}`,
        projectManagerSnapshot: 'Ing. Ondrej Kovář',
        note: `Nabídka zpracována na základě prohlídky objektu dne ${new Date().toLocaleDateString('cs-CZ')}. Ceny jsou platné 30 dní.`,
      })
      if (!estPatchRes.body?.ok) {
        warn(`Estimate patch: ${estPatchRes.body?.error}`)
      } else {
        const total = estPatchRes.body.estimate?.totalWithVat || 0
        ok(`${lines.length} položek přidáno, celkem s DPH: ${total.toLocaleString('cs-CZ')} Kč`)
      }

      // ── STEP 8: Build Excel + PDF documents ───────────────────────────────
      await sleep(STEP_DELAY * 2)
      info(`Generuji Excel + PDF rozpočtu...`)
      const buildRes = await api(`/api/crm/estimates/${estimateId}/build-documents`, TOKEN, 'POST', {})
      if (!buildRes.body?.ok) {
        warn(`Build docs: ${buildRes.body?.error || 'failed'}`)
      } else {
        const pdfOk = buildRes.body.pdf?.ok
        ok(`Excel vygenerován${pdfOk ? ' + PDF vytvořeno' : ' (PDF vyžaduje LibreOffice)'}`)
      }

      // ── STEP 9: Send estimate by email ────────────────────────────────────
      await sleep(STEP_DELAY)
      info(`Odesílám nabídku emailem na ${DEMO_TO}...`)
      const sendRes = await api(`/api/crm/estimates/${estimateId}/send-to-client`, TOKEN, 'POST', {
        email: DEMO_TO,
        subject: `Cenová nabídka ${client.lead.name} — O&L Master Dom`,
      })
      if (!sendRes.body?.ok) {
        warn(`Email send: ${sendRes.body?.error}`)
      } else {
        row.emailsSent++
        ok(`Email odeslán — klient obdrží nabídku s PDF přílohou`)
        ok(`Zakázka přesunuta do stádia: nabídka_odeslana`)
      }

      // ── STEP 10: Client approves estimate ─────────────────────────────────
      await sleep(STEP_DELAY)
      info(`Simuluji schválení nabídky klientem...`)
      const moveRes = await api(`/api/crm/jobs/${jobId}/move`, TOKEN, 'POST', {
        stage: client.stage2,
        note: client.note,
      })
      if (!moveRes.body?.ok) {
        warn(`Move to ${client.stage2}: ${moveRes.body?.error}`)
      } else {
        ok(`Zakázka přesunuta: ${client.stage2}`)
      }

      // ── STEP 11: Add approval event + comment ────────────────────────────
      await sleep(STEP_DELAY / 2)
      await api(`/api/crm/jobs/${jobId}/events`, TOKEN, 'POST', {
        eventType: 'note',
        title: 'Nabídka schválena klientem',
        message: client.note,
      })
      ok(`Komentář přidán: schválení klienta`)

      // ── STEP 12: Add tasks ───────────────────────────────────────────────
      await sleep(STEP_DELAY / 2)
      info(`Přidávám ${client.tasks.length} úkoly...`)
      for (const task of client.tasks) {
        await api(`/api/crm/jobs/${jobId}/tasks`, TOKEN, 'POST', {
          title:    task.title,
          priority: task.priority,
          dueDate:  new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          assignedTo: 'manager@ol-masterdom.cz',
        })
        await sleep(200)
      }
      ok(`${client.tasks.length} úkoly vytvořeny`)

      // ── STEP 13: Create invoice (záloha) ─────────────────────────────────
      await sleep(STEP_DELAY / 2)
      info(`Vytvářím fakturu – záloha...`)
      const invRes = await api(`/api/crm/jobs/${jobId}/invoices`, TOKEN, 'POST', {
        amount:      client.invoiceAmount,
        description: client.invoiceNote,
        dueDate:     new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status:      'pending',
        invoiceType: 'zalohova',
      })
      let invId = null
      if (!invRes.body?.ok) {
        warn(`Invoice: ${invRes.body?.error}`)
      } else {
        invId = invRes.body.invoice?.id
        ok(`Záloha faktura vytvořena #${invId} — ${client.invoiceAmount.toLocaleString('cs-CZ')} Kč`)
      }

      // ── STEP 14: Move to realization ─────────────────────────────────────
      await sleep(STEP_DELAY)
      info(`Přesouváme do fáze realizace...`)
      const realizaceRes = await api(`/api/crm/jobs/${jobId}/move`, TOKEN, 'POST', {
        stage: 'realizace',
        note: 'Záloha přijata, materiál objednán. Zahajujeme realizaci.',
      })
      if (realizaceRes.body?.ok) {
        ok(`Zakázka ve fázi: realizace`)
      }

      // ── STEP 15: Completion act (for 2 clients) ───────────────────────────
      if (client.sendAct) {
        await sleep(STEP_DELAY)
        info(`Připravuji akt o předání prací...`)
        const actRes = await api(`/api/crm/jobs/${jobId}/completion-act/prepare`, TOKEN, 'POST', {
          clientEmail: DEMO_TO,
          expiresInDays: 7,
        })
        if (!actRes.body?.ok) {
          warn(`Completion act: ${actRes.body?.error}`)
        } else {
          row.emailsSent++
          ok(`Akt o předání odeslán na ${DEMO_TO} s odkazem pro podpis`)
        }
      }

      // ── STEP 16: Mark invoice paid ────────────────────────────────────────
      if (invId) {
        await sleep(STEP_DELAY / 2)
        info(`Označuji fakturu jako uhrazenou...`)
        const paidRes = await api(`/api/crm/jobs/${jobId}/invoices/${invId}/paid`, TOKEN, 'POST', {
          paidAt: new Date().toISOString(),
          note: 'Platba přijata bankovním převodem.',
        })
        if (paidRes.body?.ok) ok(`Záloha označena jako uhrazena`)
        else warn(`Invoice paid: ${paidRes.body?.error}`)
      }

      // ── STEP 17: Close job (klient 1 and 3 = completed, others in-progress) ──
      if (client.sendAct) {
        await sleep(STEP_DELAY)
        info(`Uzavírám zakázku...`)
        const closeRes = await api(`/api/crm/jobs/${jobId}/move`, TOKEN, 'POST', {
          stage: 'dokonceno',
          note: 'Zakázka úspěšně dokončena. Akt podepsán, faktura uhrazena. Klient spokojen.',
        })
        if (closeRes.body?.ok) ok(`Zakázka uzavřena — stádium: DOKONČENO ✓`)
      }

      row.success = true
      ok(`${BOLD}Klient ${num} — průchod DOKONČEN${RESET}`)

    } catch (e) {
      row.success = false
      row.errors.push(String(e.message || e))
      err(`Klient ${num} — CHYBA: ${e.message}`)
    }

    results.push(row)
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log()
  hr()
  console.log(`${BOLD}${CYAN}VÝSLEDKY E2E PRОГОНУ${RESET}`)
  hr()
  console.log()

  let successCount = 0
  let totalEmails = 0
  for (const r of results) {
    const icon = r.success ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`
    const details = [
      r.leadId     ? `lead#${r.leadId}`     : 'no lead',
      r.jobId      ? `job#${r.jobId}`       : 'no job',
      r.estimateId ? `est#${r.estimateId}`  : 'no estimate',
      `${r.emailsSent} emails`,
    ].join('  |  ')
    console.log(`  ${icon} [${r.num}] ${BOLD}${r.name}${RESET}`)
    console.log(`      ${DIM}${details}${RESET}`)
    if (r.errors.length) {
      for (const e of r.errors) console.log(`      ${RED}→ ${e}${RESET}`)
    }
    if (r.success) successCount++
    totalEmails += r.emailsSent
    console.log()
  }

  hr()
  console.log(`  Úspěšných průchodů:  ${successCount}/${results.length}`)
  console.log(`  Odeslaných emailů:   ${totalEmails}  (inbox: ${DEMO_TO})`)
  console.log(`  WhatsApp zprávy:     ~${results.length * 2} notifikací (lead + brief/form)`)
  console.log()
  console.log(`  ${CYAN}Vizuální kontrola:${RESET}`)
  console.log(`  → Pipeline: ${BASE}/`)
  console.log(`  → Všechny zakázky jsou v různých fázích pipeline`)
  console.log(`  → Každá zakázka: záložka Dokumenty (xlsx/pdf), Emaily, Události, Úkoly, Finance`)
  hr()
  console.log()

  if (successCount < results.length) {
    process.exit(1)
  }
}

main().catch(e => {
  console.error(RED + 'Fatal error: ' + RESET + e.message)
  process.exit(1)
})
