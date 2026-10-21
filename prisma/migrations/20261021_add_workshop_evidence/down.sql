-- Down Migration (Reversible):
ALTER TABLE IF EXISTS "WorkshopEvidence" DROP CONSTRAINT IF EXISTS "WorkshopEvidence_orderId_fkey";
ALTER TABLE IF EXISTS "WorkshopEvidence" DROP CONSTRAINT IF EXISTS "WorkshopEvidence_vehicleId_fkey";
DROP TABLE IF EXISTS "WorkshopEvidence";
