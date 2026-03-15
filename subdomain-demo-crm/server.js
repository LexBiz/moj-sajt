const express = require('express')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { Pool } = require('pg')
const multer = require('multer')
const pdfParse = require('pdf-parse')
const ExcelJS = require('exceljs')
const { execFile } = require('child_process')
const { promisify } = require('util')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    if (!key) continue
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadEnvFile(path.join(__dirname, '..', '.env'))
loadEnvFile(path.join(__dirname, '..', '.env.local'))
loadEnvFile(path.join(__dirname, '.env'))
loadEnvFile(path.join(__dirname, '.env.local'))

const app = express()
const PORT = Number(process.env.PORT || 3099)
const NODE_ENV = String(process.env.NODE_ENV || 'development')
const IS_PROD = NODE_ENV === 'production'
const JWT_SECRET = String(process.env.CRM_JWT_SECRET || process.env.ADMIN_SECRET || 'change-me-now').trim()
const REQUIRE_AUTH = String(process.env.CRM_REQUIRE_AUTH || 'false').trim() === 'true'
const DATA_DIR = path.join(__dirname, 'data')
const GENERATED_DIR = path.join(__dirname, 'generated')
const GENERATED_OFFERS_DIR = path.join(GENERATED_DIR, 'offers')
const GENERATED_ESTIMATES_DIR = path.join(GENERATED_DIR, 'estimates')
const OFFER_TEMPLATES_DIR = String(process.env.CRM_OFFER_TEMPLATES_DIR || path.join(__dirname, 'templates', 'offers')).trim()
const CRM_PUBLIC_BASE_URL = String(process.env.CRM_PUBLIC_BASE_URL || `http://localhost:${PORT}`).trim().replace(/\/+$/, '')
const DB_URL = String(process.env.CRM_DATABASE_URL || process.env.DATABASE_URL || '').trim()
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim()
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || 'gpt-4.1').trim()
const LEAD_DELETE_PASSWORD = String(process.env.CRM_DELETE_PASSWORD || '12345').trim()

const STATUS = {
  NEW: 'new_request',
  FORM_SENT: 'form_sent',
  FORM_RECEIVED: 'form_received',
  CONTACTED: 'contacted',
  OFFER_SENT: 'offer_sent',
  WAITING: 'waiting_response',
  WON: 'won',
  LOST: 'lost',
  EXECUTION: 'in_execution',
  INVOICING: 'invoicing',
  COMPLETED: 'completed',
  INVALID_EMAIL: 'invalid_email',
  ATTENTION: 'need_attention',
}
const OFFER_STATUS = {
  DRAFT: 'draft',
  REVIEW: 'review',
  APPROVED: 'approved',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
}
const ESTIMATE_STATUS = {
  DRAFT: 'draft',
  REVIEW: 'review',
  APPROVED: 'approved',
  SENT: 'sent',
  ARCHIVED: 'archived',
}

const JOB_STAGES = [
  'nova_poptavka',
  'podklady',
  'zpracovani_nabidky',
  'nabidka_odeslana',
  'schvaleni_objednavka',
  'zaloha_priprava',
  'realizace',
  'predani_fakturace',
  'dokonceno',
]
const JOB_STAGE_LABELS = {
  nova_poptavka: 'Nová poptávka',
  podklady: 'Podklady od klienta',
  zpracovani_nabidky: 'Zpracování nabídky',
  nabidka_odeslana: 'Nabídka odeslána',
  schvaleni_objednavka: 'Schválení / objednávka',
  zaloha_priprava: 'Záloha / příprava',
  realizace: 'Realizace zakázky',
  predani_fakturace: 'Předání / fakturace',
  dokonceno: 'Dokončeno / uzavřeno',
}
const JOB_PRIORITIES = ['low', 'normal', 'high', 'urgent']
const RISK_LEVELS = ['none', 'approaching', 'overdue', 'invoice_overdue']
const WAITING_FOR_OPTIONS = ['client', 'internal_sales', 'accountant', 'realization_team', 'signature', 'payment', 'none']
const BLOCKING_FACTORS = ['missing_form', 'waiting_offer_response', 'waiting_signature', 'waiting_advance_payment', 'missing_contract', 'missing_material', 'missing_protocol', 'overdue_invoice', 'none']
const REALIZATION_STATUSES = ['priprava', 'realizace', 'kontrola', 'dokoncovani']

const hasPg = Boolean(DB_URL)
if (IS_PROD && !hasPg) {
  throw new Error('CRM_DATABASE_URL (or DATABASE_URL) is required in production.')
}
const pool = hasPg
  ? new Pool({
      connectionString: DB_URL,
      max: Number(process.env.PG_POOL_MAX || 20),
      idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_MS || 30000),
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000),
    })
  : null
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })
const execFileAsync = promisify(execFile)

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(GENERATED_OFFERS_DIR)) fs.mkdirSync(GENERATED_OFFERS_DIR, { recursive: true })
  if (!fs.existsSync(GENERATED_ESTIMATES_DIR)) fs.mkdirSync(GENERATED_ESTIMATES_DIR, { recursive: true })
}
function fileStorePath(name) {
  ensureDataDir()
  return path.join(DATA_DIR, `${name}.json`)
}
function readArrayFile(name) {
  const p = fileStorePath(name)
  try {
    if (!fs.existsSync(p)) fs.writeFileSync(p, '[]', 'utf8')
    const raw = fs.readFileSync(p, 'utf8')
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
function writeArrayFile(name, rows) {
  const p = fileStorePath(name)
  const tmp = `${p}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2), 'utf8')
  fs.renameSync(tmp, p)
}

function nowIso() {
  return new Date().toISOString()
}
function safeJson(v) {
  try {
    return JSON.parse(JSON.stringify(v ?? null))
  } catch {
    return null
  }
}
function normPhone(input) {
  const raw = String(input || '').trim()
  if (!raw) return ''
  const leadPlus = raw.startsWith('+')
  const digits = raw.replace(/[^\d]/g, '')
  return `${leadPlus ? '+' : ''}${digits}`
}
function validCzPhone(phone) {
  return /^\+420\d{9}$/.test(phone)
}
function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}
function requireFields(input, fields) {
  const missing = []
  for (const key of fields) {
    if (!String(input?.[key] || '').trim()) missing.push(key)
  }
  return missing
}

function safeJsonParseObject(text) {
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

async function dbQuery(sql, params = []) {
  if (!pool) throw new Error('db_not_configured')
  return pool.query(sql, params)
}

async function ensureMigrations() {
  if (!pool) return
  const dir = path.join(__dirname, 'db', 'migrations')
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS crm_schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()
    : []
  for (const id of files) {
    const got = await dbQuery('SELECT 1 FROM crm_schema_migrations WHERE id = $1', [id])
    if (got.rowCount > 0) continue
    const sql = fs.readFileSync(path.join(dir, id), 'utf8')
    await dbQuery('BEGIN')
    try {
      await dbQuery(sql)
      await dbQuery('INSERT INTO crm_schema_migrations (id) VALUES ($1)', [id])
      await dbQuery('COMMIT')
    } catch (e) {
      await dbQuery('ROLLBACK')
      throw e
    }
  }
}

async function seedDefaultAdmin() {
  const email = String(process.env.CRM_ADMIN_EMAIL || 'admin@crm.local').trim().toLowerCase()
  const password = String(process.env.CRM_ADMIN_PASSWORD || '').trim()
  const role = 'admin'
  if (!email || !password) return
  if (pool) {
    const ex = await dbQuery('SELECT id FROM crm_users WHERE email = $1 LIMIT 1', [email])
    if (ex.rowCount > 0) return
    const passwordHash = await bcrypt.hash(password, 10)
    await dbQuery(
      'INSERT INTO crm_users (email, password_hash, role, created_at) VALUES ($1, $2, $3, now())',
      [email, passwordHash, role]
    )
    return
  }
  const users = readArrayFile('users')
  if (users.some((x) => String(x.email || '').toLowerCase() === email)) return
  users.push({ id: Date.now(), email, passwordHash: await bcrypt.hash(password, 10), role, createdAt: nowIso() })
  writeArrayFile('users', users)
}

function authMiddleware(req, res, next) {
  if (!REQUIRE_AUTH) return next()
  const header = String(req.headers.authorization || '')
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.auth = payload
    return next()
  } catch {
    return res.status(401).json({ ok: false, error: 'Invalid token' })
  }
}
function roleGuard(roles) {
  const allowed = new Set(roles)
  return (req, res, next) => {
    if (!REQUIRE_AUTH) return next()
    if (!req.auth || !allowed.has(req.auth.role)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' })
    }
    return next()
  }
}

function clientFormUrl() {
  return String(process.env.CLIENT_FORM_URL || 'https://demo.temoweb.eu/client-form.html').trim()
}
function buildClientMail(lead) {
  const baseUrl = clientFormUrl()
  const formUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}leadId=${encodeURIComponent(String(lead.id))}&leadEmail=${encodeURIComponent(String(lead.email || ''))}`
  return {
    subject: 'Добрий день! Формуляр для уточнення заявки',
    text: [
      `Добрий день, ${lead.name || 'клієнт'}!`,
      '',
      'Вас вітає компанія TemoWeb.',
      'Нижче надсилаємо формуляр для уточнення деталей:',
      formUrl,
      '',
      'Після заповнення, будь ласка, відправте відповідь на цей же email.',
      '',
      'З повагою,',
      'TemoWeb Team',
    ].join('\n'),
  }
}

async function sendResendEmail({ to, subject, text, attachments }) {
  const key = String(process.env.RESEND_API_KEY || '').trim()
  const from = String(process.env.RESEND_FROM || '').trim()
  if (!key || !from || !to) return { attempted: false, ok: false, reason: 'missing_resend_env' }
  try {
    const cleanAttachments = (Array.isArray(attachments) ? attachments : [])
      .map((x) => ({
        filename: String(x?.filename || '').trim(),
        content: String(x?.content || '').trim(),
      }))
      .filter((x) => x.filename && x.content)
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        attachments: cleanAttachments.length ? cleanAttachments : undefined,
      }),
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      return { attempted: true, ok: false, reason: `email_http_${resp.status}`, details: body.slice(0, 500) }
    }
    return { attempted: true, ok: true }
  } catch (e) {
    return { attempted: true, ok: false, reason: 'email_exception', details: String(e?.message || e) }
  }
}

async function sendWhatsAppLead(lead) {
  const token = String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim()
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  const apiVersion = String(process.env.WHATSAPP_API_VERSION || 'v22.0').trim()
  const target = String(process.env.WHATSAPP_TARGET_NUMBER || '+380960494917').trim()
  const extraTargetsRaw = String(process.env.WHATSAPP_EXTRA_TARGET_NUMBERS || '').trim()
  const templateName = String(process.env.WHATSAPP_TEMPLATE_NAME || 'new_lead_notification_v1').trim()
  const templateLang = String(process.env.WHATSAPP_TEMPLATE_LANG || 'en').trim()
  if (!token || !phoneNumberId || !target) return { attempted: false, ok: false, reason: 'missing_whatsapp_env' }

  const targetList = [target, ...extraTargetsRaw.split(',').map((x) => x.trim()).filter(Boolean)]
  const uniqueTargets = [...new Set(targetList.map((x) => x.replace(/[^\d]/g, '')).filter(Boolean))]
  const text = [
    'NEW LEAD (ENTERPRISE CRM)',
    `Name: ${lead.name || '—'}`,
    `Phone: ${lead.phone || '—'}`,
    `Email: ${lead.email || '—'}`,
    `Comment: ${lead.comment || '—'}`,
    `Created: ${lead.createdAt || nowIso()}`,
  ].join('\n')
  async function sendMessage(payload) {
    const url = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    const bodyText = await resp.text().catch(() => '')
    let parsed = null
    try {
      parsed = bodyText ? JSON.parse(bodyText) : null
    } catch {
      parsed = null
    }
    return { resp, bodyText, parsed }
  }
  try {
    const recipients = []
    for (const to of uniqueTargets) {
      let usedMode = 'template'
      let attempt = await sendMessage({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: String(lead.name || '—') },
                { type: 'text', text: String(lead.phone || '—') },
                { type: 'text', text: String(lead.email || '—') },
                { type: 'text', text: String(lead.comment || '—') },
              ],
            },
          ],
        },
      })
      if (!attempt.resp.ok) {
        usedMode = 'text_fallback'
        attempt = await sendMessage({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text.slice(0, 4000) },
        })
      }
      recipients.push({
        to,
        ok: attempt.resp.ok,
        sendMode: usedMode,
        statusCode: attempt.resp.status,
        messageId: attempt.parsed?.messages?.[0]?.id || null,
      })
    }
    return { attempted: true, ok: recipients.every((x) => x.ok), recipients }
  } catch (e) {
    return { attempted: true, ok: false, reason: 'wa_exception', details: String(e?.message || e) }
  }
}

function classifyClientEmailResult(result) {
  if (!result || !result.attempted) return { state: 'not_attempted', status: STATUS.NEW, errorText: null }
  if (result.ok) return { state: 'sent', status: STATUS.FORM_SENT, errorText: null }
  const details = String(result.details || '').toLowerCase()
  const reason = String(result.reason || '')
  const invalid = reason.includes('422') || reason.includes('400') || details.includes('invalid') || details.includes('recipient')
  if (invalid) return { state: 'invalid_email', status: STATUS.INVALID_EMAIL, errorText: 'Невірний email' }
  return { state: 'failed', status: STATUS.FORM_SENT, errorText: 'Помилка відправки email' }
}

async function insertAudit(actor, action, entityType, entityId, data) {
  if (pool) {
    await dbQuery(
      'INSERT INTO crm_audit_log (actor_email, action, entity_type, entity_id, data, created_at) VALUES ($1,$2,$3,$4,$5,now())',
      [actor || null, action, entityType, String(entityId || ''), safeJson(data)]
    )
    return
  }
}

async function createLead(input) {
  const name = String(input.name || '').trim()
  const lastName = String(input.lastName || '').trim()
  const phone = normPhone(input.phone || '')
  const email = String(input.email || '').trim().toLowerCase()
  const source = String(input.source || 'web_form').trim() || 'web_form'
  const manager = String(input.manager || 'Не призначено').trim() || 'Не призначено'
  const serviceType = String(input.serviceType || 'Не вказано').trim() || 'Не вказано'
  const comment = String(input.comment || '').trim()
  const lang = String(input.lang || 'ua').trim()
  if (!name || !email) throw new Error('required')
  if (!validEmail(email)) throw new Error('invalid_email')
  if (phone && !validCzPhone(phone)) throw new Error('invalid_phone')

  if (pool) {
    const ins = await dbQuery(
      `INSERT INTO crm_leads
        (name,last_name,full_name,email,proposal_lead_email,phone,comment,lang,status,source,manager,service_type,client_number,wave,created_at,updated_at)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,1,now(),now())
       RETURNING *`,
      [
        name,
        lastName || null,
        `${name}${lastName ? ` ${lastName}` : ''}`.trim(),
        email,
        email,
        phone || null,
        comment || null,
        lang,
        STATUS.NEW,
        source,
        manager,
        serviceType,
        null,
      ]
    )
    return normalizeLead(ins.rows[0])
  }

  const leads = readArrayFile('leads')
  const id = Date.now()
  const lead = {
    id,
    name,
    lastName: lastName || null,
    fullName: `${name}${lastName ? ` ${lastName}` : ''}`.trim(),
    email,
    proposalLeadEmail: email,
    phone: phone || null,
    comment: comment || null,
    lang,
    status: STATUS.NEW,
    source,
    manager,
    serviceType,
    clientNumber: null,
    wave: 1,
    managerComment: '',
    brief: null,
    briefReceivedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  leads.unshift(lead)
  writeArrayFile('leads', leads)
  return lead
}

function normalizeLead(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    name: row.name,
    lastName: row.last_name,
    fullName: row.full_name,
    email: row.email,
    proposalLeadEmail: row.proposal_lead_email,
    phone: row.phone,
    comment: row.comment,
    lang: row.lang,
    status: row.status,
    source: row.source,
    manager: row.manager,
    serviceType: row.service_type,
    clientNumber: row.client_number || null,
    wave: Number(row.wave || 1),
    managerComment: row.manager_comment || '',
    brief: row.brief || null,
    briefReceivedAt: row.brief_received_at || null,
    proposalMailState: row.proposal_mail_state || null,
    proposalSentAt: row.proposal_sent_at || null,
    proposalError: row.proposal_error || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getLeads() {
  if (pool) {
    const q = await dbQuery('SELECT * FROM crm_leads ORDER BY created_at DESC LIMIT 5000')
    return q.rows.map(normalizeLead)
  }
  const rows = readArrayFile('leads')
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

async function getLeadById(id) {
  if (pool) {
    const q = await dbQuery('SELECT * FROM crm_leads WHERE id = $1', [id])
    return q.rowCount ? normalizeLead(q.rows[0]) : null
  }
  const rows = readArrayFile('leads')
  return rows.find((x) => Number(x.id) === Number(id)) || null
}

async function updateLead(id, patch) {
  if (pool) {
    const ex = await dbQuery('SELECT * FROM crm_leads WHERE id = $1', [id])
    if (!ex.rowCount) return null
    const row = ex.rows[0]
    const status = String(patch.status || row.status)
    const managerComment = patch.managerComment != null ? String(patch.managerComment || '').trim() : String(row.manager_comment || '')
    const manager = patch.manager != null ? String(patch.manager || '').trim() : String(row.manager || '')
    const source = patch.source != null ? String(patch.source || '').trim() : String(row.source || '')
    const serviceType = patch.serviceType != null ? String(patch.serviceType || '').trim() : String(row.service_type || '')
    const brief = patch.brief != null ? safeJson(patch.brief) : row.brief
    const wave = patch.wave != null ? Number(patch.wave) : Number(row.wave || 1)
    const proposalMailState = patch.proposalMailState != null ? patch.proposalMailState : row.proposal_mail_state
    const proposalSentAt = patch.proposalSentAt !== undefined ? patch.proposalSentAt : row.proposal_sent_at
    const proposalError = patch.proposalError !== undefined ? patch.proposalError : row.proposal_error
    const briefReceivedAt = patch.briefReceivedAt !== undefined ? patch.briefReceivedAt : row.brief_received_at
    const clientNumber = patch.clientNumber !== undefined ? (String(patch.clientNumber || '').trim() || null) : (row.client_number || null)
    const u = await dbQuery(
      `UPDATE crm_leads
       SET status=$1, manager_comment=$2, manager=$3, source=$4, service_type=$5, brief=$6, wave=$7,
           proposal_mail_state=$8, proposal_sent_at=$9, proposal_error=$10, brief_received_at=$11, client_number=$12, updated_at=now()
       WHERE id=$13
       RETURNING *`,
      [status, managerComment, manager, source, serviceType, brief, wave, proposalMailState, proposalSentAt, proposalError, briefReceivedAt, clientNumber, id]
    )
    return normalizeLead(u.rows[0])
  }
  const leads = readArrayFile('leads')
  const idx = leads.findIndex((x) => Number(x.id) === Number(id))
  if (idx < 0) return null
  leads[idx] = { ...leads[idx], ...patch, updatedAt: nowIso() }
  writeArrayFile('leads', leads)
  return leads[idx]
}

function mapAresCompany(x) {
  return {
    name: x?.obchodniJmeno || '',
    ico: x?.ico || '',
    dic: x?.dic || '',
    city: x?.sidlo?.nazevObce || '',
    zip: x?.sidlo?.psc || '',
    address: [x?.sidlo?.nazevUlice, x?.sidlo?.cisloDomovni].filter(Boolean).join(' '),
  }
}

async function lookupAresCompanies(query) {
  const raw = String(query || '').trim()
  const cleanIco = raw.replace(/[^\d]/g, '')
  if (!raw || (raw.length < 2 && cleanIco.length < 6)) return []
  const urls = [
    cleanIco.length >= 6 ? `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${encodeURIComponent(cleanIco)}` : '',
    cleanIco.length >= 6 ? `https://ares.gov.cz/ekonomicke-subjekty-v-be/api/v1/ekonomicke-subjekty/${encodeURIComponent(cleanIco)}` : '',
    cleanIco.length >= 6
      ? `https://ares.gov.cz/ekonomicke-subjekty-v-be/api/v1/ekonomicke-subjekty?ico=${encodeURIComponent(cleanIco)}`
      : '',
    `https://ares.gov.cz/ekonomicke-subjekty-v-be/api/v1/ekonomicke-subjekty?obchodniJmeno=${encodeURIComponent(raw)}`,
    `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty?obchodniJmeno=${encodeURIComponent(raw)}`,
  ].filter(Boolean)
  let data = null
  for (const url of urls) {
    const resp = await fetch(url)
    const bodyText = await resp.text().catch(() => '')
    if (!resp.ok) continue
    data = safeJsonParseObject(bodyText)
    if (data) break
  }
  if (!data) return []
  const rows = Array.isArray(data?.ekonomickeSubjekty)
    ? data.ekonomickeSubjekty.slice(0, 10)
    : data?.ico
    ? [data]
    : []
  return rows.map(mapAresCompany)
}

async function deleteLead(id) {
  if (pool) {
    const q = await dbQuery('DELETE FROM crm_leads WHERE id = $1 RETURNING *', [id])
    return q.rowCount ? normalizeLead(q.rows[0]) : null
  }
  const leads = readArrayFile('leads')
  const idx = leads.findIndex((x) => Number(x.id) === Number(id))
  if (idx < 0) return null
  const [removed] = leads.splice(idx, 1)
  writeArrayFile('leads', leads)
  return removed
}

async function findLeadForBrief({ leadId, leadEmail, leadPhone }) {
  const email = String(leadEmail || '').trim().toLowerCase()
  const phone = normPhone(leadPhone || '')
  if (pool) {
    if (Number.isFinite(Number(leadId)) && Number(leadId) > 0) {
      const byId = await dbQuery('SELECT * FROM crm_leads WHERE id = $1 LIMIT 1', [Number(leadId)])
      if (byId.rowCount) return normalizeLead(byId.rows[0])
    }
    if (email) {
      const byEmail = await dbQuery(
        'SELECT * FROM crm_leads WHERE lower(email) = $1 OR lower(proposal_lead_email) = $1 ORDER BY created_at DESC LIMIT 1',
        [email]
      )
      if (byEmail.rowCount) return normalizeLead(byEmail.rows[0])
    }
    if (phone) {
      const byPhone = await dbQuery('SELECT * FROM crm_leads WHERE phone = $1 ORDER BY created_at DESC LIMIT 1', [phone])
      if (byPhone.rowCount) return normalizeLead(byPhone.rows[0])
    }
    return null
  }
  const rows = readArrayFile('leads')
  let lead = null
  if (Number.isFinite(Number(leadId))) lead = rows.find((x) => Number(x.id) === Number(leadId)) || null
  if (!lead && email) lead = rows.find((x) => String(x.email || '').toLowerCase() === email || String(x.proposalLeadEmail || '').toLowerCase() === email) || null
  if (!lead && phone) lead = rows.find((x) => normPhone(x.phone || '') === phone) || null
  return lead
}

async function sendBriefToOwner(brief) {
  const to = String(process.env.BRIEF_FORM_TO || '').trim()
  if (!to) return { attempted: false, ok: false, reason: 'missing_brief_to' }
  return sendResendEmail({
    to,
    subject: `Client brief submitted: ${brief.company || 'Нова форма'}`,
    text: [
      `Company: ${brief.company || '—'}`,
      `Goal: ${brief.goal || '—'}`,
      `Details: ${brief.details || '—'}`,
      `Submitted at: ${nowIso()}`,
    ].join('\n'),
  })
}

function extractFirstEmail(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  const bracket = value.match(/<([^>]+)>/)
  const source = bracket?.[1] || value
  const found = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return found ? found[0].toLowerCase() : ''
}

function escapeCsvCell(value) {
  const text = String(value == null ? '' : value)
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

function buildCsv(columns, rows) {
  const header = columns.join(',')
  const body = rows.map((row) => columns.map((key) => escapeCsvCell(row?.[key] ?? '')).join(','))
  return [header, ...body].join('\n')
}

async function createAndSendFakturoidInvoice(params) {
  const accountSlug = String(process.env.FAKTUROID_ACCOUNT_SLUG || '').trim()
  const apiToken = String(process.env.FAKTUROID_API_TOKEN || '').trim()
  const subjectId = params?.subjectId
  const amount = Number(params?.amount || 0)
  const due = String(params?.dueDate || '').trim()
  const email = String(params?.email || '').trim()
  if (!accountSlug || !apiToken) return { ok: false, error: 'Fakturoid is not configured' }
  if (!subjectId || !amount || !due || !email) return { ok: false, error: 'Missing invoice params' }
  try {
    const commonHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
      'User-Agent': String(process.env.FAKTUROID_USER_AGENT || 'TemoWebCRM (info@temoweb.eu)'),
    }
    const invResp = await fetch(`https://app.fakturoid.cz/api/v3/accounts/${encodeURIComponent(accountSlug)}/invoices.json`, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({
        subject_id: subjectId,
        due_on: due,
        lines: [{ name: String(params?.lineName || 'Service'), unit_price: amount, quantity: 1 }],
      }),
    })
    const invText = await invResp.text().catch(() => '')
    if (!invResp.ok) return { ok: false, error: 'Failed to create invoice', details: invText.slice(0, 500) }
    const inv = safeJsonParseObject(invText)
    if (!inv?.id) return { ok: false, error: 'Invalid invoice response' }
    const msgResp = await fetch(
      `https://app.fakturoid.cz/api/v3/accounts/${encodeURIComponent(accountSlug)}/invoices/${encodeURIComponent(String(inv.id))}/message.json`,
      {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({
          email,
          subject: String(params?.emailSubject || `Faktura ${inv.number || ''}`),
          message: String(params?.emailMessage || 'Dobrý den, zasíláme vám fakturu.'),
          deliver_now: true,
        }),
      }
    )
    if (!msgResp.ok) {
      const body = await msgResp.text().catch(() => '')
      return { ok: false, error: 'Invoice created, but email send failed', invoice: inv, details: body.slice(0, 500) }
    }
    return { ok: true, invoice: inv }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) }
  }
}

