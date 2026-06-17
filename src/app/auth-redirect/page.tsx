import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'gkm.aravind@gmail.com'

export default async function AuthRedirect() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/login')

  const user = await prisma.user.findUnique({ where: { clerkId }, select: { email: true } })

  if (user?.email === ADMIN_EMAIL) {
    redirect('/admin/dashboard')
  }

  redirect('/dashboard')
}
