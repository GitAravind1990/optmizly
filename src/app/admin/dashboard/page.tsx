'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/stats', { signal: controller.signal })
      .then(async r => {
        if (r.status === 403) { router.push('/'); return; }
        setStats(await r.json());
      })
      .catch(e => { if (e.name !== 'AbortError') console.error(e); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [router]);

  if (loading) return <div className="p-12 text-center text-lg">Loading dashboard...</div>;
  if (!stats) return <div className="p-12 text-center text-lg text-red-600">Failed to load stats</div>;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Content Optimizer' },
    { id: 'users', label: 'Users' },
    { id: 'health', label: 'System Health' },
  ];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black">Optmizly Owner Dashboard</h1>
        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="bg-slate-600 text-white px-4 py-2 rounded hover:bg-slate-700 text-sm font-semibold"
          >
            Tools Dashboard
          </a>
          <a
            href="/admin/blog"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-semibold"
          >
            Blog Posts
          </a>
          <a
            href="/admin/subscribers"
            className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm font-semibold"
          >
            Subscribers
          </a>
          <button
            onClick={() => location.reload()}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm font-semibold"
          >
            Refresh
          </button>
          <UserButton />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm ${
              activeTab === tab.id ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
  const totalAnalyses = stats.features['Content Optimizer'] || 0;
  const avgPerUser = stats.users.total > 0 ? Math.round(totalAnalyses / stats.users.total) : 0;
  const tok = stats.tokens ?? { totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0, estimatedCost: 0, estimatedCostMin: 0, estimatedCostMax: 0 };
  const totalTokensDisplay = tok.totalTokens >= 1_000_000
    ? `${(tok.totalTokens / 1_000_000).toFixed(2)}M`
    : tok.totalTokens >= 1_000
    ? `${(tok.totalTokens / 1_000).toFixed(1)}K`
    : String(tok.totalTokens);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total MRR" value={`$${stats.revenue.totalMRR}`} sub="+15% est." color="purple" />
        <MetricCard title="Total Users" value={stats.users.total} sub={`+${stats.users.newThisMonth} this month`} color="blue" />
        <MetricCard title="Churn Rate" value={`${stats.revenue.churnRate}%`} sub="Last 30 days" color="red" />
        <MetricCard title="Avg Analyses" value={avgPerUser} sub="Per user (30d)" color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Total Tokens Used" value={totalTokensDisplay} sub={`${(tok.totalInputTokens / 1000).toFixed(1)}K in · ${(tok.totalOutputTokens / 1000).toFixed(1)}K out`} color="blue" />
        <MetricCard title="Est. LLM Cost (all time)" value={`$${tok.estimatedCost.toFixed(4)}`} sub={`$${(tok.estimatedCostMin ?? 0).toFixed(4)}–$${(tok.estimatedCostMax ?? 0).toFixed(4)} depending on tier`} color="purple" />
        <MetricCard title="Tokens / User" value={stats.users.total > 0 ? Math.round(tok.totalTokens / stats.users.total).toLocaleString() : '0'} sub="All-time average" color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">MRR by Plan</h3>
          <div className="space-y-3">
            <RevenueBar plan="PRO ($19/mo)" amount={stats.revenue.mrrByPlan.pro} total={stats.revenue.totalMRR || 1} />
            <RevenueBar plan="AGENCY ($49/mo)" amount={stats.revenue.mrrByPlan.agency} total={stats.revenue.totalMRR || 1} />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">Users by Plan</h3>
          <div className="space-y-2">
            {(['FREE', 'PRO', 'AGENCY'] as const).map(plan => (
              <div key={plan} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="font-medium">{plan}</span>
                <span className={`text-white px-3 py-1 rounded text-sm font-semibold ${
                  plan === 'FREE' ? 'bg-blue-500' : plan === 'PRO' ? 'bg-purple-600' : 'bg-green-600'
                }`}>
                  {stats.users.byPlan[plan]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/analytics/content-optimizer', { signal: controller.signal })
      .then(r => r.json())
      .then(data => setAnalytics(data))
      .catch(e => { if (e.name !== 'AbortError') console.error(e); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!analytics) return <div className="p-8 text-center text-red-600">Failed to load</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Total Analyses" value={analytics.total} sub="Last 30 days" color="purple" />
        <MetricCard title="Avg Score" value={`${analytics.avgScore}/100`} sub="Quality metric" color="green" />
        <MetricCard title="Schema Usage" value={analytics.featureUsage.schema} sub="analyses with schema" color="blue" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">By Search Intent</h3>
          {analytics.byIndustry.length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.byIndustry.map((item: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>{item.industry}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded h-2">
                    <div
                      className="bg-purple-600 h-2 rounded"
                      style={{ width: analytics.total > 0 ? (item.count / analytics.total) * 100 + '%' : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">Score Distribution</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 bg-green-50 rounded">
              <div className="text-3xl font-bold text-green-600">{analytics.scoreDistribution.excellent}</div>
              <div className="text-xs text-gray-600 mt-1">Excellent (80+)</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded">
              <div className="text-3xl font-bold text-yellow-600">{analytics.scoreDistribution.good}</div>
              <div className="text-xs text-gray-600 mt-1">Good (60-79)</div>
            </div>
            <div className="p-4 bg-red-50 rounded">
              <div className="text-3xl font-bold text-red-600">{analytics.scoreDistribution.poor}</div>
              <div className="text-xs text-gray-600 mt-1">Poor (&lt;60)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    const url = `/api/admin/users${filter ? `?plan=${filter}` : ''}`;
    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => { if (e.name !== 'AbortError') console.error(e); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [filter]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!data) return <div className="p-8 text-center text-red-600">Failed to load</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-semibold">Filter by Plan:</label>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="p-2 border rounded text-sm"
        >
          <option value="">All Plans</option>
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
          <option value="AGENCY">AGENCY</option>
        </select>
        <span className="text-sm text-gray-500">{data.pagination.total} total</span>
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Email', 'Plan', 'Joined', 'Analyses', 'Tokens (in/out)', 'Est. Cost', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.users.map((user: any, i: number) => {
              const inTok = user.totalInputTokens ?? 0;
              const outTok = user.totalOutputTokens ?? 0;
              // Groq haiku rates: $0.05/M input, $0.08/M output
              const estCost = (inTok * 0.05 + outTok * 0.08) / 1_000_000;
              return (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      user.plan === 'FREE' ? 'bg-blue-100 text-blue-800' :
                      user.plan === 'PRO' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(user.joinedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{user.analyses}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                    {inTok.toLocaleString()} / {outTok.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-semibold text-xs">
                    ${estCost < 0.001 ? estCost.toFixed(5) : estCost.toFixed(4)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.subscription?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.subscription?.status || 'Free'}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button className="text-purple-600 hover:underline text-xs font-medium">Upgrade</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-red-500 hover:underline text-xs font-medium">Cancel</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatAge(ms: number) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

type ServiceCheck = { name: string; ok: boolean; detail: string; ms: number };

/**
 * The daily cron's real verdict, replacing three hardcoded numbers that claimed a 99.2%
 * success rate regardless of what was actually happening.
 *
 * The state worth designing for is the empty one. Every dependency here fails by going
 * quiet, so a missing run is the alarm, not an absence of news — it is rendered as loudly
 * as a failing check rather than as a dash.
 */
function ServiceHealthPanel({
  health,
}: {
  health: {
    lastRun: string | null;
    healthy: boolean | null;
    ageMs: number | null;
    stale: boolean;
    durationMs: number | null;
    checks: ServiceCheck[];
    recent: { ranAt: string; healthy: boolean }[];
  };
}) {
  const checks = Array.isArray(health.checks) ? health.checks : [];
  const failing = checks.filter(c => !c.ok).length;

  const banner = health.stale
    ? {
        cls: 'bg-amber-50 border-amber-200 text-amber-900',
        title: health.lastRun ? 'No health check in over 26 hours' : 'Health check has never run',
        body: health.lastRun
          ? `Last run ${formatAge(health.ageMs!)}. It is scheduled daily at 07:00 UTC, so this gap means the cron itself has stopped — the checks below are that old and prove nothing about now.`
          : 'Nothing has been recorded yet. Until a run lands, the services below are unverified.',
      }
    : health.healthy
      ? {
          cls: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          title: 'All services answering',
          body: `Checked ${formatAge(health.ageMs!)} in ${health.durationMs}ms.`,
        }
      : {
          cls: 'bg-red-50 border-red-200 text-red-900',
          title: `${failing} service${failing === 1 ? '' : 's'} failing`,
          body: `Checked ${formatAge(health.ageMs!)}. Tools depending on these keep serving pages and quietly return errors, so this will not be visible on the site.`,
        };

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-bold mb-4">Service Health</h3>

      <div className={`border rounded-lg p-4 mb-4 ${banner.cls}`}>
        <div className="font-semibold">{banner.title}</div>
        <div className="text-sm mt-1 opacity-90">{banner.body}</div>
      </div>

      {checks.length > 0 && (
        <div className={`divide-y ${health.stale ? 'opacity-50' : ''}`}>
          {checks.map(c => (
            <div key={c.name} className="flex items-baseline gap-3 py-2 text-sm">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${c.ok ? 'bg-emerald-500' : 'bg-red-500'}`}
                aria-hidden
              />
              <span className="font-medium w-32 shrink-0">{c.name}</span>
              <span className={`flex-1 ${c.ok ? 'text-gray-500' : 'text-red-700 font-medium'}`}>
                {c.detail}
              </span>
              <span className="text-gray-400 text-xs shrink-0">{c.ms}ms</span>
            </div>
          ))}
        </div>
      )}

      {health.recent.length > 1 && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-gray-500 mb-2">
            Last {health.recent.length} runs (newest first)
          </div>
          <div className="flex gap-1">
            {health.recent.map(r => (
              <span
                key={r.ranAt}
                title={`${new Date(r.ranAt).toLocaleString()} — ${r.healthy ? 'healthy' : 'failing'}`}
                className={`h-6 w-2 rounded-sm ${r.healthy ? 'bg-emerald-400' : 'bg-red-400'}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HealthTab() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/health', { signal: controller.signal })
      .then(r => r.json())
      .then(data => setHealth(data))
      .catch(e => { if (e.name !== 'AbortError') console.error(e); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!health) return <div className="p-8 text-center text-red-600">Failed to load</div>;

  return (
    <div className="space-y-6">
      <ServiceHealthPanel health={health.health} />

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Monthly Cost Estimates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-gray-700">LLM API</h4>
            <div className="text-3xl font-bold mb-1">{health.costs.claude.estimatedMonthlyCost}</div>
            <div className="text-xs text-gray-500">
              {health.costs.claude.monthlyAnalyses} analyses @ {health.costs.claude.costPerAnalysis}/ea
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-gray-700">Google APIs</h4>
            <div className="text-3xl font-bold mb-1">{health.costs.google.estimatedMonthlyCost}</div>
            <div className="text-xs text-gray-500">{health.costs.google.callsMonthly} API calls</div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Database</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-3xl font-bold">{health.database.users}</div>
            <div className="text-sm text-gray-500 mt-1">Total Users</div>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-3xl font-bold">{health.database.contentOptimizations}</div>
            <div className="text-sm text-gray-500 mt-1">Analyses</div>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-3xl font-bold">{health.database.subscriptions}</div>
            <div className="text-sm text-gray-500 mt-1">Subscriptions</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400 text-right">
          Last checked: {new Date(health.lastChecked).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, sub, color }: { title: string; value: any; sub: string; color: string }) {
  const border = {
    purple: 'border-l-purple-600',
    blue: 'border-l-blue-600',
    green: 'border-l-green-600',
    red: 'border-l-red-500',
  }[color] || 'border-l-gray-400';

  return (
    <div className={`bg-white border border-l-4 ${border} rounded-lg p-5`}>
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  );
}

function RevenueBar({ plan, amount, total }: { plan: string; amount: number; total: number }) {
  const pct = Math.round((amount / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{plan}</span>
        <span className="font-semibold">${amount}/mo</span>
      </div>
      <div className="w-full bg-gray-200 rounded h-2">
        <div
          className="bg-purple-600 h-2 rounded"
          style={{ width: pct + '%' }}
        />
      </div>
    </div>
  );
}

