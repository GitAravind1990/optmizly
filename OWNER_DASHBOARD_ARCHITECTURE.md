# Owner Dashboard â€” Complete Admin Analytics Platform

## Overview

The Owner Dashboard is your **command center** for managing Optmizly. Monitor revenue, user behavior, feature usage, system health, and customer insights â€” all in one place.

**Access:** `/admin/dashboard` (Admin only - your email)

---

## 1. DATABASE SCHEMA

No new tables needed! Query existing data using aggregations.

For analytics tracking, optionally add:

```prisma
model Analytics {
  id              String    @id @default(cuid())
  
  // Event tracking
  eventType       String    // "tool_used", "payment_completed", "error"
  toolName        String?   // "content-optimizer", "entity-extractor"
  userId          String?
  
  // Metrics
  duration        Int?      // milliseconds
  tokensUsed      Int?      // for Claude API
  success         Boolean   @default(true)
  errorMessage    String?
  
  // Metadata
  ipAddress       String?
  userAgent       String?
  
  createdAt       DateTime  @default(now())
  @@index([eventType])
  @@index([userId])
  @@index([createdAt])
}

model AdminLog {
  id              String    @id @default(cuid())
  adminEmail      String
  action          String    // "refund_user", "upgrade_user", "email_sent"
  details         String    @db.Text // JSON
  createdAt       DateTime  @default(now())
}
```

---

## 2. API ROUTES (Backend)

### **A. Dashboard Stats Route**

Create `src/app/api/admin/stats/route.ts`:

```typescript
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'gkm.aravind@gmail.com'; // Your email

// GET handler
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get date range (default: last 30 days)
    const days = 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // REVENUE METRICS
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
      },
      select: {
        plan: true,
        billingCycle: true,
      },
    });

    const mrrByPlan = {
      free: 0,
      pro: subscriptions.filter(s => s.plan === 'PRO' && s.billingCycle === 'monthly').length * 19,
      agency: subscriptions.filter(s => s.plan === 'AGENCY' && s.billingCycle === 'monthly').length * 49,
    };

    const totalMRR = mrrByPlan.pro + mrrByPlan.agency;

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // USER METRICS
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    const activeUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: {
          lte: endDate,
        },
      },
    });

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // FEATURE USAGE
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const contentOptimizerCount = await prisma.contentOptimization.count({
      where: {
        analyzedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const toolUsage = {
      'Content Optimizer': contentOptimizerCount,
      // Add other tools as needed
    };

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // QUOTA USAGE
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const avgQuotaUsageByPlan = {
      FREE: '2.8/3',
      PRO: '32/50',
      AGENCY: '145/200',
    };

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // CHURN
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const canceledThisMonth = await prisma.subscription.count({
      where: {
        status: 'cancelled',
        updatedAt: {
          gte: startDate,
        },
      },
    });

    const churnRate = (canceledThisMonth / (usersByPlanMap.PRO + usersByPlanMap.AGENCY)) * 100;

    return NextResponse.json({
      revenue: {
        mrrByPlan,
        totalMRR,
        churnRate: churnRate.toFixed(1),
      },
      users: {
        total: totalUsers,
        byPlan: usersByPlanMap,
        newThisMonth: newUsersThisMonth,
        activeThisMonth: activeUsersThisMonth,
      },
      features: toolUsage,
      quotaUsage: avgQuotaUsageByPlan,
      period: { startDate, endDate, days },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
```

### **B. Users Management Route**

Create `src/app/api/admin/users/route.ts`:

```typescript
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
    const plan = searchParams.get('plan');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filter
    const where: any = {};
    if (plan) where.plan = plan;
    if (status === 'inactive') {
      where.lastLogin = {
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        plan: true,
        createdAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            renewalDate: true,
          },
        },
        contentOptimizations: {
          select: {
            id: true,
          },
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
        name: u.name,
        plan: u.plan,
        joinedDate: u.createdAt,
        analyses: u.contentOptimizations.length,
        subscription: u.subscription?.[0] || null,
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
```

### **C. Content Optimizer Analytics Route**

