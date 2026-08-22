/**
 * Content Optimizer's seven analyses, and the arithmetic that turns them into one score.
 *
 * Lives here rather than in the route because the run is now spread across several
 * requests: `/api/tools/content-optimizer/section` computes one section per call, and
 * `/api/tools/content-optimizer` assembles and stores the finished set. Both need the same
 * definitions, and a prompt or budget that drifted between them would be invisible.
 *
 * WHY THE RUN IS SPLIT AT ALL: seven sections through an 8,000 tokens/min Groq bucket need
 * ~160s of capacity, and Clerk's session token expires 61s after it is minted and cannot be
 * refreshed on a POST. A single request doing all seven is therefore rejected after the work
 * is finished, with the route never seeing the 401 and the user charged for nothing
 * (measured 2026-08-19). One section per request keeps every call comfortably inside that
 * window. See CLAUDE.md, "Giving a signed-in route a maxDuration over 60".
 */
import { callLLM as callLLMShared, extractJSON, GROQ_REASONING_ALLOWANCE } from './llm'
import { SECTION_ORDER, type SectionKey } from './content-optimizer-sections'

export { SECTION_ORDER, isSectionKey, SECTION_LABELS } from './content-optimizer-sections'
export type { SectionKey } from './content-optimizer-sections'

/**
 * How long one section may sit queued for Groq capacity.
 *
 * A section reserves ~2,700 tokens of an 8,000/min bucket refilling at ~133/s, so even a
 * fully drained bucket clears one in ~20s. This was 240s when all seven ran in a single
 * request and the last one admitted waited behind six others.
 *
 * The ceiling matters more than the typical case: the whole request has to finish inside
 * Clerk's 61-second session token, so this plus the model call is the budget. 30s of
 * queuing leaves room for the call and still fails cleanly rather than being killed.
 */
const SECTION_QUEUE_MS = 30_000;
// ─── Analysis helpers ───────────────────────────────────────────────────────

export interface Fix {
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
export const SECTION_BUDGET = {
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
export class SectionError extends Error {
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
export interface IntentSection { intent: string; matchScore: number; reasoning: string; suggestions: Fix[] }
export interface EntitySection { entities: unknown[]; score: number; missing: unknown[]; relationships: unknown[]; suggestions: Fix[] }
export interface LsiSection { found: string[]; missing: string[]; score: number; suggestions: Fix[] }
export interface SchemaSection { type: string; reasoning: string; jsonLd: string }
export interface TopicSection {
  mainTopic: string; covered: string[]; missing: unknown[]; score: number;
  pillarSuggestion: string; clusterSuggestions: unknown[]; linkingOpportunities: unknown[]; suggestions: Fix[]
}
export interface EeatSection {
  experience: number; expertise: number; authority: number; trust: number;
  overall: number; details: Record<string, string>
}
export interface ImprovementsSection { contentScore: number; fixes: Fix[]; rewrites: unknown[] }

export async function analyzeSearchIntent(content: string, keyword: string) {
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

export async function analyzeEntities(content: string, keyword: string) {
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

export async function analyzeLsiKeywords(content: string, keyword: string) {
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

export async function generateSchemaMarkup(content: string, keyword: string) {
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

export async function analyzeTopicCoverage(content: string, keyword: string) {
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

export async function analyzeEEAT(content: string, keyword: string) {
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

export async function generateImprovements(content: string, keyword: string) {
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

export const SECTION_RUNNERS: Record<SectionKey, (content: string, keyword: string) => Promise<unknown>> = {
  intent:       analyzeSearchIntent,
  entities:     analyzeEntities,
  lsi:          analyzeLsiKeywords,
  schema:       generateSchemaMarkup,
  topic:        analyzeTopicCoverage,
  eeat:         analyzeEEAT,
  improvements: generateImprovements,
};

/** A complete run: every section present, each already parsed and shape-checked. */
export interface SectionResults {
  intent: IntentSection;
  entities: EntitySection;
  lsi: LsiSection;
  schema: SchemaSection;
  topic: TopicSection;
  eeat: EeatSection;
  improvements: ImprovementsSection;
}

/**
 * Weighted score across six of the seven sections — schema contributes markup, not a score.
 *
 * Kept in one place because it is the number written to the database and shown to the user;
 * computing it in the route would let the stored score and the displayed one drift apart.
 */
export function computeOverallScore(r: SectionResults): number {
  return Math.round(
    r.intent.matchScore * 0.15 +
    r.entities.score * 0.15 +
    r.lsi.score * 0.15 +
    r.topic.score * 0.20 +
    r.eeat.overall * 0.20 +
    r.improvements.contentScore * 0.15
  );
}

/**
 * Check a client-submitted set of sections before any of it reaches the database.
 *
 * The sections are produced one request at a time and held by the browser in between, so
 * what arrives at the finalising request is client-supplied — it can be incomplete, or a
 * section can carry a score that is a string, or null, or absent. Six of these numbers are
 * weighted into `overallScore` and every score column is a non-nullable Int, so an
 * unchecked object turns into either a NaN write or a Prisma error at insert time.
 *
 * This does not attempt to prove the numbers were not tampered with. A user editing their
 * own report's scores gains nothing but a wrong report; the columns are what need
 * defending, not the grade.
 */
export function assertCompleteRun(v: unknown): SectionResults {
  if (!v || typeof v !== 'object') throw new SectionError('the analysis');
  const got = v as Record<string, unknown>;

  for (const key of SECTION_ORDER) {
    if (!got[key] || typeof got[key] !== 'object') throw new SectionError(key);
  }

  const num = (section: SectionKey, field: string) => {
    const raw = (got[section] as Record<string, unknown>)[field];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) throw new SectionError(section);
  };
  num('intent', 'matchScore');
  num('entities', 'score');
  num('lsi', 'score');
  num('topic', 'score');
  num('eeat', 'overall');
  num('improvements', 'contentScore');

  return got as unknown as SectionResults;
}
