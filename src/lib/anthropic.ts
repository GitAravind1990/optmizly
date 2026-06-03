import Anthropic from '@anthropic-ai/sdk'

// This file is SERVER ONLY — never import in client components
if (typeof window !== 'undefined') {
  throw new Error('anthropic.ts must only be used on the server')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export type Model = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6'

export async function callClaude(
  system: string,
  prompt: string,
  maxTokens = 1500,
  model: Model = 'claude-haiku-4-5-20251001'
): Promise<string> {
  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0,
    system,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
}

export function extractJSON<T = Record<string, unknown>>(text: string): T {
  // Strip code fences
  let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // Replace literal \n sequences
  clean = clean.replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\\r/g, '')
  // Replace real newlines
  clean = clean.replace(/[\r\n\t]+/g, ' ')
  // Find JSON object
  const start = clean.indexOf('{')
  if (start === -1) throw new Error('No JSON found in response')
  clean = clean.slice(start)
  // Find matching closing brace
  let depth = 0, end = -1, inStr = false, esc = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (!inStr) {
      if (ch === '{') depth++
      else if (ch === '}') { depth--; if (depth === 0) { end = i; break } }
    }
  }
  if (end > -1) clean = clean.slice(0, end + 1)
  // Strip trailing commas
  clean = clean.replace(/,\s*([}\]])/g, '$1')
  // Fix empty values: "key":} or "key":, or "key":]
  clean = clean.replace(/:\s*([}\],])/g, ':null$1')
  // Fix empty array starts [,
  clean = clean.replace(/\[\s*,/g, '[null,')

  // Robust truncation repair — handle unterminated strings
  function repairJSON(s: string): string {
    // Track parser state to find where truncation occurred
    let inString = false
    let escaped = false
    let depth = 0
    let lastSafePos = 0

    for (let i = 0; i < s.length; i++) {
      const ch = s[i]
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }
      if (ch === '"') {
        inString = !inString
        if (!inString) lastSafePos = i + 1
        continue
      }
      if (!inString) {
        if (ch === '{' || ch === '[') { depth++; lastSafePos = i + 1 }
        else if (ch === '}' || ch === ']') { depth--; lastSafePos = i + 1 }
      }
    }

    // If we ended inside a string, truncate back to last safe position
    if (inString) {
      s = s.slice(0, lastSafePos) + '"'
    }

    // Close any open structures
    const opens2 = (s.match(/{/g) ?? []).length
    const closes2 = (s.match(/}/g) ?? []).length
    const aopens2 = (s.match(/\[/g) ?? []).length
    const acloses2 = (s.match(/\]/g) ?? []).length
    s += ']'.repeat(Math.max(0, aopens2 - acloses2))
    s += '}'.repeat(Math.max(0, opens2 - closes2))
    return s.replace(/,\s*([}\]])/g, '$1')
  }

  clean = repairJSON(clean)

  try {
    return JSON.parse(clean) as T
  } catch {
    // Last resort: try to find largest valid JSON substring
    for (let i = clean.length - 1; i > 0; i--) {
      if (clean[i] === '}' || clean[i] === ']') {
        try {
          return JSON.parse(clean.slice(0, i + 1)) as T
        } catch { continue }
      }
    }
    throw new Error('Could not parse JSON response')
  }
}
