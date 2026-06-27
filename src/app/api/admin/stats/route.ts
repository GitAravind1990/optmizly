import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(_req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const days = 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // REVENUE METRICS
    const subscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      select: { plan: true },
    });

    const proCount = subscriptions.filter(s => s.plan === 'PRO').length;
    const agencyCount = subscriptions.filter(s => s.plan === 'AGENCY').length;

    const mrrByPlan = {
      free: 0,
      pro: proCount * 19,
      agency: agencyCount * 49,
    };
    const totalMRR = mrrByPlan.pro + mrrByPlan.agency;

    // USER METRICS
    const totalUsers = await prisma.user.count();

    const usersByPlan = await prisma.user.groupBy({
      by: ['plan'],
      _count: true,
    });

    const usersByPlanMap = {
      FREE: usersByPlan.find(u => u.plan === 'FREE')?._count || 0,
      PRO: usersByPlan.find(u => u.plan === 'PRO')?._count || 0,
      AGENCY: usersByPlan.find(u => u.plan === 'AGENCY')?._count || 0,
    };

    const newUsersThisMonth = await prisma.user.count({
      where: { createdAt: { gte: startDate } },
    });

    // FEATURE USAGE
    const contentOptimizerCount = await prisma.contentOptimization.count({
      where: { analyzedAt: { gte: startDate, lte: endDate } },
    });

    const toolUsage = { 'Content Optimizer': contentOptimizerCount };

    // CHURN
    const canceledThisMonth = await prisma.subscription.count({
      where: { status: 'CANCELLED', updatedAt: { gte: startDate } },
    });

    const paidUsers = usersByPlanMap.PRO + usersByPlanMap.AGENCY;
    const churnRate = paidUsers > 0 ? (canceledThisMonth / paidUsers) * 100 : 0;

    // TOKEN USAGE
    const tokenTotals = await prisma.user.aggregate({
      _sum: { totalInputTokens: true, totalOutputTokens: true },
    });
    const totalInputTokens = tokenTotals._sum.totalInputTokens ?? 0;
    const totalOutputTokens = tokenTotals._sum.totalOutputTokens ?? 0;
    const totalTokens = totalInputTokens + totalOutputTokens;
    // Anthropic claude-haiku-4-5 rates: $0.80/M input, $4.00/M output
    const estimatedCost = (totalInputTokens * 0.80 + totalOutputTokens * 4.00) / 1_000_000;

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
      },
      period: { startDate, endDate, days },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
