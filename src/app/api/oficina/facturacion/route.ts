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

      const invCount: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "ClientInvoice"`);
      if (!invCount[0] || invCount[0].cnt === 0) {
        const seedInvoices = [
          { id: "inv_of_1", invoiceNumber: "001-001-00001042", uuid: "...89012", date: "Hoy, 10:45 AM", concept: "Mantenimiento y Frenos", clientName: "Ricardo Montero", clientRfc: "0923456789", amount: 350.00, status: "Autorizado", paymentMethod: "Tarjeta" },
          { id: "inv_of_2", invoiceNumber: "001-001-00001041", uuid: "...89011", date: "Hoy, 09:30 AM", concept: "Servicio Flota Pesada", clientName: "Logística Express S.A.", clientRfc: "1792345678001", amount: 1250.00, status: "Autorizado", paymentMethod: "Transferencia" },
          { id: "inv_of_3", invoiceNumber: "001-001-00001040", uuid: "N/A", date: "Hoy, 08:15 AM", concept: "Diagnóstico Computarizado", clientName: "Daniela Alvarado", clientRfc: "0956781234", amount: 85.50, status: "Rechazado", paymentMethod: "Efectivo" },
          { id: "inv_of_4", invoiceNumber: "001-001-00001039", uuid: "Procesando...", date: "Ayer", concept: "Venta de Filtros", clientName: "Consumidor Final", clientRfc: "9999999999", amount: 15.00, status: "Pendiente", paymentMethod: "Efectivo" },
          { id: "inv_of_5", invoiceNumber: "001-001-00001038", uuid: "...89008", date: "Ayer", concept: "Kit de Embrague", clientName: "Carlos Villagómez", clientRfc: "0912345678", amount: 420.00, status: "Autorizado", paymentMethod: "Tarjeta" },
        ];
        for (const inv of seedInvoices) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "ClientInvoice" ("id", "invoiceNumber", "uuid", "date", "concept", "clientName", "clientRfc", "amount", "status", "paymentMethod", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
             ON CONFLICT ("invoiceNumber") DO NOTHING`,
            inv.id, inv.invoiceNumber, inv.uuid, inv.date, inv.concept, inv.clientName, inv.clientRfc, inv.amount, inv.status, inv.paymentMethod
          );
        }
      }

      const ncCount: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "CreditNote"`);
      if (!ncCount[0] || ncCount[0].cnt === 0) {
        const seedNotes = [
          { id: "nc_1", noteNumber: "001-001-00000015", date: "24 Oct 2026", clientName: "Ricardo Montero", clientRuc: "0923456789", invoiceRef: "Aplica a F-1042", total: 50.00, status: "Autorizado", accessKey: "...NC015", reason: "Descuento comercial posterior" },
          { id: "nc_2", noteNumber: "001-001-00000014", date: "20 Oct 2026", clientName: "Andrea Suárez", clientRuc: "0911223344", invoiceRef: "Aplica a F-1020", total: 310.00, status: "Autorizado", accessKey: "...NC014", reason: "Devolución de repuesto" },
        ];
        for (const nc of seedNotes) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "CreditNote" ("id", "noteNumber", "date", "clientName", "clientRuc", "invoiceRef", "total", "status", "accessKey", "reason", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
             ON CONFLICT ("noteNumber") DO NOTHING`,
            nc.id, nc.noteNumber, nc.date, nc.clientName, nc.clientRuc, nc.invoiceRef, nc.total, nc.status, nc.accessKey, nc.reason
          );
        }
      }

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
