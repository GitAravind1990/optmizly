/**
 * Builds the Product Hunt gallery images for optmizly.com.
 *
 *   node scripts/make-ph-gallery.mjs [outDir]
 *
 * Product Hunt shows gallery images at 1270x760. The first one is the only asset most people
 * ever see — it sits above the description, in the feed, and in the social card — so it has to
 * carry the promise on its own.
 *
 * Every frame is a real screen of the live site, driven in a browser: the hero audit is
 * actually run, the result shown is the one it returned. Nothing is mocked. A launch-day
 * gallery that flatters the product is the fastest way to lose the comment thread, and this is
 * an SEO audit tool being shown to people who audit things for a living.
 *
 * The demo audit is run against optmizly.com's own blog index, which scores 69 and has real
 * findings. Pointing the tool at our own site is both the honest choice and the better one: it
 * shows the tool finding genuine faults rather than a staged 98, and it avoids putting a
 * stranger's domain in marketing art, which implies an endorsement nobody gave.
 */
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

const require = createRequire(join(process.cwd(), 'resolve.js'))
const playwright = await import(pathToFileURL(require.resolve('playwright')).href)
const chromium = playwright.chromium ?? playwright.default?.chromium

const OUT = process.argv[2] || join(process.cwd(), 'launch', 'product-hunt')
const SITE = 'https://optmizly.com'
const DEMO_URL = 'https://optmizly.com/blog'

const W = 1270
const H = 760

mkdirSync(OUT, { recursive: true })

const T = {
  ink: '#0b1120', body: '#475569', brand: '#0000ff', soft: '#eef1ff',
  line: '#e2e8f0', bg: '#f8fafc',
}

/** One frame: a headline column and a real screenshot, on a light brand-tinted field. */
function frame({ shot, kicker, headline, sub, tall }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0}
    body{width:${W}px;height:${H}px;overflow:hidden;background:${T.bg};
         font:16px/1.5 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:${T.ink};
         display:flex;align-items:center;gap:${tall ? 44 : 52}px;padding:0 56px;}
    .copy{width:${tall ? 400 : 470}px;flex:0 0 auto}
    .kicker{font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;
            color:${T.brand};margin-bottom:16px}
    h1{font-size:${tall ? 38 : 42}px;line-height:1.1;letter-spacing:-1.4px;font-weight:800;margin-bottom:16px}
    p{font-size:17px;line-height:1.55;color:${T.body}}
    .shot{flex:1;min-width:0;height:${tall ? 440 : 600}px;border-radius:14px;overflow:hidden;
          background:#fff;border:1px solid ${T.line};box-shadow:0 24px 60px rgba(11,17,32,.16)}
    .shot img{display:block;width:100%}
    .mark{display:flex;align-items:center;gap:9px;margin-bottom:26px}
    .mark img{width:26px;height:26px}
    .mark span{font-weight:800;font-size:18px;letter-spacing:-.2px}
  </style></head><body>
    <div class="copy">
      <div class="mark"><img src="${SITE}/logo.png"><span>Optmizly</span></div>
      <div class="kicker">${kicker}</div>
      <h1>${headline}</h1>
      <p>${sub}</p>
    </div>
    <div class="shot"><img src="${shot}"></div>
  </body></html>`
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const asData = buf => `data:image/png;base64,${buf.toString('base64')}`

// ── 1. Run a real audit on the homepage and photograph the result ──────────────────────────
/**
 * The cookie banner floats over everything and belongs in no screenshot. Clicking it is not
 * enough: the click can land before the banner mounts, and the first version of this script
 * shipped a pricing frame with the banner sitting across the plan cards. Wait for it, click
 * it, then wait for it to go.
 */
async function dismissCookies(page) {
  const decline = page.locator('text=Decline').first()
  await decline.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
  if (await decline.count()) {
    await decline.click().catch(() => {})
    await decline.waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
  }
  await page.waitForTimeout(400)
}

const home = await ctx.newPage()
await home.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 })
await home.waitForTimeout(1500)
await dismissCookies(home)
await home.fill('input[placeholder="yourwebsite.com"]', DEMO_URL)
await home.click('text=Get My Free Score')

// Wait for a category label from the real report, not a timer: the audit fetches the page and
// its side files, and how long that takes is not ours to predict.
//
// The audit is capped at 5 a day per IP, and generating this gallery spends one. Running the
// script a few times in an afternoon exhausts it, and the page then shows the limit message
// instead of a report — so say that, rather than sitting in a two-minute timeout that looks
// like a hang.
/**
 * A spent cap must not cost the other frames.
 *
 * The audit allows 5 runs a day per IP and each build spends one, so iterating on this script
 * exhausts it — and the first version then threw, losing the two frames that need no quota.
 * Now the hero is skipped with an explanation and the rest are built.
 */
let capSpent = null
await Promise.race([
  home.waitForSelector('text=/Technical foundation|Answer readiness|Generative readiness/i', { timeout: 150000 }),
  home.waitForSelector('text=/audits today|daily limit/i', { timeout: 150000 }).then(async () => {
    // The smallest element carrying the notice. Taking the first match returns a container,
    // which prints the navigation and tells you nothing.
    const msg = await home.evaluate(() => {
      const hits = [...document.querySelectorAll('p,div,span')]
        .filter(e => /audits today|daily limit/i.test(e.innerText || ''))
      return hits.sort((a, b) => a.innerText.length - b.innerText.length)[0]?.innerText.trim()
    })
    const resetsAt = new Date(Date.UTC(
      new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1))
    capSpent =
      `The free audit's daily cap is spent for this IP, so there is no report to photograph.\n` +
      `   The page said: ${msg}\n` +
      `   The counter is keyed to the UTC day, not the local one — a local date rollover is not\n` +
      `   a reset. It clears at ${resetsAt.toISOString()} (${resetsAt.toLocaleString()} local).`
  }),
])
await home.waitForTimeout(2500)

