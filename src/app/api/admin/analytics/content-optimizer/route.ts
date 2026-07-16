import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(_req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalAnalyses, avgScore, byIndustry, eeatUsage, schemaUsage, excellent, good, poor] = await Promise.all([
      prisma.contentOptimization.count({
        where: { analyzedAt: { gte: startDate } },
      }),
      prisma.contentOptimization.aggregate({
        where: { analyzedAt: { gte: startDate } },
        _avg: { overallScore: true },
      }),
      prisma.contentOptimization.groupBy({
        by: ['detectedIntent'],
        where: { analyzedAt: { gte: startDate } },
        _count: true,
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.contentOptimization.count({
        where: { analyzedAt: { gte: startDate }, eeatOverall: { gt: 0 } },
      }),
      prisma.contentOptimization.count({
        where: { analyzedAt: { gte: startDate }, recommendedSchema: { not: '' } },
      }),
      prisma.contentOptimization.count({
        where: { analyzedAt: { gte: startDate }, overallScore: { gte: 80 } },
      }),
      prisma.contentOptimization.count({
        where: { analyzedAt: { gte: startDate }, overallScore: { gte: 60, lt: 80 } },
      }),
      prisma.contentOptimization.count({
        where: { analyzedAt: { gte: startDate }, overallScore: { lt: 60 } },
      }),
    ]);

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
