/**
 * Renders pages of a PDF to PNG, so a PDF can actually be looked at from here.
 *
 *   node scripts/render-pdf-pages.mjs <file.pdf> [outDir] [pages]
 *   node scripts/render-pdf-pages.mjs ebook.pdf ./shots 1,3,17
 *
 * poppler (pdftoppm) is not installed on this machine, which is why reading a PDF fails with
 * "install poppler-utils". Chromium is installed, and pdf.js renders to a canvas — so the file
 * goes in as a data URI, pdf.js draws each page, and the canvas is photographed.
 *
 * This is what made it possible to see the published ebook's design and rebuild it in
 * scripts/export-ebook.mjs. Proof an export against the edition it replaces before shipping
 * it; the alternative is trusting that markdown plus a stylesheet came out looking right,
 * which it did not the first time.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

const require = createRequire(join(process.cwd(), 'resolve.js'))
const playwright = await import(pathToFileURL(require.resolve('playwright')).href)
const chromium = playwright.chromium ?? playwright.default?.chromium

const SRC = process.argv[2]
const OUT_DIR = process.argv[3] || '.'
const PAGES = (process.argv[4] || '1,2').split(',').map(Number)

const b64 = readFileSync(SRC).toString('base64')

const html = `<!doctype html><html><head><meta charset="utf-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<style>body{margin:0;background:#fff}canvas{display:block}</style>
</head><body>
<script>
  window.ready = (async () => {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    const raw = atob("${b64}")
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
    window.__pageCount = pdf.numPages
    for (const n of ${JSON.stringify(PAGES)}) {
      if (n > pdf.numPages) continue
      const page = await pdf.getPage(n)
      const viewport = page.getViewport({ scale: 1.6 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.id = 'page-' + n
      document.body.append(canvas)
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    }
    return true
  })()
</script>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } })
page.on('pageerror', e => console.log('pageerror:', e.message))
await page.setContent(html, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.ready, null, { timeout: 60000 }).catch(e => console.log('render wait:', e.message.split('\n')[0]))
await page.evaluate(() => window.ready)

console.log('pages in file:', await page.evaluate(() => window.__pageCount))
for (const n of PAGES) {
  const canvas = page.locator(`#page-${n}`)
  if (await canvas.count()) {
    await canvas.screenshot({ path: join(OUT_DIR, `pdfpage-${n}.png`) })
    console.log('wrote', join(OUT_DIR, `pdfpage-${n}.png`))
  }
}
await browser.close()
