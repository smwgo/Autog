const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Migrating tables for branch support...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "branch" TEXT DEFAULT 'PRINCIPAL'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "CashRegister" ADD COLUMN IF NOT EXISTS "branch" TEXT DEFAULT 'PRINCIPAL'`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Sale_branch_idx" ON "Sale"("branch")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CashRegister_branch_idx" ON "CashRegister"("branch")`);
  
  // Also check ClientQuote, OrderRequest, PosCreditAccount
  await prisma.$executeRawUnsafe(`ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "branch" TEXT DEFAULT 'PRINCIPAL'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "ClientQuote" ADD COLUMN IF NOT EXISTS "branch" TEXT DEFAULT 'PRINCIPAL'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PosCreditAccount" ADD COLUMN IF NOT EXISTS "branch" TEXT DEFAULT 'PRINCIPAL'`);

  console.log("Migration completed successfully!");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
