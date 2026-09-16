import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { estimateCostRange, activeRates } from '@/lib/llm-pricing';
import { monthlyLimitFor, pinnedAccountFor } from '@/lib/auth';
import { PLAN_LIMITS, getMonthKey, ALL_PLANS } from '@/lib/plans';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { searchParams } = new URL(req.url);
    // Validated against ALL_PLANS rather than cast. The cast claimed three of five tiers,
    // so ?plan=STARTER was unreachable from the dropdown and, if typed by hand, reached
    // Prisma as an unvalidated string. An unrecognised value is now ignored rather than
    // filtering to nothing, which is the same thing "All Plans" does.
    const planParam = searchParams.get('plan');
    const plan = ALL_PLANS.find(p => p === planParam) ?? null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};
    if (plan) where.plan = plan;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          clerkId: true,
          email: true,
          plan: true,
          monthlyLimit: true,
          grantedAt: true,
          createdAt: true,
          totalInputTokens: true,
          totalOutputTokens: true,
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
      }),
      prisma.user.count({ where }),
    ]);

    // One query for the whole page rather than one per row. The admin dashboard has been
    // here before: four of its routes ran their queries sequentially and stacked 5.5s of
    // latency into a hang (session_jul16b). Credits live in the Usage table, keyed by
    // month, and are not derivable from the columns above.
    const month = getMonthKey();
    const usageRows = await prisma.usage.findMany({
      where: { userId: { in: users.map(u => u.id) }, month },
      select: { userId: true, count: true },
    });
    const usedByUser = new Map(usageRows.map(r => [r.userId, r.count]));

    return NextResponse.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        plan: u.plan,
        joinedDate: u.createdAt,
        analyses: u.contentOptimizations.length,
        subscription: u.subscription ?? null,
        totalInputTokens: u.totalInputTokens,
        totalOutputTokens: u.totalOutputTokens,
        // Priced here rather than in the table that displays it. The client had its own
        // copy of the rates — $0.05/$0.08, the retired Llama numbers — which is the exact
        // drift llm-pricing.ts was created to end, and it survived the August re-basing
        // because that pass only looked at the routes. It cannot live client-side either:
        // activeRates() reads LLM_PROVIDER, which is not exposed to the browser, so the
        // same call there would silently return the Anthropic card and overstate every
        // row by an order of magnitude.
        //
        // The midpoint, matching the health panel. Per-user totals carry no record of
        // which tier produced them, and on the gpt-oss pair the two ends are only 2x
        // apart, so a single figure per row is defensible where a range would not fit.
        estCostUsd: estimateCostRange(
          u.totalInputTokens ?? 0,
          u.totalOutputTokens ?? 0,
          activeRates()
        ).mid,
        // Credits, not analyses. The `analyses` field above counts ContentOptimization
        // rows; this is the weighted allowance the user is actually spending, which is the
        // number that produces a 429 and the only one comparable to the limit beside it.
        creditsUsed: usedByUser.get(u.id) ?? 0,
        creditsLimit: monthlyLimitFor(u, u.subscription?.status === 'TRIALING'),
        // Why this account holds this plan, where that is not billing. `planPinned` means
        // the plan was granted rather than bought -- by PINNED_ACCOUNTS or by a PinnedGrant
        // row -- and `limitOverridden` means the allowance is not the one the plan sells.
        // They stay independent: the founder account is pinned and not overridden.
        //
        // Both now read the row (`grantedAt`, and the enforced limit) rather than the
        // constant alone, so a revocable grant shows here exactly like a permanent pin.
        // Deriving limitOverridden by comparing the enforced number against the plan's own
        // also means it cannot disagree with the credits column printed beside it.
        planPinned: !!pinnedAccountFor(u.email) || !!u.grantedAt,
        limitOverridden:
          monthlyLimitFor(u, u.subscription?.status === 'TRIALING') !== PLAN_LIMITS[u.plan],
        // Which of the two granted it, so the UI can offer Revoke on the revocable kind
        // and not on the founder account.
        grantSource: pinnedAccountFor(u.email) ? 'constant' : u.grantedAt ? 'grant' : null,
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
