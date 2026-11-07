import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEED_INVOICES = [
  {
    invoiceNumber: "F-2023-0899",
    uuid: "A1B2C3D4-E5F6-7890-9988-1234567890AB",
    date: "2026-09-15",
    concept: "Servicio de Mantenimiento Preventivo (Hilux)",
    vehicle: "Toyota Hilux 2020 (ABC-123)",
    clientName: "Juan Pérez",
    clientRfc: "XAXX010101000",
    amount: 185.0,
    status: "Pagada",
    paymentMethod: "Tarjeta de Crédito",
    itemsJson: JSON.stringify([
      { description: "Mano de obra especializada (Mantenimiento)", amount: 65.0 },
      { description: "Aceite sintético 5W-30 y filtro de aceite", amount: 94.48 },
    ]),
    orderId: "ORD-2023-1045",
  },
  {
    invoiceNumber: "F-2023-0850",
    uuid: "B2C3D4E5-F6G7-8901-7766-2345678901BC",
    date: "2026-07-02",
    concept: "Reparación de Frenos (Civic)",
    vehicle: "Honda Civic 2018 (XYZ-987)",
    clientName: "Juan Pérez",
    clientRfc: "XAXX010101000",
    amount: 210.5,
    status: "Pagada",
    paymentMethod: "Transferencia Bancaria",
    itemsJson: JSON.stringify([
      { description: "Mano de obra: Reemplazo y purgado de frenos", amount: 80.0 },
      { description: "Pastillas delanteras de cerámica y rectificación", amount: 101.47 },
    ]),
    orderId: "ORD-2023-0892",
  },
  {
    invoiceNumber: "F-2023-0910",
    uuid: "C3D4E5F6-G7H8-9012-3322-8765432109DE",
    date: "2026-10-08",
    concept: "Compra de Repuestos y Diagnóstico Electrónico",
    vehicle: "Toyota Hilux 2020 (ABC-123)",
    clientName: "Juan Pérez",
    clientRfc: "XAXX010101000",
    amount: 65.0,
    status: "Pendiente",
    paymentMethod: "Por Definir",
    itemsJson: JSON.stringify([
      { description: "Juego de plumillas limpiaparabrisas Bosch 24\"", amount: 38.79 },
      { description: "Escaneo OBD2 preventivo", amount: 17.24 },
    ]),
    orderId: "ORD-2023-001",
  },
  {
    invoiceNumber: "F-2022-0412",
    uuid: "D4E5F6G7-H8I9-0123-5544-3456789012CD",
    date: "2026-05-10",
    concept: "Alineación 3D y Balanceo (Escape)",
    vehicle: "Ford Escape 2021 (QWE-554)",
    clientName: "Juan Pérez",
    clientRfc: "XAXX010101000",
    amount: 45.0,
    status: "Pagada",
    paymentMethod: "Efectivo",
    itemsJson: JSON.stringify([
      { description: "Alineación 3D computarizada y plomos de balanceo", amount: 38.79 },
    ]),
    orderId: "ORD-2022-1205",
  },
];

function generateId(): string {
  return "inv_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function generateUUID(): string {
  const hex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase();
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 600): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