async function insertCommercialCase(payload) {
  if (pool) {
    const q = await dbQuery(
      `INSERT INTO crm_commercial_cases
      (lead_id, client_type, company_name, company_ico, person_name, person_email, person_phone, order_type, internal_order_id,
       offer_amount, notes, stage, status, start_date, end_date, company_manager, client_contact_name, client_contact_phone, client_contact_email, created_at, updated_at)
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,now(),now())
      RETURNING *`,
      [
        payload.leadId || null,
        payload.clientType || 'person',
        payload.companyName || null,
        payload.companyIco || null,
        payload.personName || null,
        payload.personEmail || null,
        payload.personPhone || null,
        payload.orderType || 'combined',
        payload.internalOrderId || null,
        payload.offerAmount != null ? Number(payload.offerAmount) : null,
        payload.notes || null,
        payload.stage || 'preparation',
        payload.status || STATUS.CONTACTED,
        payload.startDate || null,
        payload.endDate || null,
        payload.companyManager || null,
        payload.clientContactName || null,
        payload.clientContactPhone || null,
        payload.clientContactEmail || null,
      ]
    )
    return q.rows[0]
  }
  const rows = readArrayFile('commercial_cases')
  const row = { id: Date.now(), ...payload, created_at: nowIso(), updated_at: nowIso() }
  rows.unshift(row)
  writeArrayFile('commercial_cases', rows)
  return row
}

async function listCommercialCases(filters = {}) {
  const where = []
  const params = []
  function addCond(sql, value) {
    params.push(value)
    where.push(sql.replace('?', `$${params.length}`))
  }
  if (filters.orderType) addCond('order_type = ?', String(filters.orderType))
  if (filters.status) addCond('status = ?', String(filters.status))
  if (filters.internalOrderId) addCond('internal_order_id ILIKE ?', `%${String(filters.internalOrderId)}%`)
  if (filters.manager) addCond('company_manager ILIKE ?', `%${String(filters.manager)}%`)
  if (filters.periodFrom) addCond('created_at >= ?', filters.periodFrom)
  if (filters.periodTo) addCond('created_at <= ?', filters.periodTo)
  if (pool) {
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const q = await dbQuery(`SELECT * FROM crm_commercial_cases ${whereSql} ORDER BY created_at DESC LIMIT 5000`, params)
    return q.rows
  }
  let rows = readArrayFile('commercial_cases')
  if (filters.orderType) rows = rows.filter((x) => String(x.orderType || x.order_type || '') === String(filters.orderType))
  if (filters.status) rows = rows.filter((x) => String(x.status || '') === String(filters.status))
  if (filters.internalOrderId) rows = rows.filter((x) => String(x.internalOrderId || x.internal_order_id || '').toLowerCase().includes(String(filters.internalOrderId).toLowerCase()))
  if (filters.manager) rows = rows.filter((x) => String(x.companyManager || x.company_manager || '').toLowerCase().includes(String(filters.manager).toLowerCase()))
  if (filters.periodFrom) rows = rows.filter((x) => Date.parse(String(x.created_at || x.createdAt || '')) >= Date.parse(String(filters.periodFrom)))
  if (filters.periodTo) rows = rows.filter((x) => Date.parse(String(x.created_at || x.createdAt || '')) <= Date.parse(String(filters.periodTo)))
  return rows
}

async function getCommercialCaseById(id) {
  if (pool) {
    const q = await dbQuery('SELECT * FROM crm_commercial_cases WHERE id = $1 LIMIT 1', [id])
    return q.rowCount ? q.rows[0] : null
  }
  const rows = readArrayFile('commercial_cases')
  return rows.find((x) => Number(x.id) === Number(id)) || null
}

async function updateCommercialCase(id, patch) {
  if (pool) {
    const ex = await dbQuery('SELECT * FROM crm_commercial_cases WHERE id = $1', [id])
    if (!ex.rowCount) return null
    const cur = ex.rows[0]
    const merged = {
      stage: patch.stage ?? cur.stage,
      status: patch.status ?? cur.status,
      notes: patch.notes ?? cur.notes,
      offer_amount: patch.offerAmount ?? cur.offer_amount,
      start_date: patch.startDate ?? cur.start_date,
      end_date: patch.endDate ?? cur.end_date,
      company_manager: patch.companyManager ?? cur.company_manager,
      client_contact_name: patch.clientContactName ?? cur.client_contact_name,
      client_contact_phone: patch.clientContactPhone ?? cur.client_contact_phone,
      client_contact_email: patch.clientContactEmail ?? cur.client_contact_email,
    }
    const q = await dbQuery(
      `UPDATE crm_commercial_cases
       SET stage=$1,status=$2,notes=$3,offer_amount=$4,start_date=$5,end_date=$6,
           company_manager=$7,client_contact_name=$8,client_contact_phone=$9,client_contact_email=$10,updated_at=now()
       WHERE id=$11 RETURNING *`,
      [
        merged.stage,
        merged.status,
        merged.notes,
        merged.offer_amount,
        merged.start_date,
        merged.end_date,
        merged.company_manager,
        merged.client_contact_name,
        merged.client_contact_phone,
        merged.client_contact_email,
        id,
      ]
    )
    return q.rowCount ? q.rows[0] : null
  }
  const rows = readArrayFile('commercial_cases')
  const idx = rows.findIndex((x) => Number(x.id) === Number(id))
  if (idx < 0) return null
  rows[idx] = { ...rows[idx], ...patch, updated_at: nowIso() }
  writeArrayFile('commercial_cases', rows)
  return rows[idx]
}

function toNum(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}
function roundMoney(value) {
  return Math.round(toNum(value, 0) * 100) / 100
}
function buildOfferNo(leadId) {
  const year = new Date().getFullYear()
  const tail = String(Date.now()).slice(-6)
  return `OF-${year}-${String(leadId || 'X')}-${tail}`
}
function normalizeOfferLine(raw = {}) {
  const section = ['labor', 'material', 'other'].includes(String(raw.section || '').toLowerCase())
    ? String(raw.section || '').toLowerCase()
    : 'other'
  const qty = roundMoney(toNum(raw.qty, 0))
  const unitPrice = roundMoney(toNum(raw.unitPrice, 0))
  const total = roundMoney(raw.total != null ? toNum(raw.total, qty * unitPrice) : qty * unitPrice)
  return {
    section,
    description: String(raw.description || '').trim(),
    unit: String(raw.unit || 'kpl').trim(),
    qty,
    unitPrice,
    total,
    source: String(raw.source || '').trim() || null,
    sourceRef: String(raw.sourceRef || '').trim() || null,
    confidence: roundMoney(toNum(raw.confidence, 0)),
  }
}
function normalizeOfferLines(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((x) => normalizeOfferLine(x))
    .filter((x) => x.description && x.qty >= 0 && x.unitPrice >= 0)
}
function computeOfferTotals(lines, vatRate) {
  const totals = { labor: 0, material: 0, other: 0 }
  for (const line of lines) {
    if (line.section === 'labor') totals.labor += toNum(line.total, 0)
    else if (line.section === 'material') totals.material += toNum(line.total, 0)
    else totals.other += toNum(line.total, 0)
  }
  totals.labor = roundMoney(totals.labor)
  totals.material = roundMoney(totals.material)
  totals.other = roundMoney(totals.other)
  const subtotalNoVat = roundMoney(totals.labor + totals.material + totals.other)
  const vatAmount = roundMoney(subtotalNoVat * (toNum(vatRate, 21) / 100))
  const totalWithVat = roundMoney(subtotalNoVat + vatAmount)
  return {
    subtotalLabor: totals.labor,
    subtotalMaterial: totals.material,
    subtotalOther: totals.other,
    subtotalNoVat,
    vatAmount,
    totalWithVat,
  }
}
function extractLeadBriefText(lead) {
  const brief = lead?.brief && typeof lead.brief === 'object' ? lead.brief : {}
  const chunks = [
    brief.summaryText,
    brief.note ? `Примітка: ${brief.note}` : '',
    brief.workType ? `Роботи: ${brief.workType}` : '',
    brief.objectType ? `Тип обʼєкта: ${brief.objectType}` : '',
    brief.realizationAddress ? `Адреса: ${brief.realizationAddress}` : '',
    brief.area ? `Площа/обсяг: ${brief.area}` : '',
    brief.timeline ? `Термін: ${brief.timeline}` : '',
    lead?.comment ? `Коментар клієнта: ${lead.comment}` : '',
  ]
  return chunks.filter(Boolean).join('\n').trim()
}
function mapTemplateFromLead(lead) {
  const s = String(lead?.serviceType || '').toLowerCase()
  const b = String(extractLeadBriefText(lead) || '').toLowerCase()
  if (s.includes('ajax') || b.includes('ajax') || b.includes('zabezpe')) return 'ajax_security'
  if (s.includes('cctv') || b.includes('kamera')) return 'cctv'
  if (b.includes('rodinn') || b.includes('rd') || b.includes('dům')) return 'electro_house'
  if (b.includes('byt') || b.includes('apart')) return 'electro_flat'
  return 'custom'
}
function fallbackOfferDraftFromLead(lead) {
  const briefText = extractLeadBriefText(lead)
  const service = String(lead?.serviceType || '').trim() || 'Електромонтажні роботи'
  const lines = normalizeOfferLines([
    {
      section: 'labor',
      description: `Підготовка комерційної пропозиції (${service})`,
      unit: 'kpl',
      qty: 1,
      unitPrice: 0,
      source: 'manual',
      sourceRef: 'Потрібно заповнити прайс',
      confidence: 0.4,
    },
    {
      section: 'material',
      description: 'Матеріали за специфікацією (уточнення після замірів)',
      unit: 'kpl',
      qty: 1,
      unitPrice: 0,
      source: 'manual',
      sourceRef: 'Потрібно заповнити прайс',
      confidence: 0.3,
    },
    {
      section: 'other',
      description: 'Доставка, логістика та накладні витрати',
      unit: 'kpl',
      qty: 1,
      unitPrice: 0,
      source: 'internal_rate',
      sourceRef: 'Потрібно заповнити прайс',
      confidence: 0.35,
    },
  ])
  return {
    templateKey: mapTemplateFromLead(lead),
    scopeSummary: briefText || `Чернетка КП для клієнта ${lead?.name || ''}`.trim(),
    assumptions: [
      'Чернетка створена автоматично. Перевірте обсяги робіт та ціни перед відправкою.',
      'Ціни по матеріалах та роботах поки не підтягнуті з прайс-листа.',
    ],
    warnings: ['Потрібне ручне підтвердження цін менеджером'],
    pricingMode: 'shop_markup',
    sourceNote: 'Поки без підключеного прайс-движка: заповнення вручну',
    lines,
  }
}
async function openAiBuildCommercialOfferDraft({ lead }) {
  if (!OPENAI_API_KEY) return fallbackOfferDraftFromLead(lead)
  const briefText = extractLeadBriefText(lead)
  const system = [
    'You build structured commercial offers for electrical/construction jobs.',
    'Return only JSON matching schema.',
    'Use CZK currency, VAT 21.',
    'If exact prices are unknown, keep unitPrice = 0 and add warnings.',
    'Split lines by section: labor, material, other.',
  ].join(' ')
  const user = [
    `Lead: ${JSON.stringify({ name: lead?.name || '', email: lead?.email || '', phone: lead?.phone || '', serviceType: lead?.serviceType || '' })}`,
    'Client brief:',
    briefText || 'No brief text',
    'Pricing policy:',
    '1) Usually prices come from shops (for example SMS Electro) plus markup',
    '2) Sometimes URS database is used',
    '3) Own internal rates exist for hourly labor and transport',
  ].join('\n')
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      templateKey: { type: 'string' },
      scopeSummary: { type: 'string' },
      assumptions: { type: 'array', items: { type: 'string' } },
      warnings: { type: 'array', items: { type: 'string' } },
      pricingMode: { type: 'string', enum: ['shop_markup', 'urs', 'mixed'] },
      sourceNote: { type: 'string' },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            section: { type: 'string', enum: ['labor', 'material', 'other'] },
            description: { type: 'string' },
            unit: { type: 'string' },
            qty: { type: 'number' },
            unitPrice: { type: 'number' },
            total: { type: 'number' },
            source: { type: 'string' },
            sourceRef: { type: 'string' },
            confidence: { type: 'number' },
          },
          required: ['section', 'description', 'unit', 'qty', 'unitPrice', 'total', 'source', 'sourceRef', 'confidence'],
        },
      },
    },
    required: ['templateKey', 'scopeSummary', 'assumptions', 'warnings', 'pricingMode', 'sourceNote', 'lines'],
  }
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'commercial_offer_draft', schema, strict: true },
      },
    }),
  })
  const bodyText = await resp.text().catch(() => '')
  if (!resp.ok) throw new Error(`openai_offer_http_${resp.status}:${bodyText.slice(0, 260)}`)
  const parsed = safeJsonParseObject(bodyText)
  const outputText = String(parsed?.choices?.[0]?.message?.content || '')
  const obj = safeJsonParseObject(outputText)
  if (!obj) throw new Error('openai_offer_invalid_json')
  return obj
}
function normalizeCommercialOffer(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    leadId: row.lead_id != null ? Number(row.lead_id) : null,
    caseId: row.case_id != null ? Number(row.case_id) : null,
    offerNo: row.offer_no || row.offerNo || null,
    version: Number(row.version || 1),
    status: row.status || OFFER_STATUS.DRAFT,
    templateKey: row.template_key || row.templateKey || 'custom',
    currency: row.currency || 'CZK',
    vatRate: toNum(row.vat_rate, 21),
    pricingMode: row.pricing_mode || row.pricingMode || 'shop_markup',
    sourceNote: row.source_note || row.sourceNote || null,
    scopeSummary: row.scope_summary || row.scopeSummary || '',
    assumptions: Array.isArray(row.assumptions) ? row.assumptions : [],
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    lines: Array.isArray(row.lines) ? row.lines : [],
    files: Array.isArray(row.files) ? row.files : [],
    subtotalLabor: roundMoney(row.subtotal_labor),
    subtotalMaterial: roundMoney(row.subtotal_material),
    subtotalOther: roundMoney(row.subtotal_other),
    subtotalNoVat: roundMoney(row.subtotal_no_vat),
    vatAmount: roundMoney(row.vat_amount),
    totalWithVat: roundMoney(row.total_with_vat),
    generatedBy: row.generated_by || row.generatedBy || 'ai',
    sentAt: row.sent_at || row.sentAt || null,
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
  }
}
function publicOffer(offer) {
  if (!offer) return null
  return {
    ...offer,
    files: (Array.isArray(offer.files) ? offer.files : []).map((x) => ({
      kind: x.kind || null,
      fileName: x.fileName || null,
      url: x.url || null,
      mime: x.mime || null,
      size: x.size != null ? Number(x.size) : null,
      createdAt: x.createdAt || null,
    })),
  }
}
async function insertCommercialOffer(payload) {
  const vatRate = toNum(payload.vatRate, 21)
  const lines = normalizeOfferLines(payload.lines)
  const totals = computeOfferTotals(lines, vatRate)
  if (pool) {
    const q = await dbQuery(
      `INSERT INTO crm_commercial_offers
      (lead_id, case_id, offer_no, version, status, template_key, currency, vat_rate, pricing_mode, source_note, scope_summary,
       assumptions, warnings, lines, files, subtotal_labor, subtotal_material, subtotal_other, subtotal_no_vat, vat_amount, total_with_vat,
       generated_by, sent_at, created_at, updated_at)
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,now(),now())
      RETURNING *`,
      [
        payload.leadId || null,
        payload.caseId || null,
        payload.offerNo || buildOfferNo(payload.leadId),
        Number(payload.version || 1),
        payload.status || OFFER_STATUS.DRAFT,
        payload.templateKey || 'custom',
        payload.currency || 'CZK',
        vatRate,
        payload.pricingMode || 'shop_markup',
        payload.sourceNote || null,
        payload.scopeSummary || null,
        JSON.stringify(safeJson(payload.assumptions || []) || []),
        JSON.stringify(safeJson(payload.warnings || []) || []),
        JSON.stringify(safeJson(lines) || []),
        JSON.stringify(safeJson(payload.files || []) || []),
        totals.subtotalLabor,
        totals.subtotalMaterial,
        totals.subtotalOther,
        totals.subtotalNoVat,
        totals.vatAmount,
        totals.totalWithVat,
        payload.generatedBy || 'ai',
        payload.sentAt || null,
      ]
    )
    return normalizeCommercialOffer(q.rows[0])
  }
  const rows = readArrayFile('commercial_offers')
  const row = normalizeCommercialOffer({
    id: Date.now(),
    lead_id: payload.leadId || null,
    case_id: payload.caseId || null,
    offer_no: payload.offerNo || buildOfferNo(payload.leadId),
    version: Number(payload.version || 1),
    status: payload.status || OFFER_STATUS.DRAFT,
    template_key: payload.templateKey || 'custom',
    currency: payload.currency || 'CZK',
    vat_rate: vatRate,
    pricing_mode: payload.pricingMode || 'shop_markup',
    source_note: payload.sourceNote || null,
    scope_summary: payload.scopeSummary || null,
    assumptions: payload.assumptions || [],
    warnings: payload.warnings || [],
    lines,
    files: payload.files || [],
    subtotal_labor: totals.subtotalLabor,
    subtotal_material: totals.subtotalMaterial,
    subtotal_other: totals.subtotalOther,
    subtotal_no_vat: totals.subtotalNoVat,
    vat_amount: totals.vatAmount,
    total_with_vat: totals.totalWithVat,
    generated_by: payload.generatedBy || 'ai',
    sent_at: payload.sentAt || null,
    created_at: nowIso(),
    updated_at: nowIso(),
  })
  rows.unshift(row)
  writeArrayFile('commercial_offers', rows)
  return row
}
async function listCommercialOffers(filters = {}) {
  if (pool) {
    const where = []
    const params = []
    function add(sql, value) {
      params.push(value)
      where.push(sql.replace('?', `$${params.length}`))
    }
    if (filters.leadId) add('lead_id = ?', Number(filters.leadId))
    if (filters.caseId) add('case_id = ?', Number(filters.caseId))
    if (filters.status) add('status = ?', String(filters.status))
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const q = await dbQuery(`SELECT * FROM crm_commercial_offers ${whereSql} ORDER BY created_at DESC LIMIT 300`, params)
    return q.rows.map(normalizeCommercialOffer)
  }
  let rows = readArrayFile('commercial_offers')
  if (filters.leadId) rows = rows.filter((x) => Number(x.leadId || x.lead_id) === Number(filters.leadId))
  if (filters.caseId) rows = rows.filter((x) => Number(x.caseId || x.case_id) === Number(filters.caseId))
  if (filters.status) rows = rows.filter((x) => String(x.status || '') === String(filters.status))
  return rows.map(normalizeCommercialOffer)
}
async function getCommercialOfferById(id) {
  if (pool) {
    const q = await dbQuery('SELECT * FROM crm_commercial_offers WHERE id = $1 LIMIT 1', [id])
    return q.rowCount ? normalizeCommercialOffer(q.rows[0]) : null
  }
  const rows = readArrayFile('commercial_offers')
  const row = rows.find((x) => Number(x.id) === Number(id)) || null
  return normalizeCommercialOffer(row)
}
async function updateCommercialOffer(id, patch = {}) {
  if (pool) {
    const ex = await dbQuery('SELECT * FROM crm_commercial_offers WHERE id = $1 LIMIT 1', [id])
    if (!ex.rowCount) return null
    const cur = normalizeCommercialOffer(ex.rows[0])
    const vatRate = patch.vatRate != null ? toNum(patch.vatRate, cur.vatRate) : cur.vatRate
    const lines = patch.lines != null ? normalizeOfferLines(patch.lines) : normalizeOfferLines(cur.lines)
    const totals = computeOfferTotals(lines, vatRate)
    const merged = {
      status: patch.status || cur.status,
      templateKey: patch.templateKey || cur.templateKey,
      currency: patch.currency || cur.currency,
      pricingMode: patch.pricingMode || cur.pricingMode,
      sourceNote: patch.sourceNote !== undefined ? patch.sourceNote : cur.sourceNote,
      scopeSummary: patch.scopeSummary !== undefined ? patch.scopeSummary : cur.scopeSummary,
      assumptions: patch.assumptions != null ? patch.assumptions : cur.assumptions,
      warnings: patch.warnings != null ? patch.warnings : cur.warnings,
      files: patch.files != null ? patch.files : cur.files,
      generatedBy: patch.generatedBy || cur.generatedBy,
      sentAt: patch.sentAt !== undefined ? patch.sentAt : cur.sentAt,
    }
    const q = await dbQuery(
      `UPDATE crm_commercial_offers
       SET status=$1, template_key=$2, currency=$3, vat_rate=$4, pricing_mode=$5, source_note=$6, scope_summary=$7,
           assumptions=$8, warnings=$9, lines=$10, files=$11, subtotal_labor=$12, subtotal_material=$13, subtotal_other=$14,
           subtotal_no_vat=$15, vat_amount=$16, total_with_vat=$17, generated_by=$18, sent_at=$19, updated_at=now()
       WHERE id=$20
       RETURNING *`,
      [
        merged.status,
        merged.templateKey,
        merged.currency,
        vatRate,
        merged.pricingMode,
        merged.sourceNote || null,
        merged.scopeSummary || null,
        JSON.stringify(safeJson(merged.assumptions || []) || []),
        JSON.stringify(safeJson(merged.warnings || []) || []),
        JSON.stringify(safeJson(lines) || []),
        JSON.stringify(safeJson(merged.files || []) || []),
        totals.subtotalLabor,
        totals.subtotalMaterial,
        totals.subtotalOther,
        totals.subtotalNoVat,
        totals.vatAmount,
        totals.totalWithVat,
        merged.generatedBy || 'ai',
        merged.sentAt || null,
        id,
      ]
    )
    return q.rowCount ? normalizeCommercialOffer(q.rows[0]) : null
  }
  const rows = readArrayFile('commercial_offers')
  const idx = rows.findIndex((x) => Number(x.id) === Number(id))
  if (idx < 0) return null
  const current = normalizeCommercialOffer(rows[idx])
  const vatRate = patch.vatRate != null ? toNum(patch.vatRate, current.vatRate) : current.vatRate
  const lines = patch.lines != null ? normalizeOfferLines(patch.lines) : normalizeOfferLines(current.lines)
  const totals = computeOfferTotals(lines, vatRate)
  const merged = {
    ...current,
    ...patch,
    vatRate,
    lines,
    subtotalLabor: totals.subtotalLabor,
    subtotalMaterial: totals.subtotalMaterial,
    subtotalOther: totals.subtotalOther,
    subtotalNoVat: totals.subtotalNoVat,
    vatAmount: totals.vatAmount,
    totalWithVat: totals.totalWithVat,
    updatedAt: nowIso(),
  }
  rows[idx] = merged
  writeArrayFile('commercial_offers', rows)
  return normalizeCommercialOffer(merged)
}
async function createOfferDraftFromLead(lead, actorEmail = null) {
  if (!lead) throw new Error('lead_not_found')
  const aiDraft = await openAiBuildCommercialOfferDraft({ lead }).catch(() => fallbackOfferDraftFromLead(lead))
  const created = await insertCommercialOffer({
    leadId: lead.id,
    status: OFFER_STATUS.DRAFT,
    templateKey: aiDraft.templateKey || mapTemplateFromLead(lead),
    currency: 'CZK',
    vatRate: 21,
    pricingMode: aiDraft.pricingMode || 'shop_markup',
    sourceNote: aiDraft.sourceNote || 'Чернетка згенерована AI',
    scopeSummary: aiDraft.scopeSummary || extractLeadBriefText(lead),
    assumptions: Array.isArray(aiDraft.assumptions) ? aiDraft.assumptions : [],
    warnings: Array.isArray(aiDraft.warnings) ? aiDraft.warnings : [],
    lines: Array.isArray(aiDraft.lines) ? aiDraft.lines : [],
    generatedBy: OPENAI_API_KEY ? 'ai' : 'fallback',
  })
  await insertAudit(actorEmail, 'offer_created_from_lead', 'offer', created.id, { leadId: lead.id, offerNo: created.offerNo })
  return created
}

