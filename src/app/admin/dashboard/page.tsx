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
    fetch('/api/admin/stats')
      .then(async r => {
        if (r.status === 403) { router.push('/'); return; }
        setStats(await r.json());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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
            href="/admin/blog"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-semibold"
          >
            Blog Posts
          </a>
          <button
            onClick={() => location.reload()}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm font-semibold"
          >
            Refresh
          </button>
          <UserButton afterSignOutUrl="/" />
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total MRR" value={`$${stats.revenue.totalMRR}`} sub="+15% est." color="purple" />
        <MetricCard title="Total Users" value={stats.users.total} sub={`+${stats.users.newThisMonth} this month`} color="blue" />
        <MetricCard title="Churn Rate" value={`${stats.revenue.churnRate}%`} sub="Last 30 days" color="red" />
        <MetricCard title="Avg Analyses" value={avgPerUser} sub="Per user (30d)" color="green" />
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
    fetch('/api/admin/analytics/content-optimizer')
      .then(r => r.json())
      .then(data => { setAnalytics(data); setLoading(false); });
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
    const url = `/api/admin/users${filter ? `?plan=${filter}` : ''}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
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
              {['Email', 'Plan', 'Joined', 'Analyses', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.users.map((user: any, i: number) => (
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
      .then(data => { setHealth(data); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!health) return <div className="p-8 text-center text-red-600">Failed to load</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">API Performance</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">Avg Response Time</div>
            <div className="text-2xl font-bold">{health.api.contentOptimizer.avgResponseTime}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Success Rate</div>
            <div className="text-2xl font-bold text-green-600">{health.api.contentOptimizer.successRate}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Errors (24h)</div>
            <div className="text-2xl font-bold text-red-600">{health.api.contentOptimizer.errors24h}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Monthly Cost Estimates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-gray-700">Claude API</h4>
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

