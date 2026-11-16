import { PrismaClient } from '@prisma/client'

// Single PrismaClient per process (avoids exhausting DB connections in dev/hot-reload and serverless).
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const prisma =
  global.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export default prisma
