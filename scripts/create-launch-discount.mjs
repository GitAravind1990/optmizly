/**
 * Creates the launch discount in Dodo: 30% off Starter and Pro monthly, three cycles.
 *
 *   node scripts/create-launch-discount.mjs          # shows what it would do
 *   node scripts/create-launch-discount.mjs --create # actually creates it
 *
 * **This integration is live-mode only — there is no DoDo sandbox.** Anything created here is
 * immediately real and chargeable, which is why the default is a dry run and creation needs a
 * flag. It also refuses to create a second discount under a code that already exists: a
 * duplicate code is not something you can tidy up after customers have used one of them.
 *
 * Kept in the repo rather than done by hand in the dashboard, because the restriction has to
 * match `isCouponEligibleProduct` exactly. Dodo's `restricted_to` and that function are two
 * locks on the same door; written here, they are read from the same env vars at the same
 * moment, and the pairing is reviewable.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

// .env.local, read directly: this is a one-off operator script, not part of the app.
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

const SPEC = {
  code: 'PRODUCTHUNT',
  name: 'Product Hunt launch',
  type: 'percentage',
  /** Basis points: 3000 = 30%. Dodo's own example is 540 => 5.4%. */
  amount: 3000,
  /** Three billing periods, then full price. */
  subscription_cycles: 3,
  usage_limit: 100,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
}

const PRODUCTS = {
  'Starter monthly': process.env.NEXT_PUBLIC_DODO_STARTER_PRODUCT_ID,
  'Pro monthly': process.env.NEXT_PUBLIC_DODO_PRO_PRODUCT_ID,
}

const missing = Object.entries(PRODUCTS).filter(([, id]) => !id).map(([n]) => n)
if (missing.length) {
  console.error(`Not configured: ${missing.join(', ')}. Refusing to create a discount restricted to nothing.`)
  process.exit(1)
}
if (!process.env.DODO_API_KEY) {
  console.error('DODO_API_KEY is not set.')
  process.exit(1)
}

const restricted_to = Object.values(PRODUCTS)

console.log('Discount to create (live mode):')
console.log(`  code                ${SPEC.code}`)
console.log(`  name                ${SPEC.name}`)
console.log(`  type                ${SPEC.type}`)
console.log(`  amount              ${SPEC.amount} basis points = ${SPEC.amount / 100}%`)
console.log(`  subscription_cycles ${SPEC.subscription_cycles}`)
console.log(`  usage_limit         ${SPEC.usage_limit}`)
console.log(`  expires_at          ${SPEC.expires_at}`)
for (const [label, id] of Object.entries(PRODUCTS)) {
  console.log(`  restricted_to       ${label} (${id.slice(0, 10)}…)`)
}

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_API_KEY,
  environment: process.env.DODO_ENVIRONMENT === 'test_mode' ? 'test_mode' : 'live_mode',
})

// A code that already exists must never be created twice.
try {
  const existing = await dodo.discounts.retrieveByCode(SPEC.code)
  console.log(`\nAlready exists: ${existing.discount_id}`)
  console.log(`  ${existing.amount / 100}% · used ${existing.times_used}/${existing.usage_limit ?? '∞'} · expires ${existing.expires_at ?? 'never'}`)
  console.log('Nothing to do.')
  process.exit(0)
} catch {
  // Not found is the expected path on a first run.
}

if (!process.argv.includes('--create')) {
  console.log('\nDry run. Re-run with --create to make it, for real, in live mode.')
  process.exit(0)
}

const created = await dodo.discounts.create({ ...SPEC, restricted_to })
console.log('\nCreated:')
console.log(`  discount_id  ${created.discount_id}`)
console.log(`  code         ${created.code}`)
console.log(`  amount       ${created.amount / 100}%`)
console.log(`  cycles       ${created.subscription_cycles ?? 'unlimited'}`)
console.log(`  usage_limit  ${created.usage_limit ?? 'unlimited'}`)
console.log(`  expires_at   ${created.expires_at ?? 'never'}`)
console.log(`  restricted   ${created.restricted_to.length} products`)
console.log('\nNow make sure isCouponEligibleProduct permits exactly these products.')
