import { prisma } from "@/lib/auth";
import { headers } from "next/headers";

type AuditParams = {
  userId: string;
  location: "PRINCIPAL" | "SUCURSAL" | "AMBAS";
  action: string;
  entityName: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
};

export async function createAuditLog(params: AuditParams) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip");
  const userAgent = headersList.get("user-agent");

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      location: params.location,
      action: params.action,
      entityName: params.entityName,
      entityId: params.entityId,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
      device: userAgent,
      ipAddress: ip,
      syncStatus: "ONLINE" // Will be marked as offline if queued from PWA
    }
  });
}
