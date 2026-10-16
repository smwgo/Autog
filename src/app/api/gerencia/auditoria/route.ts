import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

async function ensureAuditTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "dateLabel" TEXT NOT NULL,
      "userName" TEXT NOT NULL,
      "ipAddress" TEXT NOT NULL DEFAULT '192.168.1.10',
      "module" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "details" TEXT NOT NULL,
      "level" TEXT NOT NULL DEFAULT 'INFO',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function GET() {
  try {
    const logs = await withRetry(async () => {
      await ensureAuditTable();

      const countRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "AuditLog"`);
      if (!countRes[0] || countRes[0].cnt === 0) {
        const seeds = [
          { id: "aud_1", dateLabel: "Hoy, 10:45:12 AM", userName: "Ana Torres (Cajera)", ipAddress: "192.168.1.45", module: "Facturación", action: "Anulación de Factura", details: "Factura F-001-089 anulada. Motivo: Error de digitación", level: "CRÍTICO" },
          { id: "aud_2", dateLabel: "Hoy, 10:15:00 AM", userName: "Carlos Ruiz (Mecánico)", ipAddress: "192.168.1.112", module: "Taller", action: "Cierre de Orden", details: "Orden de Trabajo #1042 marcada como 'Completada'", level: "INFO" },
          { id: "aud_3", dateLabel: "Hoy, 09:30:22 AM", userName: "Juan Pérez (Gerente)", ipAddress: "192.168.1.10", module: "Inventario", action: "Modificación de Precio", details: "Batería 12V 60Ah: Precio $80.00 -> $85.00", level: "ADVERTENCIA" },
          { id: "aud_4", dateLabel: "Hoy, 09:15:05 AM", userName: "Ana Torres (Cajera)", ipAddress: "192.168.1.45", module: "Inicios de sesión", action: "Inicio de Sesión", details: "Login exitoso desde Sede Principal", level: "INFO" },
          { id: "aud_5", dateLabel: "Hoy, 08:05:40 AM", userName: "Sistema", ipAddress: "localhost", module: "Inventario", action: "Alerta de Stock", details: "Aceite Sintético 10W-40: Stock menor a mínimo (4 unidades)", level: "ADVERTENCIA" },
        ];
        for (const s of seeds) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "AuditLog" ("id", "dateLabel", "userName", "ipAddress", "module", "action", "details", "level")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT ("id") DO NOTHING`,
            s.id, s.dateLabel, s.userName, s.ipAddress, s.module, s.action, s.details, s.level
          );
        }
      }

      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC`);
      return rows;
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener auditoría" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-client-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      body.ipAddress ||
      "127.0.0.1";

    const created = await withRetry(async () => {
      await ensureAuditTable();
      const id = `aud_${Date.now()}`;
      const nowStr = `Hoy, ${new Date().toLocaleTimeString("es-EC")}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "AuditLog" ("id", "dateLabel", "userName", "ipAddress", "module", "action", "details", "level")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        id,
        body.dateLabel || nowStr,
        body.userName || "Administrador (Gerencia)",
        clientIp,
        body.module || "Sistema",
        body.action || "Registro Manual de Auditoría",
        body.details || "Verificación de control interno",
        body.level || "INFO"
      );
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "AuditLog" WHERE "id" = $1`, id);
      return rows[0];
    });
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al registrar evento" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      await prisma.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE "id" = $1`, id);
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar log" }, { status: 500 });
  }
}
