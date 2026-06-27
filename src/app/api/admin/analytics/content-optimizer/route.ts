import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(_req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const totalAnalyses = await prisma.contentOptimization.count({
      where: { analyzedAt: { gte: startDate } },
    });

    const avgScore = await prisma.contentOptimization.aggregate({
      where: { analyzedAt: { gte: startDate } },
      _avg: { overallScore: true },
    });

    const byIndustry = await prisma.contentOptimization.groupBy({
      by: ['detectedIntent'],
      where: { analyzedAt: { gte: startDate } },
      _count: true,
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const eeatUsage = await prisma.contentOptimization.count({
      where: { analyzedAt: { gte: startDate }, eeatOverall: { gt: 0 } },
    });

    const schemaUsage = await prisma.contentOptimization.count({
      where: { analyzedAt: { gte: startDate }, recommendedSchema: { not: '' } },
    });

    const excellent = await prisma.contentOptimization.count({
      where: { analyzedAt: { gte: startDate }, overallScore: { gte: 80 } },
    });
    const good = await prisma.contentOptimization.count({
      where: { analyzedAt: { gte: startDate }, overallScore: { gte: 60, lt: 80 } },
    });
    const poor = await prisma.contentOptimization.count({
      where: { analyzedAt: { gte: startDate }, overallScore: { lt: 60 } },
    });

    return NextResponse.json({
      total: totalAnalyses,
      avgScore: avgScore._avg.overallScore?.toFixed(1) || '0',
      byIndustry: byIndustry.map(i => ({
        industry: i.detectedIntent || 'Unknown',
        count: i._count,
      })),
      featureUsage: { schema: schemaUsage, eeat: eeatUsage },
      scoreDistribution: { excellent, good, poor },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
