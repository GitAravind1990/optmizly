import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'gkm.aravind@gmail.com';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const plan = searchParams.get('plan') as 'FREE' | 'PRO' | 'AGENCY' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};
    if (plan) where.plan = plan;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        clerkId: true,
        email: true,
        plan: true,
        createdAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            currentPeriodEnd: true,
          },
        },
        contentOptimizations: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const total = await prisma.user.count({ where });

    return NextResponse.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        plan: u.plan,
        joinedDate: u.createdAt,
        analyses: u.contentOptimizations.length,
        subscription: u.subscription ?? null,
      })),
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
