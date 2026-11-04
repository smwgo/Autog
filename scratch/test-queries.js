const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const sales = await prisma.$queryRawUnsafe(`SELECT "id", "saleNumber", "branch" FROM "Sale" LIMIT 5`);
  console.log("Sales:", sales);

  const registers = await prisma.$queryRawUnsafe(`SELECT "id", "sessionNumber", "branch" FROM "CashRegister" LIMIT 5`);
  console.log("CashRegisters:", registers);
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
