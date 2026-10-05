/**
 * Creates the full product catalogue in Dodo TEST mode, mirroring live.
 *
 *   node scripts/setup-dodo-test-mode.js
 *
 * Requires DODO_TEST_API_KEY in the environment (or .env.local). That key is separate from
 * the live one and comes from the Dodo dashboard with the mode switch set to Test — a live
 * key returns 401 against test.dodopayments.com, which is how we know the two environments
 * are genuinely separate rather than one store with a flag.
 *
 * Safe to re-run: every product is matched by name first and skipped if it already exists,
 * so an interrupted run continues rather than duplicating. Nothing here touches live.
 */
const fs = require('fs')
const path = require('path')

const ENV_FILE = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const KEY = process.env.DODO_TEST_API_KEY
const BASE = 'https://test.dodopayments.com'

if (!KEY) {
  console.error(
    'DODO_TEST_API_KEY is not set.\n\n' +
    'Get it from the Dodo dashboard with the environment switch set to Test, then either\n' +
    'add it to .env.local or pass it inline:\n\n' +
    '  DODO_TEST_API_KEY=... node scripts/setup-dodo-test-mode.js\n'
  )
  process.exit(1)
}

const api = async (p, init = {}) => {
  const r = await fetch(`${BASE}${p}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const t = await r.text()
  let body = null
  try { body = t ? JSON.parse(t) : null } catch { body = t }
  return { ok: r.ok, status: r.status, body }
}

/** Mirrors live exactly: saas, USD, no trial. Amounts in cents. */
const MONTHLY = { count: 1, interval: 'Month' }
const YEARLY = { count: 1, interval: 'Year' }

const PRODUCTS = [
  { key: 'STARTER',            name: 'OPTMIZLY STARTER',              cents: 900,    freq: MONTHLY },
  { key: 'STARTER_ANNUAL',     name: 'Optmizly Starter (Annual)',     cents: 9000,   freq: YEARLY },
  { key: 'PRO',                name: 'OPTMIZLY PRO',                  cents: 1900,   freq: MONTHLY },
  { key: 'PRO_ANNUAL',         name: 'Optmizly Pro (Annual)',         cents: 19000,  freq: YEARLY },
  { key: 'AGENCY',             name: 'OPTMIZLY AGENCY',               cents: 4900,   freq: MONTHLY },
  { key: 'AGENCY_ANNUAL',      name: 'Optmizly Agency (Annual)',      cents: 49000,  freq: YEARLY },
  { key: 'AGENCY_PLUS',        name: 'OPTMIZLY AGENCY PLUS',          cents: 9900,   freq: MONTHLY },
  { key: 'AGENCY_PLUS_ANNUAL', name: 'Optmizly Agency Plus (Annual)', cents: 99000,  freq: YEARLY },
]

/** Maps a product key to the env var the app reads it from. */
const ENV_NAME = {
  STARTER: 'NEXT_PUBLIC_DODO_STARTER_PRODUCT_ID',
  STARTER_ANNUAL: 'NEXT_PUBLIC_DODO_STARTER_ANNUAL_PRODUCT_ID',
  PRO: 'NEXT_PUBLIC_DODO_PRO_PRODUCT_ID',
  PRO_ANNUAL: 'NEXT_PUBLIC_DODO_PRO_ANNUAL_PRODUCT_ID',
  AGENCY: 'NEXT_PUBLIC_DODO_AGENCY_PRODUCT_ID',
  AGENCY_ANNUAL: 'NEXT_PUBLIC_DODO_AGENCY_ANNUAL_PRODUCT_ID',
  AGENCY_PLUS: 'NEXT_PUBLIC_DODO_AGENCY_PLUS_PRODUCT_ID',
  AGENCY_PLUS_ANNUAL: 'NEXT_PUBLIC_DODO_AGENCY_PLUS_ANNUAL_PRODUCT_ID',
}

async function main() {
  const listed = await api('/products?page_size=100')
  if (!listed.ok) {
    console.error(`Could not list test products (HTTP ${listed.status}).`)
    console.error(listed.status === 401
      ? 'That key was rejected by test mode. Check it was copied with the dashboard in Test, not Live.'
      : JSON.stringify(listed.body).slice(0, 300))
    process.exit(1)
  }
  const existing = listed.body.items ?? listed.body.data ?? listed.body ?? []
  console.log(`test mode reachable — ${existing.length} product(s) already present\n`)

  const ids = {}
  for (const p of PRODUCTS) {
    const already = existing.find(e => (e.name || '').trim().toLowerCase() === p.name.toLowerCase())
    if (already) {
      ids[p.key] = already.product_id
      console.log(`SKIP   ${p.name.padEnd(34)} exists  ${already.product_id}`)
      continue
    }
    const created = await api('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: p.name,
        description: `${p.name} — test mode`,
        tax_category: 'saas',
        license_key_enabled: false,
        price: {
          type: 'recurring_price',
          price: p.cents,
          currency: 'USD',
          tax_inclusive: false,
          discount: 0,
          purchasing_power_parity: false,
          payment_frequency_count: p.freq.count,
          payment_frequency_interval: p.freq.interval,
          subscription_period_count: 20,
          subscription_period_interval: 'Year',
          trial_period_days: 0,
        },
      }),
    })
    if (!created.ok) {
      console.log(`FAIL   ${p.name.padEnd(34)} HTTP ${created.status} ${JSON.stringify(created.body).slice(0, 160)}`)
      continue
    }
    ids[p.key] = created.body.product_id
    console.log(`CREATE ${p.name.padEnd(34)} $${p.cents / 100}/${p.freq.interval.toLowerCase()}  ${created.body.product_id}`)
  }

  // PRODUCTHUNT, restricted to every recurring product, exactly as live.
  //
  // This block used to recreate FOUNDING50 — 50%, one cycle, the two agency annual products.
  // That discount was deleted from live on 2026-10-04 and replaced by a single code covering
  // every plan, so rebuilding it here would hand anyone testing a coupon that no longer exists
  // in production and does not behave like the one that does.
  const discounts = await api('/discounts?page_size=50')
  const dList = discounts.body?.items ?? discounts.body?.data ?? discounts.body ?? []
  if (dList.some(d => d.code === 'PRODUCTHUNT')) {
    console.log('\nSKIP   PRODUCTHUNT already exists in test mode')
  } else {
    const restricted = Object.values(ids).filter(Boolean)
    const d = await api('/discounts', {
      method: 'POST',
      body: JSON.stringify({
        code: 'PRODUCTHUNT',
        name: 'Product Hunt launch',
        type: 'percentage',
        amount: 5000,          // basis points: 5000 = 50%, not 50
        usage_limit: 100,
        subscription_cycles: 3,
        restricted_to: restricted,
      }),
    })
    console.log(d.ok
      ? `\nCREATE PRODUCTHUNT  50% off, 100 uses, 3 cycles, restricted to ${restricted.length} product(s)  ${d.body.discount_id}`
      : `\nFAIL   PRODUCTHUNT  HTTP ${d.status} ${JSON.stringify(d.body).slice(0, 200)}`)
  }

  console.log('\n─────────────────────────────────────────────────────────────')
  console.log('Set these on the Vercel scope that runs test mode (Development\nand/or Preview — never Production), alongside DODO_MODE=test_mode:\n')
  for (const [key, id] of Object.entries(ids)) console.log(`  ${ENV_NAME[key]}=${id}`)
  console.log('\nDODO_MODE=test_mode')
  console.log('DODO_TEST_API_KEY=<the test key>')
  console.log('DODO_TEST_WEBHOOK_SECRET=<the test webhook secret>')
  console.log('\nProduction keeps its live ids under the same names and no DODO_MODE.')
  console.log(
    '\nThe webhook secret is separate per mode and is what actually grants the plan.\n' +
    'Without it a test payment succeeds in Dodo and the app never upgrades the user —\n' +
    'the signature check fails closed against the wrong secret. It comes from the Dodo\n' +
    'dashboard in Test mode, where the endpoint must also point at a URL Dodo can reach:\n' +
    'localhost will not receive webhooks, so a test purchase needs a deployed preview or\n' +
    'a tunnel.'
  )
}

main().catch(e => { console.error('ERR', e.message); process.exit(1) })
