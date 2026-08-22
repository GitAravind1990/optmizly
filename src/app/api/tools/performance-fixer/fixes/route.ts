import { prisma } from '@/lib/prisma';
import { callLLM, AIEmptyCompletionError, GroqCapacityError } from '@/lib/llm';
import { AuthError, requireAuth, refundUsage } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { NextRequest, NextResponse } from 'next/server';
import { captureServerException } from '@/lib/posthog-server';
import { getTrafficEstimate } from '@/lib/dataforseo';

function extractDomain(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase().split('/')[0];
}

export const maxDuration = 60;

interface AIFix {
  type: string;
  issue: string;
  beforeCode: string;
  afterCode: string;
  description: string;
  estimatedImpact: number;
  language: string;
}

// POST — generate AI fixes for an existing audit and update it
export async function POST(req: NextRequest) {
  // Set once requireAuth has taken the unit, so the catch can hand it back.
  let charged: string | null = null;
  let clerkId: string | null = null;
  try {
    // Was getOrCreateUser + canUseTool: a tier check with no quota at all, so this route
    // generated a model response and spent a real DataForSEO traffic lookup on every
    // call, unmetered, for as many calls as an Agency account cared to make. requireAuth
    // does the same tier check and also charges the run.
    const user = await requireAuth('performance-fixer');
    clerkId = user.clerkId;
    charged = user.userId;

    const { auditId } = await req.json();
    if (!auditId) throw new AuthError(400, 'auditId required');

    const audit = await prisma.performanceFixerAudit.findFirst({
      where: { id: auditId, userId: user.userId },
    });
    if (!audit) throw new AuthError(404, 'Audit not found');

    const metrics = audit.extendedMetrics ? JSON.parse(audit.extendedMetrics) : { overallScore: audit.overallScore };
    const fixes = await generateAIFixes(audit.url, metrics);
    const projectedScore = calculateProjectedScore(metrics.overallScore, fixes);

    // ROI is only computed from a real measured traffic baseline — no traffic data
    // means no ROI claim, rather than falling back to an invented visitor count.
    const monthlyOrganicTraffic = await getTrafficEstimate(extractDomain(audit.url)).catch(() => null);
    const roi = monthlyOrganicTraffic != null ? calculateROI(metrics.overallScore, projectedScore, monthlyOrganicTraffic) : null;

    await prisma.performanceFixerAudit.update({
      where: { id: auditId },
      data: {
        fixes: JSON.stringify(fixes),
        totalFixes: fixes.length,
        projectedScore,
        revenueLoss: roi?.currentRevenueLoss ?? null,
        potentialRevenue: roi?.potentialRevenue ?? null,
        fixTime: roi?.fixTime ?? 0,
      },
    });
    // The fixes are on the audit from here on, so the unit is earned even if recording
    // the individual generations below fails.
    charged = null;

    if (fixes.length > 0) {
      await prisma.aIFixGeneration.createMany({
        data: fixes.map(fix => ({
          auditId,
          fixType: fix.type,
          language: fix.language,
          beforeCode: fix.beforeCode,
          afterCode: fix.afterCode,
          description: fix.description,
          estimatedImpact: fix.estimatedImpact,
        })),
      });
    }

    return NextResponse.json({ fixes, projectedScore, roi });
  } catch (error) {
    // requireAuth charged before any work happened, so a run that ends here never
    // delivered what the user paid for. See CLAUDE.md.
    if (charged) await refundUsage(charged, 'performance-fixer');

    // AuthError carries its own status — 401, 403 for the wrong plan, 429 when the
    // allowance is gone. Without this branch the outer handler would relabel all three
    // as a 500, and the dashboard's upgrade modal keys off 403/429.
    // These two routes end with their own generic 500 rather than deferring to apiError,
    // so the central AI-error mapping would not reach them. Hand those cases over
    // explicitly: an empty completion or a saturated token bucket is transient and
    // retryable, not a server fault.
    if (error instanceof AuthError
      || error instanceof AIEmptyCompletionError
      || error instanceof GroqCapacityError) return apiError(error);
    const msg = error instanceof Error ? error.message : String(error);
    console.error('AI Fixes error:', msg);
    await captureServerException(clerkId, error, { route: '/api/tools/performance-fixer/fixes' });
    return NextResponse.json({ error: `Failed to generate fixes: ${msg}` }, { status: 500 });
  }
}