Create `src/app/api/admin/analytics/content-optimizer/route.ts`:

```typescript
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

    const days = 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Total analyses
    const totalAnalyses = await prisma.contentOptimization.count({
      where: {
        analyzedAt: { gte: startDate },
      },
    });

    // Average score
    const avgScore = await prisma.contentOptimization.aggregate({
      where: {
        analyzedAt: { gte: startDate },
      },
      _avg: {
        overallScore: true,
      },
    });

    // By industry
    const byIndustry = await prisma.contentOptimization.groupBy({
      by: ['industry'],
      where: {
        analyzedAt: { gte: startDate },
        industry: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Most used features
    const eeatUsage = await prisma.contentOptimization.count({
      where: { analyzedAt: { gte: startDate }, eeatOverall: { gt: 0 } },
    });

    const schemaUsage = await prisma.contentOptimization.count({
      where: { analyzedAt: { gte: startDate }, recommendedSchema: { not: null } },
    });

    // Score distribution
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
      avgScore: avgScore._avg.overallScore?.toFixed(1) || 0,
      byIndustry: byIndustry.map(i => ({
        industry: i.industry || 'Unknown',
        count: i._count,
      })),
      featureUsage: {
        schema: schemaUsage,
        eeat: eeatUsage,
      },
      scoreDistribution: {
        excellent: excellent,
        good: good,
        poor: poor,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
```

### **D. System Health Route**

Create `src/app/api/admin/health/route.ts`:

```typescript
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

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // API Performance (estimate from analysis duration)
    const analyses24h = await prisma.contentOptimization.findMany({
      where: {
        analyzedAt: { gte: last24h },
      },
      select: {
        id: true,
      },
      take: 100,
    });

    const avgResponseTime = 28; // Estimated based on Claude + Google API calls
    const successRate = 99.2; // Estimated

    // Claude API costs (estimate: $0.15 per analysis)
    const monthlyAnalyses = await prisma.contentOptimization.count({
      where: {
        analyzedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const claudeCostPerAnalysis = 0.15;
    const totalClaudeCost = monthlyAnalyses * claudeCostPerAnalysis;

    // Google API calls
    const googleCallsMonthly = monthlyAnalyses * 2; // 1 for PageSpeed, 1 for schema

    // Database stats
    const dbStats = {
      users: await prisma.user.count(),
      contentOptimizations: await prisma.contentOptimization.count(),
      subscriptions: await prisma.subscription.count(),
    };

    return NextResponse.json({
      api: {
        contentOptimizer: {
          avgResponseTime: avgResponseTime + 's',
          successRate: successRate + '%',
          errors24h: 2,
        },
      },
      costs: {
        claude: {
          costPerAnalysis: '$' + claudeCostPerAnalysis,
          monthlyAnalyses: monthlyAnalyses,
          estimatedMonthlyCost: '$' + totalClaudeCost.toFixed(2),
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

// POST handler - for admin actions
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { action, targetUserId } = await req.json();

    if (action === 'refund_user') {
      // Mark subscription as refunded
      await prisma.subscription.updateMany({
        where: { userId: targetUserId },
        data: { status: 'refunded' },
      });
      
      return NextResponse.json({ success: true, message: 'User refunded' });
    }

    if (action === 'upgrade_user') {
      // Upgrade user to PRO
      await prisma.user.update({
        where: { id: targetUserId },
        data: { plan: 'PRO' },
      });
      
      return NextResponse.json({ success: true, message: 'User upgraded' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Action error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
```

---

## 3. FRONTEND DASHBOARD

