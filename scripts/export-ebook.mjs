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
 * pandoc, no typst, no HTML or CSS beside the markdown — so the re-export had to be a fresh
 * render. That is worse than it sounds: the design of a published asset became unreproducible
 * at exactly the moment it was needed. Keep this file with the repo so it does not happen
 * twice.
 *
 * Markdown through `marked`, styled for print, printed by Chromium via Playwright, which is
 * already a dependency here. A4, matching the page size of the previous export.
 *
 * The design is restrained and on-brand: brand-600 (#0000ff) for links, rules and callout
 * labels, a serif face for body text because this is a document to read rather than a page to
 * scan, and each chapter starting on its own page. That last rule makes the file longer than
 * the previous export; drop `h2:not(:first-of-type) { break-before: page }` below to flow it
 * continuously instead.
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

const md = readFileSync(SRC, 'utf8')

// The placeholder must survive into the PDF looking like a placeholder, not like copy. If it
// is still here, the export is a draft and says so on every page.
const PLACEHOLDER = /\[\[ADD CHROME WEB STORE URL BEFORE EXPORT[^\]]*\]\]/
const isDraft = PLACEHOLDER.test(md)

const body = marked.parse(md, { mangle: false, headerIds: true })

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>The SEO Professional's Guide to AI Search</title>
<style>
  :root { --brand:#0000ff; --ink:#111827; --body:#1f2937; --muted:#6b7280; --line:#e5e7eb;
          --soft:#f8fafc; --warn:#b91c1c; }

  @page { size: A4; margin: 20mm 18mm 18mm; }

  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin:0; color: var(--body); font: 10.5pt/1.62 Georgia, "Times New Roman", serif; }

  h1, h2, h3, h4, strong b { font-family: "Segoe UI", -apple-system, Helvetica, Arial, sans-serif; }

  /* The document title, and the PART dividers, own their pages. */
  h1 { font-size: 30pt; line-height:1.12; letter-spacing:-0.6pt; color: var(--ink); font-weight:800;
       margin: 0 0 8pt; break-before: page; }
  h1:first-of-type { break-before: avoid; }

  h2 { font-size: 17pt; line-height:1.2; letter-spacing:-0.3pt; color: var(--ink); font-weight:750;
       margin: 22pt 0 8pt; break-after: avoid; }
  /* Each chapter starts a page; the two title-page subheadings do not. */
  h2:not(:first-of-type) { break-before: page; }

  h3 { font-size: 12.5pt; color: var(--ink); font-weight:700; margin: 16pt 0 6pt; break-after: avoid; }

  p { margin: 0 0 9pt; orphans: 2; widows: 2; }
  ul, ol { margin: 0 0 10pt; padding-left: 16pt; }
  li { margin-bottom: 4pt; }

  a { color: var(--brand); text-decoration: none; }

  code { font: 9.5pt/1.4 "Cascadia Mono", Consolas, monospace; background: var(--soft);
         border: 1px solid var(--line); border-radius: 3px; padding: 0 3px; }

  hr { border: 0; border-top: 1px solid var(--line); margin: 16pt 0; }
  /* The source uses "---\\n---" as a part break; a doubled rule would look like a mistake. */
  hr + hr { display: none; }

  blockquote { margin: 12pt 0; padding: 8pt 0 8pt 14pt; border-left: 3px solid var(--brand);
               color: var(--ink); font-style: italic; break-inside: avoid; }
  blockquote p { margin: 0; }

  /* The callouts the source already uses. */
  .example { background: var(--soft); border: 1px solid var(--line); border-left: 3px solid var(--brand);
             border-radius: 4px; padding: 10pt 12pt; margin: 12pt 0; break-inside: avoid; }
  .example p { margin: 0; font-size: 10pt; }
  .ex-label { font-family: "Segoe UI", Helvetica, Arial, sans-serif; font-size: 8pt; font-weight: 700;
              letter-spacing: 0.6pt; text-transform: uppercase; color: var(--brand); margin-bottom: 5pt; }

  table { width:100%; border-collapse: collapse; margin: 12pt 0; font-size: 9.5pt; break-inside: avoid; }
  th, td { border: 1px solid var(--line); padding: 5pt 7pt; text-align: left; vertical-align: top; }
  th { background: var(--soft); font-family: "Segoe UI", Helvetica, Arial, sans-serif; font-weight: 700; }

  /* Unfilled placeholders are meant to be impossible to miss in a proof. */
  .placeholder { color: var(--warn); font-weight: 700; }
</style></head>
<body>${body}</body></html>`

// Mark the placeholder in the rendered HTML rather than in the source.
const marked_html = html.replace(
  /\[\[ADD CHROME WEB STORE URL BEFORE EXPORT[^\]]*\]\]/g,
  m => `<span class="placeholder">${m}</span>`
)

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(marked_html, { waitUntil: 'networkidle' })
await page.emulateMedia({ media: 'print' })

await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%;font:8pt 'Segoe UI',Helvetica,Arial,sans-serif;color:#9ca3af;
                padding:0 18mm;display:flex;justify-content:space-between;">
      <span>${isDraft ? 'DRAFT — contains an unfilled placeholder' : 'The SEO Professional’s Guide to AI Search'}</span>
      <span class="pageNumber"></span>
    </div>`,
  margin: { top: '20mm', bottom: '18mm', left: '18mm', right: '18mm' },
})

await browser.close()

const bytes = readFileSync(OUT).length
console.log(`wrote ${OUT}  (${(bytes / 1024).toFixed(0)} KB)`)
console.log(isDraft
  ? 'DRAFT: the Web Store placeholder is still in the text and is printed in red.'
  : 'No placeholder found — this export is distributable.')
