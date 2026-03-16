/**
 * Material catalog import script
 * Usage: node db/import_materials.mjs
 *
 * Imports all 3 price files into crm_service_catalog_items with itemKind=material
 */
import pg from 'pg'
import ExcelJS from 'exceljs'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DATABASE_URL = process.env.DATABASE_URL || process.env.CRM_DATABASE_URL
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1) }

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })

// Parse unit from "5,000 ks" → "ks", "1,000 m" → "m"
function parseUnit(baleni) {
  const s = String(baleni || '').trim()
  const parts = s.split(/\s+/)
  if (parts.length >= 2) return parts[parts.length - 1].toLowerCase()
  return 'ks'
}

function cleanPrice(v) {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return Math.round(v * 100) / 100
  const s = String(v).replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : Math.round(n * 100) / 100
}

async function bulkInsert(items) {
  if (!items.length) return 0
  const chunkSize = 500
  let total = 0
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    const values = []
    const params = []
    let pi = 1
    for (const it of chunk) {
      values.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4},$${pi+5},$${pi+6},$${pi+7},now(),now())`)
      params.push(
        it.sourceCode || null,
        it.itemName,
        it.itemDescription || null,
        it.unit || 'ks',
        it.basePrice,
        it.categoryKey || 'elektro',
        it.phaseKey || 'material',
        JSON.stringify(it.metadata || { itemKind: 'material', category: 'elektro' })
      )
      pi += 8
    }
    await pool.query(
      `INSERT INTO crm_service_catalog_items
        (source_code, item_name, item_description, unit, base_price, category_key, phase_key, metadata, created_at, updated_at)
       VALUES ${values.join(',')}
       ON CONFLICT (source_code) WHERE source_code IS NOT NULL
       DO UPDATE SET
         item_name = EXCLUDED.item_name,
         item_description = EXCLUDED.item_description,
         unit = EXCLUDED.unit,
         base_price = EXCLUDED.base_price,
         metadata = EXCLUDED.metadata,
         updated_at = now()`,
      params
    )
    total += chunk.length
    process.stdout.write(`\r  inserted ${total}/${items.length}...`)
  }
  console.log()
  return total
}

// ── FILE 1: 0002053593_pricelist KV ELektro.xlsx ──
// Columns: Kód produktu, Produkt, Kategorie, Značka, Balení, EAN, Kód dodavatele, Základní cena, Moje cena
async function importKvElektro(filePath) {
  console.log('\n📗 Importing KV Elektro XLSX...')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)
  const ws = wb.worksheets[0]
  const items = []
  let rowNum = 0
  ws.eachRow((row, num) => {
    if (num === 1) return // header
    rowNum++
    const code = String(row.getCell(1).value || '').trim()
    const name = String(row.getCell(2).value || '').trim()
    const category = String(row.getCell(3).value || '').trim()
    const brand = String(row.getCell(4).value || '').trim()
    const baleni = String(row.getCell(5).value || '')
    const supplierCode = String(row.getCell(7).value || '').trim()
    const mojePrice = cleanPrice(row.getCell(9).value) // "Moje cena"
    const basePrice = mojePrice || cleanPrice(row.getCell(8).value) // fallback to base
    if (!name) return
    const unit = parseUnit(baleni)
    items.push({
      sourceCode: code || supplierCode || null,
      itemName: brand ? `${name} [${brand}]` : name,
      itemDescription: category || null,
      unit,
      basePrice,
      categoryKey: 'elektro',
      phaseKey: 'material',
      metadata: { itemKind: 'material', category: 'elektro', brand, supplierCode, catalogCategory: category },
    })
    if (rowNum % 10000 === 0) process.stdout.write(`\r  reading ${rowNum}...`)
  })
  console.log(`  read ${items.length} items`)
  return bulkInsert(items)
}

// ── FILE 2: 20251014-Kundenpreise-407865.xlsx ──
// Columns: Artikel, RGR, Bezeichung, PEH, Preisbasis, Rabatt, konová cena
async function importKundenpreise(filePath) {
  console.log('\n📗 Importing Kundenpreise XLSX...')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)
  const ws = wb.worksheets[0]
  const items = []
  let rowNum = 0
  ws.eachRow((row, num) => {
    if (num === 1) return
    rowNum++
    const code = String(row.getCell(1).value || '').trim()
    const name = String(row.getCell(3).value || '').trim()
    const finalPrice = cleanPrice(row.getCell(7).value) // konová cena
    if (!name || !code) return
    items.push({
      sourceCode: `KP-${code}`,
      itemName: name,
      itemDescription: null,
      unit: 'ks',
      basePrice: finalPrice,
      categoryKey: 'elektro',
      phaseKey: 'material',
      metadata: { itemKind: 'material', category: 'elektro', artikelCode: code },
    })
    if (rowNum % 5000 === 0) process.stdout.write(`\r  reading ${rowNum}...`)
  })
  console.log(`  read ${items.length} items`)
  return bulkInsert(items)
}

// ── MAIN ──
const BASE = path.join(__dirname, '../materials')
// Files will be looked for in /materials/ folder next to this script,
// OR passed as env MATERIALS_DIR
const MDIR = process.env.MATERIALS_DIR || BASE

async function main() {
  console.log('🔌 Connecting to database...')
  await pool.query('SELECT 1')
  console.log('✅ Connected')

  const files = {
    kvElektro: path.join(MDIR, '0002053593_pricelist KV ELektro.xlsx'),
    kundenpreise: path.join(MDIR, '20251014-Kundenpreise-407865.xlsx'),
  }

  let total = 0

  try {
    const n = await importKvElektro(files.kvElektro)
    console.log(`✅ KV Elektro: ${n} položek importováno`)
    total += n
  } catch (e) {
    console.error('❌ KV Elektro error:', e.message)
  }

  try {
    const n = await importKundenpreise(files.kundenpreise)
    console.log(`✅ Kundenpreise: ${n} položek importováno`)
    total += n
  } catch (e) {
    console.error('❌ Kundenpreise error:', e.message)
  }

  console.log(`\n🎉 TOTAL: ${total} materiálů v katalogu`)
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