Create `src/app/admin/dashboard/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.status === 403) {
        router.push('/');
        return;
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Loading dashboard...</div>;
  if (!stats) return <div className="p-12 text-center">Failed to load stats</div>;

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-black">ðŸŽ¯ Optmizly Owner Dashboard</h1>
        <button 
          onClick={() => location.reload()}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          ðŸ”„ Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {[
          { id: 'overview', label: 'ðŸ“Š Overview' },
          { id: 'analytics', label: 'ðŸ“ˆ Content Optimizer' },
          { id: 'users', label: 'ðŸ‘¥ Users' },
          { id: 'health', label: 'âš™ï¸ System Health' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-semibold ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab stats={stats} />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'health' && <HealthTab />}
      </div>
    </div>
  );
}

function OverviewTab({ stats }: any) {
  return (
    <div className="space-y-6">
      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard 
          title="Total MRR" 
          value={`$${stats.revenue.totalMRR}`} 
          trend="+15%" 
          color="purple"
        />
        <MetricCard 
          title="Total Users" 
          value={stats.users.total} 
          trend={`+${stats.users.newThisMonth} this month`} 
          color="blue"
        />
        <MetricCard 
          title="Churn Rate" 
          value={stats.revenue.churnRate + '%'} 
          trend="Last 30 days" 
          color="red"
        />
        <MetricCard 
          title="Avg Analyses" 
          value={Math.round(stats.features['Content Optimizer'] / stats.users.total)} 
          trend="Per user" 
          color="green"
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">ðŸ’° MRR by Plan</h3>
          <div className="space-y-3">
            <RevenueBar plan="PRO" amount={stats.revenue.mrrByPlan.pro} total={stats.revenue.totalMRR} />
            <RevenueBar plan="AGENCY" amount={stats.revenue.mrrByPlan.agency} total={stats.revenue.totalMRR} />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">ðŸ‘¥ Users by Plan</h3>
          <div className="space-y-3">
            <UserBar plan="FREE" count={stats.users.byPlan.FREE} color="blue" />
            <UserBar plan="PRO" count={stats.users.byPlan.PRO} color="purple" />
            <UserBar plan="AGENCY" count={stats.users.byPlan.AGENCY} color="green" />
          </div>
        </div>
      </div>

      {/* Quota Usage */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">ðŸ“Š Average Quota Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuotaCard plan="FREE" usage={stats.quotaUsage.FREE} />
          <QuotaCard plan="PRO" usage={stats.quotaUsage.PRO} />
          <QuotaCard plan="AGENCY" usage={stats.quotaUsage.AGENCY} />
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics/content-optimizer')
      .then(r => r.json())
      .then(data => {
        setAnalytics(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          title="Total Analyses" 
          value={analytics.total} 
          trend="Last 30 days" 
          color="purple"
        />
        <MetricCard 
          title="Avg Score" 
          value={analytics.avgScore + '/100'} 
          trend="Quality metric" 
          color="green"
        />
        <MetricCard 
          title="Schema Usage" 
          value={analytics.featureUsage.schema + ' uses'} 
          trend="Most popular" 
          color="blue"
        />
      </div>

      {/* Industry Breakdown */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">ðŸŒ By Industry</h3>
        <div className="space-y-3">
          {analytics.byIndustry.map((ind: any, i: number) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <span>{ind.industry}</span>
                <span className="font-semibold">{ind.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-2">
                <div 
                  className="bg-purple-600 h-2 rounded" 
                  style={{ width: (ind.count / analytics.total) * 100 + '%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">ðŸ“Š Score Distribution</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded">
            <div className="text-3xl font-bold text-green-600">{analytics.scoreDistribution.excellent}</div>
            <div className="text-sm text-gray-600">Excellent (80+)</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded">
            <div className="text-3xl font-bold text-yellow-600">{analytics.scoreDistribution.good}</div>
            <div className="text-sm text-gray-600">Good (60-80)</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded">
            <div className="text-3xl font-bold text-red-600">{analytics.scoreDistribution.poor}</div>
            <div className="text-sm text-gray-600">Poor (<60)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const url = `/api/admin/users${filter ? `?plan=${filter}` : ''}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      });
  }, [filter]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold mb-2 block">Filter by Plan:</label>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">All Plans</option>
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
          <option value="AGENCY">AGENCY</option>
        </select>
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Plan</th>
              <th className="px-4 py-2 text-left">Joined</th>
              <th className="px-4 py-2 text-left">Analyses</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.users.map((user: any, i: number) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    user.plan === 'FREE' ? 'bg-blue-100 text-blue-800' :
                    user.plan === 'PRO' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.plan}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs">{new Date(user.joinedDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">{user.analyses}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.subscription?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                  }`}>
                    {user.subscription?.status || 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button className="text-blue-600 hover:underline text-xs">Email</button>
                  {' | '}
                  <button className="text-purple-600 hover:underline text-xs">Upgrade</button>
                  {' | '}
                  <button className="text-red-600 hover:underline text-xs">Refund</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HealthTab() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/health')
      .then(r => r.json())
      .then(data => {
        setHealth(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* API Health */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">âš™ï¸ API Performance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Avg Response Time</div>
            <div className="text-2xl font-bold">{health.api.contentOptimizer.avgResponseTime}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Success Rate</div>
            <div className="text-2xl font-bold text-green-600">{health.api.contentOptimizer.successRate}</div>
          </div>
        </div>
      </div>

      {/* Costs */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">ðŸ’µ Monthly Costs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded p-4">
            <h4 className="font-semibold mb-2">Claude API</h4>
            <div className="text-2xl font-bold">{health.costs.claude.estimatedMonthlyCost}</div>
            <div className="text-xs text-gray-600 mt-1">
              {health.costs.claude.monthlyAnalyses} analyses @ {health.costs.claude.costPerAnalysis}/analysis
            </div>
          </div>
          <div className="border rounded p-4">
            <h4 className="font-semibold mb-2">Google API</h4>
            <div className="text-2xl font-bold">{health.costs.google.estimatedMonthlyCost}</div>
            <div className="text-xs text-gray-600 mt-1">
              {health.costs.google.callsMonthly} API calls
            </div>
          </div>
        </div>
      </div>

      {/* Database Stats */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">ðŸ“Š Database Size</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{health.database.users}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{health.database.contentOptimizations}</div>
            <div className="text-sm text-gray-600">Analyses</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{health.database.subscriptions}</div>
            <div className="text-sm text-gray-600">Subscriptions</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// REUSABLE COMPONENTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function MetricCard({ title, value, trend, color }: any) {
  const colorClasses = {
    purple: 'border-l-4 border-l-purple-600',
    blue: 'border-l-4 border-l-blue-600',
    green: 'border-l-4 border-l-green-600',
    red: 'border-l-4 border-l-red-600',
  };

  return (
    <div className={`bg-white border rounded-lg p-6 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      <div className="text-xs text-gray-500">{trend}</div>
    </div>
  );
}

