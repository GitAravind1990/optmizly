import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError, getOrCreateUser, refundUsage } from '@/lib/auth';
import { captureServerException } from '@/lib/posthog-server';
import { assertCompleteRun, computeOverallScore, SectionError, type Fix } from '@/lib/content-optimizer';

/**
 * Assembles and stores a finished run. The seven analyses happen one per request against
 * /api/tools/content-optimizer/section; this step makes no model calls at all.
 *
 * It used to run all seven here, which took ~160s and needed maxDuration 300 — long enough
 * that Clerk's 61-second session token expired mid-run and the response came back 401 after
 * the work was done and the quota spent. Two database writes finish in well under a second.
 */
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let clerkId: string | null = null
  // Set once requireAuth has taken the unit, so the catch can hand it back.
  let charged: string | null = null
  try {
    // The whole run is billed here, on the one request that produces something the user
    // keeps. Sections are gated but not charged, so a run abandoned halfway costs nothing.
    const user = await requireAuth('content-optimizer')
    clerkId = user.clerkId
    charged = user.userId

    const { content, targetKeyword, contentUrl, sections } = await req.json();
    // Thrown, not returned: an early return skips the catch below and would keep the unit
    // requireAuth just took. See CLAUDE.md, "Refund the quota when the run does not land".
    if (!content || !targetKeyword) {
      throw new AuthError(400, 'Content and target keyword are required');
    }

    // `sections` crossed the wire, so it is checked before any of it reaches a
    // non-nullable Int column — see assertCompleteRun.
    const results = assertCompleteRun(sections);
    const {
      intent: intentAnalysis, entities: entityAnalysis, lsi: lsiAnalysis,
      schema: schemaAnalysis, topic: topicAnalysis, eeat: eeatAnalysis,
      improvements,
    } = results;

    const overallScore = computeOverallScore(results);

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

    // The run produced a durable result, so the unit is earned from here on — a failure
    // while saving the individual fixes below must not refund an analysis the user can
    // still open from their history.
    charged = null;

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
    // Reaching here before the optimization row is written means the user paid a unit for
    // no result. Refunded centrally, keyed off `charged`, so a new failure mode cannot be
    // added without one — and so a failure *after* the result is saved keeps the charge.
    if (charged) await refundUsage(charged, 'content-optimizer')

    // An incomplete or malformed set of sections is the client's problem to retry, not an
    // internal error: name it rather than letting it fall through to a bare 500.
    if (error instanceof SectionError) {
      return NextResponse.json(
        { error: `${error.message}. Nothing was saved — please run the analysis again.` },
        { status: 400 }
      )
    }
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