function getOfferTemplateCandidates(templateKey) {
  const key = String(templateKey || '').toLowerCase()
  if (key === 'ajax_security') return ['ajax', 'zabezpec', '26-02']
  if (key === 'cctv') return ['cctv', 'kamerov', '26-05']
  if (key === 'electro_house') return ['_rd', 'rodinn', '26-03']
  if (key === 'electro_flat') return ['byt', '26-04', '26-06']
  return ['26-01', 'elektro']
}
function resolveOfferTemplatePath(templateKey) {
  if (!fs.existsSync(OFFER_TEMPLATES_DIR)) return null
  const files = fs.readdirSync(OFFER_TEMPLATES_DIR).filter((x) => x.toLowerCase().endsWith('.xlsx'))
  if (!files.length) return null
  const candidates = getOfferTemplateCandidates(templateKey)
  const found = files.find((name) => candidates.some((needle) => name.toLowerCase().includes(needle)))
  const selected = found || files[0]
  return path.join(OFFER_TEMPLATES_DIR, selected)
}
function formatCzDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${d}.${m}.${y}`
}
function getCellText(ws, row, col) {
  const v = ws.getCell(row, col).value
  if (v == null) return ''
  if (typeof v === 'object' && v.richText) return String(v.richText.map((x) => x.text || '').join('')).trim()
  return String(v).trim()
}
function findSheetRow(ws, predicate, from = 1, to = Math.min(ws.rowCount || 2000, 2000)) {
  for (let r = from; r <= to; r += 1) {
    const rowValues = [2, 3, 4, 5, 6, 7].map((c) => getCellText(ws, r, c).toLowerCase())
    if (predicate(rowValues)) return r
  }
  return -1
}
function findSectionBlock(ws, sectionType) {
  const sectionMatchers = {
    labor: (txt) => txt.startsWith('práce'),
    material: (txt) => txt.startsWith('materiál'),
    other: (txt) => txt.startsWith('ostatní práce'),
  }
  const sectionRow = findSheetRow(ws, (cells) => cells.some((x) => sectionMatchers[sectionType](x)))
  if (sectionRow < 0) return null
  let endRow = -1
  for (let r = sectionRow + 1; r <= Math.min(ws.rowCount || 2000, 2000); r += 1) {
    const text = [2, 3, 4, 5, 6, 7].map((c) => getCellText(ws, r, c).toLowerCase())
    if (text.some((x) => x === 'celkem')) {
      endRow = r - 1
      break
    }
  }
  if (endRow < sectionRow + 1) return null
  return { startRow: sectionRow + 1, endRow }
}
async function buildOfferXlsxFile({ offer, lead }) {
  ensureDataDir()
  const workbook = new ExcelJS.Workbook()
  const templatePath = resolveOfferTemplatePath(offer.templateKey)
  if (templatePath && fs.existsSync(templatePath)) {
    await workbook.xlsx.readFile(templatePath)
  } else {
    const ws = workbook.addWorksheet('Cenova nabidka')
    ws.getCell('C1').value = 'Cenová nabídka'
    ws.getCell('F1').value = `Datum vytvoření: ${formatCzDate(new Date())}`
    ws.getCell('F2').value = `Platí do: ${formatCzDate(new Date(Date.now() + 14 * 86400000))}`
    ws.getRow(4).values = [, 'Dodavatel:', '', 'Objednatel:']
    ws.getRow(13).values = [, 'Číslo položky', 'Popis položky', 'MJ', 'Množství', 'Jednotková cena bez DPH', 'Celková cena bez DPH']
    ws.getRow(14).values = [, '', 'Práce']
    ws.getRow(30).values = [, '', 'Celkem']
    ws.getRow(32).values = [, '', 'Materiál']
    ws.getRow(48).values = [, '', 'Celkem']
    ws.getRow(50).values = [, '', 'Ostatní práce']
    ws.getRow(58).values = [, '', 'Celkem']
    ws.getRow(60).values = [, '', 'CELKOVÁ CENA BEZ DPH']
    ws.getRow(61).values = [, '', 'DPH 21 %']
    ws.getRow(62).values = [, '', 'CELKOVÁ CENA VČETNĚ DPH']
  }
  const ws = workbook.worksheets[0]
  ws.getCell('C1').value = null
  ws.getCell('C2').value = null
  ws.getCell('C3').value = null
  ws.getCell('D1').value = null
  ws.getCell('D2').value = null
  ws.getCell('D3').value = null
  ws.getCell('E1').value = null
  ws.getCell('E2').value = null
  ws.getCell('E3').value = null
  ws.getCell('F3').value = `Nabídka: ${String(offer.offerNo || '').trim()}`
  ws.getCell('F3').font = { ...(ws.getCell('F3').font || {}), size: 9, name: 'Carlito' }
  ws.getCell('F3').alignment = { ...(ws.getCell('F3').alignment || {}), horizontal: 'left', vertical: 'middle' }
  ws.getCell('F4').value = lead?.clientNumber ? `Číslo klienta: ${String(lead.clientNumber).trim()}` : ''
  ws.getCell('F4').font = { ...(ws.getCell('F4').font || {}), bold: true, size: 10, name: 'Carlito' }
  ws.getCell('F4').alignment = { ...(ws.getCell('F4').alignment || {}), horizontal: 'left', vertical: 'middle' }
  ws.getCell('F1').value = `Datum vytvoření: ${formatCzDate(new Date())}`
  ws.getCell('F2').value = `Platí do: ${formatCzDate(new Date(Date.now() + 14 * 86400000))}`
  ws.getCell('F1').font = { ...(ws.getCell('F1').font || {}), size: 10, name: 'Carlito' }
  ws.getCell('F2').font = { ...(ws.getCell('F2').font || {}), size: 10, name: 'Carlito' }
  ws.getCell('F1').alignment = { ...(ws.getCell('F1').alignment || {}), horizontal: 'left', vertical: 'middle' }
  ws.getCell('F2').alignment = { ...(ws.getCell('F2').alignment || {}), horizontal: 'left', vertical: 'middle' }
  const objectName = lead?.brief?.objectType || lead?.brief?.realizationAddress || lead?.name || 'Objekt'
  ws.getCell('D11').value = objectName

  const linesBySection = {
    labor: (offer.lines || []).filter((x) => String(x.section) === 'labor'),
    material: (offer.lines || []).filter((x) => String(x.section) === 'material'),
    other: (offer.lines || []).filter((x) => String(x.section) === 'other'),
  }
  for (const section of ['labor', 'material', 'other']) {
    const block = findSectionBlock(ws, section)
    if (!block) continue
    const sourceRows = linesBySection[section]
    let itemNo = 1
    for (let r = block.startRow; r <= block.endRow; r += 1) {
      const row = sourceRows[r - block.startRow]
      if (!row) {
        ws.getCell(r, 2).value = null
        ws.getCell(r, 3).value = null
        ws.getCell(r, 4).value = null
        ws.getCell(r, 5).value = null
        ws.getCell(r, 6).value = null
        ws.getCell(r, 7).value = null
        continue
      }
      ws.getCell(r, 2).value = itemNo
      ws.getCell(r, 3).value = row.description
      ws.getCell(r, 4).value = row.unit
      ws.getCell(r, 5).value = toNum(row.qty, 0)
      ws.getCell(r, 6).value = toNum(row.unitPrice, 0)
      ws.getCell(r, 7).value = { formula: `E${r}*F${r}` }
      itemNo += 1
    }
  }
  const totals = computeOfferTotals(offer.lines || [], offer.vatRate || 21)
  const totalNoVatRow = findSheetRow(ws, (cells) => cells.some((x) => x.includes('celková cena bez dph')))
  const vatRow = findSheetRow(ws, (cells) => cells.some((x) => x.startsWith('dph')))
  const totalWithVatRow = findSheetRow(ws, (cells) => cells.some((x) => x.includes('včetně dph')))
  if (totalNoVatRow > 0) ws.getCell(totalNoVatRow, 7).value = totals.subtotalNoVat
  if (vatRow > 0) ws.getCell(vatRow, 7).value = totals.vatAmount
  if (totalWithVatRow > 0) ws.getCell(totalWithVatRow, 7).value = totals.totalWithVat

  const outBase = `${String(offer.offerNo || `offer-${offer.id || Date.now()}`).replace(/[^\w.-]+/g, '_')}`
  const xlsxPath = path.join(GENERATED_OFFERS_DIR, `${outBase}.xlsx`)
  await workbook.xlsx.writeFile(xlsxPath)
  return xlsxPath
}
async function convertXlsxToPdfIfPossible(xlsxPath) {
  const outDir = path.dirname(xlsxPath)
  const base = path.basename(xlsxPath, path.extname(xlsxPath))
  const pdfPath = path.join(outDir, `${base}.pdf`)
  try {
    await execFileAsync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', outDir, xlsxPath], { timeout: 60000 })
    if (fs.existsSync(pdfPath)) return { ok: true, pdfPath }
    return { ok: false, reason: 'pdf_not_created' }
  } catch (e) {
    return { ok: false, reason: 'soffice_failed', details: String(e?.message || e) }
  }
}
function fileToBase64(filePath) {
  const buf = fs.readFileSync(filePath)
  return buf.toString('base64')
}
function publicFileUrl(filePath) {
  const rel = path.relative(__dirname, filePath).replaceAll(path.sep, '/')
  return `${CRM_PUBLIC_BASE_URL}/${rel}`
}

async function buildEstimateXlsxFile({ estimate, lead, job, customer }) {
  ensureDataDir()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'TemoWeb CRM'
  workbook.lastModifiedBy = 'TemoWeb CRM'
  const ws = workbook.addWorksheet('Rozpocet')
  ws.views = [{ state: 'frozen', ySplit: 10, showGridLines: false }]
  ws.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.35, right: 0.35, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 },
  }
  ws.columns = [
    { key: 'a', width: 14 },
    { key: 'b', width: 14 },
    { key: 'c', width: 10 },
    { key: 'd', width: 38 },
    { key: 'e', width: 31 },
    { key: 'f', width: 9 },
    { key: 'g', width: 11 },
    { key: 'h', width: 14 },
    { key: 'i', width: 15 },
    { key: 'j', width: 14 },
    { key: 'k', width: 15 },
    { key: 'l', width: 16 },
  ]
  const title = estimate?.title || `Rozpočet ze dne ${formatCzDate(new Date())}`
  const estimateDate = estimate?.estimateDate || new Date().toISOString().slice(0, 10)
  const lines = Array.isArray(estimate?.lines) ? estimate.lines.map((line, idx) => normalizeEstimateLine(line, idx)) : []
  const grouped = groupedEstimateLinesForUniversalTemplate(lines)
  const vatRate = toNum(estimate?.vatRate, 21)
  const note = estimate?.note || ''
  const customerName = customer?.name || estimate?.clientNameSnapshot || lead?.fullName || lead?.name || '—'
  const projectName = estimate?.companyNameSnapshot || customer?.companyName || customerName
  const headerRows = 500
  for (let row = 1; row <= headerRows; row += 1) {
    for (let col = 1; col <= 12; col += 1) {
      const cell = ws.getCell(row, col)
      cell.font = { name: 'Calibri', size: 10 }
      cell.alignment = { vertical: 'middle', wrapText: true }
    }
  }

  ws.mergeCells('A1:L1')
  ws.getCell('A1').value = title
  ws.getCell('A1').font = { name: 'Calibri', size: 14, bold: true }
  ws.getRow(1).height = 22

  ws.mergeCells('A2:L2')
  ws.getCell('A2').value = `Název rozpočtu: ${title} ${projectName}`.trim()
  ws.getCell('A2').font = { name: 'Calibri', size: 10 }

  ws.mergeCells('A3:L3')
  ws.getCell('A3').value = `${formatCzDate(new Date(estimateDate))} · ${estimate?.estimateNo || ''} · ${job?.internalNumber || estimate?.jobNumberSnapshot || ''} · Verze ${estimate?.versionNo || 1}`
  ws.getCell('A3').font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF666666' } }

  ws.mergeCells('A4:L4')
  ws.getCell('A4').value = `Klient: ${customerName} · Adresa objektu: ${estimate?.customerAddressSnapshot || customer?.address || '—'} · Projektový manažer: ${estimate?.projectManagerSnapshot || job?.responsiblePerson || '—'} · Telefon: ${customer?.phone || lead?.phone || '—'} · Email: ${customer?.email || lead?.email || '—'}`
  ws.getCell('A4').font = { name: 'Calibri', size: 10 }

  const headerRow = 6
  const headerLabels = ['Kategorie', 'Kód položky', 'Číslo položky', 'Popis práce', 'Popis materiálu', 'MJ', 'Množství', 'Cena práce (MJ)', 'Cena práce (celkem)', 'Cena materiálu (MJ)', 'Cena materiálu (celkem)', 'Cena celkem']
  headerLabels.forEach((label, idx) => {
    const cell = ws.getCell(headerRow, idx + 1)
    cell.value = label
    cell.font = { name: 'Calibri', size: 10, bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9EEF5' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = thinBorder()
  })
  const subHeaderRow = 7
  ;['', '', '', '', '', '', '', '', '', '', '', ''].forEach((label, idx) => {
    const cell = ws.getCell(subHeaderRow, idx + 1)
    cell.value = label
    cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF666666' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = thinBorder()
  })

  let rowNo = 8
  const dataRows = []
  let itemNo = 1
  for (const [categoryKey, rows] of grouped) {
    ws.mergeCells(`A${rowNo}:L${rowNo}`)
    ws.getCell(`A${rowNo}`).value = estimateCategoryLabel(categoryKey)
    ws.getCell(`A${rowNo}`).font = { name: 'Calibri', size: 10, bold: true }
    ws.getCell(`A${rowNo}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: estimateCategoryColor(categoryKey) } }
    for (let col = 1; col <= 12; col += 1) ws.getCell(rowNo, col).border = thinBorder()
    rowNo += 1
    for (const line of rows) {
      dataRows.push(rowNo)
      ws.getCell(`A${rowNo}`).value = ''
      ws.getCell(`B${rowNo}`).value = line.sourceCatalogCode || line.lineCode || `${categoryKey === 'stavba' ? 'STV' : categoryKey === 'ostatni' ? 'OST' : 'ELE'}-${String(itemNo).padStart(3, '0')}`
      ws.getCell(`C${rowNo}`).value = itemNo
      ws.getCell(`D${rowNo}`).value = line.workDescription || ''
      ws.getCell(`E${rowNo}`).value = line.materialDescription || 'bez materiálu'
      ws.getCell(`F${rowNo}`).value = line.unit || 'ks'
      ws.getCell(`G${rowNo}`).value = toNum(line.quantity, 0)
      ws.getCell(`G${rowNo}`).numFmt = '#,##0.##'
      ws.getCell(`H${rowNo}`).value = toNum(line.laborUnitPrice, 0)
      ws.getCell(`H${rowNo}`).numFmt = MONEY_NUM_FMT
      ws.getCell(`I${rowNo}`).value = { formula: `G${rowNo}*H${rowNo}` }
      ws.getCell(`I${rowNo}`).numFmt = MONEY_NUM_FMT
      ws.getCell(`J${rowNo}`).value = toNum(line.materialUnitPrice, 0)
      ws.getCell(`J${rowNo}`).numFmt = MONEY_NUM_FMT
      ws.getCell(`K${rowNo}`).value = { formula: `G${rowNo}*J${rowNo}` }
      ws.getCell(`K${rowNo}`).numFmt = MONEY_NUM_FMT
      ws.getCell(`L${rowNo}`).value = { formula: `I${rowNo}+K${rowNo}` }
      ws.getCell(`L${rowNo}`).numFmt = MONEY_NUM_FMT
      for (let col = 1; col <= 12; col += 1) {
        const cell = ws.getCell(rowNo, col)
        cell.border = thinBorder()
        cell.alignment = { vertical: 'top', horizontal: col >= 7 ? 'right' : 'left', wrapText: true }
      }
      ws.getCell(`C${rowNo}`).alignment = { horizontal: 'center', vertical: 'top' }
      ws.getRow(rowNo).height = 30
      rowNo += 1
      itemNo += 1
    }
    ws.mergeCells(`A${rowNo}:K${rowNo}`)
    ws.getCell(`A${rowNo}`).value = `${estimateCategoryLabel(categoryKey)} CELKEM`
    ws.getCell(`A${rowNo}`).font = { name: 'Calibri', size: 10, bold: true }
    ws.getCell(`L${rowNo}`).value = { formula: rows.map((_line, offset) => `L${rowNo - rows.length + offset}`).join('+') || '0' }
    ws.getCell(`L${rowNo}`).numFmt = MONEY_NUM_FMT
    for (let col = 1; col <= 12; col += 1) ws.getCell(rowNo, col).border = thinBorder()
    rowNo += 1
  }

  const workSum = dataRows.length ? dataRows.map((r) => `I${r}`).join('+') : '0'
  const materialSum = dataRows.length ? dataRows.map((r) => `K${r}`).join('+') : '0'
  const totalSum = dataRows.length ? dataRows.map((r) => `L${r}`).join('+') : '0'
  rowNo += 1
  const finalRows = [
    ['Práce celkem', { formula: workSum }],
    ['Materiál celkem', { formula: materialSum }],
    ['Mezisoučet', { formula: totalSum }],
    [`DPH ${vatRate} %`, { formula: `L${rowNo + 2}*${vatRate / 100}` }],
    ['Celkem s DPH', { formula: `L${rowNo + 2}+L${rowNo + 3}` }],
  ]
  for (const [label, formula] of finalRows) {
    ws.mergeCells(`A${rowNo}:K${rowNo}`)
    ws.getCell(`A${rowNo}`).value = label
    ws.getCell(`A${rowNo}`).font = { name: 'Calibri', size: 10, bold: true }
    ws.getCell(`A${rowNo}`).alignment = { horizontal: 'right', vertical: 'middle' }
    ws.getCell(`L${rowNo}`).value = formula
    ws.getCell(`L${rowNo}`).numFmt = MONEY_NUM_FMT
    ws.getCell(`L${rowNo}`).font = { name: 'Calibri', size: 10, bold: true }
    const fillColor = label === 'Celkem s DPH' ? 'FFE2F0D9' : 'FFF8F9FB'
    for (let col = 1; col <= 12; col += 1) {
      ws.getCell(rowNo, col).border = thinBorder()
      ws.getCell(rowNo, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } }
    }
    rowNo += 1
  }

  rowNo += 1
  ws.mergeCells(`A${rowNo}:L${rowNo}`)
  ws.getCell(`A${rowNo}`).value = 'Poznámka:'
  ws.getCell(`A${rowNo}`).font = { name: 'Calibri', size: 10, bold: true }
  for (let col = 1; col <= 12; col += 1) ws.getCell(rowNo, col).border = thinBorder()
  rowNo += 1
  ws.mergeCells(`A${rowNo}:L${rowNo + 2}`)
  ws.getCell(`A${rowNo}`).value = note || ''
  ws.getCell(`A${rowNo}`).font = { name: 'Calibri', size: 10 }
  ws.getCell(`A${rowNo}`).alignment = { vertical: 'top', wrapText: true }
  for (let r = rowNo; r <= rowNo + 2; r += 1) for (let c = 1; c <= 12; c += 1) ws.getCell(r, c).border = thinBorder()

  ws.headerFooter.oddFooter = '&LTemoWeb CRM&CStrana &P / &N&R' + String(estimate?.estimateNo || '')
  ws.printArea = `A1:L${rowNo + 2}`
  ws.autoFilter = `A${headerRow}:L${headerRow}`

  const safe = String(estimate?.estimateNo || `rozpocet-${estimate?.id || Date.now()}`).replace(/[^\w.-]+/g, '_')
  const xlsxPath = path.join(GENERATED_ESTIMATES_DIR, `${safe}.xlsx`)
  await workbook.xlsx.writeFile(xlsxPath)
  return xlsxPath
}

const MONEY_NUM_FMT = '#,##0.00 "Kč"'

function thinBorder() {
  return {
    top: { style: 'thin', color: { argb: 'FF9EB2CC' } },
    left: { style: 'thin', color: { argb: 'FF9EB2CC' } },
    bottom: { style: 'thin', color: { argb: 'FF9EB2CC' } },
    right: { style: 'thin', color: { argb: 'FF9EB2CC' } },
  }
}

function estimateGroupLabel(key) {
  const map = {
    grooves: 'Sekání šliců (drážek) a kapes',
    boxes: 'Krabice a osazení',
    cables: 'Tahání kabelů',
    switchboards: 'Rozvaděče',
    outlets: 'Zapojení zásuvek a vypínačů',
    completion: 'Kompletace',
    revision: 'Revize a měření',
    demolition: 'Demontáže',
    systems: 'Elektrikářské celky',
    hourly: 'Ostatní rozpočtové náklady',
    other: 'Ostatní rozpočtové náklady',
  }
  return map[key] || 'Rozpočet'
}

function estimateCategoryKey(line) {
  const raw = String(line?.category || line?.sectionType || '').trim().toLowerCase()
  if (raw === 'stavba' || raw === 'construction') return 'stavba'
  if (raw === 'ostatni_naklady' || raw === 'other') return 'ostatni'
  return 'elektro'
}

function estimateCategoryLabel(key) {
  if (key === 'stavba') return 'STAVBA'
  if (key === 'ostatni') return 'OSTATNÍ'
  return 'ELEKTRO'
}

function estimateCategoryColor(key) {
  if (key === 'stavba') return 'FFF4B084'
  if (key === 'ostatni') return 'FFD9E2F3'
  return 'FFA9D08E'
}

function getEstimateGeneratedFiles(estimate) {
  if (!estimate) return { xlsx: null, pdf: null }
  const safe = String(estimate.estimateNo || `rozpocet-${estimate.id}`).replace(/[^\w.-]+/g, '_')
  const xlsxPath = path.join(GENERATED_ESTIMATES_DIR, `${safe}.xlsx`)
  const pdfPath = path.join(GENERATED_ESTIMATES_DIR, `${safe}.pdf`)
  const xlsx = fs.existsSync(xlsxPath)
    ? { kind: 'xlsx', fileName: path.basename(xlsxPath), filePath: xlsxPath, url: publicFileUrl(xlsxPath) }
    : null
  const pdf = fs.existsSync(pdfPath)
    ? { kind: 'pdf', fileName: path.basename(pdfPath), filePath: pdfPath, url: publicFileUrl(pdfPath) }
    : null
  return { xlsx, pdf }
}

