/**
 * Shows the generated icons at real toolbar size and magnified, on light and dark chrome, so
 * the 16px version can actually be judged rather than assumed.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

const require = createRequire(join(process.cwd(), 'resolve.js'))
const playwright = await import(pathToFileURL(require.resolve('playwright')).href)
const chromium = playwright.chromium ?? playwright.default?.chromium

const SCRATCH = String.raw`C:\Users\Aravind\AppData\Local\Temp\claude\G--optmizly\e69ec628-29c1-4ff1-9aee-f58d6187b083\scratchpad`
const url = p => `data:image/png;base64,${readFileSync(p).toString('base64')}`

const tile16 = url(join(SCRATCH, 'tile-16.png'))
const flat16 = url(join(SCRATCH, 'flat-16.png'))
const tile128 = url(join(SCRATCH, 'tile-128.png'))

const row = (label, src) => `
  <div class="row">
    <div class="label">${label}</div>
    <div class="bar light"><img src="${src}" class="actual"><span>light toolbar</span></div>
    <div class="bar dark"><img src="${src}" class="actual"><span>dark toolbar</span></div>
    <img src="${src}" class="zoom">
  </div>`

const html = `<!doctype html><html><head><style>
  body { margin:0; padding:24px; background:#fff; font:13px "Segoe UI",sans-serif; color:#0f172a; }
  .row { display:flex; align-items:center; gap:18px; margin-bottom:22px; }
  .label { width:110px; font-weight:700; }
  .bar { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; }
  .light { background:#f1f3f4; color:#3c4043; }
  .dark { background:#292a2d; color:#e8eaed; }
  .actual { width:16px; height:16px; }
  .zoom { width:128px; height:128px; image-rendering:pixelated;
          border:1px solid #e2e8f0; border-radius:8px; background:
          repeating-conic-gradient(#f8fafc 0% 25%, #eef2f6 0% 50%) 50%/16px 16px; }
</style></head><body>
  ${row('White tile', tile16)}
  ${row('No tile', flat16)}
  <div class="row"><div class="label">128px (tile)</div><img src="${tile128}" style="width:128px;height:128px"></div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 700, height: 420 }, deviceScaleFactor: 2 })
await page.setContent(html)
await page.waitForTimeout(300)
await page.screenshot({ path: join(SCRATCH, 'icon-compare.png') })
await browser.close()
console.log('wrote', join(SCRATCH, 'icon-compare.png'))
