const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("Verificando conexión con Neon PostgreSQL...");
    const check = await prisma.$queryRawUnsafe("SELECT current_database(), current_user, version()");
    console.log("Conectado exitosamente:", check);

    console.log("Aplicando migración incremental '20261021_add_workshop_evidence'...");

    // 1. Crear tabla
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WorkshopEvidence" (
          "id" TEXT NOT NULL,
          "orderId" TEXT,
          "orderNumber" TEXT,
          "vehicleId" TEXT,
          "plate" TEXT,
          "type" TEXT NOT NULL,
          "r2Key" TEXT NOT NULL,
          "mimeType" TEXT NOT NULL,
          "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
          "durationSeconds" INTEGER,
          "transcriptionText" TEXT,
          "uploadStatus" TEXT NOT NULL DEFAULT 'COMPLETED',
          "transcriptionStatus" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
          "uploadedBy" TEXT,
          "clientTempId" TEXT,
          "branch" TEXT DEFAULT 'PRINCIPAL',
          "metadataJson" TEXT DEFAULT '{}',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "WorkshopEvidence_pkey" PRIMARY KEY ("id")
      )
    `);

    // 2. Crear índices
    const indices = [
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_orderId_idx" ON "WorkshopEvidence"("orderId")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_orderNumber_idx" ON "WorkshopEvidence"("orderNumber")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_vehicleId_idx" ON "WorkshopEvidence"("vehicleId")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_plate_idx" ON "WorkshopEvidence"("plate")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_r2Key_idx" ON "WorkshopEvidence"("r2Key")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_type_idx" ON "WorkshopEvidence"("type")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_uploadStatus_idx" ON "WorkshopEvidence"("uploadStatus")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_clientTempId_idx" ON "WorkshopEvidence"("clientTempId")`
    ];

    for (const idxSql of indices) {
      await prisma.$executeRawUnsafe(idxSql);
    }

    // 3. Crear constraints con verificación
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'WorkshopEvidence_orderId_fkey'
          ) THEN
              ALTER TABLE "WorkshopEvidence"
              ADD CONSTRAINT "WorkshopEvidence_orderId_fkey"
              FOREIGN KEY ("orderId") REFERENCES "WorkshopOrder"("id")
              ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;

          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'WorkshopEvidence_vehicleId_fkey'
          ) THEN
              ALTER TABLE "WorkshopEvidence"
              ADD CONSTRAINT "WorkshopEvidence_vehicleId_fkey"
              FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
              ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
      END $$;
    `);

    console.log("Migración aplicada exitosamente.");

    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'WorkshopEvidence'
      ORDER BY ordinal_position
    `);
    console.log("Estructura verificada de WorkshopEvidence en Neon:");
    console.table(columns);
  } catch (err) {
    console.error("Error en migración:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