function groupedEstimateLinesForUniversalTemplate(lines) {
  const map = new Map()
  for (const line of lines) {
    const key = estimateCategoryKey(line)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(line)
  }
  const ordered = ['elektro', 'stavba', 'ostatni']
  const result = []
  for (const key of ordered) if (map.has(key)) result.push([key, map.get(key)])
  for (const [k, v] of map.entries()) if (!ordered.includes(k)) result.push([k, v])
  return result
}

function buildEstimateNo(jobIdOrLeadId) {
  const year = new Date().getFullYear()
  const tail = String(Date.now()).slice(-6)
  return `RZP-${year}-${String(jobIdOrLeadId || 'X')}-${tail}`
}
function estimateLineFromRow(row) {
  const category = String(row.category || row.section_type || 'elektro').trim() || 'elektro'
  return {
    id: row.id != null ? Number(row.id) : null,
    estimateId: row.estimate_id != null ? Number(row.estimate_id) : null,
    catalogItemId: row.catalog_item_id != null ? Number(row.catalog_item_id) : null,
    sourceCatalogCode: row.source_catalog_code || null,
    lineCode: row.line_code || null,
    sectionType: category,
    category,
    groupKey: row.group_key || row.category_key || 'other',
    groupLabel: row.group_label || row.group_key || row.category_key || 'Ostatní',
    phaseKey: row.phase_key || row.phaseKey || 'preparation',
    categoryKey: row.category_key || row.categoryKey || 'general',
    itemName: row.item_name || row.itemName || '',
    workDescription: row.work_description || row.item_name || row.itemName || '',
    materialDescription: row.material_description || '',
    unit: row.unit || 'ks',
    quantity: roundMoney(row.quantity),
    laborUnitPrice: roundMoney(row.labor_unit_price != null ? row.labor_unit_price : row.client_price),
    laborTotal: roundMoney(row.labor_total != null ? row.labor_total : row.total_client),
    materialUnitPrice: roundMoney(row.material_unit_price),
    materialTotal: roundMoney(row.material_total),
    lineTotal: roundMoney(row.line_total != null ? row.line_total : row.total_client),
    basePrice: roundMoney(row.base_price),
    clientPrice: roundMoney(row.client_price),
    totalBase: roundMoney(row.total_base),
    totalClient: roundMoney(row.total_client),
    positionOrder: Number(row.position_order || row.positionOrder || 0),
  }
}
function normalizeEstimateLine(input = {}, idx = 0) {
  const category = String(input.category || input.sectionType || 'elektro').trim() || 'elektro'
  const quantity = roundMoney(toNum(input.quantity, 0))
  const laborUnitPrice = roundMoney(toNum(input.laborUnitPrice != null ? input.laborUnitPrice : input.clientPrice, 0))
  const materialUnitPrice = roundMoney(toNum(input.materialUnitPrice, 0))
  const laborTotal = roundMoney(quantity * laborUnitPrice)
  const materialTotal = roundMoney(quantity * materialUnitPrice)
  const lineTotal = roundMoney(laborTotal + materialTotal)
  return {
    id: input.id != null ? Number(input.id) : null,
    catalogItemId: input.catalogItemId != null ? Number(input.catalogItemId) : null,
    sourceCatalogCode: input.sourceCatalogCode ? String(input.sourceCatalogCode).trim() : null,
    lineCode: input.lineCode ? String(input.lineCode).trim() : null,
    sectionType: category,
    category,
    groupKey: String(input.groupKey || input.categoryKey || 'other').trim() || 'other',
    groupLabel: String(input.groupLabel || input.groupKey || 'Ostatní').trim() || 'Ostatní',
    phaseKey: String(input.phaseKey || 'preparation').trim() || 'preparation',
    categoryKey: String(input.categoryKey || 'general').trim() || 'general',
    itemName: String(input.itemName || input.workDescription || '').trim(),
    workDescription: String(input.workDescription || input.itemName || '').trim(),
    materialDescription: String(input.materialDescription || '').trim(),
    unit: String(input.unit || 'ks').trim() || 'ks',
    quantity,
    laborUnitPrice,
    laborTotal,
    materialUnitPrice,
    materialTotal,
    lineTotal,
    basePrice: roundMoney(toNum(input.basePrice, laborUnitPrice)),
    clientPrice: laborUnitPrice,
    totalBase: laborTotal,
    totalClient: lineTotal,
    positionOrder: Number(input.positionOrder != null ? input.positionOrder : idx + 1),
  }
}
function computeEstimateTotals(lines, vatRate) {
  const laborTotal = roundMoney(lines.filter(x => String(x.sectionType || '') !== 'ostatni_naklady').reduce((sum, line) => sum + toNum(line.laborTotal, 0), 0))
  const materialTotal = roundMoney(lines.filter(x => String(x.sectionType || '') !== 'ostatni_naklady').reduce((sum, line) => sum + toNum(line.materialTotal, 0), 0))
  const otherCostsTotal = roundMoney(lines.filter(x => String(x.sectionType || '') === 'ostatni_naklady').reduce((sum, line) => sum + toNum(line.lineTotal, 0), 0))
  const subtotalBase = roundMoney(lines.reduce((sum, line) => sum + toNum(line.totalBase, 0), 0))
  const subtotalClient = roundMoney(lines.reduce((sum, line) => sum + toNum(line.totalClient, 0), 0))
  const totalNoVat = roundMoney(laborTotal + materialTotal + otherCostsTotal)
  const vatAmount = roundMoney(totalNoVat * (toNum(vatRate, 21) / 100))
  const totalWithVat = roundMoney(totalNoVat + vatAmount)
  return { subtotalBase, subtotalClient, totalNoVat, vatAmount, totalWithVat, laborTotal, materialTotal, otherCostsTotal }
}
function normalizeServiceCatalogItem(row) {
  return {
    id: Number(row.id),
    sourceCode: row.source_code || row.sourceCode || null,
    tradeType: row.trade_type || row.tradeType || 'electro',
    buildingType: row.building_type || row.buildingType || null,
    phaseKey: row.phase_key || row.phaseKey || 'preparation',
    categoryKey: row.category_key || row.categoryKey || 'general',
    subcategoryKey: row.subcategory_key || row.subcategoryKey || null,
    itemName: row.item_name || row.itemName || '',
    itemDescription: row.item_description || row.itemDescription || null,
    unit: row.unit || 'ks',
    basePrice: roundMoney(row.base_price),
    currency: row.currency || 'CZK',
    sortOrder: Number(row.sort_order || row.sortOrder || 0),
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : Boolean(row.isActive),
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
  }
}
async function listServiceCatalogItems(filters = {}) {
  if (pool) {
    const where = ['is_active = true']
    const params = []
    function add(sql, value) {
      params.push(value)
      where.push(sql.replace('?', `$${params.length}`))
    }
    if (filters.tradeType) add('trade_type = ?', String(filters.tradeType))
    if (filters.buildingType) {
      params.push(String(filters.buildingType))
      where.push(`(building_type = $${params.length} OR building_type IS NULL)`)
    }
    if (filters.phaseKey) add('phase_key = ?', String(filters.phaseKey))
    if (filters.categoryKey) add('category_key = ?', String(filters.categoryKey))
    if (filters.search) {
      params.push(`%${String(filters.search)}%`)
      const idx1 = params.length
      params.push(`%${String(filters.search)}%`)
      const idx2 = params.length
      where.push(`(item_name ILIKE $${idx1} OR coalesce(item_description, '') ILIKE $${idx2})`)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const q = await dbQuery(
      `SELECT * FROM crm_service_catalog_items ${whereSql} ORDER BY sort_order ASC, item_name ASC LIMIT 5000`,
      params
    )
    return q.rows.map(normalizeServiceCatalogItem)
  }
  let rows = readArrayFile('service_catalog')
  rows = rows.filter((x) => x.isActive !== false)
  if (filters.tradeType) rows = rows.filter((x) => String(x.tradeType || '') === String(filters.tradeType))
  if (filters.buildingType) {
    rows = rows.filter((x) => {
      const building = String(x.buildingType || '').trim()
      return !building || building === String(filters.buildingType)
    })
  }
  if (filters.phaseKey) rows = rows.filter((x) => String(x.phaseKey || '') === String(filters.phaseKey))
  if (filters.categoryKey) rows = rows.filter((x) => String(x.categoryKey || '') === String(filters.categoryKey))
  if (filters.search) {
    const q = String(filters.search).toLowerCase()
    rows = rows.filter((x) => [x.itemName, x.itemDescription].some((v) => String(v || '').toLowerCase().includes(q)))
  }
  return rows.map(normalizeServiceCatalogItem)
}
async function createServiceCatalogItem(payload) {
  const rowPayload = {
    sourceCode: payload.sourceCode ? String(payload.sourceCode).trim() : null,
    tradeType: String(payload.tradeType || 'electro').trim() || 'electro',
    buildingType: payload.buildingType ? String(payload.buildingType).trim() : null,
    phaseKey: String(payload.phaseKey || 'preparation').trim() || 'preparation',
    categoryKey: String(payload.categoryKey || 'general').trim() || 'general',
    subcategoryKey: payload.subcategoryKey ? String(payload.subcategoryKey).trim() : null,
    itemName: String(payload.itemName || '').trim(),
    itemDescription: payload.itemDescription ? String(payload.itemDescription).trim() : null,
    unit: String(payload.unit || 'ks').trim() || 'ks',
    basePrice: roundMoney(payload.basePrice),
    currency: String(payload.currency || 'CZK').trim() || 'CZK',
    sortOrder: Number(payload.sortOrder || 0),
    isActive: payload.isActive !== false,
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
  }
  if (!rowPayload.itemName) throw new Error('item_name_required')
  if (pool) {
    const q = await dbQuery(
      `INSERT INTO crm_service_catalog_items
      (source_code, trade_type, building_type, phase_key, category_key, subcategory_key, item_name, item_description, unit, base_price, currency, sort_order, is_active, metadata, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),now())
      ON CONFLICT (source_code) WHERE source_code IS NOT NULL
      DO UPDATE SET
        trade_type = EXCLUDED.trade_type,
        building_type = EXCLUDED.building_type,
        phase_key = EXCLUDED.phase_key,
        category_key = EXCLUDED.category_key,
        subcategory_key = EXCLUDED.subcategory_key,
        item_name = EXCLUDED.item_name,
        item_description = EXCLUDED.item_description,
        unit = EXCLUDED.unit,
        base_price = EXCLUDED.base_price,
        currency = EXCLUDED.currency,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        metadata = EXCLUDED.metadata,
        updated_at = now()
      RETURNING *`,
      [
        rowPayload.sourceCode,
        rowPayload.tradeType,
        rowPayload.buildingType,
        rowPayload.phaseKey,
        rowPayload.categoryKey,
        rowPayload.subcategoryKey,
        rowPayload.itemName,
        rowPayload.itemDescription,
        rowPayload.unit,
        rowPayload.basePrice,
        rowPayload.currency,
        rowPayload.sortOrder,
        rowPayload.isActive,
        JSON.stringify(rowPayload.metadata || {}),
      ]
    )
    return normalizeServiceCatalogItem(q.rows[0])
  }
  const rows = readArrayFile('service_catalog')
  const existingIdx = rowPayload.sourceCode ? rows.findIndex((x) => String(x.sourceCode || '') === rowPayload.sourceCode) : -1
  const row = { id: existingIdx >= 0 ? rows[existingIdx].id : Date.now(), ...rowPayload, createdAt: existingIdx >= 0 ? rows[existingIdx].createdAt : nowIso(), updatedAt: nowIso() }
  if (existingIdx >= 0) rows[existingIdx] = row
  else rows.unshift(row)
  writeArrayFile('service_catalog', rows)
  return normalizeServiceCatalogItem(row)
}
async function bulkImportServiceCatalogItems(items = []) {
  const created = []
  for (const item of items) {
    created.push(await createServiceCatalogItem(item))
  }
  return created
}
function normalizeEstimate(row, lines = []) {
  return {
    id: Number(row.id),
    jobId: row.job_id != null ? Number(row.job_id) : null,
    leadId: row.lead_id != null ? Number(row.lead_id) : null,
    estimateNo: row.estimate_no || row.estimateNo || '',
    estimateDate: row.estimate_date || row.estimateDate || null,
    jobNumberSnapshot: row.job_number_snapshot || row.jobNumberSnapshot || null,
    clientNumberSnapshot: row.client_number_snapshot || row.clientNumberSnapshot || null,
    clientNameSnapshot: row.client_name_snapshot || row.clientNameSnapshot || null,
    companyNameSnapshot: row.company_name_snapshot || row.companyNameSnapshot || null,
    customerAddressSnapshot: row.customer_address_snapshot || row.customerAddressSnapshot || null,
    customerIcoSnapshot: row.customer_ico_snapshot || row.customerIcoSnapshot || null,
    versionNo: Number(row.version_no || row.versionNo || 1),
    projectManagerSnapshot: row.project_manager_snapshot || row.projectManagerSnapshot || null,
    estimateKind: row.estimate_kind || row.estimateKind || 'standard',
    title: row.title || '',
    tradeType: row.trade_type || row.tradeType || 'electro',
    buildingType: row.building_type || row.buildingType || null,
    status: row.status || ESTIMATE_STATUS.DRAFT,
    currency: row.currency || 'CZK',
    vatRate: roundMoney(row.vat_rate),
    notes: row.notes || '',
    note: row.note || '',
    laborTotal: roundMoney(row.labor_total),
    materialTotal: roundMoney(row.material_total),
    otherCostsTotal: roundMoney(row.other_costs_total),
    subtotalBase: roundMoney(row.subtotal_base),
    subtotalClient: roundMoney(row.subtotal_client),
    totalNoVat: roundMoney(row.total_no_vat),
    vatAmount: roundMoney(row.vat_amount),
    totalWithVat: roundMoney(row.total_with_vat),
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
    lines: lines.map(estimateLineFromRow),
  }
}
async function getEstimateById(id) {
  if (pool) {
    const est = await dbQuery('SELECT * FROM crm_estimates WHERE id = $1 LIMIT 1', [id])
    if (!est.rowCount) return null
    const lines = await dbQuery('SELECT * FROM crm_estimate_lines WHERE estimate_id = $1 ORDER BY position_order ASC, id ASC', [id])
    return normalizeEstimate(est.rows[0], lines.rows)
  }
  const rows = readArrayFile('estimates')
  const row = rows.find((x) => Number(x.id) === Number(id)) || null
  return row || null
}
async function listEstimates(filters = {}) {
  if (pool) {
    const where = []
    const params = []
    function add(sql, value) {
      params.push(value)
      where.push(sql.replace('?', `$${params.length}`))
    }
    if (filters.leadId) add('lead_id = ?', Number(filters.leadId))
    if (filters.jobId) add('job_id = ?', Number(filters.jobId))
    if (filters.status) add('status = ?', String(filters.status))
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const q = await dbQuery(`SELECT * FROM crm_estimates ${whereSql} ORDER BY created_at DESC LIMIT 200`, params)
    const out = []
    for (const row of q.rows) {
      const lines = await dbQuery('SELECT * FROM crm_estimate_lines WHERE estimate_id = $1 ORDER BY position_order ASC, id ASC', [row.id])
      out.push(normalizeEstimate(row, lines.rows))
    }
    return out
  }
  let rows = readArrayFile('estimates')
  if (filters.leadId) rows = rows.filter((x) => Number(x.leadId) === Number(filters.leadId))
  if (filters.jobId) rows = rows.filter((x) => Number(x.jobId) === Number(filters.jobId))
  if (filters.status) rows = rows.filter((x) => String(x.status || '') === String(filters.status))
  return rows
}
async function createEstimateDraftForContext({ lead, job, customer }) {
  if (!lead && !job) throw new Error('estimate_context_missing')
  const title = `Rozpočet ze dne ${new Date().toLocaleDateString('cs-CZ')} ${customer?.name || lead?.clientNumber || lead?.name || job?.internalNumber || 'zakázka'}`
  const tradeType = job?.jobType === 'stavebni' ? 'construction' : job?.jobType === 'kombinovana' ? 'construction' : 'electro'
  const buildingType = lead?.brief?.objectType ? String(lead.brief.objectType) : null
  const estimateNo = buildEstimateNo(job?.id || lead?.id)
  const estimateDate = new Date().toISOString().slice(0, 10)
  if (pool) {
    const q = await dbQuery(
      `INSERT INTO crm_estimates
      (job_id, lead_id, estimate_no, estimate_date, job_number_snapshot, client_number_snapshot, client_name_snapshot, company_name_snapshot, customer_address_snapshot, customer_ico_snapshot, version_no, project_manager_snapshot, estimate_kind, title, trade_type, building_type, status, currency, vat_rate, notes, note,
       labor_total, material_total, other_costs_total, subtotal_base, subtotal_client, total_no_vat, vat_amount, total_with_vat, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,0,0,0,0,0,0,0,0,now(),now()) RETURNING *`,
      [
        job?.id || null,
        lead?.id || null,
        estimateNo,
        estimateDate,
        job?.internalNumber || null,
        lead?.clientNumber || null,
        customer?.name || lead?.fullName || lead?.name || null,
        customer?.companyName || null,
        customer?.address || lead?.brief?.realizationAddress || null,
        customer?.ico || lead?.brief?.companyIco || null,
        1,
        job?.responsiblePerson || null,
        'standard',
        title,
        tradeType,
        buildingType,
        ESTIMATE_STATUS.DRAFT,
        'CZK',
        21,
        lead?.brief?.summaryText || '',
        '',
      ]
    )
    return normalizeEstimate(q.rows[0], [])
  }
  const rows = readArrayFile('estimates')
  const row = {
    id: Date.now(),
    jobId: job?.id || null,
    leadId: lead?.id || null,
    estimateNo,
    estimateDate,
    jobNumberSnapshot: job?.internalNumber || null,
    clientNumberSnapshot: lead?.clientNumber || null,
    clientNameSnapshot: customer?.name || lead?.fullName || lead?.name || null,
    companyNameSnapshot: customer?.companyName || null,
    customerAddressSnapshot: customer?.address || lead?.brief?.realizationAddress || null,
    customerIcoSnapshot: customer?.ico || lead?.brief?.companyIco || null,
    versionNo: 1,
    projectManagerSnapshot: job?.responsiblePerson || null,
    estimateKind: 'standard',
    title,
    tradeType,
    buildingType,
    status: ESTIMATE_STATUS.DRAFT,
    currency: 'CZK',
    vatRate: 21,
    notes: lead?.brief?.summaryText || '',
    note: '',
    laborTotal: 0,
    materialTotal: 0,
    otherCostsTotal: 0,
    subtotalBase: 0,
    subtotalClient: 0,
    totalNoVat: 0,
    vatAmount: 0,
    totalWithVat: 0,
    lines: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  rows.unshift(row)
  writeArrayFile('estimates', rows)
  return row
}
async function createEstimateDraftFromLead(lead) {
  if (!lead) throw new Error('lead_not_found')
  const job = await findJobByLeadId(lead.id)
  const customer = job?.customerId ? await getCustomerById(job.customerId) : null
  return createEstimateDraftForContext({ lead, job, customer })
}
async function createEstimateDraftFromJob(job) {
  if (!job) throw new Error('job_not_found')
  const customer = job.customerId ? await getCustomerById(job.customerId) : null
  let lead = null
  if (job.leadId) lead = await getLeadById(job.leadId)
  return createEstimateDraftForContext({ lead, job, customer })
}
async function saveEstimate(id, patch = {}) {
  if (pool) {
    const ex = await dbQuery('SELECT * FROM crm_estimates WHERE id = $1 LIMIT 1', [id])
    if (!ex.rowCount) return null
    const cur = ex.rows[0]
    const lines = Array.isArray(patch.lines) ? patch.lines.map((x, idx) => normalizeEstimateLine(x, idx)) : (await getEstimateById(id))?.lines || []
    const totals = computeEstimateTotals(lines, patch.vatRate != null ? patch.vatRate : cur.vat_rate)
    const merged = {
      estimateDate: patch.estimateDate !== undefined ? patch.estimateDate : cur.estimate_date,
      jobNumberSnapshot: patch.jobNumberSnapshot !== undefined ? patch.jobNumberSnapshot : cur.job_number_snapshot,
      clientNameSnapshot: patch.clientNameSnapshot !== undefined ? patch.clientNameSnapshot : cur.client_name_snapshot,
      companyNameSnapshot: patch.companyNameSnapshot !== undefined ? patch.companyNameSnapshot : cur.company_name_snapshot,
      customerAddressSnapshot: patch.customerAddressSnapshot !== undefined ? patch.customerAddressSnapshot : cur.customer_address_snapshot,
      customerIcoSnapshot: patch.customerIcoSnapshot !== undefined ? patch.customerIcoSnapshot : cur.customer_ico_snapshot,
      versionNo: patch.versionNo != null ? Number(patch.versionNo) : Number(cur.version_no || 1),
      projectManagerSnapshot: patch.projectManagerSnapshot !== undefined ? patch.projectManagerSnapshot : cur.project_manager_snapshot,
      estimateKind: patch.estimateKind !== undefined ? patch.estimateKind : cur.estimate_kind,
      title: patch.title != null ? String(patch.title || '').trim() : cur.title,
      tradeType: patch.tradeType != null ? String(patch.tradeType || '').trim() : cur.trade_type,
      buildingType: patch.buildingType !== undefined ? (patch.buildingType ? String(patch.buildingType).trim() : null) : cur.building_type,
      status: patch.status != null ? String(patch.status || '').trim() : cur.status,
      currency: patch.currency != null ? String(patch.currency || '').trim() : cur.currency,
      vatRate: patch.vatRate != null ? roundMoney(patch.vatRate) : roundMoney(cur.vat_rate),
      notes: patch.notes !== undefined ? String(patch.notes || '') : String(cur.notes || ''),
      note: patch.note !== undefined ? String(patch.note || '') : String(cur.note || ''),
      clientNumberSnapshot: patch.clientNumberSnapshot !== undefined ? (patch.clientNumberSnapshot || null) : cur.client_number_snapshot,
    }
    await dbQuery(
      `UPDATE crm_estimates
       SET estimate_date=$1,job_number_snapshot=$2,client_number_snapshot=$3,client_name_snapshot=$4,company_name_snapshot=$5,customer_address_snapshot=$6,customer_ico_snapshot=$7,version_no=$8,project_manager_snapshot=$9,estimate_kind=$10,title=$11,trade_type=$12,building_type=$13,status=$14,currency=$15,vat_rate=$16,notes=$17,note=$18,
           labor_total=$19,material_total=$20,other_costs_total=$21,subtotal_base=$22,subtotal_client=$23,total_no_vat=$24,vat_amount=$25,total_with_vat=$26,updated_at=now()
       WHERE id=$27`,
      [
        merged.estimateDate,
        merged.jobNumberSnapshot,
        merged.clientNumberSnapshot,
        merged.clientNameSnapshot,
        merged.companyNameSnapshot,
        merged.customerAddressSnapshot,
        merged.customerIcoSnapshot,
        merged.versionNo,
        merged.projectManagerSnapshot,
        merged.estimateKind,
        merged.title,
        merged.tradeType,
        merged.buildingType,
        merged.status,
        merged.currency,
        merged.vatRate,
        merged.notes,
        merged.note,
        totals.laborTotal,
        totals.materialTotal,
        totals.otherCostsTotal,
        totals.subtotalBase,
        totals.subtotalClient,
        totals.totalNoVat,
        totals.vatAmount,
        totals.totalWithVat,
        id,
      ]
    )
    if (Array.isArray(patch.lines)) {
      await dbQuery('DELETE FROM crm_estimate_lines WHERE estimate_id = $1', [id])
      for (const line of lines) {
        await dbQuery(
          `INSERT INTO crm_estimate_lines
          (estimate_id, catalog_item_id, source_catalog_code, line_code, section_type, group_key, group_label, phase_key, category_key, item_name, work_description, material_description, unit, quantity, labor_unit_price, labor_total, material_unit_price, material_total, line_total, base_price, client_price, total_base, total_client, position_order, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,now(),now())`,
          [id, line.catalogItemId, line.sourceCatalogCode, line.lineCode, line.sectionType, line.groupKey, line.groupLabel, line.phaseKey, line.categoryKey, line.itemName, line.workDescription, line.materialDescription, line.unit, line.quantity, line.laborUnitPrice, line.laborTotal, line.materialUnitPrice, line.materialTotal, line.lineTotal, line.basePrice, line.clientPrice, line.totalBase, line.totalClient, line.positionOrder]
        )
      }
    }
    return getEstimateById(id)
  }
  const rows = readArrayFile('estimates')
  const idx = rows.findIndex((x) => Number(x.id) === Number(id))
  if (idx < 0) return null
  const current = rows[idx]
  const lines = Array.isArray(patch.lines) ? patch.lines.map((x, i) => normalizeEstimateLine(x, i)) : (current.lines || [])
  const totals = computeEstimateTotals(lines, patch.vatRate != null ? patch.vatRate : current.vatRate)
  rows[idx] = {
    ...current,
    ...patch,
    versionNo: patch.versionNo != null ? Number(patch.versionNo) : Number(current.versionNo || 1),
    projectManagerSnapshot: patch.projectManagerSnapshot !== undefined ? patch.projectManagerSnapshot : current.projectManagerSnapshot,
    lines,
    laborTotal: totals.laborTotal,
    materialTotal: totals.materialTotal,
    otherCostsTotal: totals.otherCostsTotal,
    subtotalBase: totals.subtotalBase,
    subtotalClient: totals.subtotalClient,
    totalNoVat: totals.totalNoVat,
    vatAmount: totals.vatAmount,
    totalWithVat: totals.totalWithVat,
    updatedAt: nowIso(),
  }
  writeArrayFile('estimates', rows)
  return rows[idx]
}
async function listAuditRowsForLead(leadId) {
  if (pool) {
    const q = await dbQuery(
      `SELECT actor_email, action, entity_type, entity_id, data, created_at
       FROM crm_audit_log
       WHERE (entity_type = 'lead' AND entity_id = $1) OR (entity_type = 'offer' AND data->>'leadId' = $1)
       ORDER BY created_at ASC LIMIT 200`,
      [String(leadId)]
    )
    return q.rows
  }
  return []
}
function buildLeadTimeline(lead, auditRows = []) {
  const items = []
  if (!lead) return items
  items.push({ key: 'lead_created', title: 'Заявка отримана', at: lead.createdAt, tone: 'new', note: lead.source || 'web_form' })
  if (lead.proposalSentAt) items.push({ key: 'form_sent', title: 'Формуляр відправлено', at: lead.proposalSentAt, tone: 'contacted', note: lead.email || '' })
  if (lead.briefReceivedAt) items.push({ key: 'brief_received', title: 'Формуляр отримано', at: lead.briefReceivedAt, tone: 'proposal', note: lead.brief?.objectType || '' })
  if (lead.clientNumber) items.push({ key: 'client_number', title: 'Присвоєно номер клієнта', at: lead.updatedAt || lead.briefReceivedAt || lead.createdAt, tone: 'won', note: lead.clientNumber })
  for (const row of auditRows) {
    if (row.action === 'estimate_created') items.push({ key: `estimate_${row.created_at}`, title: 'Створено розрахунок', at: row.created_at, tone: 'contacted', note: row.data?.estimateNo || '' })
  }
  return items.sort((a, b) => Date.parse(String(a.at || '')) - Date.parse(String(b.at || '')))
}

async function listSuppliers(type) {
  if (pool) {
    if (!type) {
      const q = await dbQuery('SELECT * FROM crm_suppliers ORDER BY created_at DESC')
      return q.rows
    }
    const q = await dbQuery('SELECT * FROM crm_suppliers WHERE specialization_type = $1 ORDER BY created_at DESC', [type])
    return q.rows
  }
  const rows = readArrayFile('suppliers')
  if (!type) return rows
  return rows.filter((x) => String(x.specializationType || '') === type)
}

async function createSupplier(payload) {
  if (pool) {
    const q = await dbQuery(
      `INSERT INTO crm_suppliers
      (name, ico, address, email, phone, specialization, specialization_type, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now()) RETURNING *`,
      [
        payload.name,
        payload.ico || null,
        payload.address || null,
        payload.email || null,
        payload.phone || null,
        payload.specialization || null,
        payload.specializationType || null,
      ]
    )
    return q.rows[0]
  }
  const rows = readArrayFile('suppliers')
  const row = { id: Date.now(), ...payload, created_at: nowIso(), updated_at: nowIso() }
  rows.unshift(row)
  writeArrayFile('suppliers', rows)
  return row
}

function computeCaseSignals(row) {
  const now = new Date()
  const start = row.start_date || row.startDate ? new Date(row.start_date || row.startDate) : null
  const end = row.end_date || row.endDate ? new Date(row.end_date || row.endDate) : null
  const daysToStart = start ? Math.ceil((start.getTime() - now.getTime()) / 86400000) : null
  const daysToEnd = end ? Math.ceil((end.getTime() - now.getTime()) / 86400000) : null
  const needsAttention = daysToStart != null && daysToStart <= 20 && daysToStart >= 15 && !['in_execution', 'completed'].includes(String(row.status || ''))
  return { daysToStart, daysToEnd, needsAttention }
}

async function extractTextFromUploadedFile(file) {
  if (!file || !file.buffer) return ''
  const mime = String(file.mimetype || '').toLowerCase()
  const name = String(file.originalname || '').toLowerCase()
  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    const parsed = await pdfParse(file.buffer)
    return String(parsed?.text || '').trim()
  }
  return String(file.buffer.toString('utf8') || '').trim()
}

async function openAiExtractCommercialCase({ lead, formText }) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured')
  const system = 'Extract structured CRM commercial-case data from customer form text. Return only valid JSON by schema.'
  const user = [
    `Lead context: ${JSON.stringify({ name: lead?.name || '', email: lead?.email || '', phone: lead?.phone || '', comment: lead?.comment || '' })}`,
    'Form text:',
    formText,
  ].join('\n')
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      clientType: { type: 'string', enum: ['company', 'person'] },
      companyName: { type: 'string' },
      companyIco: { type: 'string' },
      personName: { type: 'string' },
      personEmail: { type: 'string' },
      personPhone: { type: 'string' },
      orderType: { type: 'string', enum: ['construction', 'electro', 'combined'] },
      internalOrderId: { type: 'string' },
      offerAmount: { anyOf: [{ type: 'number' }, { type: 'null' }] },
      notes: { type: 'string' },
      stage: { type: 'string' },
      status: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      companyManager: { type: 'string' },
      clientContactName: { type: 'string' },
      clientContactPhone: { type: 'string' },
      clientContactEmail: { type: 'string' },
    },
    required: [
      'clientType',
      'companyName',
      'companyIco',
      'personName',
      'personEmail',
      'personPhone',
      'orderType',
      'internalOrderId',
      'offerAmount',
      'notes',
      'stage',
      'status',
      'startDate',
      'endDate',
      'companyManager',
      'clientContactName',
      'clientContactPhone',
      'clientContactEmail',
    ],
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'commercial_case_extraction',
          schema,
          strict: true,
        },
      },
    }),
  })
  const bodyText = await resp.text().catch(() => '')
  if (!resp.ok) throw new Error(`openai_http_${resp.status}:${bodyText.slice(0, 300)}`)
  const parsed = safeJsonParseObject(bodyText)
  const outputText = String(parsed?.choices?.[0]?.message?.content || '')
  const asObj = safeJsonParseObject(outputText)
  if (!asObj) throw new Error('openai_invalid_json')
  return asObj
}

