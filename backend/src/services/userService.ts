import { prisma } from '../lib/prisma';

export async function getOrCreateUser(clerkUserId: string, email?: string) {
  const existing = await prisma.user.findUnique({
    where: { clerkUserId },
    include: { credits: true },
  });
  if (existing) return existing;

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        clerkUserId,
        email: email || `${clerkUserId}@placeholder.zeflash.app`,
      },
    });
    await tx.credit.create({
      data: { userId: newUser.id, total: 0, used: 0, remaining: 0 },
    });
    return newUser;
  });

  return prisma.user.findUnique({ where: { id: user.id }, include: { credits: true } });
}

export async function getRemainingCredits(userId: string): Promise<number> {
  const credits = await prisma.credit.findUnique({ where: { userId } });
  return credits?.remaining ?? 0;
}

export async function addCredits(userId: string, amount: number, note: string) {
  return prisma.$transaction(async (tx) => {
    const credits = await tx.credit.upsert({
      where: { userId },
      create: { userId, total: amount, used: 0, remaining: amount },
      update: { total: { increment: amount }, remaining: { increment: amount } },
    });
    await tx.creditTransaction.create({
      data: { userId, type: 'purchase', credits: amount, note },
    });
    return credits;
  });
}

export async function deductCredit(userId: string, note: string) {
  const credits = await prisma.credit.findUnique({ where: { userId } });
  if (!credits || credits.remaining < 1) throw new Error('Insufficient credits');

  return prisma.$transaction(async (tx) => {
    await tx.credit.update({
      where: { userId },
      data: { used: { increment: 1 }, remaining: { decrement: 1 } },
    });
    await tx.creditTransaction.create({
      data: { userId, type: 'usage', credits: -1, note },
    });
  });
}
