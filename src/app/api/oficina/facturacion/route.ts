import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

async function ensureFacturacionTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClientInvoice" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "invoiceNumber" TEXT NOT NULL UNIQUE,
      "uuid" TEXT NOT NULL UNIQUE,
      "date" TEXT NOT NULL,
      "concept" TEXT NOT NULL,
      "vehicle" TEXT,
      "clientName" TEXT NOT NULL DEFAULT 'Juan Pérez',
      "clientRfc" TEXT NOT NULL DEFAULT '0999999999',
      "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'Autorizado',
      "paymentMethod" TEXT NOT NULL DEFAULT 'Efectivo',
      "itemsJson" TEXT NOT NULL DEFAULT '[]',
      "orderId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CreditNote" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "noteNumber" TEXT NOT NULL UNIQUE,
      "date" TEXT NOT NULL,
      "clientName" TEXT NOT NULL,
      "clientRuc" TEXT NOT NULL DEFAULT '9999999999',
      "invoiceRef" TEXT NOT NULL,
      "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'Autorizado',
      "accessKey" TEXT NOT NULL DEFAULT '...NC001',
      "reason" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function GET() {
  try {
    const data = await withRetry(async () => {
      await ensureFacturacionTables();

      const facturas: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "ClientInvoice" ORDER BY "createdAt" DESC`);
      const notas: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "CreditNote" ORDER BY "createdAt" DESC`);

      return { facturas, notas };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener facturación" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { docType } = body; // "factura" | "nota"

    const created = await withRetry(async () => {
      await ensureFacturacionTables();

      if (docType === "nota") {
        const id = `nc_${Date.now()}`;
        const noteNumber = body.noteNumber || `001-001-000000${Math.floor(16 + Math.random() * 80)}`;
        const accessKey = `...NC${Math.floor(100 + Math.random() * 900)}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO "CreditNote" ("id", "noteNumber", "date", "clientName", "clientRuc", "invoiceRef", "total", "status", "accessKey", "reason", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
          id,
          noteNumber,
          body.date || "Hoy",
          body.clientName || "Cliente",
          body.clientRuc || "0999999999",
          body.invoiceRef || "Aplica a Factura",
          Number(body.total || 0),
          body.status || "Autorizado",
          accessKey,
          body.reason || "Devolución / Descuento"
        );
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "CreditNote" WHERE "id" = $1`, id);
        return rows[0];
      } else {
        const id = `inv_${Date.now()}`;
        const seq = Math.floor(1043 + Math.random() * 900);
        const invoiceNumber = body.invoiceNumber || `001-001-0000${seq}`;
        const uuid = body.status === "Pendiente" ? "Procesando..." : `...${Math.floor(89013 + Math.random() * 9000)}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO "ClientInvoice" ("id", "invoiceNumber", "uuid", "date", "concept", "clientName", "clientRfc", "amount", "status", "paymentMethod", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
          id,
          invoiceNumber,
          uuid,
          body.date || "Hoy",
          body.concept || "Facturación Manual SRI",
          body.clientName || "Consumidor Final",
          body.clientRfc || "9999999999",
          Number(body.amount || 0),
          body.status || "Autorizado",
          body.paymentMethod || "Efectivo"
        );
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "ClientInvoice" WHERE "id" = $1`, id);
        return rows[0];
      }
    });

    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al emitir documento" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, docType } = body;

    const updated = await withRetry(async () => {
      await ensureFacturacionTables();
      if (docType === "nota") {
        await prisma.$executeRawUnsafe(
          `UPDATE "CreditNote"
           SET "clientName" = COALESCE($2, "clientName"),
               "invoiceRef" = COALESCE($3, "invoiceRef"),
               "total" = COALESCE($4, "total"),
               "status" = COALESCE($5, "status"),
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $1`,
          id,
          body.clientName ?? null,
          body.invoiceRef ?? null,
          body.total !== undefined ? Number(body.total) : null,
          body.status ?? null
        );
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "CreditNote" WHERE "id" = $1`, id);
        return rows[0];
      } else {
        const uuid = body.status === "Autorizado" ? `...${Math.floor(89015 + Math.random() * 900)}` : undefined;
        await prisma.$executeRawUnsafe(
          `UPDATE "ClientInvoice"
           SET "clientName" = COALESCE($2, "clientName"),
               "clientRfc" = COALESCE($3, "clientRfc"),
               "concept" = COALESCE($4, "concept"),
               "amount" = COALESCE($5, "amount"),
               "status" = COALESCE($6, "status"),
               "uuid" = COALESCE($7, "uuid"),
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $1`,
          id,
          body.clientName ?? null,
          body.clientRfc ?? null,
          body.concept ?? null,
          body.amount !== undefined ? Number(body.amount) : null,
          body.status ?? null,
          uuid ?? null
        );
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "ClientInvoice" WHERE "id" = $1`, id);
        return rows[0];
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar documento" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const docType = searchParams.get("docType") || "factura";
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      if (docType === "nota") {
        await prisma.$executeRawUnsafe(`DELETE FROM "CreditNote" WHERE "id" = $1`, id);
      } else {
        await prisma.$executeRawUnsafe(`DELETE FROM "ClientInvoice" WHERE "id" = $1`, id);
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar documento" }, { status: 500 });
  }
}