async function queueLeadDelivery(lead) {
  const wa = await sendWhatsAppLead(lead)
  const mail = await sendResendEmail({
    to: lead.email,
    subject: buildClientMail(lead).subject,
    text: buildClientMail(lead).text,
  })
  const emailState = classifyClientEmailResult(mail)
  const updated = await updateLead(lead.id, {
    status: emailState.status,
    proposalMailState: emailState.state,
    proposalSentAt: emailState.state === 'sent' ? nowIso() : null,
    proposalError: emailState.errorText,
  })
  return { wa, mail, lead: updated }
}

function publicError(lang, key) {
  const dict = {
    required: {
      cz: 'Vyplňte prosím všechna povinná pole.',
      ua: 'Будь ласка, заповніть усі обовʼязкові поля.',
      en: 'Please fill in all required fields.',
    },
    phone: {
      cz: 'Telefon musí být ve formátu +420XXXXXXXXX.',
      ua: 'Телефон має бути у форматі +420XXXXXXXXX.',
      en: 'Phone must be in +420XXXXXXXXX format.',
    },
    email: {
      cz: 'E-mail není ve správném formátu.',
      ua: 'Некоректний формат e-mail.',
      en: 'Invalid email format.',
    },
  }
  const safe = lang === 'ua' || lang === 'en' ? lang : 'cz'
  return dict[key]?.[safe] || 'Validation error'
}

/* ══════════════════════════════════════════════════════════════════
   ZAKAZKA PIPELINE: customers, jobs, documents, events, tasks
   ══════════════════════════════════════════════════════════════════ */

