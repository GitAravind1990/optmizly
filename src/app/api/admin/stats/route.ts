import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { estimateCostRange, activeRates } from '@/lib/llm-pricing';
import { ALL_PLANS, MONTHLY_PRICE_USD } from '@/lib/plans';
import type { Plan } from '@prisma/client';

export async function GET(_req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const days = 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const [
      subscriptions,
      totalUsers,
      usersByPlan,
      newUsersThisMonth,
      contentOptimizerCount,
      activeAtPeriodStart,
      churnedInPeriod,
      tokenTotals,
    ] = await Promise.all([
      prisma.subscription.findMany({ where: { status: 'ACTIVE' }, select: { plan: true } }),
      prisma.user.count(),
      prisma.user.groupBy({ by: ['plan'], _count: true }),
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.contentOptimization.count({ where: { analyzedAt: { gte: startDate, lte: endDate } } }),
      // Subscriptions that already existed and hadn't cancelled as of startDate -- the
      // correct denominator for a churn rate. Using *current* paid-user count instead
      // double-punishes churn: a cancelled subscriber leaves that count the moment they
      // also join the numerator, which can push the "rate" past 100%.
      prisma.subscription.count({
        where: {
          createdAt: { lt: startDate },
          OR: [{ cancelledAt: null }, { cancelledAt: { gte: startDate } }],
        },
      }),
      prisma.subscription.count({
        where: { createdAt: { lt: startDate }, cancelledAt: { gte: startDate, lte: endDate } },
      }),
      prisma.user.aggregate({ _sum: { totalInputTokens: true, totalOutputTokens: true } }),
    ]);

    // REVENUE METRICS
    //
    // Over every plan, not the two that used to be listed. An Agency Plus subscriber
    // contributed $0 to reported MRR and a Starter subscriber the same, so total MRR
    // understated real revenue by however many of those existed -- invisibly, because the
    // panel showed two bars that summed correctly to a wrong total.
    const mrrByPlan = Object.fromEntries(
      ALL_PLANS.map(plan => [
        plan,
        subscriptions.filter(s => s.plan === plan).length * MONTHLY_PRICE_USD[plan],
      ])
    ) as Record<Plan, number>;
    const totalMRR = ALL_PLANS.reduce((sum, plan) => sum + mrrByPlan[plan], 0);

    // USER METRICS
    //
    // Same fix: this map named three tiers, so byPlan summed to less than the `total` it is
    // displayed beside, and nobody on Starter or Agency Plus appeared anywhere.
    const usersByPlanMap = Object.fromEntries(
      ALL_PLANS.map(plan => [plan, usersByPlan.find(u => u.plan === plan)?._count ?? 0])
    ) as Record<Plan, number>;

    // FEATURE USAGE
    const toolUsage = { 'Content Optimizer': contentOptimizerCount };

    // CHURN
    const churnRate = activeAtPeriodStart > 0 ? (churnedInPeriod / activeAtPeriodStart) * 100 : 0;

    // TOKEN USAGE
    const totalInputTokens = tokenTotals._sum.totalInputTokens ?? 0;
    const totalOutputTokens = tokenTotals._sum.totalOutputTokens ?? 0;
    const totalTokens = totalInputTokens + totalOutputTokens;
    // Rates live in llm-pricing.ts and follow LLM_PROVIDER, so this cannot drift back
    // into billing one provider's tokens at another's prices. A range rather than a
    // single figure because token totals carry no record of which tier produced them.
    const costRange = estimateCostRange(totalInputTokens, totalOutputTokens, activeRates());
    const estimatedCost = costRange.mid;

    return NextResponse.json({
      revenue: { mrrByPlan, totalMRR, churnRate: churnRate.toFixed(1) },
      users: {
        total: totalUsers,
        byPlan: usersByPlanMap,
        newThisMonth: newUsersThisMonth,
      },
      features: toolUsage,
      tokens: {
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        estimatedCost: parseFloat(estimatedCost.toFixed(4)),
        // The bounds the midpoint sits between, so the panel can show that this is
        // an estimate with real width rather than a precise figure.
        estimatedCostMin: parseFloat(costRange.min.toFixed(4)),
        estimatedCostMax: parseFloat(costRange.max.toFixed(4)),
      },
      period: { startDate, endDate, days },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
