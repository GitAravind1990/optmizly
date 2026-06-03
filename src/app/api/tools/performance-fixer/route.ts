import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

interface ExtendedMetrics {
  lcp: number; lcpScore: number;
  cls: number; clsScore: number;
  fid: number | null; fidScore: number | null;
  inp: number | null; inpScore: number | null;
  fcp: number | null; fcpScore: number | null;
  speedIndex: number | null; speedIndexScore: number | null;
  tti: number | null; ttiScore: number | null;
  tbt: number | null; tbtScore: number | null;
  ttfb: number | null; ttfbScore: number | null;
  overallScore: number;
  redirects: number | null; redirectsScore: number | null;
  unusedJs: number | null; unusedJsScore: number | null;
  unusedCss: number | null; unusedCssScore: number | null;
  renderBlockingScore: number | null;
  legacyJsScore: number | null;
  totalByteWeight: number | null;
  jsBootupTime: number | null; jsBootupScore: number | null;
  domSize: number | null;
  mainthreadWork: number | null;
  networkRtt: number | null;
}

function extractMetrics(audits: Record<string, { score?: number | null; numericValue?: number | null }>): ExtendedMetrics {
  const n = (key: string) => audits[key]?.numericValue ?? null;
  const s = (key: string) => audits[key]?.score != null ? Math.round(audits[key].score! * 100) : null;
  return {
    lcp: (n('largest-contentful-paint') ?? 0) / 1000,
    lcpScore: s('largest-contentful-paint') ?? 0,
    cls: n('cumulative-layout-shift') ?? 0,
    clsScore: s('cumulative-layout-shift') ?? 0,
    fid: n('first-input-delay'),
    fidScore: s('first-input-delay'),
    inp: n('interaction-to-next-paint'),
    inpScore: s('interaction-to-next-paint'),
    fcp: n('first-contentful-paint') != null ? n('first-contentful-paint')! / 1000 : null,
    fcpScore: s('first-contentful-paint'),
    speedIndex: n('speed-index') != null ? n('speed-index')! / 1000 : null,
    speedIndexScore: s('speed-index'),
    tti: n('interactive') != null ? n('interactive')! / 1000 : null,
    ttiScore: s('interactive'),
    tbt: n('total-blocking-time'),
    tbtScore: s('total-blocking-time'),
    ttfb: n('server-response-time'),
    ttfbScore: s('server-response-time'),
    overallScore: 0,
    redirects: n('redirects'),
    redirectsScore: s('redirects'),
    unusedJs: n('unused-javascript'),
    unusedJsScore: s('unused-javascript'),
    unusedCss: n('unused-css-rules'),
    unusedCssScore: s('unused-css-rules'),
    renderBlockingScore: s('render-blocking-insight'),
    legacyJsScore: s('legacy-javascript-insight'),
    totalByteWeight: n('total-byte-weight'),
    jsBootupTime: n('bootup-time'),
    jsBootupScore: s('bootup-time'),
    domSize: n('dom-size-insight'),
    mainthreadWork: n('mainthread-work-breakdown'),
    networkRtt: n('network-rtt'),
  };
}

// POST — fetch PSI metrics and store audit, return auditId + metrics
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { url, industry } = await req.json();
    if (!url || !url.startsWith('http')) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user?.plan !== 'AGENCY') {
      return NextResponse.json({ error: 'This tool is exclusive to Agency plan', requiredPlan: 'AGENCY', upgradeUrl: '/pricing' }, { status: 403 });
    }

    const auditCount = await prisma.performanceFixerAudit.count({
      where: { userId: user.id, analyzedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });
    if (auditCount >= 50) return NextResponse.json({ error: 'Quota exceeded. 50 audits/month for Agency.' }, { status: 429 });

    const psiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    psiUrl.searchParams.set('url', url);
    psiUrl.searchParams.set('category', 'performance');
    if (GOOGLE_API_KEY) psiUrl.searchParams.set('key', GOOGLE_API_KEY);

    const cwvResponse = await fetch(psiUrl.toString());
    const cwvData = await cwvResponse.json();

    if (!cwvData.lighthouseResult) {
      const apiError = cwvData.error?.message ?? JSON.stringify(cwvData).slice(0, 200);
      console.error('PageSpeed API error:', apiError);
      return NextResponse.json({ error: `Failed to analyze URL. ${apiError}` }, { status: 500 });
    }

    const audits = cwvData.lighthouseResult.audits;
    const metrics = extractMetrics(audits);
    metrics.overallScore = Math.round(cwvData.lighthouseResult.categories.performance.score * 100);

    const industryData = industry ? getIndustryComparison(industry) : null;

    const audit = await prisma.performanceFixerAudit.create({
      data: {
        userId: user.id,
        url,
        industry: industry || null,
        lcp: metrics.lcp,
        cls: metrics.cls,
        fid: metrics.fid,
        inp: metrics.inp,
        lcpScore: metrics.lcpScore,
        clsScore: metrics.clsScore,
        fidScore: metrics.fidScore,
        overallScore: metrics.overallScore,
        projectedScore: metrics.overallScore,
        revenueLoss: 0,
        potentialRevenue: 0,
        fixTime: 0,
        fixCost: 0,
        totalFixes: 0,
        industryAvg: industryData?.avg ?? null,
        industryRank: industryData?.rank ?? null,
        fixes: '[]',
        extendedMetrics: JSON.stringify(metrics),
      },
    });

    return NextResponse.json({ url, metrics, auditId: audit.id, industryData });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Performance Fixer error:', msg);
    return NextResponse.json({ error: `Analysis failed: ${msg}` }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user?.plan !== 'AGENCY') return NextResponse.json({ error: 'Agency only' }, { status: 403 });
    const audits = await prisma.performanceFixerAudit.findMany({
      where: { userId: user.id },
      orderBy: { analyzedAt: 'desc' },
      take: 20,
    });
    return NextResponse.json({ audits });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

function getIndustryComparison(industry: string) {
  const benchmarks: Record<string, { avg: number; topPercent: number }> = {
    ecommerce: { avg: 65, topPercent: 92 },
    saas: { avg: 78, topPercent: 95 },
    blog: { avg: 70, topPercent: 90 },
    portfolio: { avg: 80, topPercent: 95 },
    news: { avg: 60, topPercent: 88 },
  };
  const b = benchmarks[industry.toLowerCase()] ?? { avg: 70, topPercent: 90 };
  return { avg: b.avg, topPercent: b.topPercent, rank: Math.floor(Math.random() * 50) + 1 };
}
