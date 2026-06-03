import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

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
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { auditId } = await req.json();
    if (!auditId) return NextResponse.json({ error: 'auditId required' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user?.plan !== 'AGENCY') return NextResponse.json({ error: 'Agency only' }, { status: 403 });

    const audit = await prisma.performanceFixerAudit.findFirst({
      where: { id: auditId, userId: user.id },
    });
    if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });

    const metrics = audit.extendedMetrics ? JSON.parse(audit.extendedMetrics) : { overallScore: audit.overallScore };
    const fixes = await generateAIFixes(audit.url, metrics);
    const projectedScore = calculateProjectedScore(metrics.overallScore, fixes);
    const roi = calculateROI(metrics.overallScore, projectedScore);

    await prisma.performanceFixerAudit.update({
      where: { id: auditId },
      data: {
        fixes: JSON.stringify(fixes),
        totalFixes: fixes.length,
        projectedScore,
        revenueLoss: roi.currentRevenueLoss,
        potentialRevenue: roi.potentialRevenue,
        fixTime: roi.fixTime,
      },
    });

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
    const msg = error instanceof Error ? error.message : String(error);
    console.error('AI Fixes error:', msg);
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

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch (error) {
    console.error('AI generation error:', error);
    return [];
  }
}

function calculateProjectedScore(currentScore: number, fixes: AIFix[]): number {
  if (fixes.length === 0) return currentScore;
  const avgGain = fixes.reduce((sum, f) => sum + f.estimatedImpact, 0) / fixes.length;
  return Math.min(100, Math.max(0, currentScore + Math.round(avgGain)));
}

function calculateROI(currentScore: number, projectedScore: number) {
  const improvement = projectedScore - currentScore;
  const currentRevenue = 5000 * 0.025 * 30;
  const potentialRevenue = currentRevenue * (1 + improvement * 0.005);
  return {
    currentRevenueLoss: Math.round((potentialRevenue - currentRevenue) * 0.5),
    potentialRevenue: Math.round(potentialRevenue),
    fixTime: Math.ceil(improvement * 5),
    estimatedCost: 0,
  };
}
