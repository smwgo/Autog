const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSetting.findMany();
  console.log('SystemSettings in Neon:', settings);
  const branches = await prisma.branch.findMany();
  console.log('Branches in Neon:', branches);
}

main().catch(console.error).finally(() => prisma.$disconnect());

