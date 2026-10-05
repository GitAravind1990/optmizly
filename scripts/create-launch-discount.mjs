/**
 * Makes the launch discount in Dodo match SPEC below: 50% off every paid plan, three cycles.
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
  /**
   * Basis points: 5000 = 50%. Dodo's own example is 540 => 5.4%.
   *
   * 30% -> 15% -> 50%. The middle step was a reaction to purchasing power parity going on:
   * PPP already prices by country, and the code stacks on top of it, so in the markets a
   * launch audience skews towards the two compound. Starter in India lists at about 270
   * rupees under PPP, and 50% takes that to roughly 135 — about $1.50 a month, before Dodo's
   * per-transaction fee and before this account's real DataForSEO spend on the tools that
   * plan unlocks. For three cycles, capped at 100 redemptions.
   */
  amount: 5000,
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

console.log('Discount spec:')
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

/**
 * A code that already exists is reconciled against SPEC, never created twice.
 *
 * SPEC above is the source of truth and Dodo holds a copy; changing the offer should be an edit
 * here plus a run, not a visit to a dashboard that leaves the repo describing a discount nobody
 * is actually getting. Only the fields SPEC owns are compared, and every difference is printed
 * before anything is sent.
 */
let existing = null
try {
  existing = await dodo.discounts.retrieveByCode(SPEC.code)
} catch {
  // Not found is the expected path on a first run.
}

if (existing) {
  const drift = []
  if (existing.amount !== SPEC.amount) {
    drift.push(['amount', `${existing.amount / 100}%`, `${SPEC.amount / 100}%`])
  }
  if ((existing.subscription_cycles ?? null) !== SPEC.subscription_cycles) {
    drift.push(['cycles', existing.subscription_cycles ?? 'unlimited', SPEC.subscription_cycles])
  }
  if ((existing.usage_limit ?? null) !== SPEC.usage_limit) {
    drift.push(['usage_limit', existing.usage_limit ?? 'unlimited', SPEC.usage_limit])
  }

  console.log(`\nExists: ${existing.discount_id}   used ${existing.times_used}/${existing.usage_limit ?? 'unlimited'}`)
  if (!drift.length) {
    console.log('Matches the spec. Nothing to do.')
    process.exit(0)
  }
  for (const [field, from, to] of drift) {
    console.log(`  ${field.padEnd(12)} ${from}  ->  ${to}`)
  }

  if (!process.argv.includes('--create')) {
    console.log('\nDry run. Re-run with --create to apply these changes in ' + mode + '.')
    process.exit(0)
  }

  // Said out loud because "update a discount" sounds more harmless than it is: this changes
  // what the next person is charged. Redemptions already made keep their own terms.
  if (existing.times_used > 0) {
    console.log(`\nNote: ${existing.times_used} redemption(s) already made keep the terms they were made under.`)
  }

  await dodo.discounts.update(existing.discount_id, {
    amount: SPEC.amount,
    subscription_cycles: SPEC.subscription_cycles,
    usage_limit: SPEC.usage_limit,
  })

  // Read it back rather than trusting the write: the figure here is a price.
  const after = await dodo.discounts.retrieveByCode(SPEC.code)
  console.log('\nUpdated:')
  console.log(`  amount       ${after.amount / 100}%`)
  console.log(`  cycles       ${after.subscription_cycles ?? 'unlimited'}`)
  console.log(`  usage_limit  ${after.usage_limit ?? 'unlimited'}`)
  console.log(`  restricted   ${after.restricted_to.length} products`)
  process.exit(0)
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