async function generateAIFixes(url: string, m: Record<string, number | null>): Promise<AIFix[]> {
  const fmt = (v: number | null, unit = '') => v != null ? `${v}${unit}` : 'N/A';
  const score = (v: number | null) => v != null ? `${v}/100` : 'N/A';

  const prompt = `You are a web performance expert. Analyze these PageSpeed Insights metrics for ${url} and generate 8 SPECIFIC, copy-paste ready code fixes prioritized by worst scores first.

CORE WEB VITALS:
- LCP: ${fmt(m.lcp, 's')} (${score(m.lcpScore)})
- CLS: ${m.cls} (${score(m.clsScore)})
- FID: ${fmt(m.fid, 'ms')} (${score(m.fidScore)})
- INP: ${fmt(m.inp, 'ms')} (${score(m.inpScore)})

ADDITIONAL METRICS:
- FCP: ${fmt(m.fcp, 's')} (${score(m.fcpScore)})
- Speed Index: ${fmt(m.speedIndex, 's')} (${score(m.speedIndexScore)})
- TTI: ${fmt(m.tti, 's')} (${score(m.ttiScore)})
- TBT: ${fmt(m.tbt, 'ms')} (${score(m.tbtScore)})
- TTFB: ${fmt(m.ttfb, 'ms')} (${score(m.ttfbScore)})
- Overall: ${m.overallScore}/100

OPPORTUNITIES:
- Redirects: ${fmt(m.redirects, 'ms')} (${score(m.redirectsScore)})
- Unused JS: ${m.unusedJs != null ? Math.round(m.unusedJs / 1024) + 'KB' : 'N/A'} (${score(m.unusedJsScore)})
- Unused CSS: ${m.unusedCss != null ? Math.round(m.unusedCss / 1024) + 'KB' : 'N/A'} (${score(m.unusedCssScore)})
- Render-blocking: ${score(m.renderBlockingScore)}
- Legacy JS: ${score(m.legacyJsScore)}
- JS bootup: ${fmt(m.jsBootupTime, 'ms')} (${score(m.jsBootupScore)})
- Page weight: ${m.totalByteWeight != null ? Math.round(m.totalByteWeight / 1024) + 'KB' : 'N/A'}
- DOM size: ${fmt(m.domSize, ' nodes')}

Return ONLY a valid JSON array with no extra text:
[{"type":"image|css|js|html|server|network","issue":"specific problem referencing the metric","beforeCode":"original code snippet","afterCode":"optimized code snippet","description":"which metric this fixes and why","estimatedImpact":15,"language":"html|css|javascript|http"}]`;

  // Routed through callLLM, which follows LLM_PROVIDER like every other AI call here.
  // This function used to construct the Anthropic SDK directly against
  // ANTHROPIC_API_KEY — the one account with no credit on it — so in production every
  // request returned "credit balance is too low". The provider rename swept the rest of
  // the codebase but not this file, because it never imported the shared module.
  const text = await callLLM(
    'You are a web performance expert. Return only the JSON array requested.',
    prompt,
    4000
  );
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI returned no parseable fix list');
  return JSON.parse(match[0]);
}

function calculateProjectedScore(currentScore: number, fixes: AIFix[]): number {
  if (fixes.length === 0) return currentScore;
  const avgGain = fixes.reduce((sum, f) => sum + f.estimatedImpact, 0) / fixes.length;
  return Math.min(100, Math.max(0, currentScore + Math.round(avgGain)));
}

// Conversion rate (2.5%) and average order value ($30) are typical e-commerce
// assumptions, not measurable per-site without a store integration — disclosed to
// the user in the UI. Monthly traffic itself is real (DataForSEO organic estimate).
const ASSUMED_CONVERSION_RATE = 0.025;
const ASSUMED_AOV = 30;

function calculateROI(currentScore: number, projectedScore: number, monthlyOrganicTraffic: number) {
  const improvement = projectedScore - currentScore;
  const currentRevenue = monthlyOrganicTraffic * ASSUMED_CONVERSION_RATE * ASSUMED_AOV;
  const potentialRevenue = currentRevenue * (1 + improvement * 0.005);
  return {
    currentRevenueLoss: Math.round((potentialRevenue - currentRevenue) * 0.5),
    potentialRevenue: Math.round(potentialRevenue),
    fixTime: Math.ceil(improvement * 5),
    estimatedCost: 0,
  };
}
