interface FaqPair {
  question: string
  answer: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractFaqPairs(html: string): FaqPair[] {
  const pairs: FaqPair[] = []
  // Split on any heading tag so we can grab inter-heading content
  const segments = html.split(/(?=<h[1-6][^>]*>)/i)

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const h2Match = seg.match(/^<h2[^>]*>([^<]+\?)<\/h2>([\s\S]*)/i)
    if (!h2Match) continue

    const question = h2Match[1].trim()
    const bodyHtml = h2Match[2].trim()
    // Take the first 1–3 paragraphs as the answer
    const paraMatches = [...bodyHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    const answerText = paraMatches
      .slice(0, 3)
      .map(m => stripHtml(m[1]))
      .join(' ')
      .slice(0, 500)
      .trim()

    if (question && answerText) {
      pairs.push({ question, answer: answerText })
    }
  }

  return pairs
}

export function buildFaqJsonLd(pairs: FaqPair[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  })
}
