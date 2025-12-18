const projects = [
  ['Sphynx Dubai', 'https://sphynxdubai.ae/'],
  ['Boss Detaling', 'https://bossdetaling.eu/'],
  ['TikTok Boost Lana', 'https://tiktokboostlana.netlify.app/'],
  ['Mila Style', 'https://milastyle.netlify.app/'],
  ['Dmitry Rieltor UA', 'https://dmitryrieltorua.netlify.app/'],
  ['Eco Remont', 'https://ecoremont.netlify.app/'],
  ['Anika Brand Lux', 'https://anikabrandlux.netlify.app/'],
  ['Lakerta', 'https://lakerta.netlify.app/'],
  ['TemoWeb', 'https://temoweb.netlify.app/'],
]

const strip = (s) => (s ? String(s).replace(/\s+/g, ' ').trim() : '')
const pick = (re, html) => {
  const m = html.match(re)
  return m ? strip(m[1]) : ''
}

function extractFacts(html) {
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i, html)
  const metaDescription =
    pick(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      html,
    ) ||
    pick(
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
      html,
    )
  const h1Raw = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)
  const h1 = strip(h1Raw.replace(/<[^>]+>/g, ''))

  const hasForm = /<form\b/i.test(html)
  const hasCart = /cart|basket|корзин/i.test(html)
  const hasCheckout = /checkout|оплат|payment/i.test(html)

  return { title, metaDescription, h1, flags: { hasForm, hasCart, hasCheckout } }
}

async function main() {
  for (const [name, url] of projects) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      const html = await res.text()
      const facts = extractFacts(html)
      process.stdout.write(`\n=== ${name} ===\n`)
      process.stdout.write(`URL: ${url}\n`)
      process.stdout.write(`HTTP: ${res.status}\n`)
      process.stdout.write(`TITLE: ${facts.title}\n`)
      process.stdout.write(`META: ${facts.metaDescription}\n`)
      process.stdout.write(`H1: ${facts.h1}\n`)
      process.stdout.write(`flags: ${JSON.stringify(facts.flags)}\n`)
    } catch (e) {
      process.stdout.write(`\n=== ${name} ===\n`)
      process.stdout.write(`URL: ${url}\n`)
      process.stdout.write(`ERROR: ${e?.message || String(e)}\n`)
    }
  }
}

await main()