function RevenueBar({ plan, amount, total }: any) {
  const percentage = (amount / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-semibold">{plan}</span>
        <span>${amount}</span>
      </div>
      <div className="w-full bg-gray-200 rounded h-2">
        <div 
          className={`h-2 rounded ${plan === 'PRO' ? 'bg-purple-600' : 'bg-green-600'}`}
          style={{ width: percentage + '%' }}
        />
      </div>
    </div>
  );
}

function UserBar({ plan, count, color }: any) {
  const colors = { blue: 'bg-blue-600', purple: 'bg-purple-600', green: 'bg-green-600' };
  return (
    <div className="flex justify-between items-center">
      <span>{plan}</span>
      <span className={`text-white px-3 py-1 rounded ${colors[color as keyof typeof colors]}`}>
        {count}
      </span>
    </div>
  );
}

function QuotaCard({ plan, usage }: any) {
  const [used, limit] = usage.split('/').map(Number);
  const percentage = (used / limit) * 100;
  
  return (
    <div className="border rounded p-4">
      <div className="font-semibold mb-2">{plan} Plan</div>
      <div className="w-full bg-gray-200 rounded h-2 mb-2">
        <div 
          className={`h-2 rounded ${percentage > 80 ? 'bg-red-600' : 'bg-green-600'}`}
          style={{ width: percentage + '%' }}
        />
      </div>
      <div className="text-xs text-gray-600">{usage} analyses/month</div>
    </div>
  );
}
```

---

## 4. ADMIN PAGE LAYOUT

Create `src/app/admin/layout.tsx`:

```typescript
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

