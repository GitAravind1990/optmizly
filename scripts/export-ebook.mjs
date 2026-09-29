/**
 * Exports the lead-magnet ebook from markdown to PDF.
 *
 *   node scripts/export-ebook.mjs [source.md] [out.pdf]
 *
 * Defaults to the guide in Downloads, where the source and its export live: the ebook is a
 * marketing asset rather than part of this app, so it sits outside the repo.
 *
 * **This script exists because the original pipeline did not.** Whatever produced
 * Optmizly-AI-SEO-Guide.pdf was not on this machine when the guide next needed changing — no
 * pandoc, no typst, no HTML or CSS beside the markdown — so the design of a published asset
 * had become unreproducible at exactly the moment it was needed. Keep this file with the repo
 * so that does not happen twice.
 *
 * Markdown through `marked`, styled for print, printed by Chromium via Playwright, both
 * already dependencies here. A4, matching the previous export.
 *
 * **The styling below is a reconstruction of the published PDF**, read back page by page with
 * pdf.js (poppler is not installed here, so the Read tool refuses PDFs; Chromium renders them
 * fine). Navy headings on a teal accent, a justified serif measure, the mint pull-quote and
 * the blue-grey "IN PRACTICE" callout, the page number and optmizly.com in the footer, and a
 * dark cover with the node motif. It is a reconstruction, not the original artwork: the cover
 * graphic is redrawn from what the old one looks like, and the strapline below the subtitle
 * exists only in the PDF, never in the markdown, so it lives here as a constant.
 *
 * Note the palette is NOT the site's #0000ff. The book was made in the older navy/teal brand,
 * and a lead magnet that does not match its own published edition looks like a forgery rather
 * than a refresh. Change both together if the book is ever restyled.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

const require = createRequire(join(process.cwd(), 'resolve.js'))
// marked resolves to its CJS build here, so the named export arrives under `default`.
const markedMod = await import(pathToFileURL(require.resolve('marked')).href)
const marked = markedMod.marked ?? markedMod.default?.marked ?? markedMod.default
const playwright = await import(pathToFileURL(require.resolve('playwright')).href)
const chromium = playwright.chromium ?? playwright.default?.chromium

const SRC = process.argv[2] || String.raw`C:\Users\Aravind\Downloads\ebook2.md`
const OUT = process.argv[3] || String.raw`C:\Users\Aravind\Downloads\Optmizly-AI-SEO-Guide-DRAFT.pdf`

/** On the cover of the published edition, and nowhere in the markdown. */
const STRAPLINE = 'A practical, no-fluff field guide for agencies and SEO professionals'
const EYEBROW = 'OPTMIZLY FIELD GUIDE'

const md = readFileSync(SRC, 'utf8')

// An unfilled placeholder must reach the page looking like one, and mark the whole file as a
// proof. Silently printing it as copy is the failure this guards against.
const PLACEHOLDER = /\[\[ADD CHROME WEB STORE URL BEFORE EXPORT[^\]]*\]\]/
const isDraft = PLACEHOLDER.test(md)

let rendered = marked.parse(md)

/**
 * The first heading pair is the cover, not body text.
 *
 * Pulled out of the flow and rebuilt as the cover page, along with the rule that follows it —
 * otherwise the guide opens with a bare H1 on a white page, which is what the first version of
 * this script produced and the published edition never did.
 */
const title = rendered.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.trim() ?? 'Untitled'
const subtitle = rendered.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1]?.trim() ?? ''
rendered = rendered
  .replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '')
  .replace(/<h2[^>]*>[\s\S]*?<\/h2>/, '')
  .replace(/^\s*<hr\s*\/?>/, '')