function buildCustomerNumber() {
  return `KL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
}
function buildJobNumber() {
  return `ZAK-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
}
function normalizeCustomer(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    name: row.name || '',
    companyName: row.company_name || null,
    ico: row.ico || null,
    dic: row.dic || null,
    clientType: row.client_type || 'osoba',
    phone: row.phone || null,
    email: row.email || null,
    address: row.address || null,
    aresData: row.ares_data || null,
    internalNumber: row.internal_number || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
async function createCustomer(p) {
  if (pool) {
    const q = await dbQuery(
      `INSERT INTO crm_customers (name,company_name,ico,dic,client_type,phone,email,address,ares_data,internal_number,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now()) RETURNING *`,
      [p.name||'',p.companyName||null,p.ico||null,p.dic||null,p.clientType||'osoba',p.phone||null,p.email||null,p.address||null,p.aresData?JSON.stringify(p.aresData):null,p.internalNumber||buildCustomerNumber()]
    )
    return normalizeCustomer(q.rows[0])
  }
  const rows = readArrayFile('customers')
  const row = { id: Date.now(), name: p.name||'', company_name: p.companyName||null, ico: p.ico||null, dic: p.dic||null, client_type: p.clientType||'osoba', phone: p.phone||null, email: p.email||null, address: p.address||null, ares_data: p.aresData||null, internal_number: p.internalNumber||buildCustomerNumber(), created_at: nowIso(), updated_at: nowIso() }
  rows.unshift(row)
  writeArrayFile('customers', rows)
  return normalizeCustomer(row)
}
async function getCustomerById(id) {
  if (pool) { const q = await dbQuery('SELECT * FROM crm_customers WHERE id=$1',[id]); return q.rowCount ? normalizeCustomer(q.rows[0]) : null }
  return normalizeCustomer(readArrayFile('customers').find(x => Number(x.id) === Number(id)) || null)
}
async function listCustomers() {
  if (pool) { const q = await dbQuery('SELECT * FROM crm_customers ORDER BY created_at DESC LIMIT 2000'); return q.rows.map(normalizeCustomer) }
  return readArrayFile('customers').map(normalizeCustomer)
}
async function findCustomerByEmail(email) {
  if (!email) return null
  if (pool) { const q = await dbQuery('SELECT * FROM crm_customers WHERE lower(email)=$1 LIMIT 1',[email.toLowerCase()]); return q.rowCount ? normalizeCustomer(q.rows[0]) : null }
  return normalizeCustomer(readArrayFile('customers').find(x => String(x.email||'').toLowerCase() === email.toLowerCase()) || null)
}

function normalizeJob(row) {
  if (!row) return null
  const pipelineStage = row.pipeline_stage || row.stage || 'nova_poptavka'
  return {
    id: Number(row.id),
    customerId: row.customer_id != null ? Number(row.customer_id) : null,
    leadId: row.lead_id != null ? Number(row.lead_id) : null,
    internalNumber: row.internal_number || null,
    title: row.title || '',
    jobType: row.job_type || 'kombinovana',
    source: row.source || 'web_form',
    stage: pipelineStage,
    pipelineStage,
    receivedAt: row.received_at || null,
    formSentAt: row.form_sent_at || null,
    formReceivedAt: row.form_received_at || null,
    offerSentAt: row.offer_sent_at || null,
    offerApprovedAt: row.offer_approved_at || null,
    orderSignedAt: row.order_signed_at || null,
    depositPaidAt: row.deposit_paid_at || null,
    plannedStart: row.planned_start || null,
    plannedEnd: row.planned_end || null,
    actualStart: row.actual_start || null,
    actualEnd: row.actual_end || null,
    handoverAt: row.handover_at || null,
    closedAt: row.closed_at || null,
    totalPrice: roundMoney(row.total_price),
    depositAmount: roundMoney(row.deposit_amount),
    depositInvoiceId: row.deposit_invoice_id || null,
    depositPaid: Boolean(row.deposit_paid),
    finalInvoiceId: row.final_invoice_id || null,
    finalPaid: Boolean(row.final_paid),
    costs: roundMoney(row.costs),
    profit: roundMoney(row.profit),
    responsiblePerson: row.responsible_person || null,
    clientContactPerson: row.client_contact_person || null,
    priority: row.priority || 'normal',
    blockingFactor: row.blocking_factor || 'none',
    waitingFor: row.waiting_for || 'none',
    riskLevel: row.risk_level || 'none',
    nextAction: row.next_action || null,
    nextActionDueAt: row.next_action_due_at || null,
    lastClientContactAt: row.last_client_contact_at || null,
    lastInternalActionAt: row.last_internal_action_at || null,
    stalledAt: row.stalled_at || null,
    stalledReason: row.stalled_reason || null,
    orderSent: Boolean(row.order_sent),
    clientSigned: Boolean(row.client_signed),
    weSigned: Boolean(row.we_signed),
    realizationStatus: row.realization_status || 'priprava',
    handoverPlanned: Boolean(row.handover_planned),
    handoverProtocolReady: Boolean(row.handover_protocol_ready),
    handoverSigned: Boolean(row.handover_signed),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
async function createJob(p) {
  const pipelineStage = p.pipelineStage || p.stage || 'nova_poptavka'
  if (pool) {
    const q = await dbQuery(
      `INSERT INTO crm_jobs (customer_id,lead_id,internal_number,title,job_type,source,stage,pipeline_stage,received_at,responsible_person,client_contact_person,priority,waiting_for,blocking_factor,risk_level,next_action,next_action_due_at,last_client_contact_at,last_internal_action_at,notes,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,now(),now()) RETURNING *`,
      [p.customerId||null,p.leadId||null,p.internalNumber||buildJobNumber(),p.title||'Nová zakázka',p.jobType||'kombinovana',p.source||'web_form',pipelineStage,pipelineStage,p.responsiblePerson||null,p.clientContactPerson||null,p.priority||'normal',p.waitingFor||'client',p.blockingFactor||'missing_form',p.riskLevel||'none',p.nextAction||'Zkontrolovat novou poptávku',p.nextActionDueAt||null,p.lastClientContactAt||null,p.lastInternalActionAt||nowIso(),p.notes||null]
    )
    return normalizeJob(q.rows[0])
  }
  const rows = readArrayFile('jobs')
  const row = { id: Date.now(), customer_id: p.customerId||null, lead_id: p.leadId||null, internal_number: p.internalNumber||buildJobNumber(), title: p.title||'Nová zakázka', job_type: p.jobType||'kombinovana', source: p.source||'web_form', stage: pipelineStage, pipeline_stage: pipelineStage, received_at: nowIso(), responsible_person: p.responsiblePerson||null, client_contact_person: p.clientContactPerson||null, priority: p.priority||'normal', waiting_for: p.waitingFor||'client', blocking_factor: p.blockingFactor||'missing_form', risk_level: p.riskLevel||'none', next_action: p.nextAction||'Zkontrolovat novou poptávku', next_action_due_at: p.nextActionDueAt||null, last_client_contact_at: p.lastClientContactAt||null, last_internal_action_at: nowIso(), stalled_at: null, stalled_reason: null, notes: p.notes||null, created_at: nowIso(), updated_at: nowIso(), total_price: 0, deposit_amount: 0, deposit_paid: false, final_paid: false, costs: 0, profit: 0, order_sent: false, client_signed: false, we_signed: false, realization_status: 'priprava', handover_planned: false, handover_protocol_ready: false, handover_signed: false }
  rows.unshift(row)
  writeArrayFile('jobs', rows)
  return normalizeJob(row)
}
async function getJobById(id) {
  if (pool) { const q = await dbQuery('SELECT * FROM crm_jobs WHERE id=$1',[id]); return q.rowCount ? normalizeJob(q.rows[0]) : null }
  return normalizeJob(readArrayFile('jobs').find(x => Number(x.id) === Number(id)) || null)
}
async function listJobs(filters = {}) {
  if (pool) {
    const w = []; const p = []
    function a(sql, val) { p.push(val); w.push(sql.replace('?', `$${p.length}`)) }
    if (filters.stage || filters.pipelineStage) a('pipeline_stage=?', filters.pipelineStage || filters.stage)
    if (filters.customerId) a('customer_id=?', Number(filters.customerId))
    if (filters.priority) a('priority=?', filters.priority)
    if (filters.riskLevel) a('risk_level=?', filters.riskLevel)
    if (filters.waitingFor) a('waiting_for=?', filters.waitingFor)
    const ws = w.length ? `WHERE ${w.join(' AND ')}` : ''
    const q = await dbQuery(`SELECT * FROM crm_jobs ${ws} ORDER BY created_at DESC LIMIT 2000`, p)
    return q.rows.map(normalizeJob)
  }
  let rows = readArrayFile('jobs')
  if (filters.stage || filters.pipelineStage) rows = rows.filter(x => (x.pipeline_stage || x.stage) === (filters.pipelineStage || filters.stage))
  if (filters.customerId) rows = rows.filter(x => Number(x.customer_id) === Number(filters.customerId))
  if (filters.waitingFor) rows = rows.filter(x => (x.waiting_for || 'none') === filters.waitingFor)
  return rows.map(normalizeJob)
}
async function updateJob(id, patch) {
  if (pool) {
    const ex = await dbQuery('SELECT * FROM crm_jobs WHERE id=$1',[id])
    if (!ex.rowCount) return null
    const c = ex.rows[0]
    const fields = ['title','job_type','stage','pipeline_stage','form_sent_at','form_received_at','offer_sent_at','offer_approved_at','order_signed_at','deposit_paid_at','planned_start','planned_end','actual_start','actual_end','handover_at','closed_at','total_price','deposit_amount','deposit_invoice_id','deposit_paid','final_invoice_id','final_paid','costs','profit','responsible_person','client_contact_person','priority','blocking_factor','waiting_for','risk_level','next_action','next_action_due_at','last_client_contact_at','last_internal_action_at','stalled_at','stalled_reason','order_sent','client_signed','we_signed','realization_status','handover_planned','handover_protocol_ready','handover_signed','notes']
    const camel = (s) => s.replace(/_([a-z])/g, (_, l) => l.toUpperCase())
    const vals = []; const sets = []
    for (const f of fields) {
      const key = camel(f)
      if (patch[key] !== undefined) { vals.push(patch[key]); sets.push(`${f}=$${vals.length}`) }
    }
    if (patch.pipelineStage !== undefined && patch.stage === undefined) { vals.push(patch.pipelineStage); sets.push(`stage=$${vals.length}`) }
    if (patch.stage !== undefined && patch.pipelineStage === undefined) { vals.push(patch.stage); sets.push(`pipeline_stage=$${vals.length}`) }
    if (!sets.length) return normalizeJob(c)
    vals.push(id)
    const q = await dbQuery(`UPDATE crm_jobs SET ${sets.join(',')},updated_at=now() WHERE id=$${vals.length} RETURNING *`, vals)
    return normalizeJob(q.rows[0])
  }
  const rows = readArrayFile('jobs')
  const idx = rows.findIndex(x => Number(x.id) === Number(id))
  if (idx < 0) return null
  const camel = (s) => s.replace(/_([a-z])/g, (_, l) => l.toUpperCase())
  for (const key of Object.keys(patch)) {
    const snk = key.replace(/[A-Z]/g, l => '_' + l.toLowerCase())
    rows[idx][snk] = patch[key]
  }
  rows[idx].updated_at = nowIso()
  writeArrayFile('jobs', rows)
  return normalizeJob(rows[idx])
}
async function findJobByLeadId(leadId) {
  if (pool) { const q = await dbQuery('SELECT * FROM crm_jobs WHERE lead_id=$1 ORDER BY created_at DESC LIMIT 1',[leadId]); return q.rowCount ? normalizeJob(q.rows[0]) : null }
  return normalizeJob(readArrayFile('jobs').find(x => Number(x.lead_id) === Number(leadId)) || null)
}

function normalizeJobDoc(row) { return { id: Number(row.id), jobId: Number(row.job_id), docType: row.document_type || row.doc_type, fileName: row.file_name, filePath: row.file_path||null, fileUrl: row.file_url||null, storageKey: row.storage_key || null, status: row.status || 'created', version: Number(row.version || 1), uploadedBy: row.uploaded_by || null, source: row.source || null, signatureMode: row.signature_mode || null, isFinal: Boolean(row.is_final), uploadedAt: row.uploaded_at || row.created_at, sentAt: row.sent_at || null, signedAt: row.signed_at || null } }
async function addJobDocument(jobId, doc) {
  if (pool) { const q = await dbQuery('INSERT INTO crm_job_documents (job_id,doc_type,document_type,file_name,file_path,file_url,storage_key,status,version,sent_at,signed_at,uploaded_by,source,signature_mode,is_final,uploaded_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now()) RETURNING *',[jobId,doc.documentType||doc.docType||'other',doc.documentType||doc.docType||'other',doc.fileName||'',doc.filePath||null,doc.fileUrl||null,doc.storageKey||null,doc.status||'created',doc.version||1,doc.sentAt||null,doc.signedAt||null,doc.uploadedBy||null,doc.source||null,doc.signatureMode||null,Boolean(doc.isFinal)]); return normalizeJobDoc(q.rows[0]) }
  const rows = readArrayFile('job_documents'); const r = { id: Date.now(), job_id: jobId, doc_type: doc.documentType||doc.docType||'other', document_type: doc.documentType||doc.docType||'other', file_name: doc.fileName||'', file_path: doc.filePath||null, file_url: doc.fileUrl||null, storage_key: doc.storageKey||null, status: doc.status||'created', version: doc.version||1, sent_at: doc.sentAt||null, signed_at: doc.signedAt||null, uploaded_by: doc.uploadedBy||null, source: doc.source||null, signature_mode: doc.signatureMode||null, is_final: Boolean(doc.isFinal), uploaded_at: nowIso() }; rows.unshift(r); writeArrayFile('job_documents', rows); return normalizeJobDoc(r)
}
async function listJobDocuments(jobId) {
  if (pool) { const q = await dbQuery('SELECT * FROM crm_job_documents WHERE job_id=$1 ORDER BY uploaded_at DESC',[jobId]); return q.rows.map(normalizeJobDoc) }
  return readArrayFile('job_documents').filter(x => Number(x.job_id) === Number(jobId)).map(normalizeJobDoc)
}

function normalizeJobEvent(row) { return { id: Number(row.id), jobId: Number(row.job_id), eventType: row.event_type, eventCode: row.event_code || null, title: row.title, description: row.description||null, actor: row.actor||null, actorType: row.actor_type || 'user', actorId: row.actor_id || null, message: row.message || row.description || null, metadata: row.metadata || {}, createdAt: row.created_at } }
async function addJobEvent(jobId, ev) {
  if (pool) { const q = await dbQuery('INSERT INTO crm_job_events (job_id,event_type,event_code,title,description,actor,actor_type,actor_id,message,metadata,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now()) RETURNING *',[jobId,ev.eventType||'note',ev.eventCode||null,ev.title||'',ev.description||null,ev.actor||null,ev.actorType||'user',ev.actorId||null,ev.message||ev.description||null,JSON.stringify(ev.metadata||{})]); return normalizeJobEvent(q.rows[0]) }
  const rows = readArrayFile('job_events'); const r = { id: Date.now(), job_id: jobId, event_type: ev.eventType||'note', event_code: ev.eventCode||null, title: ev.title||'', description: ev.description||null, actor: ev.actor||null, actor_type: ev.actorType||'user', actor_id: ev.actorId||null, message: ev.message||ev.description||null, metadata: ev.metadata||{}, created_at: nowIso() }; rows.unshift(r); writeArrayFile('job_events', rows); return normalizeJobEvent(r)
}
async function listJobEvents(jobId) {
  if (pool) { const q = await dbQuery('SELECT * FROM crm_job_events WHERE job_id=$1 ORDER BY created_at DESC LIMIT 500',[jobId]); return q.rows.map(normalizeJobEvent) }
  return readArrayFile('job_events').filter(x => Number(x.job_id) === Number(jobId)).map(normalizeJobEvent)
}

function normalizeJobTask(row) { return { id: Number(row.id), jobId: Number(row.job_id), taskType: row.task_type || 'manual', title: row.title, description: row.description || null, status: row.status||'pending', assignedTo: row.assigned_to||null, dueDate: row.due_date||null, completedAt: row.completed_at||null, isSystemGenerated: Boolean(row.is_system_generated), priority: row.priority || 'normal', createdAt: row.created_at } }
async function addJobTask(jobId, t) {
  if (pool) { const q = await dbQuery('INSERT INTO crm_job_tasks (job_id,task_type,title,description,status,assigned_to,due_date,completed_at,is_system_generated,priority,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now()) RETURNING *',[jobId,t.taskType||'manual',t.title||'',t.description||null,t.status||'pending',t.assignedTo||null,t.dueDate||null,t.completedAt||null,Boolean(t.isSystemGenerated),t.priority||'normal']); return normalizeJobTask(q.rows[0]) }
  const rows = readArrayFile('job_tasks'); const r = { id: Date.now(), job_id: jobId, task_type: t.taskType||'manual', title: t.title||'', description: t.description||null, status: t.status||'pending', assigned_to: t.assignedTo||null, due_date: t.dueDate||null, completed_at: t.completedAt||null, is_system_generated: Boolean(t.isSystemGenerated), priority: t.priority||'normal', created_at: nowIso() }; rows.unshift(r); writeArrayFile('job_tasks', rows); return normalizeJobTask(r)
}
async function updateJobTask(taskId, patch) {
  if (pool) {
    const sets = []; const vals = []
    if (patch.status !== undefined) { vals.push(patch.status); sets.push(`status=$${vals.length}`) }
    if (patch.completedAt !== undefined) { vals.push(patch.completedAt); sets.push(`completed_at=$${vals.length}`) }
    if (patch.title !== undefined) { vals.push(patch.title); sets.push(`title=$${vals.length}`) }
    if (patch.taskType !== undefined) { vals.push(patch.taskType); sets.push(`task_type=$${vals.length}`) }
    if (patch.description !== undefined) { vals.push(patch.description); sets.push(`description=$${vals.length}`) }
    if (patch.assignedTo !== undefined) { vals.push(patch.assignedTo); sets.push(`assigned_to=$${vals.length}`) }
    if (patch.dueDate !== undefined) { vals.push(patch.dueDate); sets.push(`due_date=$${vals.length}`) }
    if (patch.isSystemGenerated !== undefined) { vals.push(Boolean(patch.isSystemGenerated)); sets.push(`is_system_generated=$${vals.length}`) }
    if (patch.priority !== undefined) { vals.push(patch.priority); sets.push(`priority=$${vals.length}`) }
    if (!sets.length) return null
    vals.push(taskId)
    const q = await dbQuery(`UPDATE crm_job_tasks SET ${sets.join(',')} WHERE id=$${vals.length} RETURNING *`, vals)
    return q.rowCount ? normalizeJobTask(q.rows[0]) : null
  }
  const rows = readArrayFile('job_tasks'); const idx = rows.findIndex(x => Number(x.id) === Number(taskId)); if (idx < 0) return null
  Object.assign(rows[idx], patch); writeArrayFile('job_tasks', rows); return normalizeJobTask(rows[idx])
}
async function listJobTasks(jobId) {
  if (pool) { const q = await dbQuery('SELECT * FROM crm_job_tasks WHERE job_id=$1 ORDER BY created_at ASC',[jobId]); return q.rows.map(normalizeJobTask) }
  return readArrayFile('job_tasks').filter(x => Number(x.job_id) === Number(jobId)).map(normalizeJobTask)
}

function daysBetween(from, to) {
  if (!from) return null
  const a = new Date(from); const b = to ? new Date(to) : new Date()
  return Math.ceil((b.getTime() - a.getTime()) / 86400000)
}
function computeJobTimers(job) {
  if (!job) return {}
  const lastClientContact = job.lastClientContactAt || job.formSentAt || job.offerSentAt || job.receivedAt
  return {
    daysWithoutClientReply: (job.waitingFor === 'client' && lastClientContact) ? daysBetween(lastClientContact) : null,
    daysSinceOfferSent: job.offerSentAt ? daysBetween(job.offerSentAt) : null,
    daysToStart: job.plannedStart ? Math.ceil((new Date(job.plannedStart).getTime() - Date.now()) / 86400000) : null,
    daysOverdue: (job.plannedEnd && !job.closedAt) ? Math.max(0, Math.ceil((Date.now() - new Date(job.plannedEnd).getTime()) / 86400000)) : null,
    daysToInvoiceDue: null,
    daysSinceLastInternalAction: job.lastInternalActionAt ? daysBetween(job.lastInternalActionAt) : null,
    daysStalled: job.stalledAt ? daysBetween(job.stalledAt) : null,
  }
}
function computeJobRisks(job) {
  if (!job) return { riskLevel: 'none', blockingFactor: 'none' }
  const timers = computeJobTimers(job)
  let risk = job.riskLevel || 'none'
  let blocking = job.blockingFactor || 'none'
  if (timers.daysOverdue != null && timers.daysOverdue > 0) risk = 'overdue'
  else if (timers.daysToStart != null && timers.daysToStart <= 3 && timers.daysToStart >= 0) risk = 'approaching'
  const stage = job.pipelineStage || job.stage
  if (stage === 'nova_poptavka' && !job.formSentAt) blocking = 'missing_form'
  if (stage === 'podklady' && !job.formReceivedAt) blocking = 'missing_form'
  if (stage === 'nabidka_odeslana' && !job.offerApprovedAt) blocking = 'waiting_offer_response'
  if (stage === 'schvaleni_objednavka' && !job.clientSigned) blocking = job.orderSent ? 'waiting_signature' : 'missing_contract'
  if (stage === 'zaloha_priprava' && !job.depositPaid) blocking = 'waiting_advance_payment'
  if (stage === 'zaloha_priprava' && job.depositPaid && job.notes && /material/i.test(job.notes) && !job.actualStart) blocking = 'missing_material'
  if (stage === 'predani_fakturace' && !job.handoverSigned) blocking = 'missing_protocol'
  if (job.finalInvoiceId && !job.finalPaid && timers.daysOverdue != null && timers.daysOverdue > 0) blocking = 'overdue_invoice'
  if (!blocking) blocking = 'none'
  return { riskLevel: risk, blockingFactor: blocking }
}
function enrichJob(job) {
  if (!job) return null
  const timers = computeJobTimers(job)
  const risks = computeJobRisks(job)
  const nextAction = job.nextAction || (
    risks.blockingFactor === 'missing_form' ? 'Odeslat / dohledat formulář' :
    risks.blockingFactor === 'waiting_offer_response' ? 'Zavolat klientovi kvůli nabídce' :
    risks.blockingFactor === 'waiting_signature' ? 'Urgovat podpis objednávky' :
    risks.blockingFactor === 'waiting_advance_payment' ? 'Zkontrolovat zálohovou platbu' :
    risks.blockingFactor === 'missing_contract' ? 'Připravit a odeslat objednávku' :
    risks.blockingFactor === 'missing_material' ? 'Objednat materiál' :
    risks.blockingFactor === 'missing_protocol' ? 'Připravit předávací protokol' :
    risks.blockingFactor === 'overdue_invoice' ? 'Řešit fakturu po splatnosti' :
    'Pokračovat v aktuální etapě'
  )
  return { ...job, timers, computedRisk: risks.riskLevel, computedBlocking: risks.blockingFactor, nextAction }
}
async function listProblems() {
  const jobs = await listJobs()
  return jobs.map(enrichJob).filter(j => {
    if ((j.pipelineStage || j.stage) === 'dokonceno') return false
    const t = j.timers || {}
    if (t.daysWithoutClientReply != null && t.daysWithoutClientReply >= 3) return true
    if (t.daysSinceOfferSent != null && t.daysSinceOfferSent >= 5 && (j.pipelineStage || j.stage) === 'nabidka_odeslana') return true
    if (t.daysToStart != null && t.daysToStart <= 3 && t.daysToStart >= 0) return true
    if (t.daysOverdue != null && t.daysOverdue > 0) return true
    if (j.computedBlocking && j.computedBlocking !== 'none') return true
    if (j.computedRisk !== 'none') return true
    return false
  })
}

function groupProblemsByType(items = []) {
  const groups = { bez_odpovedi: [], finance: [], dokumenty: [], realizace: [], po_terminu: [] }
  for (const job of items) {
    const t = job.timers || {}
    const blocking = job.computedBlocking || 'none'
    if (t.daysWithoutClientReply != null && t.daysWithoutClientReply >= 3) { groups.bez_odpovedi.push(job); continue }
    if (['waiting_advance_payment', 'overdue_invoice'].includes(blocking)) { groups.finance.push(job); continue }
    if (['missing_form', 'missing_contract', 'missing_protocol', 'waiting_signature'].includes(blocking)) { groups.dokumenty.push(job); continue }
    if ((job.pipelineStage || job.stage) === 'realizace' || ['missing_material'].includes(blocking)) { groups.realizace.push(job); continue }
    if (t.daysOverdue != null && t.daysOverdue > 0) { groups.po_terminu.push(job); continue }
    groups.realizace.push(job)
  }
  return groups
}

function normalizeInvoice(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    jobId: Number(row.job_id),
    invoiceType: row.invoice_type || 'advance',
    fakturoidInvoiceId: row.fakturoid_invoice_id || null,
    invoiceNumber: row.invoice_number || null,
    status: row.status || 'draft',
    amount: roundMoney(row.amount),
    currency: row.currency || 'CZK',
    issuedAt: row.issued_at || null,
    dueAt: row.due_at || null,
    paidAt: row.paid_at || null,
    rawPayload: row.raw_payload || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }
}
async function addJobInvoice(jobId, payload) {
  if (pool) {
    const q = await dbQuery(
      `INSERT INTO crm_job_invoices (job_id,invoice_type,fakturoid_invoice_id,invoice_number,status,amount,currency,issued_at,due_at,paid_at,raw_payload,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now()) RETURNING *`,
      [jobId, payload.invoiceType || 'advance', payload.fakturoidInvoiceId || null, payload.invoiceNumber || null, payload.status || 'draft', roundMoney(payload.amount), payload.currency || 'CZK', payload.issuedAt || null, payload.dueAt || null, payload.paidAt || null, payload.rawPayload ? JSON.stringify(payload.rawPayload) : null]
    )
    return normalizeInvoice(q.rows[0])
  }
  const rows = readArrayFile('job_invoices')
  const row = { id: Date.now(), job_id: jobId, invoice_type: payload.invoiceType || 'advance', fakturoid_invoice_id: payload.fakturoidInvoiceId || null, invoice_number: payload.invoiceNumber || null, status: payload.status || 'draft', amount: roundMoney(payload.amount), currency: payload.currency || 'CZK', issued_at: payload.issuedAt || null, due_at: payload.dueAt || null, paid_at: payload.paidAt || null, raw_payload: payload.rawPayload || null, created_at: nowIso(), updated_at: nowIso() }
  rows.unshift(row)
  writeArrayFile('job_invoices', rows)
  return normalizeInvoice(row)
}
async function listJobInvoices(jobId) {
  if (pool) {
    const q = await dbQuery('SELECT * FROM crm_job_invoices WHERE job_id=$1 ORDER BY created_at DESC', [jobId])
    return q.rows.map(normalizeInvoice)
  }
  return readArrayFile('job_invoices').filter(x => Number(x.job_id) === Number(jobId)).map(normalizeInvoice)
}

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use('/generated', express.static(path.join(__dirname, 'generated')))

app.get('/api/ops/status', async (_req, res) => {
  try {
    let lastBackupAt = null
    const backupDir = path.join(__dirname, 'backups')
    if (fs.existsSync(backupDir)) {
      const files = fs
        .readdirSync(backupDir)
        .filter((x) => x.endsWith('.dump.gz'))
        .map((name) => {
          const full = path.join(backupDir, name)
          const st = fs.statSync(full)
          return { name, mtimeMs: Number(st.mtimeMs || 0) }
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
      if (files.length) lastBackupAt = new Date(files[0].mtimeMs).toISOString()
    }
    const dbOk = Boolean(pool ? (await dbQuery('SELECT 1')).rowCount : true)
    const leadsCount = pool
      ? Number((await dbQuery('SELECT COUNT(*)::int AS c FROM crm_leads')).rows[0].c || 0)
      : readArrayFile('leads').length
    return res.json({
      ok: true,
      env: NODE_ENV,
      db: { enabled: hasPg, ok: dbOk },
      leadsCount,
      backup: { lastBackupAt },
      ts: nowIso(),
    })
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '').trim()
  if (!email || !password) return res.status(400).json({ ok: false, error: 'Missing credentials' })
  let user = null
  if (pool) {
    const q = await dbQuery('SELECT id, email, role, password_hash FROM crm_users WHERE email = $1 LIMIT 1', [email])
    user = q.rowCount ? q.rows[0] : null
  } else {
    user = readArrayFile('users').find((x) => String(x.email || '').toLowerCase() === email) || null
  }
  if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' })
  const valid = await bcrypt.compare(password, String(user.password_hash || user.passwordHash || ''))
  if (!valid) return res.status(401).json({ ok: false, error: 'Invalid credentials' })
  const token = jwt.sign({ sub: String(user.id), email: user.email, role: user.role || 'viewer' }, JWT_SECRET, {
    expiresIn: '8h',
  })
  return res.json({ ok: true, token, user: { email: user.email, role: user.role || 'viewer' } })
})

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  if (!req.auth) return res.status(401).json({ ok: false, error: 'Unauthorized' })
  return res.json({ ok: true, user: req.auth })
})

async function handleLeadCreate(req, res, forced = {}) {
  const lang = req.body?.lang === 'ua' || req.body?.lang === 'en' ? req.body?.lang : 'cz'
  try {
    const lead = await createLead({ ...(req.body || {}), ...forced })
    const dispatch = await queueLeadDelivery(lead)
    await insertAudit(null, 'lead_created', 'lead', lead.id, { source: lead.source })

    let customer = await findCustomerByEmail(lead.email)
    if (!customer) {
      customer = await createCustomer({
        name: lead.fullName || lead.name || '',
        phone: lead.phone || null,
        email: lead.email || null,
        clientType: 'osoba',
      })
    }
    const serviceMap = { 'Електромонтаж': 'elektro', 'Будівельні роботи': 'stavebni', 'Ремонт': 'stavebni' }
    const job = await createJob({
      customerId: customer.id,
      leadId: lead.id,
      title: `Zakázka ${lead.name || lead.fullName || ''}`.trim(),
      jobType: serviceMap[lead.serviceType] || 'kombinovana',
      source: lead.source || 'web_form',
      stage: 'nova_poptavka',
      pipelineStage: 'nova_poptavka',
      waitingFor: 'client',
      blockingFactor: dispatch.mail?.ok ? 'none' : 'missing_form',
      nextAction: dispatch.mail?.ok ? 'Čekáme na formulář od klienta' : 'Odeslat informační formulář klientovi',
      lastClientContactAt: null,
      lastInternalActionAt: nowIso(),
      notes: lead.comment || null,
      formSentAt: dispatch.mail?.ok ? nowIso() : null,
      nextActionDueAt: dispatch.mail?.ok ? new Date(Date.now() + 3 * 86400000).toISOString() : null,
    })
    await addJobEvent(job.id, { eventType: 'stage_change', eventCode: 'job_created_from_lead', actorType: 'system', title: 'Nová poptávka vytvořena', description: `Klient: ${customer.name}, zdroj: ${lead.source || 'web_form'}`, message: 'Systém vytvořil zákazníka a zakázku z nové poptávky', metadata: { leadId: lead.id, customerId: customer.id } })
    if (dispatch.mail?.ok) {
      await updateJob(job.id, { formSentAt: nowIso(), lastClientContactAt: nowIso(), waitingFor: 'client', blockingFactor: 'missing_form', nextAction: 'Vyčkat na vyplněný formulář klienta' })
      await addJobEvent(job.id, { eventType: 'email_sent', eventCode: 'form_sent', actorType: 'system', title: 'Informační formulář odeslán', description: `Email: ${lead.email}`, message: 'Systém odeslal informační formulář klientovi', metadata: { email: lead.email } })
    }
    await addJobTask(job.id, { taskType: 'lead_review', title: 'Zkontrolovat novou poptávku', isSystemGenerated: true, priority: 'normal', assignedTo: 'internal_sales' })

    return res.json({ ok: true, lead: dispatch.lead || lead, dispatch: { whatsapp: dispatch.wa, emailClient: dispatch.mail }, job: enrichJob(job), customer })
  } catch (e) {
    const reason = String(e?.message || e)
    if (reason === 'required') return res.status(400).json({ ok: false, error: publicError(lang, 'required') })
    if (reason === 'invalid_phone') return res.status(400).json({ ok: false, error: publicError(lang, 'phone') })
    if (reason === 'invalid_email') return res.status(400).json({ ok: false, error: publicError(lang, 'email') })
    return res.status(500).json({ ok: false, error: 'Failed to create lead' })
  }
}

app.post('/api/leads', async (req, res) => handleLeadCreate(req, res))

app.post('/api/leads/email', async (req, res) => {
  return handleLeadCreate(req, res, {
    source: 'email',
    lang: 'ua',
    name: req.body?.name || 'Клієнт',
    comment: req.body?.comment || req.body?.subject || '',
  })
})

app.post('/api/inbound/email', async (req, res) => {
  try {
    const inboundFrom = extractFirstEmail(req.body?.from || req.body?.sender || req.body?.reply_to || '')
    const explicitLeadId = Number(req.body?.leadId)
    const text = String(req.body?.text || req.body?.body || req.body?.plain || '').trim()
    const subject = String(req.body?.subject || '').trim()
    const lead = await findLeadForBrief({
      leadId: Number.isFinite(explicitLeadId) ? explicitLeadId : null,
      leadEmail: inboundFrom,
      leadPhone: req.body?.phone || '',
    })
    if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' })
    const inbound = {
      from: inboundFrom || null,
      subject: subject || null,
      text: text || null,
      receivedAt: nowIso(),
    }
    const existingBrief = lead.brief && typeof lead.brief === 'object' ? lead.brief : {}
    const updated = await updateLead(lead.id, {
      status: STATUS.FORM_RECEIVED,
      wave: Math.max(Number(lead.wave || 1), 2),
      brief: { ...existingBrief, inboundEmail: inbound },
      briefReceivedAt: nowIso(),
    })
    await insertAudit(null, 'inbound_email_linked', 'lead', lead.id, { from: inboundFrom, subject })
    return res.json({ ok: true, lead: updated })
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

app.get('/api/crm/export/leads.csv', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const scope = String(req.query?.scope || 'all').trim().toLowerCase()
  const leads = await getLeads()
  const rows = leads.filter((x) => {
    const wave = Number(x.wave || 1)
    if (scope === 'wave1') return wave === 1
    if (scope === 'wave2') return wave === 2
    if (scope === 'wave3') return wave >= 3
    return true
  })
  const csvRows = rows.map((x) => ({
    createdAt: x.createdAt || '',
    fullName: x.fullName || x.name || '',
    phone: x.phone || '',
    email: x.email || '',
    status: x.status || '',
    wave: Number(x.wave || 1),
    serviceType: x.serviceType || '',
    manager: x.manager || '',
    comment: x.comment || '',
  }))
  const csv = buildCsv(['createdAt', 'fullName', 'phone', 'email', 'status', 'wave', 'serviceType', 'manager', 'comment'], csvRows)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="leads-${scope || 'all'}.csv"`)
  return res.status(200).send(csv)
})

app.get('/api/crm/export/cases.csv', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const cases = await listCommercialCases()
  const csvRows = cases.map((x) => ({
    createdAt: x.created_at || x.createdAt || '',
    internalOrderId: x.internal_order_id || x.internalOrderId || '',
    client: x.company_name || x.person_name || '',
    email: x.person_email || x.client_contact_email || '',
    phone: x.person_phone || x.client_contact_phone || '',
    orderType: x.order_type || x.orderType || '',
    stage: x.stage || '',
    status: x.status || '',
    offerAmount: x.offer_amount ?? x.offerAmount ?? '',
    startDate: x.start_date || x.startDate || '',
    endDate: x.end_date || x.endDate || '',
    manager: x.company_manager || x.companyManager || '',
    notes: x.notes || '',
  }))
  const csv = buildCsv(
    ['createdAt', 'internalOrderId', 'client', 'email', 'phone', 'orderType', 'stage', 'status', 'offerAmount', 'startDate', 'endDate', 'manager', 'notes'],
    csvRows
  )
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="commercial-cases.csv"')
  return res.status(200).send(csv)
})

app.post('/api/client-brief', async (req, res) => {
  try {
    const toStringArray = (value) => {
      if (Array.isArray(value)) return value.map((x) => String(x || '').trim()).filter(Boolean)
      if (value == null) return []
      const text = String(value).trim()
      return text ? [text] : []
    }
    const leadId = Number(req.body?.leadId)
    const leadEmail = String(req.body?.leadEmail || req.body?.clientEmail || req.body?.email || '').trim().toLowerCase()
    const leadPhone = normPhone(req.body?.leadPhone || req.body?.phone || '')
    const clientName = String(req.body?.clientName || req.body?.name || '').trim()
    const clientEmail = String(req.body?.clientEmail || req.body?.email || leadEmail || '').trim().toLowerCase()
    const companyIco = String(req.body?.companyIco || '').trim()
    const companyAddress = String(req.body?.companyAddress || '').trim()
    const realizationAddress = String(req.body?.realizationAddress || req.body?.address || '').trim()
    const requestTypes = toStringArray(req.body?.requestTypes)
    const requestOther = String(req.body?.requestOther || '').trim()
    const objectType = String(req.body?.objectType || '').trim()
    const documents = toStringArray(req.body?.documents)
    const requestedTerm = String(req.body?.requestedTerm || '').trim()
    const termOther = String(req.body?.termOther || '').trim()
    const scopeType = String(req.body?.scopeType || '').trim()
    const scopePartialDetails = String(req.body?.scopePartialDetails || '').trim()
    const area = String(req.body?.area || '').trim()
    const hasBudget = String(req.body?.hasBudget || '').trim()
    const budgetAmount = String(req.body?.budgetAmount || req.body?.budget || '').trim()
    const budgetNeedsProposal = Boolean(req.body?.budgetNeedsProposal)
    const sourceChannels = toStringArray(req.body?.sourceChannels)
    const sourceOther = String(req.body?.sourceOther || '').trim()
    const note = String(req.body?.note || req.body?.details || req.body?.message || '').trim()
    const consentGiven = Boolean(req.body?.consentGiven)

    const workType = requestTypes.length || requestOther ? [...requestTypes, requestOther].filter(Boolean).join(', ') : String(req.body?.workType || '').trim()
    const timeline = requestedTerm || termOther || String(req.body?.timeline || '').trim()
    const budget = budgetAmount || (budgetNeedsProposal ? 'Потрібна пропозиція' : '')
    const sourceText = [...sourceChannels, sourceOther].filter(Boolean).join(', ')
    const details = [
      note ? `Примітка: ${note}` : '',
      scopeType ? `Обсяг: ${scopeType}${scopePartialDetails ? ` (${scopePartialDetails})` : ''}` : '',
      documents.length ? `Підкладки: ${documents.join(', ')}` : '',
      sourceText ? `Джерело: ${sourceText}` : '',
    ].filter(Boolean).join(' | ')
    const company = String(req.body?.company || clientName || objectType || 'Заявка з формуляра').trim()
    const goal = String(req.body?.goal || workType || 'Уточнення по проєкту').trim()

    if (!clientName || !clientEmail || !goal || !consentGiven) {
      return res.status(400).json({ ok: false, error: 'Please fill required fields.' })
    }
    if (!validEmail(clientEmail)) return res.status(400).json({ ok: false, error: 'Invalid email format.' })

    let companyRegistry = null
    if (companyIco) {
      const ares = await lookupAresCompanies(companyIco)
      companyRegistry = ares[0] || null
    }

    const summaryText = [
      `Клієнт: ${clientName}`,
      `Email: ${clientEmail}`,
      `Телефон: ${leadPhone || '—'}`,
      `Тип клієнта: ${companyIco ? 'Компанія' : 'Фізична особа'}`,
      companyIco ? `IČO: ${companyIco}` : '',
      companyRegistry?.name ? `Назва з реєстру: ${companyRegistry.name}` : '',
      companyRegistry?.dic ? `DIČ: ${companyRegistry.dic}` : '',
      companyAddress ? `Адреса/сидло: ${companyAddress}` : '',
      companyRegistry?.address || companyRegistry?.city ? `Офіційна адреса: ${[companyRegistry?.address, companyRegistry?.city, companyRegistry?.zip].filter(Boolean).join(', ')}` : '',
      realizationAddress ? `Локація реалізації: ${realizationAddress}` : '',
      `Що потрібно: ${goal}`,
      objectType ? `Тип об'єкта: ${objectType}` : '',
      documents.length ? `Підкладки: ${documents.join(', ')}` : '',
      timeline ? `Термін: ${timeline}` : '',
      area ? `Площа: ${area}` : '',
      budget ? `Бюджет: ${budget}` : '',
      sourceText ? `Як дізнались: ${sourceText}` : '',
      note ? `Примітка: ${note}` : '',
    ].filter(Boolean).join('\n')

    const lead = await findLeadForBrief({ leadId, leadEmail, leadPhone })
    let updatedLead = null
    let offerDraft = null
    if (lead) {
      updatedLead = await updateLead(lead.id, {
        brief: {
          company,
          goal,
          details: details || summaryText,
          summaryText,
          formVersion: 'informacni_formular_v1',
          clientName: clientName || null,
          clientEmail: clientEmail || null,
          clientPhone: leadPhone || null,
          companyIco: companyIco || null,
          companyAddress: companyAddress || null,
          companyRegistry,
          realizationAddress: realizationAddress || null,
          requestTypes,
          requestOther: requestOther || null,
          objectType: objectType || null,
          workType: workType || null,
          address: realizationAddress || null,
          documents,
          requestedTerm: requestedTerm || null,
          termOther: termOther || null,
          scopeType: scopeType || null,
          scopePartialDetails: scopePartialDetails || null,
          area: area || null,
          budget: budget || null,
          timeline: timeline || null,
          hasBudget: hasBudget || null,
          budgetAmount: budgetAmount || null,
          budgetNeedsProposal,
          sourceChannels,
          sourceOther: sourceOther || null,
          note: note || null,
          consentGiven,
          receivedAt: nowIso(),
        },
        briefReceivedAt: nowIso(),
        status: STATUS.FORM_RECEIVED,
        wave: Math.max(Number(lead.wave || 1), 2),
      })
      await insertAudit(null, 'brief_received', 'lead', lead.id, { wave: updatedLead?.wave || 2 })
      try {
        offerDraft = await createOfferDraftFromLead(updatedLead)
      } catch (offerErr) {
        await insertAudit(null, 'offer_auto_create_failed', 'lead', lead.id, { error: String(offerErr?.message || offerErr) })
      }
      const linkedJob = await findJobByLeadId(lead.id)
      if (linkedJob && linkedJob.stage === 'nova_poptavka') {
        await updateJob(linkedJob.id, {
          stage: 'podklady',
          pipelineStage: 'podklady',
          formReceivedAt: nowIso(),
          waitingFor: 'internal_sales',
          blockingFactor: 'none',
          nextAction: 'Zpracovat podklady a připravit kalkulaci',
          nextActionDueAt: new Date(Date.now() + 2 * 86400000).toISOString(),
          lastClientContactAt: nowIso(),
        })
        await addJobEvent(linkedJob.id, { eventType: 'stage_change', eventCode: 'brief_received', actorType: 'customer', title: 'Podklady od klienta přijaty', description: `Formulář přijat`, message: 'Klient odeslal informační formulář', metadata: { leadId: lead.id } })
        await addJobDocument(linkedJob.id, { docType: 'formular', documentType: 'formular', fileName: 'Informační formulář klienta', status: 'received', uploadedBy: 'system', source: 'client_form', isFinal: true })
        await addJobTask(linkedJob.id, { taskType: 'offer_preparation', title: 'Připravit kalkulaci a návrh nabídky', isSystemGenerated: true, priority: 'high', assignedTo: 'internal_sales', dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) })
      }
    }
    const dispatch = await sendBriefToOwner({ company, goal, details: summaryText })
    if (!dispatch.ok) return res.status(502).json({ ok: false, error: 'Failed to send brief email.', dispatch })
    return res.json({ ok: true, dispatch, linkedLead: updatedLead, offerDraft })
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

app.get('/api/leads', async (_req, res) => {
  const leads = await getLeads()
  return res.json({ ok: true, leads })
})

app.get('/api/leads/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const lead = await getLeadById(id)
  if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' })
  return res.json({ ok: true, lead })
})

app.get('/api/crm/client-workspace/:leadId', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const leadId = Number(req.params.leadId)
  if (!Number.isFinite(leadId)) return res.status(400).json({ ok: false, error: 'Invalid leadId' })
  const lead = await getLeadById(leadId)
  if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' })
  const [estimates, cases, audits] = await Promise.all([
    listEstimates({ leadId }),
    listCommercialCases().then((rows) => rows.filter((x) => Number(x.lead_id || x.leadId) === leadId)),
    listAuditRowsForLead(leadId),
  ])
  return res.json({
    ok: true,
    workspace: {
      lead,
      timeline: buildLeadTimeline(lead, audits),
      estimates,
      cases: cases.map((x) => ({ ...x, signals: computeCaseSignals(x) })),
    },
  })
})

app.patch('/api/leads/:id', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const lead = await updateLead(id, {
    status: req.body?.status,
    managerComment: req.body?.managerComment,
    source: req.body?.source,
    manager: req.body?.manager,
    serviceType: req.body?.serviceType,
    clientNumber: req.body?.clientNumber,
    wave: req.body?.wave,
  })
  if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' })
  await insertAudit(req.auth?.email || null, 'lead_updated', 'lead', id, req.body || {})
  return res.json({ ok: true, lead })
})

app.post('/api/leads/:id/enrich-company-by-ico', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const ico = String(req.body?.ico || '').trim()
  if (!ico) return res.status(400).json({ ok: false, error: 'ico is required' })
  const lead = await getLeadById(id)
  if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' })
  const found = await lookupAresCompanies(ico)
  const company = found[0] || null
  if (!company) return res.status(404).json({ ok: false, error: 'Company not found by IČO' })
  const currentBrief = lead.brief && typeof lead.brief === 'object' ? lead.brief : {}
  const nextBrief = {
    ...currentBrief,
    companyIco: ico,
    companyRegistry: company,
    summaryText: [
      currentBrief.summaryText ? String(currentBrief.summaryText) : '',
      `Оновлено з ARES по IČO ${ico}: ${company.name || ''}`.trim(),
    ].filter(Boolean).join('\n'),
  }
  const updated = await updateLead(id, { brief: nextBrief })
  await insertAudit(req.auth?.email || null, 'lead_enriched_by_ico', 'lead', id, { ico })
  return res.json({ ok: true, lead: updated, company })
})

