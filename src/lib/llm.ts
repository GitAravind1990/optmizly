// Single entry point for every LLM call in the product.
//
// Provider-neutral on purpose: LLM_PROVIDER selects between Groq, Anthropic and
// Bedrock at runtime, and production currently runs Groq. This file was called
// anthropic.ts and its function callClaude() until 2026-08-09, which made the source
// read as though Anthropic were the provider — that is how Groq ended up processing
// user content while the privacy policy still named Anthropic. Do not rename these
// after whichever provider happens to be live; name them after the job.
//
// The Anthropic SDK import below is one provider path among three, not the default.

import Anthropic from '@anthropic-ai/sdk'
import { AsyncLocalStorage } from 'async_hooks'
import { prisma } from './prisma'
import { reserve, release, sync, markExhausted, estimateTokens, fitBudget } from './groq-limiter'

export { GroqCapacityError } from './groq-limiter'

// This file is SERVER ONLY — never import in client components
if (typeof window !== 'undefined') {
  throw new Error('llm.ts must only be used on the server')
}

// Per-request userId storage for automatic token tracking
const trackingStorage = new AsyncLocalStorage<string>()

/** Set the tracking userId for the current async context (call once in a route handler after auth). */
export function setTrackingUser(userId: string): void {
  trackingStorage.enterWith(userId)
}

/** Wrap an async route body to auto-track tokens for all callLLM calls within it. */
export function runWithTracking<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return trackingStorage.run(userId, fn)
}

const LLM_PROVIDER = process.env.LLM_PROVIDER ?? 'anthropic'

export type Model = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6'

// Map Anthropic model tiers → Groq model IDs.
//
// Was llama-3.1-8b-instant / llama-3.3-70b-versatile until 2026-08-17, when Groq retired
// both and every AI tool on the site started returning 404 model_not_found. Nothing in the
// catalogue is a plain instruct model any more — what remains is reasoning models, Whisper
// and safety classifiers — so the replacements behave differently and callGroq below has
// to account for that.
const GROQ_MODEL_MAP: Record<Model, string> = {
  'claude-haiku-4-5-20251001': process.env.GROQ_HAIKU_MODEL  ?? 'openai/gpt-oss-20b',
  'claude-sonnet-4-6':         process.env.GROQ_SONNET_MODEL ?? 'openai/gpt-oss-120b',
}

/**
 * Reasoning budget the gpt-oss models spend before writing a single visible character.
 *
 * They emit into a separate `reasoning` field that shares the max_tokens budget with the
 * answer, so a caller asking for 1200 tokens got 1200 tokens of reasoning and an **empty
 * string** back — `finish_reason: length`, no error, nothing to parse.
 *
 * `reasoning_effort` is what makes them usable, and the setting is load-bearing rather
 * than a tuning knob: measured on a real E-E-A-T prompt, `low` spent 36 reasoning tokens
 * and returned the empty JSON schema echoed straight back, while `medium` spent ~858 and
 * produced a genuine analysis. So `medium` it is, and every caller's budget is topped up
 * by this allowance so the numbers they already pass still leave room for an answer.
 */
const GROQ_REASONING_EFFORT = 'medium'
export const GROQ_REASONING_ALLOWANCE = 1_200

/**
 * How long a call may sit queued waiting for per-minute token capacity before giving up.
 *
 * Sized for a 60s route by default: a single call refused on an empty bucket needs about
 * 20s of refill for a typical 2,500-token budget, so 30s covers it and still leaves the
 * route time to make the call and do its own work. Callers on a longer maxDuration —
 * Content Optimizer runs seven sections through one 8,000/min bucket — pass their own,
 * larger value.
 */
const GROQ_DEFAULT_QUEUE_MS = 30_000

/**
 * Hard ceiling on max_tokens for a single Groq request.
 *
 * The account's per-minute token allowance is 8,000 org-wide, and Groq rejects a request
 * outright — "Request too large", before any work happens — if its max_tokens exceeds
 * what the bucket can hold. So the retry below cannot simply double: 4,200 → 8,400 is
 * refused, while 7,500 completes. Kept just under the limit rather than at it, because
 * anything else running concurrently is drawing on the same bucket.
 *
 * Raise this only alongside the account's actual rate limit; it is not a tuning knob.
 */
const GROQ_MAX_REQUEST_TOKENS = 7_500

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

