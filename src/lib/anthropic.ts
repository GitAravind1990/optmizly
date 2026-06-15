import Anthropic from '@anthropic-ai/sdk'

// This file is SERVER ONLY — never import in client components
if (typeof window !== 'undefined') {
  throw new Error('anthropic.ts must only be used on the server')
}

const LLM_PROVIDER = process.env.LLM_PROVIDER ?? 'anthropic'

export type Model = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6'

// Map Anthropic model tiers → Groq model IDs
const GROQ_MODEL_MAP: Record<Model, string> = {
  'claude-haiku-4-5-20251001': process.env.GROQ_HAIKU_MODEL  ?? 'llama-3.1-8b-instant',
  'claude-sonnet-4-6':         process.env.GROQ_SONNET_MODEL ?? 'llama-3.3-70b-versatile',
}

// Map Anthropic model IDs → Bedrock model IDs
const BEDROCK_MODEL_MAP: Record<Model, string> = {
  'claude-haiku-4-5-20251001': process.env.BEDROCK_HAIKU_MODEL  ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  'claude-sonnet-4-6':         process.env.BEDROCK_SONNET_MODEL ?? 'us.anthropic.claude-sonnet-4-6-20251001-v1:0',
}

function createAnthropicClient(): Anthropic {
  if (LLM_PROVIDER === 'bedrock') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AnthropicBedrock } = require('@anthropic-ai/bedrock-sdk')
    return new AnthropicBedrock({
      awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
      awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION ?? 'us-east-1',
    }) as unknown as Anthropic
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

// Only instantiated when using Anthropic/Bedrock
export const anthropic = LLM_PROVIDER === 'groq' ? null! : createAnthropicClient()

async function callGroq(system: string, prompt: string, maxTokens: number, model: Model): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Groq = require('groq-sdk').default
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL_MAP[model],
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0,
  })
  return completion.choices[0]?.message?.content ?? ''
}

export async function callClaude(
  system: string,
  prompt: string,
  maxTokens = 1500,
  model: Model = 'claude-haiku-4-5-20251001'
): Promise<string> {
  if (LLM_PROVIDER === 'groq') {
    return callGroq(system, prompt, maxTokens, model)
  }

  const resolvedModel = LLM_PROVIDER === 'bedrock' ? BEDROCK_MODEL_MAP[model] : model
  const message = await anthropic.messages.create({
    model: resolvedModel,
    max_tokens: maxTokens,
    temperature: 0,
    system,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
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
  // Fix empty values
  clean = clean.replace(/:\s*([}\],])/g, ':null$1')
  // Fix empty array starts
  clean = clean.replace(/\[\s*,/g, '[null,')

  function repairJSON(s: string): string {
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

    if (inString) s = s.slice(0, lastSafePos) + '"'

    const opens2  = (s.match(/{/g) ?? []).length
    const closes2 = (s.match(/}/g) ?? []).length
    const aopens2  = (s.match(/\[/g) ?? []).length
    const acloses2 = (s.match(/\]/g) ?? []).length
    s += ']'.repeat(Math.max(0, aopens2 - acloses2))
    s += '}'.repeat(Math.max(0, opens2 - closes2))
    return s.replace(/,\s*([}\]])/g, '$1')
  }

  clean = repairJSON(clean)

  try {
    return JSON.parse(clean) as T
  } catch {
    for (let i = clean.length - 1; i > 0; i--) {
      if (clean[i] === '}' || clean[i] === ']') {
        try { return JSON.parse(clean.slice(0, i + 1)) as T } catch { continue }
      }
    }
    throw new Error('Could not parse JSON response')
  }
}
