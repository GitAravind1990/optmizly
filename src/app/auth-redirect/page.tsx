import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminAuth'

export default async function AuthRedirect() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/login')

  const admin = await requireAdmin()
  redirect(admin.ok ? '/admin/dashboard' : '/dashboard')
}