const cover = `
<section class="cover">
  <svg class="cover-art" viewBox="0 0 600 420" aria-hidden="true">
    <g stroke="rgba(120,200,190,0.30)" stroke-width="1" fill="none">
      <path d="M150 250 L245 95 L520 55" /><path d="M150 250 L410 205" />
      <path d="M410 205 L245 95" /><path d="M410 205 L520 55" />
      <path d="M410 205 L545 300" /><path d="M410 205 L205 355" />
      <path d="M205 355 L150 250" />
    </g>
    <g fill="#5f7d94">
      <circle cx="150" cy="250" r="7" /><circle cx="245" cy="95" r="6" />
      <circle cx="520" cy="55" r="7" /><circle cx="545" cy="300" r="6" />
      <circle cx="205" cy="355" r="6" />
    </g>
    <circle cx="410" cy="205" r="26" fill="#2d9d8f" />
    <circle cx="410" cy="205" r="32" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2" />
  </svg>

  <div class="cover-body">
    <div class="eyebrow">${EYEBROW}</div>
    <h1 class="cover-title">${title}</h1>
    <div class="cover-rule"></div>
    <div class="cover-sub">${subtitle}</div>
    <div class="cover-strap">${STRAPLINE}</div>
  </div>

  <div class="cover-foot">
    <div class="cover-brand">Optmizly</div>
    <div class="cover-domain">optmizly.com</div>
  </div>
</section>`

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>
  :root {
    --navy:#1c3d5c; --navy-deep:#132a40; --teal:#2d9d8f;
    --ink:#1a1a1a; --muted:#6b7a88; --line:#dfe5ea;
    --callout:#f4f7fb; --quote:#edf7f3; --warn:#b91c1c;
  }

  @page { size: A4; margin: 24mm 22mm 20mm; }
  /* The cover art has to reach the trim, so that page gets a box of its own with no margin.
     Named pages, rather than negative margins, which cannot escape the page box. */
  @page cover { margin: 0; }

  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin:0; color: var(--ink);
    font: 10.5pt/1.62 "Georgia", "Times New Roman", serif;
    text-align: justify; hyphens: auto; -webkit-hyphens: auto;
  }

  h1, h2, h3, h4, .eyebrow, .cover-sub, .ex-label, th {
    font-family: "Segoe UI", -apple-system, Helvetica, Arial, sans-serif;
    text-align: left; hyphens: none;
  }

  /* ── Cover ─────────────────────────────────────────────────────────────── */

  .cover {
    page: cover; position: relative; break-after: page;
    margin: 0; padding: 34mm 26mm 26mm;
    width: 210mm; height: 297mm; box-sizing: border-box; overflow: hidden;
    /* Opaque stops only. A radial glow built from rgba(teal, 0.34) over navy converted to a
       magenta wash on the way into the PDF — gradients with alpha do not survive Chromium's
       print pipeline intact, whatever they look like on screen. */
    background: linear-gradient(158deg, #13273c 0%, #1b3a53 52%, #1f5360 100%);
    color: #fff;
  }
  .cover-art { position: absolute; top: 20mm; right: 8mm; width: 150mm; opacity: 0.95; }
  .cover-body { position: absolute; left: 26mm; right: 26mm; top: 47%; }
  .eyebrow { font-size: 9.5pt; font-weight: 700; letter-spacing: 3.2pt; color: #7fd0c3; margin-bottom: 8mm; }
  /* Overrides the body h1 rule: on the cover the title carries no teal underline and must not
     open a new page, which is what it did on the first attempt. */
  .cover-title {
    font-size: 34pt; line-height: 1.1; letter-spacing: -0.8pt; font-weight: 800;
    color: #fff; margin: 0 0 6mm; padding: 0; border: 0; break-before: avoid;
  }
  .cover-rule { width: 22mm; height: 2.5pt; background: var(--teal); margin-bottom: 6mm; }
  .cover-sub { font-size: 14pt; line-height: 1.35; color: #e6eef4; font-weight: 400; }
  .cover-strap { margin-top: 5mm; font-size: 11pt; font-style: italic; color: #9fb6c9; text-align: left; }
  .cover-foot { position: absolute; left: 26mm; bottom: 24mm; }
  .cover-brand { font-size: 13pt; font-weight: 700; }
  .cover-domain { font-size: 10pt; color: #9fb6c9; margin-top: 1mm; }

  /* ── Structure ─────────────────────────────────────────────────────────── */

  /* Parts and the contents page open a page; chapters flow, as the published edition does. */
  h1 { font-size: 20pt; line-height: 1.15; color: var(--navy); font-weight: 700;
       margin: 0 0 6mm; padding-bottom: 3mm; border-bottom: 2pt solid var(--teal);
       break-before: page; break-after: avoid; }
  h2 { font-size: 15pt; line-height: 1.2; color: var(--navy); font-weight: 700;
       margin: 9mm 0 3mm; break-after: avoid; }
  h3 { font-size: 11.5pt; color: var(--navy); font-weight: 700; margin: 6mm 0 2mm; break-after: avoid; }

  p { margin: 0 0 3.2mm; orphans: 2; widows: 2; }
  ul, ol { margin: 0 0 3.5mm; padding-left: 6mm; text-align: left; }
  li { margin-bottom: 1.4mm; }

  a { color: var(--teal); text-decoration: none; }
  strong { color: #10263a; }

  code { font: 9pt/1.4 "Cascadia Mono", Consolas, monospace; background: #f1f4f7;
         border: 1px solid var(--line); border-radius: 3px; padding: 0 3px; hyphens: none; }

  hr { border: 0; border-top: 1px solid var(--line); margin: 7mm 0; }
  hr + hr { display: none; }          /* the source uses "---\\n---" as a part break */

  blockquote {
    margin: 5mm 0; padding: 4mm 6mm; background: var(--quote);
    border-left: 3pt solid var(--teal); color: var(--navy);
    font-family: "Segoe UI", Helvetica, Arial, sans-serif; font-size: 10.5pt;
    font-weight: 700; text-align: left; break-inside: avoid;
  }
  blockquote p { margin: 0; }

  .example {
    background: var(--callout); border-left: 3pt solid var(--navy);
    padding: 4mm 6mm; margin: 5mm 0; break-inside: avoid;
  }
  .example p { margin: 0 0 2mm; font-size: 10pt; }
  .example p:last-child { margin-bottom: 0; }
  .ex-label { font-size: 8pt; font-weight: 700; letter-spacing: 1.4pt;
              text-transform: uppercase; color: var(--teal); margin-bottom: 2.5mm; }

  table { width:100%; border-collapse: collapse; margin: 5mm 0; font-size: 9.5pt;
          break-inside: avoid; text-align: left; }
  th, td { border: 1px solid var(--line); padding: 2mm 3mm; vertical-align: top; text-align: left; }
  th { background: var(--callout); color: var(--navy); font-weight: 700; }

  .placeholder { color: var(--warn); font-weight: 700; }
</style></head>
<body>${cover}${rendered}</body></html>`
  .replace(/\[\[ADD CHROME WEB STORE URL BEFORE EXPORT[^\]]*\]\]/g, m => `<span class="placeholder">${m}</span>`)

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.emulateMedia({ media: 'print' })

await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  // Page number centred, domain right — the published edition's footer.
  footerTemplate: `
    <div style="width:100%;font:8pt 'Segoe UI',Helvetica,Arial,sans-serif;color:#9fb0bd;
                padding:0 22mm;display:flex;align-items:center;">
      <span style="flex:1;color:#b91c1c;font-weight:700;">${isDraft ? 'DRAFT — unfilled placeholder' : ''}</span>
      <span class="pageNumber" style="flex:0 0 auto;"></span>
      <span style="flex:1;text-align:right;">optmizly.com</span>
    </div>`,
  margin: { top: '24mm', bottom: '20mm', left: '22mm', right: '22mm' },
})

await browser.close()

console.log(`wrote ${OUT}  (${(readFileSync(OUT).length / 1024).toFixed(0)} KB)`)
console.log(isDraft
  ? 'DRAFT: the Web Store placeholder is still in the text, printed in red, flagged on every page.'
  : 'No placeholder found — this export is distributable.')