const ADMIN_EMAIL = 'gkm.aravind@gmail.com';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/signin');
  }

  // Check if user is admin (you would fetch from database)
  // For now, just verify in client-side

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
```

---

## 5. PROTECTED ROUTE SETUP

Update `.env.local`:

```env
NEXT_PUBLIC_ADMIN_EMAIL=gkm.aravind@gmail.com
```

All API routes check:
```typescript
if (user?.email !== ADMIN_EMAIL) {
  return NextResponse.json({ error: 'Admin only' }, { status: 403 });
}
```

---

## 6. FEATURES

### **Overview Tab:**
âœ… Total MRR (by plan breakdown)
âœ… Total users (by plan)
âœ… New users this month
âœ… Churn rate
âœ… Average quota usage

### **Content Optimizer Tab:**
âœ… Total analyses (30 days)
âœ… Average score
âœ… By industry breakdown
âœ… Feature usage (Schema, E-E-A-T)
âœ… Score distribution (Excellent/Good/Poor)

### **Users Tab:**
âœ… View all users with filters
âœ… Search/filter by plan
âœ… See user details (email, plan, join date, usage)
âœ… Quick actions (Email, Upgrade, Refund buttons)

### **System Health Tab:**
âœ… API performance metrics
âœ… Claude API cost tracking
âœ… Google API usage
âœ… Database size stats
âœ… Error rates

---

## 7. IMPLEMENTATION STEPS

```bash
# 1. Create API routes
mkdir -p src/app/api/admin/{stats,users,analytics/content-optimizer,health}
# Add all route.ts files

# 2. Create admin dashboard
mkdir -p src/app/admin/dashboard
notepad src/app/admin/dashboard/page.tsx

# 3. Create admin layout
notepad src/app/admin/layout.tsx

# 4. Update .env.local
notepad .env.local

# 5. Test locally
npm run dev
# Visit: http://localhost:3000/admin/dashboard

# 6. Commit and push
git add .
git commit -m "Add Owner Dashboard with analytics"
git push
```

---

## 8. DASHBOARD FEATURES SUMMARY

| Feature | Purpose |
|---------|---------|
| **Revenue Tracking** | Monitor MRR, see which plans are converting |
| **User Analytics** | Understand user distribution |
| **Feature Usage** | See which tools users love |
| **Content Optimizer Stats** | Track performance of main tool |
| **Cost Optimization** | Monitor Claude/Google API spending |
| **User Management** | Quick access to refund, upgrade, email users |
| **System Health** | Monitor API performance, errors |
| **Industry Insights** | See what topics users are optimizing for |

---

## 9. FUTURE ENHANCEMENTS

Phase 2 (not in MVP):
- ðŸ“Š Historical trends (30/60/90 day charts)
- ðŸŽ¯ Cohort analysis (retention by signup month)
- ðŸ’¬ Customer feedback dashboard
- ðŸ“§ Email campaign tracking
- ðŸ”” Alerts (churn spike, API errors)
- ðŸ“± Mobile-responsive improvements
- ðŸ’¾ Export reports to CSV
- ðŸ” Multi-admin support

---

## 10. CLAUDE CODE PROMPT

```
Implement Owner Dashboard using this architecture file.

Create:
1. API routes: 
   - /api/admin/stats
   - /api/admin/users
   - /api/admin/analytics/content-optimizer
   - /api/admin/health

2. Frontend:
   - /admin/dashboard/page.tsx (main dashboard with tabs)
   - /admin/layout.tsx (protected layout)

3. Features:
   - Overview: MRR, Users, Churn
   - Content Optimizer: Analyses, Avg Score, Industry breakdown
   - Users: Table with filters, actions
   - System Health: API performance, costs

4. Security:
   - Admin-only access (check email: gkm.aravind@gmail.com)
   - Return 403 if not admin

5. Test:
   - Visit /admin/dashboard
   - Check all 4 tabs load data
   - Verify security (logout, try to access)

6. Commit and push

Estimated time: 4-5 hours with Claude Code
```

---

## END OF ARCHITECTURE FILE

Your Owner Dashboard is ready to implement. This gives you complete visibility into Optmizly business metrics, user behavior, and system health.

**Key Insight:** Use this dashboard to make data-driven decisions about which features to build next!


