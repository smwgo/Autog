const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log("Checking Neon database connection...");
    const userCount = await prisma.user.count();
    console.log("Users count in Neon:", userCount);
    
    // Check if workshopService exists on prisma client
    if (prisma.workshopService) {
      console.log("prisma.workshopService exists on client!");
      const count = await prisma.workshopService.count();
      console.log("WorkshopService count in DB:", count);
      const services = await prisma.workshopService.findMany({ take: 10 });
      console.log("Found services in Neon DB:", services);
    } else {
      console.log("prisma.workshopService DOES NOT exist on generated client!");
      const raw = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "WorkshopService"');
      console.log("Raw query count on WorkshopService:", raw);
    }
  } catch (err) {
    console.error("Database check error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
