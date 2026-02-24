const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🔌 Testing Neon DB connection via Prisma...\n");

  // 1. Test connection
  await prisma.$connect();
  console.log("✅ Connected to Neon DB successfully");

  // 2. Create a test user
  const testUser = await prisma.user.upsert({
    where: { clerkUserId: "test_clerk_id_123" },
    update: {},
    create: {
      clerkUserId: "test_clerk_id_123",
      email: "test@zeflash.app",
    },
  });
  console.log("✅ User created/found:", testUser.id, testUser.email);

  // 3. Create or check credits record
  const credits = await prisma.credit.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      total: 0,
      used: 0,
      remaining: 0,
    },
  });
  console.log("✅ Credits record:", { total: credits.total, remaining: credits.remaining });

  // 4. List all tables by counting rows
  const [userCount, creditCount, paymentCount, reportCount, txCount] = await Promise.all([
    prisma.user.count(),
    prisma.credit.count(),
    prisma.payment.count(),
    prisma.report.count(),
    prisma.creditTransaction.count(),
  ]);
  console.log("\n📊 Table row counts:");
  console.log(`   Users:               ${userCount}`);
  console.log(`   Credits:             ${creditCount}`);
  console.log(`   Payments:            ${paymentCount}`);
  console.log(`   Reports:             ${reportCount}`);
  console.log(`   CreditTransactions:  ${txCount}`);

  // 5. Clean up test data
  await prisma.credit.delete({ where: { userId: testUser.id } });
  await prisma.user.delete({ where: { id: testUser.id } });
  console.log("\n🧹 Test data cleaned up");

  console.log("\n🎉 All tests passed! Neon DB + Prisma is working correctly.");
}

main()
  .catch((e) => {
    console.error("❌ Test failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
