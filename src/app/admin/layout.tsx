import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/adminAuth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const result = await requireAdmin();
  if (!result.ok) redirect(result.status === 401 ? '/login' : '/');

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
