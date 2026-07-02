import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/adminAuth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let result: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    result = await requireAdmin();
  } catch (err) {
    console.error('[AdminLayout] requireAdmin threw:', err);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <p className="text-lg font-bold text-slate-900 mb-2">Admin unavailable</p>
          <p className="text-sm text-slate-500 mb-4">Database or auth service error. Check Vercel logs.</p>
          <pre className="text-xs text-red-600 bg-red-50 p-3 rounded text-left overflow-auto">
            {err instanceof Error ? err.message : String(err)}
          </pre>
        </div>
      </div>
    );
  }

  if (!result.ok) redirect(result.status === 401 ? '/login' : '/');

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
