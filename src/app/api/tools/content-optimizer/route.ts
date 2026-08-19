import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { callLLM as callLLMShared, extractJSON, GROQ_REASONING_ALLOWANCE, GroqCapacityError } from '@/lib/llm';
import { requireAuth, AuthError, getOrCreateUser, refundUsage } from '@/lib/auth';
import { captureServerException } from '@/lib/posthog-server';

// Seven model calls through one 8,000 tokens/minute bucket cannot finish inside 60s: the
// run reserves ~19k tokens and the bucket refills at ~133/s, so it needs a little over two
// minutes of capacity no matter how the calls are ordered. The limiter in groq-limiter.ts
// paces them; this is the room it needs to do that. Drops back to well under a minute on
// its own the moment the Groq account has a larger per-minute allowance.
export const maxDuration = 300;

/** Ceiling on how long any one section may sit queued for token capacity. Seven sections
 *  share the bucket, so the last one admitted waits for all six in front of it. */
const SECTION_QUEUE_MS = 240_000;

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  try {
    const user = await requireAuth('content-optimizer')
    clerkId = user.clerkId

    const { content, targetKeyword, contentUrl } = await req.json();
    if (!content || !targetKeyword) {
      return NextResponse.json({ error: 'Content and target keyword are required' }, { status: 400 });
    }

    // Run all 7 analyses in parallel.
    //
    // allSettled rather than all, so a failure reports every section that broke instead of
    // whichever rejected first. With seven concurrent calls against a shared per-minute
    // token budget, partial failure is the likely shape, and "three sections failed" is a
    // far more useful error than one name.
    const settled = await Promise.allSettled([
      analyzeSearchIntent(content, targetKeyword),
      analyzeEntities(content, targetKeyword),
      analyzeLsiKeywords(content, targetKeyword),
      generateSchemaMarkup(content, targetKeyword),
      analyzeTopicCoverage(content, targetKeyword),
      analyzeEEAT(content, targetKeyword),
      generateImprovements(content, targetKeyword),
    ]);

    // Running out of per-minute token capacity is not the same kind of failure as a
    // section the model could not produce: the content was never sent, nothing was
    // charged, and trying again shortly genuinely works. Naming it as a broken section
    // would send the user back to rewrite content that was fine.
    const starved = settled.some(r => r.status === 'rejected' && r.reason instanceof GroqCapacityError);
    if (starved) {
      console.error('[ContentOptimizer] ran out of Groq per-minute token capacity');
      await refundUsage(user.userId, 'content-optimizer');
      throw new AuthError(
        503,
        'The AI provider’s per-minute limit is saturated right now. Nothing was saved and nothing was charged — please try again in a minute.'
      );
    }

    const failures = settled.flatMap(r =>
      r.status === 'rejected'
        ? [r.reason instanceof SectionError ? r.reason.section : String(r.reason?.message ?? r.reason)]
        : []
    );
    if (failures.length > 0) {
      // Nothing is saved. Six of these scores are weighted into overallScore and every
      // score column is a non-nullable Int, so a partial run cannot be recorded honestly —
      // it would have to invent the missing pieces, which is exactly what this replaced.
      console.error(`[ContentOptimizer] ${failures.length}/7 sections failed:`, failures.join('; '));
      throw new AuthError(
        502,
        `Analysis incomplete — could not produce: ${failures.join(', ')}. Nothing was saved. Please try again.`
      );
    }

    const [intentAnalysis, entityAnalysis, lsiAnalysis, schemaAnalysis, topicAnalysis, eeatAnalysis, improvements] =
      settled.map(r => (r as PromiseFulfilledResult<unknown>).value) as [
        IntentSection, EntitySection, LsiSection, SchemaSection, TopicSection, EeatSection, ImprovementsSection,
      ];

    const overallScore = Math.round(
      intentAnalysis.matchScore * 0.15 +
      entityAnalysis.score * 0.15 +
      lsiAnalysis.score * 0.15 +
      topicAnalysis.score * 0.20 +
      eeatAnalysis.overall * 0.20 +
      improvements.contentScore * 0.15
    );

    const optimization = await prisma.contentOptimization.create({
      data: {
        userId: user.userId,
        content,
        targetKeyword,
        contentUrl: contentUrl || null,
        detectedIntent: intentAnalysis.intent,
        intentMatchScore: intentAnalysis.matchScore,
        intentSuggestions: JSON.stringify(intentAnalysis.suggestions),
        entities: JSON.stringify(entityAnalysis.entities),
        entityScore: entityAnalysis.score,
        missingEntities: JSON.stringify(entityAnalysis.missing),
        entityRelationships: JSON.stringify(entityAnalysis.relationships),
        lsiKeywords: JSON.stringify(lsiAnalysis.found),
        missingLsi: JSON.stringify(lsiAnalysis.missing),
        lsiScore: lsiAnalysis.score,
        recommendedSchema: schemaAnalysis.type,
        schemaJsonLd: schemaAnalysis.jsonLd,
        mainTopic: topicAnalysis.mainTopic,
        subtopicsCovered: JSON.stringify(topicAnalysis.covered),
        subtopicsMissing: JSON.stringify(topicAnalysis.missing),
        topicCoverageScore: topicAnalysis.score,
        pillarSuggestion: topicAnalysis.pillarSuggestion || null,
        clusterSuggestions: JSON.stringify(topicAnalysis.clusterSuggestions),
        internalLinkingOps: JSON.stringify(topicAnalysis.linkingOpportunities),
        experienceScore: eeatAnalysis.experience,
        expertiseScore: eeatAnalysis.expertise,
        authorityScore: eeatAnalysis.authority,
        trustScore: eeatAnalysis.trust,
        eeatOverall: eeatAnalysis.overall,
        overallScore,
        rewriteSuggestions: JSON.stringify(improvements.rewrites),
        improvements: JSON.stringify(improvements.fixes),
      },
    });

    // Save individual fixes (non-blocking via createMany)
    const allFixes = [
      ...intentAnalysis.suggestions.map((s: Fix) => ({ ...s, category: 'intent' })),
      ...entityAnalysis.suggestions.map((s: Fix) => ({ ...s, category: 'entity' })),
      ...lsiAnalysis.suggestions.map((s: Fix) => ({ ...s, category: 'lsi' })),
      ...topicAnalysis.suggestions.map((s: Fix) => ({ ...s, category: 'topic' })),
      ...improvements.fixes.map((s: Fix) => ({ ...s, category: 'general' })),
    ];

    if (allFixes.length > 0) {
      await prisma.contentOptimizationFix.createMany({
        data: allFixes.map(fix => ({
          optimizationId: optimization.id,
          category: fix.category ?? 'general',
          priority: fix.priority ?? 'info',
          issue: fix.issue ?? '',
          suggestion: fix.suggestion ?? '',
          beforeText: fix.beforeText ?? null,
          afterText: fix.afterText ?? null,
        })),
      });
    }

    return NextResponse.json({
      id: optimization.id,
      overallScore,
      intent: intentAnalysis,
      entities: entityAnalysis,
      lsi: lsiAnalysis,
      schema: schemaAnalysis,
      topics: topicAnalysis,
      eeat: eeatAnalysis,
      improvements,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Content Optimizer error:', error);
    await captureServerException(clerkId, error, { route: '/api/tools/content-optimizer' })
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

export async function GET() {
  const { userId: clerkId } = await auth();
  try {
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await getOrCreateUser(clerkId);

    const optimizations = await prisma.contentOptimization.findMany({
      where: { userId: user.id },
      orderBy: { analyzedAt: 'desc' },
      take: 20,
      select: { id: true, targetKeyword: true, overallScore: true, detectedIntent: true, analyzedAt: true },
    });

    return NextResponse.json({ optimizations });
  } catch (e) {
    await captureServerException(clerkId, e, { route: '/api/tools/content-optimizer' })
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// ─── Analysis helpers ───────────────────────────────────────────────────────

interface Fix {
  category?: string;
  priority?: string;
  issue?: string;
  suggestion?: string;
  beforeText?: string;
  afterText?: string;
}

/**
 * Total token budget per section — reasoning and answer together, which is what the model
 * spends and what Groq charges.
 *
 * Every section asked for 3,000 (a 4,200 budget once the reasoning allowance is added)
 * because one number was easier than seven. That is not free: Groq reserves
 * prompt + max_tokens against the per-minute bucket at admission and never refunds the
 * unused part, so the run was charged 33,849 tokens to do 13,573 tokens of work — four
 * times an 8,000/min bucket, which is why the seven parallel calls 429'd each other.
 *
 * Measured on gpt-oss-120b, 2026-08-19, against 3,000 characters of article text — the
 * same slice every prompt below sends — then given ~1.5x headroom over the LARGEST of
 * several samples, not over one. Sizing from a single sample is what made the first
 * attempt at this table wrong: schema measured 1,075 once, so it was given 1,700, and the
 * very next run wrote 1,766 tokens and came back truncated. Observed spreads were:
 *
 *   intent 499–752      entities 1,754–2,424   lsi 1,231–1,416   schema 1,075–1,766
 *   topic 1,653–1,931   eeat 454–464           improvements 1,414–1,590
 *
 * The variance is reasoning, which is not stable run to run. Schema and entities are the
 * open-ended ones — both write as much markup or as many entities as the content merits —
 * so they carry the widest margins.
 *
 * Watch for the "truncated" warning from llm.ts: that is what a budget that has drifted
 * too tight looks like in the logs, and it arrives as an unparseable section rather than
 * an obviously short one.
 */
const SECTION_BUDGET = {
  intent:       1_400,
  entities:     3_700,
  lsi:          2_200,
  schema:       2_700,
  topic:        2_900,
  eeat:         1_200,
  improvements: 2_500,
} as const;

/**
 * `totalBudget` is reasoning + answer. callLLM adds the reasoning allowance to whatever it
 * is given, so subtract it here to land on the number actually measured above rather than
 * silently overshooting every section by the allowance.
 */
async function callLLM(prompt: string, totalBudget: number): Promise<string> {
  return callLLMShared('', prompt, Math.max(256, totalBudget - GROQ_REASONING_ALLOWANCE), 'claude-sonnet-4-6', {
    maxQueueMs: SECTION_QUEUE_MS,
  })
}

/**
 * Parses one analysis section, or fails loudly.
 *
 * This used to take a `fallback` and return it on any parse failure. The fallbacks were not
 * empty — they carried scores (matchScore 50, score 50, eeat overall 50) which six of the
 * seven sections feed into the weighted overallScore. So a run where every model call failed
 * produced a confident "50/100", wrote it to the database as a real analysis, showed it to
 * the user, and fed it into the admin aggregates. Indistinguishable from a genuine result.
 *
 * A missing section is now an error. Persisting an invented score is the one outcome worth
 * preventing, and the score columns are non-nullable Ints, so there is no way to record
 * "could not assess" alongside the real ones.
 *
 * Uses the shared extractJSON — its bracket-stack scan handles nested objects and trailing
 * prose, where the greedy /\{[\s\S]*\}/ this replaced would swallow everything between the
 * first brace and the last one anywhere in the response.
 */
class SectionError extends Error {
  constructor(public section: string) {
    super(`${section} could not be parsed`);
  }
}

function parseSection<T>(section: string, text: string): T {
  try {
    return extractJSON(text) as T;
  } catch {
    throw new SectionError(section);
  }
}

// Shapes the seven prompts ask for. Previously these were inferred from the fallback
// objects, which is how a fabricated score ended up being the type's source of truth.
// Suggestions and fixes reuse the existing Fix shape — they are written to
// ContentOptimizationFix through the same path further down.
interface IntentSection { intent: string; matchScore: number; reasoning: string; suggestions: Fix[] }
interface EntitySection { entities: unknown[]; score: number; missing: unknown[]; relationships: unknown[]; suggestions: Fix[] }
interface LsiSection { found: string[]; missing: string[]; score: number; suggestions: Fix[] }
interface SchemaSection { type: string; reasoning: string; jsonLd: string }
interface TopicSection {
  mainTopic: string; covered: string[]; missing: unknown[]; score: number;
  pillarSuggestion: string; clusterSuggestions: unknown[]; linkingOpportunities: unknown[]; suggestions: Fix[]
}
interface EeatSection {
  experience: number; expertise: number; authority: number; trust: number;
  overall: number; details: Record<string, string>
}
interface ImprovementsSection { contentScore: number; fixes: Fix[]; rewrites: unknown[] }

async function analyzeSearchIntent(content: string, keyword: string) {
  const prompt = `Analyze this content for search intent matching the keyword "${keyword}".

<content>
${content.slice(0, 3000)}
</content>

Return ONLY valid JSON:
{
  "intent": "informational|navigational|transactional|commercial",
  "matchScore": 75,
  "reasoning": "Why this intent",
  "suggestions": [
    { "issue": "Specific issue", "suggestion": "How to fix", "priority": "critical|warning|info" }
  ]
}`;
  return parseSection<IntentSection>('Search intent', await callLLM(prompt, SECTION_BUDGET.intent));
}

async function analyzeEntities(content: string, keyword: string) {
  const prompt = `Analyze entities in this content for the topic "${keyword}".

<content>
${content.slice(0, 3000)}
</content>

Return ONLY valid JSON:
{
  "entities": [{"name": "Entity", "type": "person|place|concept|brand", "strength": "strong|weak", "frequency": 3}],
  "score": 65,
  "missing": [{"name": "Entity", "reason": "Why important", "where": "Where to add"}],
  "relationships": [{"entity1": "X", "entity2": "Y", "relationship": "type"}],
  "suggestions": [{"issue": "...", "suggestion": "...", "priority": "warning"}]
}`;
  return parseSection<EntitySection>('Entities', await callLLM(prompt, SECTION_BUDGET.entities));
}

async function analyzeLsiKeywords(content: string, keyword: string) {
  const prompt = `Identify LSI keywords for content about "${keyword}".

<content>
${content.slice(0, 3000)}
</content>

Return ONLY valid JSON:
{
  "found": ["keyword1", "keyword2"],
  "missing": ["keyword3", "keyword4"],
  "score": 60,
  "suggestions": [{"issue": "...", "suggestion": "...", "priority": "info"}]
}`;
  return parseSection<LsiSection>('LSI keywords', await callLLM(prompt, SECTION_BUDGET.lsi));
}

async function generateSchemaMarkup(content: string, keyword: string) {
  const prompt = `Generate JSON-LD schema markup for this content about "${keyword}".

<content>
${content.slice(0, 3000)}
</content>

Return ONLY valid JSON:
{
  "type": "Article|HowTo|FAQ|Product|Recipe",
  "reasoning": "Why this schema type",
  "jsonLd": "<script type=\\"application/ld+json\\">{ \\"@context\\": \\"https://schema.org\\" }</script>"
}`;
  return parseSection<SchemaSection>('Schema markup', await callLLM(prompt, SECTION_BUDGET.schema));
}

async function analyzeTopicCoverage(content: string, keyword: string) {
  const prompt = `Analyze topic coverage for content about "${keyword}".

<content>
${content.slice(0, 3000)}
</content>

Return ONLY valid JSON:
{
  "mainTopic": "Topic name",
  "covered": ["subtopic1", "subtopic2"],
  "missing": [{"topic": "X", "importance": "high|medium|low", "reason": "Why"}],
  "score": 55,
  "pillarSuggestion": "Broad pillar page topic",
  "clusterSuggestions": [{"title": "Cluster page title", "topic": "subtopic", "importance": "high"}],
  "linkingOpportunities": [{"from": "current page", "to": "suggested page", "anchor": "link text"}],
  "suggestions": [{"issue": "...", "suggestion": "...", "priority": "warning"}]
}`;
  return parseSection<TopicSection>('Topic coverage', await callLLM(prompt, SECTION_BUDGET.topic));
}

async function analyzeEEAT(content: string, keyword: string) {
  const prompt = `Analyze E-E-A-T for this content about "${keyword}".

<content>
${content.slice(0, 3000)}
</content>

Return ONLY valid JSON:
{
  "experience": 60,
  "expertise": 70,
  "authority": 55,
  "trust": 65,
  "overall": 62,
  "details": {
    "experience": "Explanation",
    "expertise": "Explanation",
    "authority": "Explanation",
    "trust": "Explanation"
  }
}`;
  return parseSection<EeatSection>('E-E-A-T', await callLLM(prompt, SECTION_BUDGET.eeat));
}

async function generateImprovements(content: string, keyword: string) {
  const prompt = `Suggest specific improvements for this content about "${keyword}".

<content>
${content.slice(0, 3000)}
</content>

Return ONLY valid JSON:
{
  "contentScore": 65,
  "fixes": [
    {
      "issue": "Specific problem",
      "suggestion": "How to fix",
      "beforeText": "Original text",
      "afterText": "Improved text",
      "priority": "critical|warning|info"
    }
  ],
  "rewrites": [
    { "section": "Section name", "original": "Current text", "improved": "AI rewrite" }
  ]
}`;
  return parseSection<ImprovementsSection>('Improvements', await callLLM(prompt, SECTION_BUDGET.improvements));
}
