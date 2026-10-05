/**
 * Turns purchasing power parity on (or off) for every recurring product in Dodo.
 *
 *   node scripts/set-ppp.mjs                 # shows what would change, live mode
 *   node scripts/set-ppp.mjs --apply         # applies it
 *   node scripts/set-ppp.mjs --off --apply   # turns it back off
 *   DODO_MODE=test_mode node scripts/set-ppp.mjs --apply
 *
 * **This changes what customers are charged.** PPP tells Dodo to price by country rather than
 * converting a US price: a buyer in India pays a price set for India instead of $9 converted
 * at Dodo's rate plus GST. Lower revenue per customer in those markets, more of them. It is
 * reversible — hence --off — but anyone who subscribes while it is on keeps the price they
 * signed up at, so the reversal is not retroactive.
 *
 * `purchasing_power_parity` lives inside the product's `price` object, and the update replaces
 * that object wholesale. So each product's current price is read first and sent back with the
 * one field changed: a partial price would silently reset the amount, the interval, or the
 * trial settings, and the first sign of it would be a customer charged the wrong number.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

for (const file of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(join(process.cwd(), file), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* file may not exist */ }
}

const require = createRequire(join(process.cwd(), 'resolve.js'))
const { default: DodoPayments } = await import(pathToFileURL(require.resolve('dodopayments')).href)

const mode = process.env.DODO_MODE === 'test_mode' ? 'test_mode' : 'live_mode'
const apiKey = mode === 'test_mode' ? process.env.DODO_TEST_API_KEY : process.env.DODO_API_KEY
if (!apiKey) {
  console.error(`No API key for ${mode}.`)
  process.exit(1)
}
const dodo = new DodoPayments({ bearerToken: apiKey, environment: mode })

const target = !process.argv.includes('--off')
const apply = process.argv.includes('--apply')

console.log(`${mode}: setting purchasing_power_parity = ${target} on every recurring product\n`)

const products = []
for await (const p of dodo.products.list({ archived: false })) {
  if (p.is_recurring) products.push(p)
}

let changed = 0
for (const listed of products) {
  // The list response is a summary; the price object has to come from a retrieve.
  const product = await dodo.products.retrieve(listed.product_id)
  const price = product.price
  const current = price?.purchasing_power_parity

  if (current === target) {
    console.log(`  SKIP   ${(product.name ?? '?').padEnd(30)} already ${target}`)
    continue
  }

  console.log(`  ${apply ? 'SET ' : 'WOULD'}   ${(product.name ?? '?').padEnd(30)} ${current} -> ${target}   (${price.price} ${price.currency})`)
  changed++

  if (apply) {
    // The whole price object, with one field changed. See the header note.
    await dodo.products.update(product.product_id, {
      price: { ...price, purchasing_power_parity: target },
    })
  }
}

if (!changed) {
  console.log('\nNothing to change.')
} else if (!apply) {
  console.log(`\nDry run: ${changed} product(s) would change. Re-run with --apply.`)
} else {
  console.log(`\nUpdated ${changed} product(s). Verifying…`)
  for (const listed of products) {
    const after = await dodo.products.retrieve(listed.product_id)
    const ok = after.price?.purchasing_power_parity === target
    console.log(`  ${ok ? 'OK  ' : 'FAIL'}   ${(after.name ?? '?').padEnd(30)} ppp=${after.price?.purchasing_power_parity}  price=${after.price?.price} ${after.price?.currency}`)
  }
}
