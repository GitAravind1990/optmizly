/**
 * Creates the launch discount in Dodo: 30% off every paid plan, three cycles.
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

/**
 * Every paid product, monthly and annual.
 *
 * Must stay in step with COUPON_ELIGIBLE_KEYS in src/lib/dodo-products.ts — Dodo's
 * `restricted_to` and that list are two locks on the same door, and a product in one but not
 * the other is a plan where the code is either offered and refused, or accepted where it was
 * never meant to be.
 */
const PRODUCTS = {
  'Starter monthly': process.env.NEXT_PUBLIC_DODO_STARTER_PRODUCT_ID,
  'Starter annual': process.env.NEXT_PUBLIC_DODO_STARTER_ANNUAL_PRODUCT_ID,
  'Pro monthly': process.env.NEXT_PUBLIC_DODO_PRO_PRODUCT_ID,
  'Pro annual': process.env.NEXT_PUBLIC_DODO_PRO_ANNUAL_PRODUCT_ID,
  'Agency monthly': process.env.NEXT_PUBLIC_DODO_AGENCY_PRODUCT_ID,
  'Agency annual': process.env.NEXT_PUBLIC_DODO_AGENCY_ANNUAL_PRODUCT_ID,
  'Agency Plus monthly': process.env.NEXT_PUBLIC_DODO_AGENCY_PLUS_PRODUCT_ID,
  'Agency Plus annual': process.env.NEXT_PUBLIC_DODO_AGENCY_PLUS_ANNUAL_PRODUCT_ID,
}

// DODO_MODE is the repo's convention, and test mode uses a different key entirely. Getting this
// wrong on a script that creates chargeable objects would create them in the wrong place.
const mode = process.env.DODO_MODE === 'test_mode' ? 'test_mode' : 'live_mode'
const apiKey = mode === 'test_mode' ? process.env.DODO_TEST_API_KEY : process.env.DODO_API_KEY
if (!apiKey) {
  console.error(`No API key for ${mode}.`)
  process.exit(1)
}
const dodo = new DodoPayments({ bearerToken: apiKey, environment: mode })

/**
 * Product ids come from Dodo, not from .env.local.
 *
 * This machine's .env.local carries only two of the eight — the rest live in Vercel — so
 * building the restriction from env would have silently produced a discount valid on Starter
 * and Pro and nothing else, which is exactly the bug this offer exists to fix. Asking Dodo for
 * its own subscription products is both complete and the right definition of "every plan".
 *
 * Env ids are still read, as a cross-check: anything configured here that Dodo does not list
 * is a mismatch worth seeing before creating a discount around it.
 */
const listed = []
for await (const product of dodo.products.list({ archived: false })) {
  if (product.is_recurring) listed.push(product)
}
if (!listed.length) {
  console.error('Dodo lists no active recurring products. Refusing to create a discount restricted to nothing.')
  process.exit(1)
}

const envIds = new Set(Object.values(PRODUCTS).filter(Boolean))
const restricted_to = listed.map(p => p.product_id)

console.log('Discount to create:')
console.log(`  environment         ${mode}`)
console.log(`  code                ${SPEC.code}`)
console.log(`  name                ${SPEC.name}`)
console.log(`  type                ${SPEC.type}`)
console.log(`  amount              ${SPEC.amount} basis points = ${SPEC.amount / 100}%`)
console.log(`  subscription_cycles ${SPEC.subscription_cycles}`)
console.log(`  usage_limit         ${SPEC.usage_limit}`)
console.log(`  expires_at          ${SPEC.expires_at}`)
console.log(`  restricted_to       ${restricted_to.length} recurring products:`)
for (const p of listed) {
  const known = envIds.has(p.product_id) ? '' : '   (not in this machine’s .env.local)'
  console.log(`                      ${(p.name ?? '(unnamed)').padEnd(28)} ${p.product_id}${known}`)
}
const unmatched = [...envIds].filter(id => !restricted_to.includes(id))
if (unmatched.length) {
  console.log(`  WARNING             ${unmatched.length} configured id(s) not listed by Dodo: ${unmatched.join(', ')}`)
}

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