// Photograph the report itself rather than the viewport, which would show the form above it.
// Skipped when the cap is spent: `resultShot` stays null and the hero frame drops out below.
const box = capSpent ? null : await home.evaluate(() => {
  const found = [...document.querySelectorAll('div,section')].filter(el => {
    const t = el.innerText || ''
    if (!/\/\s*100/.test(t) || !/Technical foundation/i.test(t)) return false
    const r = el.getBoundingClientRect()
    return r.height > 250 && r.height < 2200
  })
  const el = found[found.length - 1]
  const r = el.getBoundingClientRect()
  return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), width: Math.round(r.width), height: Math.round(r.height) }
})
if (box) console.log('report block:', JSON.stringify(box))
// Capped: the gallery window shows the score and the categories, which is the part that sells.
// fullPage, because the clip is in page coordinates and the report sits far below the fold —
// a viewport-relative clip there is "outside the resulting image".
const resultShot = box
  ? await home.screenshot({ fullPage: true, clip: { ...box, height: Math.min(box.height, 880) } })
  : null

// ── 2. Supporting screens ──────────────────────────────────────────────────────────────────
const freeTools = await ctx.newPage()
await freeTools.goto(`${SITE}/#free-tools`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await freeTools.waitForSelector('#free-tools', { timeout: 30000 })
await freeTools.waitForTimeout(1200)
const toolsShot = await freeTools.locator('#free-tools').screenshot()

const pricing = await ctx.newPage()
await pricing.goto(`${SITE}/pricing`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await pricing.waitForTimeout(1500)
await pricing.click('text=Decline').catch(() => {})
await pricing.waitForTimeout(800)
const pricingShot = await pricing.screenshot({ fullPage: false })

// ── 3. Compose ─────────────────────────────────────────────────────────────────────────────
const FRAMES = [
  {
    file: '01-hero.png',
    shot: resultShot && asData(resultShot),
    kicker: 'Free, no account',
    headline: 'Can AI search even quote your page?',
    sub: 'Paste a URL and get the answer before you give an email address. Six weighted categories, a 0-100 score, and a worst-first list of fixes in plain language.',
  },
  {
    file: '02-free-tools.png',
    shot: asData(toolsShot),
    tall: true,
    kicker: 'Give before you ask',
    headline: 'Four tools that need no signup at all.',
    sub: 'The readiness audit, an E-E-A-T checker, an AI regex generator and a prospect finder. Each returns the finished result, not a teaser with the useful half behind a wall.',
  },
  {
    file: '03-pricing.png',
    shot: asData(pricingShot),
    kicker: 'Plans',
    headline: 'Free forever. Paid starts at $9.',
    sub: 'Three analyses a month with no card. $9 unlocks all 12 tools, $49 opens all 24. Data-heavy tools cost 2-3 credits and say so before you run them.',
  },
]

for (const f of FRAMES.filter(f => f.shot)) {
  const page = await ctx.newPage()
  await page.setViewportSize({ width: W, height: H })
  await page.setContent(frame(f), { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(OUT, f.file), scale: 'css' })
  await page.close()
  console.log('wrote', join(OUT, f.file))
}

await browser.close()
console.log('\ngallery in', OUT)
if (capSpent) {
  console.log('\nSKIPPED 01-hero.png — ' + capSpent)
  console.log('   Re-run after the reset and it will be written.')
}
