import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAIL = 'gkm.aravind@gmail.com';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (user?.email !== ADMIN_EMAIL) redirect('/');

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
