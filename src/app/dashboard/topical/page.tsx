import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { TopicalClient } from './client'

export default async function TopicalPage() {
  return <TopicalClient />
}
