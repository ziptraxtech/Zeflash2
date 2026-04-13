import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

console.log('[Prisma] Initializing client...');
console.log('[Prisma] DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('[Prisma] DIRECT_URL exists:', !!process.env.DIRECT_URL);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ 
    log: ['error'],
    errorFormat: 'pretty'
  });

// Always cache in production
globalForPrisma.prisma = prisma;

// Test connection on startup
prisma.$connect()
  .then(() => console.log('[Prisma] ✅ Database connection successful'))
  .catch((err) => {
    console.error('[Prisma] ❌ Database connection failed:', err.message);
    console.error('[Prisma] DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  });

