import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'gkm.aravind@gmail.com';

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

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

    return NextResponse.json({
      revenue: { mrrByPlan, totalMRR, churnRate: churnRate.toFixed(1) },
      users: {
        total: totalUsers,
        byPlan: usersByPlanMap,
        newThisMonth: newUsersThisMonth,
      },
      features: toolUsage,
      period: { startDate, endDate, days },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