app.delete('/api/leads/:id', authMiddleware, roleGuard(['admin']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const deletePassword = String(req.body?.deletePassword || '').trim()
  if (!deletePassword || deletePassword !== LEAD_DELETE_PASSWORD) {
    return res.status(403).json({ ok: false, error: 'Invalid delete password' })
  }
  const removed = await deleteLead(id)
  if (!removed) return res.status(404).json({ ok: false, error: 'Lead not found' })
  await insertAudit(req.auth?.email || null, 'lead_deleted', 'lead', id, null)
  return res.json({ ok: true, removedId: id, removedLead: removed })
})

app.post('/api/leads/:id/resend-whatsapp', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const lead = await getLeadById(id)
  if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' })
  const wa = await sendWhatsAppLead(lead)
  await insertAudit(req.auth?.email || null, 'lead_resend_whatsapp', 'lead', id, { ok: wa.ok })
  return res.json({ ok: true, whatsapp: wa })
})

app.post('/api/crm/cases', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const missing = requireFields(req.body || {}, ['clientType', 'orderType'])
  if (missing.length) return res.status(400).json({ ok: false, error: `Missing fields: ${missing.join(', ')}` })
  const created = await insertCommercialCase({
    leadId: req.body?.leadId ? Number(req.body.leadId) : null,
    clientType: String(req.body?.clientType || 'person'),
    companyName: req.body?.companyName,
    companyIco: req.body?.companyIco,
    personName: req.body?.personName,
    personEmail: req.body?.personEmail,
    personPhone: req.body?.personPhone,
    orderType: req.body?.orderType,
    internalOrderId: req.body?.internalOrderId,
    offerAmount: req.body?.offerAmount,
    notes: req.body?.notes,
    stage: req.body?.stage || 'preparation',
    status: req.body?.status || STATUS.CONTACTED,
    startDate: req.body?.startDate,
    endDate: req.body?.endDate,
    companyManager: req.body?.companyManager,
    clientContactName: req.body?.clientContactName,
    clientContactPhone: req.body?.clientContactPhone,
    clientContactEmail: req.body?.clientContactEmail,
  })
  if (created.lead_id || created.leadId) {
    const leadId = Number(created.lead_id || created.leadId)
    await updateLead(leadId, { status: STATUS.CONTACTED })
  }
  await insertAudit(req.auth?.email || null, 'case_created', 'commercial_case', created.id, req.body || {})
  return res.json({ ok: true, case: created })
})

app.get('/api/crm/cases', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const rows = await listCommercialCases({
    orderType: req.query?.orderType ? String(req.query.orderType) : '',
    status: req.query?.status ? String(req.query.status) : '',
    internalOrderId: req.query?.internalOrderId ? String(req.query.internalOrderId) : '',
    manager: req.query?.manager ? String(req.query.manager) : '',
    periodFrom: req.query?.periodFrom ? String(req.query.periodFrom) : '',
    periodTo: req.query?.periodTo ? String(req.query.periodTo) : '',
  })
  const mapped = rows.map((x) => ({ ...x, signals: computeCaseSignals(x) }))
  return res.json({ ok: true, cases: mapped })
})

app.post('/api/crm/cases/from-form-ai', authMiddleware, roleGuard(['admin', 'manager']), upload.single('formFile'), async (req, res) => {
  const leadId = Number(req.body?.leadId)
  if (!Number.isFinite(leadId)) return res.status(400).json({ ok: false, error: 'leadId is required' })
  const lead = await getLeadById(leadId)
  if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' })
  try {
    const manualText = String(req.body?.formText || '').trim()
    const fileText = await extractTextFromUploadedFile(req.file)
    const briefText = lead.brief ? JSON.stringify(lead.brief) : ''
    const combinedText = [briefText, manualText, fileText].filter(Boolean).join('\n\n')
    if (!combinedText) return res.status(400).json({ ok: false, error: 'No form content provided' })

    const aiCase = await openAiExtractCommercialCase({ lead, formText: combinedText })
    const created = await insertCommercialCase({
      leadId: lead.id,
      clientType: aiCase.clientType || (aiCase.companyName ? 'company' : 'person'),
      companyName: aiCase.companyName || '',
      companyIco: aiCase.companyIco || '',
      personName: aiCase.personName || lead.name || '',
      personEmail: aiCase.personEmail || lead.email || '',
      personPhone: aiCase.personPhone || lead.phone || '',
      orderType: aiCase.orderType || 'combined',
      internalOrderId: aiCase.internalOrderId || `INT-${lead.id}-${Date.now().toString().slice(-5)}`,
      offerAmount: aiCase.offerAmount != null ? Number(aiCase.offerAmount) : null,
      notes: aiCase.notes || '',
      stage: aiCase.stage || 'preparation',
      status: aiCase.status || STATUS.CONTACTED,
      startDate: aiCase.startDate || null,
      endDate: aiCase.endDate || null,
      companyManager: aiCase.companyManager || '',
      clientContactName: aiCase.clientContactName || '',
      clientContactPhone: aiCase.clientContactPhone || '',
      clientContactEmail: aiCase.clientContactEmail || '',
    })
    await updateLead(lead.id, { status: STATUS.CONTACTED, wave: Math.max(Number(lead.wave || 1), 2) })
    await insertAudit(req.auth?.email || null, 'case_created_from_ai_form', 'commercial_case', created.id, { leadId })
    return res.json({ ok: true, case: { ...created, signals: computeCaseSignals(created) }, extracted: aiCase })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'AI case extraction failed', details: String(e?.message || e) })
  }
})

app.patch('/api/crm/cases/:id', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const row = await updateCommercialCase(id, req.body || {})
  if (!row) return res.status(404).json({ ok: false, error: 'Case not found' })
  await insertAudit(req.auth?.email || null, 'case_updated', 'commercial_case', id, req.body || {})
  return res.json({ ok: true, case: { ...row, signals: computeCaseSignals(row) } })
})

app.post('/api/crm/cases/:id/send-offer', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const row = await getCommercialCaseById(id)
  if (!row) return res.status(404).json({ ok: false, error: 'Case not found' })
  const email =
    String(req.body?.email || '').trim() ||
    String(row.client_contact_email || '').trim() ||
    String(row.person_email || '').trim()
  if (!email || !validEmail(email)) return res.status(400).json({ ok: false, error: 'Valid email is required' })
  const offerAmount = req.body?.offerAmount != null ? Number(req.body.offerAmount) : Number(row.offer_amount || 0)
  const internalOrderId = String(row.internal_order_id || '').trim() || `CASE-${id}`
  const subject = String(req.body?.subject || `Комерційна пропозиція ${internalOrderId}`).trim()
  const text = String(
    req.body?.text ||
      `Добрий день!\n\nНадсилаємо комерційну пропозицію по замовленню ${internalOrderId}.\nСума пропозиції: ${Number.isFinite(offerAmount) ? offerAmount : 0} CZK.\n\nПідтвердьте, будь ласка, відповіддю на цей email.\n\nЗ повагою,\nTemoWeb`
  ).trim()
  const mail = await sendResendEmail({ to: email, subject, text })
  const status = mail.ok ? 'offer_sent' : 'need_attention'
  const stage = mail.ok ? 'offer_sent' : 'preparation'
  const noteBlock = `\n[${nowIso()}] Offer email ${mail.ok ? 'sent' : 'failed'} to ${email}`
  const updated = await updateCommercialCase(id, {
    status,
    stage,
    offerAmount: Number.isFinite(offerAmount) ? offerAmount : row.offer_amount,
    notes: `${String(row.notes || '')}${noteBlock}`.trim(),
  })
  if (row.lead_id) {
    await updateLead(Number(row.lead_id), {
      status: mail.ok ? STATUS.FORM_SENT : STATUS.INVALID_EMAIL,
      proposalMailState: mail.ok ? 'sent' : 'failed',
      proposalSentAt: mail.ok ? nowIso() : null,
      proposalError: mail.ok ? null : 'Помилка відправки КП',
      wave: Math.max(2, Number((await getLeadById(Number(row.lead_id)))?.wave || 1)),
    })
  }
  await insertAudit(req.auth?.email || null, 'case_offer_sent', 'commercial_case', id, { email, ok: mail.ok })
  return res.json({ ok: true, case: { ...updated, signals: computeCaseSignals(updated) }, mail })
})

app.post('/api/crm/cases/:id/accept-offer', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const row = await getCommercialCaseById(id)
  if (!row) return res.status(404).json({ ok: false, error: 'Case not found' })
  const dueDate = String(req.body?.dueDate || '').trim()
  const amount = req.body?.amount != null ? Number(req.body.amount) : Number(row.offer_amount || 0)
  const invoiceResp = await createAndSendFakturoidInvoice({
    subjectId: req.body?.subjectId,
    amount,
    dueDate,
    email: req.body?.email || row.client_contact_email || row.person_email,
    lineName: req.body?.lineName || `Замовлення ${row.internal_order_id || id}`,
    emailSubject: req.body?.emailSubject,
    emailMessage: req.body?.emailMessage,
  })
  if (!invoiceResp.ok) {
    return res.status(502).json({ ok: false, error: invoiceResp.error, details: invoiceResp.details, invoice: invoiceResp.invoice || null })
  }
  const updated = await updateCommercialCase(id, {
    status: 'in_execution',
    stage: 'in_execution',
    notes: `${String(row.notes || '')}\n[${nowIso()}] Offer accepted. Invoice ${invoiceResp.invoice?.id || ''} sent.`.trim(),
  })
  if (row.lead_id) {
    await updateLead(Number(row.lead_id), {
      status: STATUS.EXECUTION,
      wave: 3,
    })
  }
  await insertAudit(req.auth?.email || null, 'case_offer_accepted_invoice_sent', 'commercial_case', id, { invoiceId: invoiceResp.invoice?.id || null })
  return res.json({ ok: true, case: { ...updated, signals: computeCaseSignals(updated) }, invoice: invoiceResp.invoice })
})

app.get('/api/crm/offers', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const offers = await listCommercialOffers({
    leadId: req.query?.leadId ? Number(req.query.leadId) : null,
    caseId: req.query?.caseId ? Number(req.query.caseId) : null,
    status: req.query?.status ? String(req.query.status) : '',
  })
  return res.json({ ok: true, offers: offers.map(publicOffer) })
})

app.get('/api/crm/offers/:id', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const offer = await getCommercialOfferById(id)
  if (!offer) return res.status(404).json({ ok: false, error: 'Offer not found' })
  return res.json({ ok: true, offer: publicOffer(offer) })
})

app.post('/api/crm/offers/from-lead-ai', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const leadId = Number(req.body?.leadId)
  if (!Number.isFinite(leadId)) return res.status(400).json({ ok: false, error: 'leadId is required' })
  const lead = await getLeadById(leadId)
  if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' })
  try {
    const offer = await createOfferDraftFromLead(lead, req.auth?.email || null)
    return res.json({ ok: true, offer: publicOffer(offer) })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Offer generation failed', details: String(e?.message || e) })
  }
})

app.patch('/api/crm/offers/:id', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const next = await updateCommercialOffer(id, {
    status: req.body?.status,
    templateKey: req.body?.templateKey,
    currency: req.body?.currency,
    vatRate: req.body?.vatRate,
    pricingMode: req.body?.pricingMode,
    sourceNote: req.body?.sourceNote,
    scopeSummary: req.body?.scopeSummary,
    assumptions: req.body?.assumptions,
    warnings: req.body?.warnings,
    lines: req.body?.lines,
    generatedBy: req.body?.generatedBy,
    sentAt: req.body?.sentAt,
  })
  if (!next) return res.status(404).json({ ok: false, error: 'Offer not found' })
  await insertAudit(req.auth?.email || null, 'offer_updated', 'offer', id, req.body || {})
  return res.json({ ok: true, offer: publicOffer(next) })
})

app.post('/api/crm/offers/:id/build-documents', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const offer = await getCommercialOfferById(id)
  if (!offer) return res.status(404).json({ ok: false, error: 'Offer not found' })
  const lead = offer.leadId ? await getLeadById(Number(offer.leadId)) : null
  try {
    const xlsxPath = await buildOfferXlsxFile({ offer, lead })
    const pdfResult = await convertXlsxToPdfIfPossible(xlsxPath)
    const files = [
      {
        kind: 'xlsx',
        fileName: path.basename(xlsxPath),
        filePath: xlsxPath,
        url: publicFileUrl(xlsxPath),
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: fs.statSync(xlsxPath).size,
        createdAt: nowIso(),
      },
    ]
    if (pdfResult.ok) {
      const pdfPath = pdfResult.pdfPath
      files.push({
        kind: 'pdf',
        fileName: path.basename(pdfPath),
        filePath: pdfPath,
        url: publicFileUrl(pdfPath),
        mime: 'application/pdf',
        size: fs.statSync(pdfPath).size,
        createdAt: nowIso(),
      })
    }
    const updated = await updateCommercialOffer(id, {
      files,
      warnings: pdfResult.ok
        ? offer.warnings || []
        : [...(Array.isArray(offer.warnings) ? offer.warnings : []), 'PDF не згенеровано: на сервері відсутній LibreOffice (soffice).'],
    })
    await insertAudit(req.auth?.email || null, 'offer_documents_built', 'offer', id, {
      files: files.map((x) => ({ kind: x.kind, fileName: x.fileName })),
      pdfOk: pdfResult.ok,
      pdfReason: pdfResult.reason || null,
    })
    return res.json({ ok: true, offer: publicOffer(updated), pdf: pdfResult })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Failed to build documents', details: String(e?.message || e) })
  }
})

app.post('/api/crm/offers/:id/send-to-client', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const offer = await getCommercialOfferById(id)
  if (!offer) return res.status(404).json({ ok: false, error: 'Offer not found' })
  const lead = offer.leadId ? await getLeadById(Number(offer.leadId)) : null
  const files = Array.isArray(offer.files) ? offer.files : []
  const pdf = files.find((x) => x.kind === 'pdf' && x.filePath && fs.existsSync(x.filePath))
  const xlsx = files.find((x) => x.kind === 'xlsx' && x.filePath && fs.existsSync(x.filePath))
  if (!pdf || !xlsx) {
    return res.status(400).json({ ok: false, error: 'Потрібно спочатку згенерувати файли КП (Excel + PDF).' })
  }
  const to = String(req.body?.email || lead?.email || '').trim().toLowerCase()
  if (!to || !validEmail(to)) return res.status(400).json({ ok: false, error: 'Valid email is required' })
  const subject = String(req.body?.subject || `Комерційна пропозиція ${offer.offerNo || ''}`).trim()
  const text = String(
    req.body?.text ||
      `Добрий день!\n\nНадсилаємо комерційну пропозицію ${offer.offerNo || ''}.\nУ вкладенні PDF для клієнта та Excel для опрацювання.\n\nЗ повагою,\nTemoWeb`
  ).trim()
  const mail = await sendResendEmail({
    to,
    subject,
    text,
    attachments: [
      { filename: pdf.fileName, content: fileToBase64(pdf.filePath) },
      { filename: xlsx.fileName, content: fileToBase64(xlsx.filePath) },
    ],
  })
  if (!mail.ok) {
    await insertAudit(req.auth?.email || null, 'offer_send_failed', 'offer', id, { to, reason: mail.reason, details: mail.details || null })
    return res.status(502).json({ ok: false, error: 'Failed to send offer email', mail })
  }
  const updated = await updateCommercialOffer(id, { status: OFFER_STATUS.SENT, sentAt: nowIso() })
  if (lead) {
    await updateLead(Number(lead.id), { status: STATUS.OFFER_SENT, wave: Math.max(2, Number(lead.wave || 1)) })
  }
  await insertAudit(req.auth?.email || null, 'offer_sent_to_client', 'offer', id, { to })
  return res.json({ ok: true, offer: publicOffer(updated), mail })
})

app.get('/api/crm/offers/:id/file/:kind', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const id = Number(req.params.id)
  const kind = String(req.params.kind || '').trim().toLowerCase()
  if (!Number.isFinite(id) || !['xlsx', 'pdf'].includes(kind)) {
    return res.status(400).json({ ok: false, error: 'Invalid params' })
  }
  const offer = await getCommercialOfferById(id)
  if (!offer) return res.status(404).json({ ok: false, error: 'Offer not found' })
  const file = (Array.isArray(offer.files) ? offer.files : []).find((x) => x.kind === kind)
  if (!file || !file.filePath || !fs.existsSync(file.filePath)) return res.status(404).json({ ok: false, error: 'File not found' })
  return res.download(file.filePath, file.fileName || path.basename(file.filePath))
})

app.get('/api/crm/catalog/items', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const items = await listServiceCatalogItems({
    tradeType: req.query?.tradeType ? String(req.query.tradeType) : '',
    buildingType: req.query?.buildingType ? String(req.query.buildingType) : '',
    phaseKey: req.query?.phaseKey ? String(req.query.phaseKey) : '',
    categoryKey: req.query?.categoryKey ? String(req.query.categoryKey) : '',
    search: req.query?.search ? String(req.query.search) : '',
  })
  return res.json({ ok: true, items })
})