async function callGroq(system: string, prompt: string, maxTokens: number, model: Model, maxQueueMs: number): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Groq = require('groq-sdk').default
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const groqModel = GROQ_MODEL_MAP[model]

  // What the per-minute bucket will actually be charged for this call. Groq bills the
  // reservation — prompt tokens plus max_tokens — at admission, not what the completion
  // turns out to need, and never refunds the difference. See groq-limiter.ts.
  const estimatedInput = estimateTokens(system) + estimateTokens(prompt)

  const ask = async (budget: number) => {
    const queuedMs = await reserve(groqModel, estimatedInput + budget, maxQueueMs)
    if (queuedMs > 1_000) {
      console.warn(`[LLM] ${groqModel} queued ${(queuedMs / 1000).toFixed(1)}s for ${estimatedInput + budget} tokens of per-minute capacity`)
    }
    let data, response
    try {
      ({ data, response } = await groq.chat.completions.create({
        model: groqModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        // Reasoning and answer share this budget — see GROQ_REASONING_ALLOWANCE.
        max_tokens: budget,
        reasoning_effort: GROQ_REASONING_EFFORT,
        temperature: 0,
      }).withResponse())
    } catch (e) {
      // Groq saying "rate limit" is better information about the bucket than anything this
      // process inferred. Without recording it, the local bucket still reads as healthy and
      // every call queued behind this one is admitted into the same refusal.
      if ((e as { status?: number })?.status === 429) markExhausted(groqModel)
      throw e
    }
    // Give back the part of the prompt estimate that was never charged, before folding in
    // the header — the header already reflects the true cost, so clamping to it afterwards
    // keeps a refund from being counted twice when other traffic has moved the bucket.
    release(groqModel, estimatedInput - (data.usage?.prompt_tokens ?? estimatedInput))
    // The header is the org-wide truth; this process only ever sees its own share of the
    // spend, so every response is a chance to correct the local estimate downward.
    sync(groqModel, Number(response.headers.get('x-ratelimit-remaining-tokens')))
    return data
  }

  // fitBudget keeps prompt + max_tokens inside the whole bucket. GROQ_MAX_REQUEST_TOKENS
  // caps the budget alone, which is not sufficient: 7,500 is legal by itself and still
  // refused outright once an 800-token prompt is in front of it on an 8,000 bucket.
  const firstBudget = fitBudget(estimatedInput, Math.min(maxTokens + GROQ_REASONING_ALLOWANCE, GROQ_MAX_REQUEST_TOKENS))
  const retryBudget = fitBudget(estimatedInput, Math.min(firstBudget * 2, GROQ_MAX_REQUEST_TOKENS))
  let completion = await ask(firstBudget)
  let choice = completion.choices[0]

  // Empty content with finish_reason 'length' means reasoning ate the whole budget before
  // the model wrote a character. The SDK reports success, so without this it would surface
  // downstream as an unparseable response and get blamed on the prompt.
  //
  // Retried rather than simply given a bigger allowance up front, because reasoning cost is
  // not a property of the tool — measured across real prompts it ranged from 655 tokens
  // (Content Gap) to 4,198 (Backlinks, which exhausted its entire budget). Sizing every
  // call for the worst case would inflate cost and burn through the per-minute token limit
  // for the majority that never need it.
  if (!choice?.message?.content && choice?.finish_reason === 'length' && retryBudget > firstBudget) {
    console.warn(
      `[LLM] ${GROQ_MODEL_MAP[model]} used all ${firstBudget} tokens on reasoning; retrying at ${retryBudget}`
    )
    completion = await ask(retryBudget)
    choice = completion.choices[0]
  }

  const text = choice?.message?.content ?? ''

  // Non-empty *and* truncated: the caller gets a partial answer that extractJSON's repair
  // pass will silently close up, so it arrives looking well-formed with fields missing.
  // Not retried here — that would double the cost of tools whose output is legitimately
  // long — but budgets are sized against measured output, so this appearing in the logs
  // means a budget is now too tight for real content.
  if (text && choice?.finish_reason === 'length') {
    console.warn(`[LLM] ${groqModel} truncated at ${retryBudget === firstBudget ? firstBudget : retryBudget} tokens; response is incomplete`)
  }

  if (!text && choice?.finish_reason === 'length') {
    throw new Error(
      `Groq model ${GROQ_MODEL_MAP[model]} returned no content at ${retryBudget} tokens — reasoning consumed the entire budget`
    )
  }

  return {
    text,
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
  }
}

