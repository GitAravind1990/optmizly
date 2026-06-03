import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx'

export const runtime = 'nodejs'
export const maxDuration = 30

// Very light HTML → docx converter. Handles h1-h3, p, ul/li, strong, em, br.
function htmlToDocxChildren(html: string): Paragraph[] {
  const out: Paragraph[] = []
  // Normalise whitespace
  const src = html.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ')

  // Match top-level block elements in order
  const blockRegex = /<(h1|h2|h3|p|ul|ol|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = blockRegex.exec(src)) !== null) {
    const tag = m[1].toLowerCase()
    const inner = m[2]

    if (tag === 'ul' || tag === 'ol') {
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
      let li: RegExpExecArray | null
      while ((li = liRegex.exec(inner)) !== null) {
        out.push(new Paragraph({
          children: inlineToRuns(li[1]),
          bullet: { level: 0 },
        }))
      }
      continue
    }

    if (tag === 'h1') {
      out.push(new Paragraph({ children: inlineToRuns(inner), heading: HeadingLevel.HEADING_1 }))
    } else if (tag === 'h2') {
      out.push(new Paragraph({ children: inlineToRuns(inner), heading: HeadingLevel.HEADING_2 }))
    } else if (tag === 'h3') {
      out.push(new Paragraph({ children: inlineToRuns(inner), heading: HeadingLevel.HEADING_3 }))
    } else if (tag === 'blockquote') {
      out.push(new Paragraph({ children: inlineToRuns(inner), indent: { left: 720 } }))
    } else {
      out.push(new Paragraph({ children: inlineToRuns(inner) }))
    }
  }

  // Fallback: if no block elements matched, dump whole text as one paragraph
  if (out.length === 0) {
    const text = src.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (text) out.push(new Paragraph({ children: [new TextRun(text)] }))
  }

  return out
}

function inlineToRuns(html: string): TextRun[] {
  const runs: TextRun[] = []
  // Split on <strong>, <b>, <em>, <i>
  const tokens: Array<{ text: string; bold?: boolean; italic?: boolean }> = []
  let remaining = html

  const inlineRegex = /<(strong|b|em|i)[^>]*>([\s\S]*?)<\/\1>/i
  while (remaining.length > 0) {
    const match = remaining.match(inlineRegex)
    if (!match || match.index === undefined) {
      tokens.push({ text: stripTags(remaining) })
      break
    }
    if (match.index > 0) {
      tokens.push({ text: stripTags(remaining.slice(0, match.index)) })
    }
    const tag = match[1].toLowerCase()
    tokens.push({
      text: stripTags(match[2]),
      bold: tag === 'strong' || tag === 'b',
      italic: tag === 'em' || tag === 'i',
    })
    remaining = remaining.slice(match.index + match[0].length)
  }

  for (const t of tokens) {
    if (!t.text) continue
    runs.push(new TextRun({ text: t.text, bold: t.bold, italics: t.italic }))
  }

  if (runs.length === 0) runs.push(new TextRun(''))
  return runs
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
    }

    const { html, filename } = await req.json()
    if (!html || typeof html !== 'string') {
      return new Response(JSON.stringify({ error: 'HTML content required' }), { status: 400 })
    }

    const children = htmlToDocxChildren(html)
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 22 }, // 11pt
          },
        },
      },
      sections: [{ children }],
    })

    const buffer = await Packer.toBuffer(doc)
    const safeName = (filename || 'fixed-content').replace(/[^a-zA-Z0-9_-]/g, '-')

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}.docx"`,
      },
    })
  } catch (e) {
    console.error('[fixer-docx] error:', e)
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'DOCX generation failed' }), { status: 500 })
  }
}