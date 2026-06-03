import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { callClaude, extractJSON } from '@/lib/anthropic'
import { apiError, apiSuccess } from '@/lib/api'

export const runtime = 'nodejs'
export const maxDuration = 60

const FRAMEWORK = `CONTENT FRAMEWORK — High-Performance SEO Style

== PHILOSOPHY ==
Style A: Long-form 2,500–5,000+ words, data-driven depth, step-by-step how-tos, soft CTAs throughout, plain language 8th grade reading level.
Style B: Skyscraper technique — beat the #1 result, short punchy sentences, one powerful technique per H2, bucket brigades, custom visuals, strong link-bait angle.
Master Formula: Irresistible Headline + Quick-Win Intro + Skyscraper Depth + Scannable Structure + Data Proof = Content That Compounds.

== HEADLINE RULES ==
Write a compelling headline using one of these proven formats:
- Number List: "17 [Topic] Strategies That Actually Work in 2025"
- How-To: "How to [Achieve Result] in [Timeframe] (Step-by-Step)"
- Ultimate Guide: "The Ultimate Guide to [Topic] (Backed by Data)"
- Contrarian: "Why Most [Topic] Advice Is Dead Wrong (And What to Do Instead)"
RULE: Keyword naturally in H1, first 100 words.

== 7-PART BLOG BLUEPRINT — FOLLOW EXACTLY ==

PART 1 — HOOK INTRO (first 150 words):
- NEVER start with "In this post I will..." or "Welcome to..."
- Open with a staggering stat, bold claim, pain point, OR mini-story
- Data-led opener: "Did you know X% of [audience] never [achieve goal]?"
- Story-led opener: "A few years ago, [relatable struggle]. Here's what changed everything."
- Use 1–2 sentence paragraphs ONLY
- End intro with: "Here's exactly what you'll learn:" followed by 3-4 bullet points

PART 2 — DEFINITION / CONTEXT (H2: "What is [Topic]?"):
- Answer in the FIRST 2 sentences — targets Google Featured Snippet
- Use a crisp 40–60 word definition paragraph
- Immediately expand with context and why it matters

PART 3 — CORE CONTENT (H2 sections):
- Each H2 = one distinct tactic, concept, or step
- Never exceed 400 words per section without a visual break
- Use numbered steps inside how-to sections
- Add [IMAGE PLACEHOLDER: description] every 300–400 words
- Use bucket brigades at transitions (see Writing Style section)
- **Bold every key phrase** readers might scan for

PART 4 — DATA & SOCIAL PROOF:
- Back every major claim with a stat or case result
- Format: "According to [credible source], X% of..."
- Include original data or results when possible

PART 5 — VISUAL ASSETS:
- Add [IMAGE PLACEHOLDER: annotated screenshot] markers
- Add [CHART PLACEHOLDER: description] for data
- Every 300–400 words MUST have a visual placeholder marker

PART 6 — INTERNAL LINKS & MID-CONTENT CTA:
- Add [INTERNAL LINK: relevant topic] placeholders — minimum 3, maximum 5
- Place [CTA: content upgrade description] at approximately the 60% mark
- Rule: every post needs one content upgrade offer

PART 7 — CONCLUSION (max 150 words):
- Summarize the 3 most important takeaways
- Close option A: Summary → soft tool/product CTA → question
- Close option B: "Now I want to hear from you — which [technique/tip] will you try first? Let me know in the comments below."

== WRITING STYLE RULES ==
- Maximum 3 sentences per paragraph. One-line paragraphs are encouraged. They create rhythm.
- Flesch–Kincaid grade 6–8. No jargon without immediate definition.
- Write as a practitioner: "I did X and got Y result." Address reader as "you" — 1:1 coaching tone.
- Bucket brigades every 3–5 paragraphs (mandatory):
  * "But here's the kicker:"
  * "Now for the best part:"
  * "Here's what most people get wrong:"
  * "Let me show you exactly how:"
  * "The bottom line?"
  * "Now here's where it gets interesting:"

`