async function ensureTableExists() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClientInvoice" (
      "id" TEXT NOT NULL,
      "invoiceNumber" TEXT NOT NULL,
      "uuid" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "concept" TEXT NOT NULL,
      "vehicle" TEXT,
      "clientName" TEXT NOT NULL DEFAULT 'Juan Pérez',
      "clientRfc" TEXT NOT NULL DEFAULT 'XAXX010101000',
      "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'Pendiente',
      "paymentMethod" TEXT NOT NULL DEFAULT 'Por Definir',
      "itemsJson" TEXT NOT NULL DEFAULT '[]',
      "orderId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ClientInvoice_pkey" PRIMARY KEY ("id")
    );
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim() || "";
    const estado = searchParams.get("estado")?.trim() || "";

    return await withRetry(async () => {
      await ensureTableExists();

      let query = 'SELECT * FROM "ClientInvoice" WHERE 1=1';
      const params: any[] = [];
      let pIdx = 1;

      if (estado && estado !== "Todas") {
        query += ` AND "status" = $${pIdx++}`;
        params.push(estado);
      }

      if (busqueda) {
        query += ` AND ("invoiceNumber" ILIKE $${pIdx} OR "uuid" ILIKE $${pIdx} OR "concept" ILIKE $${pIdx} OR COALESCE("vehicle", '') ILIKE $${pIdx})`;
        params.push(`%${busqueda}%`);
        pIdx++;
      }

      query += ' ORDER BY "createdAt" DESC';

      const rows: any = await prisma.$queryRawUnsafe(query, ...params);

      const invoices = rows.map((r: any) => {
        let items: Array<{ description: string; amount: number }> = [];
        try {
          items = r.itemsJson ? JSON.parse(r.itemsJson) : [];
        } catch {}

        return {
          id: r.invoiceNumber || r.id,
          dbId: r.id,
          invoiceNumber: r.invoiceNumber,
          uuid: r.uuid,
          date: r.date,
          concept: r.concept,
          vehicle: r.vehicle || "",
          clientName: r.clientName || "Juan Pérez",
          clientRfc: r.clientRfc || "XAXX010101000",
          amount: Number(r.amount || 0),
          status: (r.status === "Pagada" ? "Pagada" : "Pendiente") as "Pagada" | "Pendiente",
          paymentMethod: r.paymentMethod || "Por Definir",
          items,
          orderId: r.orderId || "",
        };
      });

      return NextResponse.json({
        success: true,
        facturas: invoices,
        invoices,
        total: invoices.length,
      });
    });
  } catch (error: any) {
    console.error("Error al obtener facturas de cliente:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar facturas en Neon." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { concept, vehicle, clientName, clientRfc, amount, status, paymentMethod, items } = body;

    if (!concept || amount === undefined) {
      return NextResponse.json(
        { success: false, error: "Concepto y monto son obligatorios." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      const id = generateId();
      const invoiceNumber = `F-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const uuid = generateUUID();
      const dateStr = new Date().toISOString().split("T")[0];
      const numAmount = Math.max(0, parseFloat(amount.toString()) || 0);
      const parsedItems =
        Array.isArray(items) && items.length > 0
          ? items
          : [{ description: concept.trim(), amount: Math.round((numAmount / 1.16) * 100) / 100 }];

      await prisma.$executeRawUnsafe(
        `INSERT INTO "ClientInvoice" ("id", "invoiceNumber", "uuid", "date", "concept", "vehicle", "clientName", "clientRfc", "amount", "status", "paymentMethod", "itemsJson", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        id,
        invoiceNumber,
        uuid,
        dateStr,
        concept.trim(),
        vehicle ? vehicle.trim() : null,
        clientName ? clientName.trim() : "Juan Pérez",
        clientRfc ? clientRfc.trim().toUpperCase() : "XAXX010101000",
        numAmount,
        status || "Pendiente",
        paymentMethod || "Por Definir",
        JSON.stringify(parsedItems)
      );

      return NextResponse.json({
        success: true,
        invoiceNumber,
        uuid,
        message: "Factura registrada en Neon DB.",
      });
    });
  } catch (error: any) {
    console.error("Error al crear factura:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear factura en Neon." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, paymentMethod, concept, amount } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de factura requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(
        `UPDATE "ClientInvoice"
         SET "status" = COALESCE($2, "status"),
             "paymentMethod" = COALESCE($3, "paymentMethod"),
             "concept" = COALESCE($4, "concept"),
             "amount" = COALESCE($5, "amount"),
             "updatedAt" = NOW()
         WHERE "id" = $1 OR "invoiceNumber" = $1`,
        id,
        status || null,
        paymentMethod || null,
        concept || null,
        amount !== undefined ? parseFloat(amount.toString()) : null
      );

      return NextResponse.json({
        success: true,
        message: "Factura actualizada en Neon DB.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar factura:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar factura en Neon." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de factura requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(
        'DELETE FROM "ClientInvoice" WHERE "id" = $1 OR "invoiceNumber" = $1',
        id
      );

      return NextResponse.json({
        success: true,
        message: "Factura eliminada de Neon DB.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar factura:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar factura en Neon." },
      { status: 500 }
    );
  }
}