app.post('/api/crm/catalog/items', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  try {
    const item = await createServiceCatalogItem(req.body || {})
    await insertAudit(req.auth?.email || null, 'catalog_item_created', 'catalog_item', item.id, req.body || {})
    return res.json({ ok: true, item })
  } catch (e) {
    return res.status(400).json({ ok: false, error: String(e?.message || e) })
  }
})

app.post('/api/crm/catalog/import', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : []
  if (!items.length) return res.status(400).json({ ok: false, error: 'items are required' })
  try {
    const imported = await bulkImportServiceCatalogItems(items)
    await insertAudit(req.auth?.email || null, 'catalog_imported', 'catalog_item', imported.length, {
      count: imported.length,
      tradeType: req.body?.tradeType || null,
      source: req.body?.source || null,
    })
    return res.json({ ok: true, count: imported.length, items: imported.slice(0, 20) })
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

app.get('/api/crm/estimates', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const estimates = await listEstimates({
    leadId: req.query?.leadId ? Number(req.query.leadId) : null,
    jobId: req.query?.jobId ? Number(req.query.jobId) : null,
    status: req.query?.status ? String(req.query.status) : '',
  })
  return res.json({ ok: true, estimates })
})

app.get('/api/crm/estimates/:id', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const estimate = await getEstimateById(id)
  if (!estimate) return res.status(404).json({ ok: false, error: 'Estimate not found' })
  return res.json({ ok: true, estimate })
})

app.post('/api/crm/estimates/from-lead', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const leadId = Number(req.body?.leadId)
  if (!Number.isFinite(leadId)) return res.status(400).json({ ok: false, error: 'leadId is required' })
  const lead = await getLeadById(leadId)
  if (!lead) return res.status(404).json({ ok: false, error: 'Lead not found' })
  const job = await findJobByLeadId(leadId)
  const existing = (await listEstimates({ leadId, jobId: job?.id || null })).find((x) => String(x.status || '') !== ESTIMATE_STATUS.ARCHIVED)
  if (existing) return res.json({ ok: true, estimate: existing, reused: true })
  const estimate = job ? await createEstimateDraftFromJob(job) : await createEstimateDraftFromLead(lead)
  await insertAudit(req.auth?.email || null, 'estimate_created', 'estimate', estimate.id, { leadId, estimateNo: estimate.estimateNo })
  return res.json({ ok: true, estimate, reused: false })
})

app.post('/api/crm/estimates/from-job', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const jobId = Number(req.body?.jobId)
  if (!Number.isFinite(jobId)) return res.status(400).json({ ok: false, error: 'jobId is required' })
  const job = await getJobById(jobId)
  if (!job) return res.status(404).json({ ok: false, error: 'Job not found' })
  const existing = (await listEstimates({ jobId })).find((x) => String(x.status || '') !== ESTIMATE_STATUS.ARCHIVED)
  if (existing) return res.json({ ok: true, estimate: existing, reused: true })
  const estimate = await createEstimateDraftFromJob(job)
  await insertAudit(req.auth?.email || null, 'estimate_created_from_job', 'estimate', estimate.id, { jobId, estimateNo: estimate.estimateNo })
  return res.json({ ok: true, estimate, reused: false })
})

app.patch('/api/crm/estimates/:id', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const estimate = await saveEstimate(id, req.body || {})
  if (!estimate) return res.status(404).json({ ok: false, error: 'Estimate not found' })
  await insertAudit(req.auth?.email || null, 'estimate_updated', 'estimate', id, req.body || {})
  return res.json({ ok: true, estimate })
})

app.post('/api/crm/estimates/:id/build-documents', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const estimate = await getEstimateById(id)
  if (!estimate) return res.status(404).json({ ok: false, error: 'Estimate not found' })
  const job = estimate.jobId ? await getJobById(estimate.jobId) : null
  const customer = job?.customerId ? await getCustomerById(job.customerId) : null
  let lead = null
  if (estimate.leadId) lead = await getLeadById(estimate.leadId)
  try {
    const xlsxPath = await buildEstimateXlsxFile({ estimate, lead, job, customer })
    const pdfResult = await convertXlsxToPdfIfPossible(xlsxPath)
    const docs = []
    docs.push(await addJobDocument(job?.id || 0, { documentType: 'kalkulace', fileName: path.basename(xlsxPath), filePath: xlsxPath, fileUrl: publicFileUrl(xlsxPath), storageKey: xlsxPath, status: 'created', version: 1, uploadedBy: 'system', source: 'estimate_builder', isFinal: true }))
    if (pdfResult.ok) {
      docs.push(await addJobDocument(job?.id || 0, { documentType: 'kalkulace', fileName: path.basename(pdfResult.pdfPath), filePath: pdfResult.pdfPath, fileUrl: publicFileUrl(pdfResult.pdfPath), storageKey: pdfResult.pdfPath, status: 'created', version: 1, uploadedBy: 'system', source: 'estimate_builder', isFinal: true }))
    }
    if (job?.id) {
      await addJobEvent(job.id, { eventType: 'document_added', eventCode: 'estimate_documents_built', actorType: 'system', title: 'Rozpočet exportován', message: 'Systém vygeneroval Excel/PDF rozpočtu', metadata: { estimateId: id, xlsx: path.basename(xlsxPath), pdf: pdfResult.ok ? path.basename(pdfResult.pdfPath) : null } })
    }
    return res.json({ ok: true, estimate, files: docs, pdf: pdfResult })
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Failed to build estimate documents', details: String(e?.message || e) })
  }
})

app.post('/api/crm/estimates/:id/send-to-client', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'Invalid id' })
  const estimate = await getEstimateById(id)
  if (!estimate) return res.status(404).json({ ok: false, error: 'Estimate not found' })
  const job = estimate.jobId ? await getJobById(estimate.jobId) : null
  const customer = job?.customerId ? await getCustomerById(job.customerId) : null
  const lead = estimate.leadId ? await getLeadById(estimate.leadId) : null
  const { xlsx, pdf } = getEstimateGeneratedFiles(estimate)
  if (!xlsx || !pdf) {
    return res.status(400).json({ ok: false, error: 'Nejprve vygenerujte Excel i PDF rozpočtu.' })
  }
  const to = String(req.body?.email || customer?.email || lead?.email || '').trim().toLowerCase()
  if (!to || !validEmail(to)) return res.status(400).json({ ok: false, error: 'Valid email is required' })
  const subject = String(req.body?.subject || `Rozpočet ${estimate.estimateNo || ''}`).trim()
  const text = String(
    req.body?.text ||
      `Dobrý den,\n\nv příloze zasíláme rozpočet ${estimate.estimateNo || ''} k zakázce ${job?.internalNumber || ''}.\nSoučástí je PDF pro klienta a Excel pro detailní rozpis.\n\nS pozdravem,\nO&L Master Dom`
  ).trim()
  const mail = await sendResendEmail({
    to,
    subject,
    text,
    attachments: [
      { filename: pdf.fileName, content: fileToBase64(pdf.filePath) },
      { filename: xlsx.fileName, content: fileToBase64(xlsx.filePath) },
    ],
  })
  if (!mail.ok) {
    await insertAudit(req.auth?.email || null, 'estimate_send_failed', 'estimate', id, { to, reason: mail.reason, details: mail.details || null })
    return res.status(502).json({ ok: false, error: 'Failed to send estimate email', mail })
  }
  const updatedEstimate = await saveEstimate(id, { status: ESTIMATE_STATUS.SENT })
  if (job?.id) {
    await updateJob(job.id, {
      pipelineStage: 'nabidka_odeslana',
      stage: 'nabidka_odeslana',
      waitingFor: 'client',
      blockingFactor: 'waiting_offer_response',
      offerSentAt: nowIso(),
      lastInternalActionAt: nowIso(),
      nextAction: 'Vyčkat na reakci klienta na rozpočet',
      nextActionDueAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    })
    await addJobEvent(job.id, {
      eventType: 'email_sent',
      eventCode: 'estimate_sent_to_client',
      actorType: 'user',
      actor: req.auth?.email || null,
      title: 'Rozpočet odeslán klientovi',
      message: `Rozpočet ${estimate.estimateNo || ''} byl odeslán na ${to}`,
      metadata: { estimateId: id, to, estimateNo: estimate.estimateNo || null },
    })
  }
  if (lead) {
    await updateLead(Number(lead.id), { status: STATUS.OFFER_SENT, wave: Math.max(2, Number(lead.wave || 1)) })
  }
  await insertAudit(req.auth?.email || null, 'estimate_sent_to_client', 'estimate', id, { to, estimateNo: estimate.estimateNo || null })
  return res.json({ ok: true, estimate: updatedEstimate, mail, files: { xlsx, pdf } })
})

app.get('/api/crm/estimates/:id/file/:kind', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const id = Number(req.params.id)
  const kind = String(req.params.kind || '').trim().toLowerCase()
  if (!Number.isFinite(id) || !['xlsx','pdf'].includes(kind)) return res.status(400).json({ ok: false, error: 'Invalid params' })
  const estimate = await getEstimateById(id)
  if (!estimate) return res.status(404).json({ ok: false, error: 'Estimate not found' })
  const files = getEstimateGeneratedFiles(estimate)
  const file = kind === 'xlsx' ? files.xlsx : files.pdf
  if (!file) return res.status(404).json({ ok: false, error: 'File not found' })
  return res.download(file.filePath, file.fileName || path.basename(file.filePath))
})

app.get('/api/crm/suppliers', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const type = String(req.query?.type || '').trim()
  const rows = await listSuppliers(type || null)
  return res.json({ ok: true, suppliers: rows })
})

app.get('/api/crm/company-lookup', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const query = String(req.query?.q || '').trim()
  if (!query || query.length < 2) return res.status(400).json({ ok: false, error: 'q is required' })
  try {
    const mapped = await lookupAresCompanies(query)
    return res.json({ ok: true, companies: mapped })
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

app.post('/api/crm/suppliers', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const missing = requireFields(req.body || {}, ['name'])
  if (missing.length) return res.status(400).json({ ok: false, error: `Missing fields: ${missing.join(', ')}` })
  const row = await createSupplier(req.body || {})
  await insertAudit(req.auth?.email || null, 'supplier_created', 'supplier', row.id, req.body || {})
  return res.json({ ok: true, supplier: row })
})

app.get('/api/crm/analytics', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const leads = await getLeads()
  const cases = (await listCommercialCases()).map((x) => ({ ...x, signals: computeCaseSignals(x) }))
  const total = leads.length
  const won = leads.filter((x) => x.status === STATUS.WON).length
  const lost = leads.filter((x) => x.status === STATUS.LOST).length
  const completed = leads.filter((x) => x.status === STATUS.COMPLETED).length
  const active = leads.filter((x) => [STATUS.CONTACTED, STATUS.FORM_SENT, STATUS.FORM_RECEIVED, STATUS.EXECUTION, STATUS.INVOICING, STATUS.WAITING].includes(String(x.status || ''))).length
  const successRate = total > 0 ? Math.round((won / total) * 10000) / 100 : 0
  const byWave = {
    wave1: leads.filter((x) => Number(x.wave || 1) === 1).length,
    wave2: leads.filter((x) => Number(x.wave || 1) === 2).length,
    wave3: leads.filter((x) => Number(x.wave || 1) >= 3).length,
  }
  const orders = {
    activeOrders: cases.filter((x) => ['contacted', 'offer_sent', 'waiting_response', 'in_execution', 'invoicing', 'need_attention'].includes(String(x.status || ''))).length,
    beforeStart: cases.filter((x) => x.signals?.daysToStart != null && x.signals.daysToStart >= 0).length,
    inExecution: cases.filter((x) => String(x.status || '') === 'in_execution').length,
    overdue: cases.filter((x) => x.signals?.daysToEnd != null && x.signals.daysToEnd < 0 && !['completed', 'won', 'lost'].includes(String(x.status || ''))).length,
    wonCases: cases.filter((x) => String(x.status || '') === 'won').length,
    lostCases: cases.filter((x) => String(x.status || '') === 'lost').length,
  }
  return res.json({ ok: true, reports: { total, won, lost, successRate, active, completed, byWave, orders } })
})

app.post('/api/crm/fakturoid/invoices/create-and-send', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const result = await createAndSendFakturoidInvoice(req.body || {})
  if (!result.ok) return res.status(502).json({ ok: false, error: result.error, details: result.details, invoice: result.invoice || null })
  await insertAudit(req.auth?.email || null, 'fakturoid_invoice_sent', 'invoice', result.invoice?.id || null, {
    email: req.body?.email || null,
  })
  return res.json({ ok: true, invoice: result.invoice })
})

/* ══════════════════════════════════════════════════════════════════
   ZAKAZKA PIPELINE API ROUTES
   ══════════════════════════════════════════════════════════════════ */

app.get('/api/crm/pipeline', async (_req, res) => {
  const jobs = await listJobs()
  const enriched = jobs.map(enrichJob)
  const byStage = {}
  for (const s of JOB_STAGES) byStage[s] = []
  for (const j of enriched) (byStage[j.pipelineStage] || (byStage[j.pipelineStage] = [])).push(j)
  const customerIds = [...new Set(enriched.map(j => j.customerId).filter(Boolean))]
  const customers = {}
  for (const cid of customerIds) { const c = await getCustomerById(cid); if (c) customers[cid] = c }
  return res.json({ ok: true, stages: JOB_STAGES, stageLabels: JOB_STAGE_LABELS, byStage, customers })
})

app.post('/api/crm/customers', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const c = await createCustomer(req.body || {})
  await insertAudit(req.auth?.email || null, 'customer_created', 'customer', c.id, req.body)
  return res.json({ ok: true, customer: c })
})
app.get('/api/crm/customers', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (_req, res) => {
  return res.json({ ok: true, customers: await listCustomers() })
})
app.get('/api/crm/customers/:id', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const c = await getCustomerById(Number(req.params.id))
  if (!c) return res.status(404).json({ ok: false, error: 'Customer not found' })
  return res.json({ ok: true, customer: c })
})

app.post('/api/crm/jobs', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const job = await createJob(req.body || {})
  await addJobEvent(job.id, { eventType: 'stage_change', eventCode: 'job_created', actorType: 'user', title: 'Zakázka vytvořena', description: `Etapa: ${JOB_STAGE_LABELS[job.pipelineStage] || job.pipelineStage}`, actor: req.auth?.email, message: 'Vytvořena nová zakázka', metadata: { pipelineStage: job.pipelineStage } })
  await insertAudit(req.auth?.email || null, 'job_created', 'job', job.id, req.body)
  return res.json({ ok: true, job: enrichJob(job) })
})
app.get('/api/crm/jobs', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const leadId = req.query?.leadId ? Number(req.query.leadId) : null
  let jobs = await listJobs({ pipelineStage: req.query?.pipelineStage || req.query?.stage, customerId: req.query?.customerId, priority: req.query?.priority, riskLevel: req.query?.riskLevel, waitingFor: req.query?.waitingFor })
  if (Number.isFinite(leadId)) jobs = jobs.filter((x) => Number(x.leadId || 0) === leadId)
  return res.json({ ok: true, jobs: jobs.map(enrichJob) })
})
app.get('/api/crm/jobs/:id', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  const job = await getJobById(Number(req.params.id))
  if (!job) return res.status(404).json({ ok: false, error: 'Job not found' })
  const customer = job.customerId ? await getCustomerById(job.customerId) : null
  const events = await listJobEvents(job.id)
  const documents = await listJobDocuments(job.id)
  const tasks = await listJobTasks(job.id)
  const invoices = await listJobInvoices(job.id)
  return res.json({ ok: true, job: enrichJob(job), customer, events, documents, tasks, invoices })
})
app.patch('/api/crm/jobs/:id', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  const updated = await updateJob(id, req.body || {})
  if (!updated) return res.status(404).json({ ok: false, error: 'Job not found' })
  await insertAudit(req.auth?.email || null, 'job_updated', 'job', id, req.body)
  return res.json({ ok: true, job: enrichJob(updated) })
})
app.post('/api/crm/jobs/:id/move', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id)
  const newStage = String(req.body?.stage || '').trim()
  if (!JOB_STAGES.includes(newStage)) return res.status(400).json({ ok: false, error: `Invalid stage. Must be one of: ${JOB_STAGES.join(', ')}` })
  const dateFields = {}
  if (newStage === 'podklady') dateFields.formReceivedAt = nowIso()
  if (newStage === 'nabidka_odeslana') dateFields.offerSentAt = nowIso()
  if (newStage === 'schvaleni_objednavka') dateFields.offerApprovedAt = nowIso()
  if (newStage === 'zaloha_priprava') dateFields.orderSignedAt = nowIso()
  if (newStage === 'realizace') dateFields.actualStart = new Date().toISOString().slice(0, 10)
  if (newStage === 'predani_fakturace') dateFields.handoverAt = nowIso()
  if (newStage === 'dokonceno') dateFields.closedAt = nowIso()
  const stagePatch = {
    pipelineStage: newStage,
    stage: newStage,
    waitingFor:
      newStage === 'nova_poptavka' ? 'client' :
      newStage === 'podklady' ? 'internal_sales' :
      newStage === 'zpracovani_nabidky' ? 'internal_sales' :
      newStage === 'nabidka_odeslana' ? 'client' :
      newStage === 'schvaleni_objednavka' ? 'signature' :
      newStage === 'zaloha_priprava' ? 'payment' :
      newStage === 'realizace' ? 'realization_team' :
      newStage === 'predani_fakturace' ? 'accountant' :
      'none',
    blockingFactor:
      newStage === 'nova_poptavka' ? 'missing_form' :
      newStage === 'podklady' ? 'none' :
      newStage === 'zpracovani_nabidky' ? 'none' :
      newStage === 'nabidka_odeslana' ? 'waiting_offer_response' :
      newStage === 'schvaleni_objednavka' ? 'waiting_signature' :
      newStage === 'zaloha_priprava' ? 'waiting_advance_payment' :
      newStage === 'realizace' ? 'missing_material' :
      newStage === 'predani_fakturace' ? 'missing_protocol' :
      'none',
    nextAction:
      newStage === 'nova_poptavka' ? 'Kontaktovat klienta a zkontrolovat poptávku' :
      newStage === 'podklady' ? 'Zkontrolovat podklady od klienta' :
      newStage === 'zpracovani_nabidky' ? 'Připravit kalkulaci a nabídku' :
      newStage === 'nabidka_odeslana' ? 'Zavolat klientovi kvůli reakci na nabídku' :
      newStage === 'schvaleni_objednavka' ? 'Zajistit podpis objednávky' :
      newStage === 'zaloha_priprava' ? 'Vystavit zálohovou fakturu' :
      newStage === 'realizace' ? 'Potvrdit termín a připravit realizaci' :
      newStage === 'predani_fakturace' ? 'Připravit předávací protokol a finální fakturu' :
      'Uzavřít zakázku',
    nextActionDueAt: req.body?.nextActionDueAt || null,
    lastInternalActionAt: nowIso(),
    stalledAt: null,
    stalledReason: null,
    ...dateFields,
  }
  const updated = await updateJob(id, stagePatch)
  if (!updated) return res.status(404).json({ ok: false, error: 'Job not found' })
  await addJobEvent(id, { eventType: 'stage_change', eventCode: 'stage_moved', actorType: 'user', title: `Přesun do: ${JOB_STAGE_LABELS[newStage] || newStage}`, actor: req.auth?.email, message: `Zakázka přesunuta do etapy ${JOB_STAGE_LABELS[newStage] || newStage}`, metadata: { pipelineStage: newStage } })
  if (newStage === 'schvaleni_objednavka') {
    await addJobTask(id, { taskType: 'contract', title: 'Připravit objednávku', isSystemGenerated: true, priority: 'high' })
  }
  if (newStage === 'zaloha_priprava') {
    await addJobTask(id, { taskType: 'invoice', title: 'Vystavit zálohovou fakturu', isSystemGenerated: true, priority: 'high' })
  }
  if (newStage === 'realizace') {
    await addJobTask(id, { taskType: 'schedule', title: 'Potvrdit termín realizace', isSystemGenerated: true, priority: 'high' })
  }
  if (newStage === 'predani_fakturace') {
    await addJobTask(id, { taskType: 'handover_protocol', title: 'Připravit předávací protokol', isSystemGenerated: true, priority: 'high' })
    await addJobTask(id, { taskType: 'invoice', title: 'Vystavit finální fakturu', isSystemGenerated: true, priority: 'high' })
  }
  await insertAudit(req.auth?.email || null, 'job_stage_moved', 'job', id, { stage: newStage })
  return res.json({ ok: true, job: enrichJob(updated) })
})

app.post('/api/crm/jobs/:id/documents', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const doc = await addJobDocument(Number(req.params.id), req.body || {})
  await addJobEvent(Number(req.params.id), { eventType: 'document_added', eventCode: 'document_added', actorType: 'user', title: `Dokument přidán: ${doc.fileName}`, actor: req.auth?.email, message: `Přidán dokument ${doc.fileName}`, metadata: { documentType: doc.docType, status: doc.status, version: doc.version } })
  return res.json({ ok: true, document: doc })
})
app.get('/api/crm/jobs/:id/documents', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  return res.json({ ok: true, documents: await listJobDocuments(Number(req.params.id)) })
})

app.post('/api/crm/jobs/:id/events', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const ev = await addJobEvent(Number(req.params.id), { ...(req.body || {}), actor: req.auth?.email || req.body?.actor, actorType: req.body?.actorType || 'user' })
  return res.json({ ok: true, event: ev })
})
app.get('/api/crm/jobs/:id/events', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  return res.json({ ok: true, events: await listJobEvents(Number(req.params.id)) })
})

app.post('/api/crm/jobs/:id/tasks', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const task = await addJobTask(Number(req.params.id), req.body || {})
  return res.json({ ok: true, task })
})
app.patch('/api/crm/jobs/:id/tasks/:taskId', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const task = await updateJobTask(Number(req.params.taskId), req.body || {})
  if (!task) return res.status(404).json({ ok: false, error: 'Task not found' })
  return res.json({ ok: true, task })
})
app.get('/api/crm/jobs/:id/tasks', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  return res.json({ ok: true, tasks: await listJobTasks(Number(req.params.id)) })
})

app.get('/api/crm/problems', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (_req, res) => {
  const problems = await listProblems()
  const customerIds = [...new Set(problems.map(j => j.customerId).filter(Boolean))]
  const customers = {}
  for (const cid of customerIds) { const c = await getCustomerById(cid); if (c) customers[cid] = c }
  const grouped = groupProblemsByType(problems)
  return res.json({ ok: true, problems, grouped, customers })
})

app.get('/api/crm/job-stages', (_req, res) => {
  return res.json({ ok: true, stages: JOB_STAGES, labels: JOB_STAGE_LABELS, waitingFor: WAITING_FOR_OPTIONS, blockingFactors: BLOCKING_FACTORS })
})

app.post('/api/crm/jobs/:id/invoices', authMiddleware, roleGuard(['admin', 'manager']), async (req, res) => {
  const invoice = await addJobInvoice(Number(req.params.id), req.body || {})
  await addJobEvent(Number(req.params.id), { eventType: 'finance_update', eventCode: 'invoice_created', actorType: 'user', title: `Faktura ${invoice.invoiceType}`, actor: req.auth?.email, message: `Vytvořena ${invoice.invoiceType} faktura`, metadata: { invoiceId: invoice.id, status: invoice.status } })
  return res.json({ ok: true, invoice })
})

app.get('/api/crm/jobs/:id/invoices', authMiddleware, roleGuard(['admin', 'manager', 'viewer']), async (req, res) => {
  return res.json({ ok: true, invoices: await listJobInvoices(Number(req.params.id)) })
})

async function bootstrap() {
  if (pool) {
    await ensureMigrations()
  } else {
    ensureDataDir()
  }
  await seedDefaultAdmin()
  app.listen(PORT, () => {
    console.log(`Enterprise CRM running on http://127.0.0.1:${PORT}`)
  })
}

bootstrap().catch((e) => {
  console.error('Fatal bootstrap error', e)
  process.exit(1)
})

