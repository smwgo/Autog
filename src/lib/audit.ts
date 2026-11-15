import { prisma as prismaClient } from "@/lib/prisma";
import { headers } from "next/headers";

const prisma = prismaClient as any;

type AuditParams = {
  userId?: string;
  userName?: string;
  location?: "PRINCIPAL" | "SUCURSAL" | "AMBAS";
  module?: string;
  action: string;
  entityName?: string;
  entityId?: string;
  details?: string;
  level?: "INFO" | "ADVERTENCIA" | "CRÍTICO";
  oldValue?: any;
  newValue?: any;
};

export async function createAuditLog(params: AuditParams) {
  let ip = "unknown";
  try {
    const headersList = await headers();
    ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown";
  } catch {
    ip = "unknown";
  }

  const now = new Date();
  const dateLabel = now.toISOString().slice(0, 16).replace("T", " ");
  const moduleName =
    params.module || params.entityName || params.location || "SISTEMA";
  const userName = params.userName || params.userId || "Sistema";
  const detailsText =
    params.details ||
    [
      params.entityName ? `Entidad: ${params.entityName}` : "",
      params.entityId ? `ID: ${params.entityId}` : "",
      params.location ? `Sede: ${params.location}` : "",
      params.oldValue !== undefined ? `Antes: ${JSON.stringify(params.oldValue)}` : "",
      params.newValue !== undefined ? `Después: ${JSON.stringify(params.newValue)}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

  try {
    await prisma.auditLog.create({
      data: {
        dateLabel,
        userName,
        ipAddress: ip,
        module: moduleName,
        action: params.action,
        details: detailsText || params.action,
        level: params.level || "INFO",
      },
    });
  } catch (err) {
    console.warn("[audit] No se pudo registrar AuditLog:", err);
  }
}
