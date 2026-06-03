import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const maxDuration = 60;

const QUOTA: Record<string, number> = { FREE: 3, PRO: 50, AGENCY: 200 };

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content, targetKeyword, contentUrl } = await req.json();
    if (!content || !targetKeyword) {
      return NextResponse.json({ error: 'Content and target keyword are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    const limit = QUOTA[user?.plan ?? 'FREE'] ?? 3;

    const monthlyCount = await prisma.contentOptimization.count({
      where: {
        userId: user?.id,
        analyzedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    if (monthlyCount >= limit) {
      return NextResponse.json(
        { error: `Quota exceeded. ${user?.plan ?? 'FREE'} plan allows ${limit} analyses/month.` },
        { status: 429 }
      );
    }

    // Run all 7 analyses in parallel
    const [intentAnalysis, entityAnalysis, lsiAnalysis, schemaAnalysis, topicAnalysis, eeatAnalysis, improvements] =
      await Promise.all([
        analyzeSearchIntent(content, targetKeyword),
        analyzeEntities(content, targetKeyword),
        analyzeLsiKeywords(content, targetKeyword),
        generateSchemaMarkup(content, targetKeyword),
        analyzeTopicCoverage(content, targetKeyword),
        analyzeEEAT(content, targetKeyword),
        generateImprovements(content, targetKeyword),
      ]);

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
        userId: user!.id,
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
    console.error('Content Optimizer error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });

    const optimizations = await prisma.contentOptimization.findMany({
      where: { userId: user?.id },
      orderBy: { analyzedAt: 'desc' },
      take: 20,
      select: { id: true, targetKeyword: true, overallScore: true, detectedIntent: true, analyzedAt: true },
    });

    return NextResponse.json({ optimizations });
  } catch {
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

async function callClaude(prompt: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  } catch (err) {
    console.error('Claude error:', err);
    return '';
  }
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch {
    return fallback;
  }
}

async function analyzeSearchIntent(content: string, keyword: string) {
  const prompt = `Analyze this content for search intent matching the keyword "${keyword}".

Content: ${content.slice(0, 3000)}

Return ONLY valid JSON:
{
  "intent": "informational|navigational|transactional|commercial",
  "matchScore": 75,
  "reasoning": "Why this intent",
  "suggestions": [
    { "issue": "Specific issue", "suggestion": "How to fix", "priority": "critical|warning|info" }
  ]
}`;
  return parseJSON(await callClaude(prompt), {
    intent: 'informational', matchScore: 50, reasoning: '', suggestions: [],
  });
}

async function analyzeEntities(content: string, keyword: string) {
  const prompt = `Analyze entities in this content for the topic "${keyword}".

Content: ${content.slice(0, 3000)}

Return ONLY valid JSON:
{
  "entities": [{"name": "Entity", "type": "person|place|concept|brand", "strength": "strong|weak", "frequency": 3}],
  "score": 65,
  "missing": [{"name": "Entity", "reason": "Why important", "where": "Where to add"}],
  "relationships": [{"entity1": "X", "entity2": "Y", "relationship": "type"}],
  "suggestions": [{"issue": "...", "suggestion": "...", "priority": "warning"}]
}`;
  return parseJSON(await callClaude(prompt), {
    entities: [], score: 50, missing: [], relationships: [], suggestions: [],
  });
}

async function analyzeLsiKeywords(content: string, keyword: string) {
  const prompt = `Identify LSI keywords for content about "${keyword}".

Content: ${content.slice(0, 3000)}

Return ONLY valid JSON:
{
  "found": ["keyword1", "keyword2"],
  "missing": ["keyword3", "keyword4"],
  "score": 60,
  "suggestions": [{"issue": "...", "suggestion": "...", "priority": "info"}]
}`;
  return parseJSON(await callClaude(prompt), {
    found: [], missing: [], score: 50, suggestions: [],
  });
}

async function generateSchemaMarkup(content: string, keyword: string) {
  const prompt = `Generate JSON-LD schema markup for this content about "${keyword}".

Content: ${content.slice(0, 3000)}

Return ONLY valid JSON:
{
  "type": "Article|HowTo|FAQ|Product|Recipe",
  "reasoning": "Why this schema type",
  "jsonLd": "<script type=\\"application/ld+json\\">{ \\"@context\\": \\"https://schema.org\\" }</script>"
}`;
  return parseJSON(await callClaude(prompt), {
    type: 'Article', reasoning: '', jsonLd: '',
  });
}

async function analyzeTopicCoverage(content: string, keyword: string) {
  const prompt = `Analyze topic coverage for content about "${keyword}".

Content: ${content.slice(0, 3000)}

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
  return parseJSON(await callClaude(prompt), {
    mainTopic: keyword, covered: [], missing: [], score: 50,
    pillarSuggestion: '', clusterSuggestions: [], linkingOpportunities: [], suggestions: [],
  });
}

async function analyzeEEAT(content: string, keyword: string) {
  const prompt = `Analyze E-E-A-T for this content about "${keyword}".

Content: ${content.slice(0, 3000)}

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
  return parseJSON(await callClaude(prompt), {
    experience: 50, expertise: 50, authority: 50, trust: 50, overall: 50, details: {},
  });
}

async function generateImprovements(content: string, keyword: string) {
  const prompt = `Suggest specific improvements for this content about "${keyword}".

Content: ${content.slice(0, 3000)}

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
  return parseJSON(await callClaude(prompt), {
    contentScore: 50, fixes: [], rewrites: [],
  });
}
