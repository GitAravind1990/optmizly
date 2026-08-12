import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { estimateCostRange, activeRates } from '@/lib/llm-pricing';

export async function GET(_req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const [monthlyAnalyses, totalUsers, totalContentOptimizations, totalSubscriptions, tokenTotals, analysisTotal] =
      await Promise.all([
        prisma.contentOptimization.count({
          where: { analyzedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        }),
        prisma.user.count(),
        prisma.contentOptimization.count(),
        prisma.subscription.count(),
        prisma.user.aggregate({ _sum: { totalInputTokens: true, totalOutputTokens: true } }),
        prisma.usage.aggregate({ _sum: { count: true } }),
      ]);

    // Derived from real usage rather than a chosen constant. The previous $0.15 per
    // analysis was picked against Anthropic pricing and survived the move to Groq, which
    // put this panel out by roughly two orders of magnitude — a real analysis costs a
    // fraction of a cent at Llama rates.
    //
    // Per-analysis cost is all-time spend divided by all-time analyses, then applied to
    // the last 30 days' count. Both sides come from stored data, so the figure moves with
    // actual behaviour instead of needing to be maintained by hand.
    const allTimeCost = estimateCostRange(
      tokenTotals._sum.totalInputTokens ?? 0,
      tokenTotals._sum.totalOutputTokens ?? 0,
      activeRates()
    ).mid;
    const allTimeAnalyses = analysisTotal._sum.count ?? 0;
    const aiCostPerAnalysis = allTimeAnalyses > 0 ? allTimeCost / allTimeAnalyses : 0;
    const totalAiCost = monthlyAnalyses * aiCostPerAnalysis;
    const googleCallsMonthly = monthlyAnalyses * 2;

    const dbStats = {
      users: totalUsers,
      contentOptimizations: totalContentOptimizations,
      subscriptions: totalSubscriptions,
    };

    return NextResponse.json({
      api: {
        contentOptimizer: {
          avgResponseTime: '28s',
          successRate: '99.2%',
          errors24h: 0,
        },
      },
      costs: {
        claude: {
          costPerAnalysis: '$' + aiCostPerAnalysis.toFixed(4),
          monthlyAnalyses,
          estimatedMonthlyCost: '$' + totalAiCost.toFixed(2),
        },
        google: {
          callsMonthly: googleCallsMonthly,
          estimatedMonthlyCost: '$' + (googleCallsMonthly * 0.005).toFixed(2),
        },
      },
      database: dbStats,
      lastChecked: new Date(),
    });
  } catch (error) {
    console.error('Health error:', error);
    return NextResponse.json({ error: 'Failed to fetch health' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { action, targetUserId } = await req.json();

    if (action === 'refund_user') {
      await prisma.subscription.updateMany({
        where: { userId: targetUserId },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json({ success: true, message: 'User subscription cancelled' });
    }

    if (action === 'upgrade_user') {
      await prisma.user.update({
        where: { id: targetUserId },
        data: { plan: 'PRO' },
      });
      return NextResponse.json({ success: true, message: 'User upgraded to PRO' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Action error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
