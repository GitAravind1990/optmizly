import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const result = await prisma.user.deleteMany({})
console.log(`Deleted ${result.count} users`)
await prisma.$disconnect()