const EEAT_SYSTEM = `You are an E-E-A-T specialist. Return ONLY valid JSON:
{"overall":0,"summary":"","dimensions":{"experience":{"score":0,"finding":""},"expertise":{"score":0,"finding":""},"authoritativeness":{"score":0,"finding":""},"trustworthiness":{"score":0,"finding":""}},"recommendations":[""]}`

const REWRITE_SYSTEM = (eeatFindings: string) => `You are a world-class SEO content writer who has mastered proven high-performance content frameworks used by top SEO publications.

Your job is to completely rewrite the provided content following the framework below with 100% fidelity. Do not cut the article short. Write the COMPLETE full-length article (minimum 1,500 words, ideally 2,500+ words).

FRAMEWORK TO FOLLOW STRICTLY:
${FRAMEWORK}

E-E-A-T ISSUES TO FIX IN THE REWRITE:
${eeatFindings}

CRITICAL RULES:
1. Write the COMPLETE article — do not stop early or truncate
2. Use bucket brigades — they are MANDATORY, include at least 5
3. Every H2 section must be fully written out, not summarised
4. Include all placeholders: [IMAGE PLACEHOLDER], [INTERNAL LINK], [CTA]
5. The article MUST have a proper conclusion with the sign-off question

OUTPUT FORMAT:
Write the complete rewritten article using HTML heading tags:
- Use <h1> for the article title (only one H1)
- Use <h2> for main section headings
- Use <h3> for sub-section headings
- Use <p> for paragraphs
- Use <strong> for bold text
- Use <ul><li> for bullet lists
- Do NOT use markdown (no # or ##) — use HTML tags only

Then write exactly this delimiter on its own line: ===REWRITE_END===
Then write the JSON metadata: {"improvements":["","","","",""],"framework_sections_applied":["hook_intro","definition_h2","bucket_brigades","data_proof","internal_links","cta_placement","conclusion"]}

Start writing the article now. Do not stop until the full article is complete.`

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('rewrite')
    const { content, summary, cachedEeat } = await req.json()

    // Step 1: E-E-A-T analysis (use cached if available)
    let eeatResult = cachedEeat
    if (!eeatResult?.overall) {
      const eeatRaw = await callClaude(
        EEAT_SYSTEM,
        `Analyse for E-E-A-T. Topic: ${summary ?? ''}.\n\n${content.slice(0, 3000)}`,
        1200
      )
      try { eeatResult = extractJSON(eeatRaw) } catch { eeatResult = {} }
    }

    // Build E-E-A-T findings
    const dims = eeatResult?.dimensions ?? {}
    const eeatFindings = Object.entries(dims)
      .map(([k, v]) => `${k.toUpperCase()} (${(v as {score:number}).score}/100): ${(v as {finding:string}).finding}`)
      .join('\n')
    const eeatRecs = (eeatResult?.recommendations ?? []).slice(0, 5)
      .map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')

    // Step 2: Full rewrite with higher token limit
    const raw = await callClaude(
      REWRITE_SYSTEM(`${eeatFindings}\n\nRECOMMENDATIONS TO APPLY:\n${eeatRecs}`),
      `Rewrite this content following the high-performance SEO framework. Write the COMPLETE article, do not truncate:\n\n${content.slice(0, 6000)}`,
      6000,
      'claude-sonnet-4-6'
    )

    const DELIM = '===REWRITE_END==='
    const delimIdx = raw.indexOf(DELIM)
    let rewrittenContent = raw
    let meta: { improvements?: string[]; framework_sections_applied?: string[] } = {}

    if (delimIdx > 0) {
      rewrittenContent = raw.slice(0, delimIdx).trim()
      try { meta = extractJSON(raw.slice(delimIdx + DELIM.length).trim()) } catch { /* ok */ }
    }

    // Strip dangerous HTML tags before sending to client (XSS prevention)
    rewrittenContent = rewrittenContent.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/\son\w+\s*=/gi, ' data-removed=')
      .replace(/<object[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')

    return apiSuccess({
      rewritten_content: rewrittenContent,
      improvements: meta.improvements ?? [],
      framework_sections_applied: meta.framework_sections_applied ?? [],
      eeat_applied: eeatResult,
      plan: user.plan,
    })
  } catch (e) {
    return apiError(e)
  }
}