async function trackTokens(userId: string, inputTokens: number, outputTokens: number): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalInputTokens: { increment: inputTokens },
        totalOutputTokens: { increment: outputTokens },
      },
    })
  } catch {
    // fire-and-forget: don't let tracking errors surface to callers
  }
}

/** clerkId -> User.id. The mapping never changes for a given clerkId, so this is safe to
 *  hold for the life of the process and saves a lookup on every model call.
 *
 *  Holds the in-flight promise rather than the resolved id, so the seven parallel calls
 *  Content Optimizer makes share one query instead of racing to answer the same question
 *  seven times on a cold process. */
const userIdByClerkId = new Map<string, Promise<string | null>>()

/**
 * Who to bill this call to.
 *
 * The AsyncLocalStorage store is the fast path, but it only holds a value when
 * setTrackingUser() was called from the same async frame that later calls callLLM — i.e.
 * from the route handler itself. That is a much narrower guarantee than it looks, and it
 * is why every token counter in this product read zero from June until it was noticed on
 * 2026-08-18:
 *
 *   requireAuth() called setTrackingUser() just before returning, which reads as though
 *   every route using it was covered. It is not. enterWith() applies to the current
 *   execution context and its descendants, and an awaited callee is not an ancestor of
 *   its caller's continuation — the route resumes in the context it had at the await,
 *   with no store. So the value was set into a context that ended the moment
 *   requireAuth() returned, and callLLM saw undefined on all eighteen routes.
 *
 * Two routes (backlinks, content-ideas outline) had a second setTrackingUser() call in
 * the route body, which does work. Whoever added those found the symptom and patched
 * around it twice without the cause surfacing, which is the reason attribution now lives
 * here rather than at each call site: this is the one place every model call passes
 * through, and a route that forgets a line is indistinguishable from a route that has
 * nothing to attribute.
 *
 * The fallback asks Clerk who is making the current request. That is request-scoped
 * state Next.js maintains for us, so it needs no cooperation from the caller and cannot
 * be forgotten by the next route author. Outside a request — the crons, a script — auth()
 * has no context and throws; unattributed is the right answer there, so it is swallowed.
 */
async function resolveTrackingUser(): Promise<string | null> {
  const fromContext = trackingStorage.getStore()
  if (fromContext) return fromContext

  try {
    const { auth } = await import('@clerk/nextjs/server')
    const { userId: clerkId } = await auth()
    if (!clerkId) return null

    const cached = userIdByClerkId.get(clerkId)
    if (cached) return await cached

    const lookup = prisma.user
      .findUnique({ where: { clerkId }, select: { id: true } })
      .then(u => u?.id ?? null)
    userIdByClerkId.set(clerkId, lookup)
    // Neither a failed lookup nor a miss may be cached as a permanent "unknown" for this
    // clerkId: users are auto-provisioned on first use, so a miss now can be a hit later
    // and this map outlives the request that saw it.
    lookup.then(id => { if (!id) userIdByClerkId.delete(clerkId) }).catch(() => userIdByClerkId.delete(clerkId))
    return await lookup
  } catch {
    // No request context, or Clerk is unavailable. Tokens go unattributed rather than
    // failing the call the user actually asked for.
    return null
  }
}

function getRetryAfterMs(error: unknown, attempt: number): number {
  const fallbackMs = 1000 * Math.pow(2, attempt) // 1s, 2s, 4s
  const headers = (error as { headers?: { get?(name: string): string | null } })?.headers
  const retryAfter = headers?.get?.('retry-after')
  if (!retryAfter) return fallbackMs
  const parsed = parseFloat(retryAfter)
  return Number.isNaN(parsed) ? fallbackMs : parsed * 1000
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (e) {
      const status = (e as { status?: number })?.status
      if (status !== 429 || attempt >= maxRetries) throw e
      await new Promise(resolve => setTimeout(resolve, getRetryAfterMs(e, attempt)))
    }
  }
}

