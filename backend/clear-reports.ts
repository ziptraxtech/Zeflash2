import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearOldReports() {
  try {
    console.log("Clearing all old reports with AWS URLs...");
    
    // Delete all reports
    const deleted = await prisma.report.deleteMany();
    console.log(`✅ Deleted ${deleted.count} old reports`);
    
    console.log("Database cleared. All reports with cached AWS URLs removed.");
    console.log("Next reports generated will use localhost:3001 URLs only.");
  } catch (error) {
    console.error("Error clearing reports:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearOldReports();
