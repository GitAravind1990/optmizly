import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const dbUrl = process.env['DATABASE_URL']
if (!dbUrl) {
  console.error('[Prisma] FATAL: DATABASE_URL is not set — all DB operations will fail')
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['error'] : [],
    datasources: { db: { url: dbUrl } },
  })

if (process.env['NODE_ENV'] !== 'production') globalForPrisma.prisma = prisma