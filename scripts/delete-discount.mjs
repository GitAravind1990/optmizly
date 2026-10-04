/**
 * Deletes a discount from Dodo.
 *
 *   node scripts/delete-discount.mjs FOUNDING50            # shows what it would delete
 *   node scripts/delete-discount.mjs FOUNDING50 --delete   # deletes it
 *
 * **Refuses to delete a discount that has been redeemed.** A code with `times_used > 0` is part
 * of somebody's billing history: deleting it removes the record of why they are paying what
 * they are paying, and nothing restores it. If you genuinely need to stop a used code, expire
 * it instead — set `expires_at` in the past, which keeps the record and closes the door.
 *
 * Live-mode only, like everything else in this integration, so the default is a dry run.
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

const code = process.argv[2]
if (!code || code.startsWith('--')) {
  console.error('Usage: node scripts/delete-discount.mjs <CODE> [--delete]')
  process.exit(1)
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

let d
try {
  d = await dodo.discounts.retrieveByCode(code)
} catch {
  console.log(`No discount with code ${code} in ${mode}. Nothing to delete.`)
  process.exit(0)
}

console.log(`${code} in ${mode}:`)
console.log(`  discount_id   ${d.discount_id}`)
console.log(`  name          ${d.name ?? '(none)'}`)
console.log(`  amount        ${d.type === 'percentage' ? `${d.amount / 100}%` : `${d.amount} cents`}`)
console.log(`  times_used    ${d.times_used}`)
console.log(`  usage_limit   ${d.usage_limit ?? 'unlimited'}`)
console.log(`  restricted_to ${d.restricted_to.length} product(s)`)

if (d.times_used > 0) {
  console.error(`\nRefusing: ${code} has been redeemed ${d.times_used} time(s).`)
  console.error('Deleting it would remove the record behind somebody\'s price. Expire it instead.')
  process.exit(1)
}

if (!process.argv.includes('--delete')) {
  console.log('\nDry run — no redemptions, so this is safe to delete.')
  console.log(`Re-run with --delete to remove it from ${mode}.`)
  process.exit(0)
}

await dodo.discounts.delete(d.discount_id)
console.log(`\nDeleted ${code} (${d.discount_id}).`)
