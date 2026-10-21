-- Up Migration: Crear tabla WorkshopEvidence de manera incremental y reversible
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
);

-- Índices para búsqueda rápida y control de concurrencia / deduplicación
CREATE INDEX IF NOT EXISTS "WorkshopEvidence_orderId_idx" ON "WorkshopEvidence"("orderId");
CREATE INDEX IF NOT EXISTS "WorkshopEvidence_orderNumber_idx" ON "WorkshopEvidence"("orderNumber");
CREATE INDEX IF NOT EXISTS "WorkshopEvidence_vehicleId_idx" ON "WorkshopEvidence"("vehicleId");
CREATE INDEX IF NOT EXISTS "WorkshopEvidence_plate_idx" ON "WorkshopEvidence"("plate");
CREATE INDEX IF NOT EXISTS "WorkshopEvidence_r2Key_idx" ON "WorkshopEvidence"("r2Key");
CREATE INDEX IF NOT EXISTS "WorkshopEvidence_type_idx" ON "WorkshopEvidence"("type");
CREATE INDEX IF NOT EXISTS "WorkshopEvidence_uploadStatus_idx" ON "WorkshopEvidence"("uploadStatus");
CREATE INDEX IF NOT EXISTS "WorkshopEvidence_clientTempId_idx" ON "WorkshopEvidence"("clientTempId");

-- Claves foráneas seguras con ON DELETE SET NULL para evitar borrados en cascada destructivos no deseados
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