export async function callLLM(
  system: string,
  prompt: string,
  maxTokens = 1500,
  model: Model = 'claude-haiku-4-5-20251001',
  opts: {
    /** How long this call may queue for Groq per-minute capacity. Raise it only on a route
     *  whose maxDuration can absorb the wait. */
    maxQueueMs?: number
  } = {}
): Promise<string> {
  let text: string
  let inputTokens: number
  let outputTokens: number

  if (LLM_PROVIDER === 'groq') {
    const maxQueueMs = opts.maxQueueMs ?? GROQ_DEFAULT_QUEUE_MS
    const result = await withRetry(() => callGroq(system, prompt, maxTokens, model, maxQueueMs))
    text = result.text
    inputTokens = result.inputTokens
    outputTokens = result.outputTokens
  } else {
    const resolvedModel = LLM_PROVIDER === 'bedrock' ? BEDROCK_MODEL_MAP[model] : model
    const message = await withRetry(() => anthropic.messages.create({
      model: resolvedModel,
      max_tokens: maxTokens,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: prompt }],
    }))
    text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
    inputTokens = message.usage.input_tokens
    outputTokens = message.usage.output_tokens
  }

  const userId = await resolveTrackingUser()
  if (userId) {
    void trackTokens(userId, inputTokens, outputTokens)
  }

  return text
}

/** Thrown when the model's response can't be parsed as JSON — distinct from a real
 *  server error so callers can surface a "please try again" message instead of
 *  a generic 500. */
export class AIResponseParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIResponseParseError'
  }
}

export function extractJSON<T = Record<string, unknown>>(text: string): T {
  // Strip code fences
  let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // Replace literal \n sequences
  clean = clean.replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\\r/g, '')
  // Replace real newlines
  clean = clean.replace(/[\r\n\t]+/g, ' ')
  // Find JSON object or array
  const braceIdx = clean.indexOf('{')
  const bracketIdx = clean.indexOf('[')
  const start = braceIdx === -1 ? bracketIdx : bracketIdx === -1 ? braceIdx : Math.min(braceIdx, bracketIdx)
  if (start === -1) throw new AIResponseParseError('No JSON found in response')
  clean = clean.slice(start)
  // Find matching closing brace/bracket
  let depth = 0, end = -1, inStr = false, esc = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (!inStr) {
      if (ch === '{' || ch === '[') depth++
      else if (ch === '}' || ch === ']') { depth--; if (depth === 0) { end = i; break } }
    }
  }
  if (end > -1) clean = clean.slice(0, end + 1)
  // Strip trailing commas
  clean = clean.replace(/,\s*([}\]])/g, '$1')
  // Fix empty values
  clean = clean.replace(/:\s*([}\],])/g, ':null$1')
  // Fix empty array starts
  clean = clean.replace(/\[\s*,/g, '[null,')

  // Stack-based, not count-based: tracks the actual nesting order of open
  // brackets so it can fix both a truncated response (brackets never closed —
  // the original failure mode this was built for) and a wrong-closer response
  // (observed live: the model closed a "plan" array with "}" instead of "]" right
  // before the outer object's own "}" — same bracket *count* on each side, so
  // the old blind "count {, count }, append the difference" approach saw
  // balanced counts and did nothing, then mis-fixed the real problem by
  // appending "]" at the very end instead of where it was actually missing).
  function repairJSON(s: string): string {
    let inString = false
    let escaped = false
    const stack: Array<'}' | ']'> = []
    let out = ''
    let lastSafePos = 0

    for (let i = 0; i < s.length; i++) {
      const ch = s[i]
      if (escaped) { out += ch; escaped = false; continue }
      if (ch === '\\') { out += ch; escaped = true; continue }
      if (ch === '"') {
        inString = !inString
        out += ch
        if (!inString) lastSafePos = out.length
        continue
      }
      if (!inString) {
        if (ch === '{') { stack.push('}'); out += ch; lastSafePos = out.length; continue }
        if (ch === '[') { stack.push(']'); out += ch; lastSafePos = out.length; continue }
        if (ch === '}' || ch === ']') {
          // A closer that doesn't match the innermost open bracket means a
          // bracket was skipped (e.g. array never closed before the object) —
          // insert whatever's actually missing first, then let this character
          // close the level it now genuinely matches.
          while (stack.length && stack[stack.length - 1] !== ch) out += stack.pop()
          if (stack.length && stack[stack.length - 1] === ch) {
            stack.pop()
            out += ch
            lastSafePos = out.length
          }
          // else: a stray closer with nothing open to match — drop it.
          continue
        }
      }
      out += ch
    }

    if (inString) out = out.slice(0, lastSafePos) + '"'
    while (stack.length) out += stack.pop()

    return out.replace(/,\s*([}\]])/g, '$1')
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
    throw new AIResponseParseError('Could not parse JSON response')
  }
}
