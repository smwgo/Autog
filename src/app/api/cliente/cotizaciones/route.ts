import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEED_QUOTES = [
  {
    quoteNumber: "COT-2026-1045",
    date: "2026-10-14",
    vehicle: "Toyota Hilux 2020 (ABC-123)",
    plate: "ABC-123",
    clientName: "Juan Pérez",
    status: "Pendiente",
    itemsJson: JSON.stringify([
      { name: "Amortiguadores Delanteros (Par)", price: 120.0, qty: 1 },
      { name: "Mano de Obra - Suspensión", price: 80.0, qty: 1 },
      { name: "Alineación Computarizada 3D", price: 25.0, qty: 1 },
    ]),
    subtotal: 225.0,
    total: 261.0,
    notes: "Se detectó desgaste prematuro en el amortiguador derecho. Se recomienda cambio en par.",
  },
  {
    quoteNumber: "COT-2026-0892",
    date: "2026-10-02",
    vehicle: "Honda Civic 2018 (XYZ-987)",
    plate: "XYZ-987",
    clientName: "Juan Pérez",
    status: "Aprobada",
    itemsJson: JSON.stringify([
      { name: "Batería 12V Libre Mantenimiento", price: 110.0, qty: 1 },
      { name: "Instalación y Diagnóstico de Alternador", price: 15.0, qty: 1 },
    ]),
    subtotal: 125.0,
    total: 145.0,
    notes: "Batería anterior con voltaje bajo en arranque en frío.",
  },
];

function generateId(): string {
  return "cot_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
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
    CREATE TABLE IF NOT EXISTS "ClientQuote" (
      "id" TEXT NOT NULL,
      "quoteNumber" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "vehicle" TEXT NOT NULL,
      "plate" TEXT,
      "clientName" TEXT NOT NULL DEFAULT 'Juan Pérez',
      "status" TEXT NOT NULL DEFAULT 'Pendiente',
      "itemsJson" TEXT NOT NULL DEFAULT '[]',
      "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ClientQuote_pkey" PRIMARY KEY ("id")
    );
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim() || "";

    return await withRetry(async () => {
      await ensureTableExists();

      const countResult: any = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "ClientQuote"');
      const count = countResult?.[0]?.count || 0;

      if (count === 0) {
        for (const q of SEED_QUOTES) {
          const id = generateId();
          await prisma.$executeRawUnsafe(
            `INSERT INTO "ClientQuote" ("id", "quoteNumber", "date", "vehicle", "plate", "clientName", "status", "itemsJson", "subtotal", "total", "notes", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
            id,
            q.quoteNumber,
            q.date,
            q.vehicle,
            q.plate,
            q.clientName,
            q.status,
            q.itemsJson,
            q.subtotal,
            q.total,
            q.notes
          );
        }
      }

      let query = 'SELECT * FROM "ClientQuote" WHERE 1=1';
      const params: any[] = [];
      if (busqueda) {
        query += ` AND ("quoteNumber" ILIKE $1 OR "vehicle" ILIKE $1 OR COALESCE("notes", '') ILIKE $1)`;
        params.push(`%${busqueda}%`);
      }
      query += ' ORDER BY "createdAt" DESC';

      const rows: any = await prisma.$queryRawUnsafe(query, ...params);

      const quotes = rows.map((r: any) => {
        let items: Array<{ name: string; price: number; qty: number }> = [];
        try {
          items = r.itemsJson ? JSON.parse(r.itemsJson) : [];
        } catch {}

        return {
          id: r.quoteNumber || r.id,
          dbId: r.id,
          quoteNumber: r.quoteNumber,
          date: r.date,
          vehicle: r.vehicle,
          plate: r.plate || "",
          clientName: r.clientName || "Juan Pérez",
          status: r.status || "Pendiente",
          items: items.map((i: any) => ({
            name: String(i.name || "Servicio"),
            price: Number(i.price || 0),
            qty: Number(i.qty || i.quantity || 1),
          })),
          subtotal: Number(r.subtotal || 0),
          total: Number(r.total || 0),
          notes: r.notes || "",
        };
      });

      return NextResponse.json({
        success: true,
        quotes,
        total: quotes.length,
      });
    });
  } catch (error: any) {
    console.error("Error al obtener cotizaciones de cliente:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar cotizaciones en Neon." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicle, plate, clientName, items, notes } = body;

    if (!vehicle || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Vehículo y al menos una partida son obligatorios." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      const id = generateId();
      const quoteNumber = `COT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const dateStr = new Date().toISOString().split("T")[0];

      const cleanItems = items.map((i: any) => ({
        name: String(i.name || "Servicio").trim(),
        price: Math.max(0, parseFloat(i.price?.toString() || "0") || 0),
        qty: Math.max(1, parseInt(i.qty?.toString() || "1", 10) || 1),
      }));

      const subtotal = cleanItems.reduce((acc, it) => acc + it.price * it.qty, 0);
      const total = Math.round(subtotal * 1.16 * 100) / 100;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "ClientQuote" ("id", "quoteNumber", "date", "vehicle", "plate", "clientName", "status", "itemsJson", "subtotal", "total", "notes", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, 'Pendiente', $7, $8, $9, $10, NOW(), NOW())`,
        id,
        quoteNumber,
        dateStr,
        vehicle.trim(),
        plate ? plate.trim().toUpperCase() : null,
        clientName ? clientName.trim() : "Juan Pérez",
        JSON.stringify(cleanItems),
        subtotal,
        total,
        notes ? notes.trim() : null
      );

      return NextResponse.json({
        success: true,
        quoteNumber,
        message: "Cotización creada en Neon DB.",
      });
    });
  } catch (error: any) {
    console.error("Error al crear cotización:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear cotización en Neon." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, vehicle, notes, items } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de cotización requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();

      if (Array.isArray(items) && items.length > 0) {
        const cleanItems = items.map((i: any) => ({
          name: String(i.name || "Servicio").trim(),
          price: Math.max(0, parseFloat(i.price?.toString() || "0") || 0),
          qty: Math.max(1, parseInt(i.qty?.toString() || "1", 10) || 1),
        }));
        const subtotal = cleanItems.reduce((acc, it) => acc + it.price * it.qty, 0);
        const total = Math.round(subtotal * 1.16 * 100) / 100;

        await prisma.$executeRawUnsafe(
          `UPDATE "ClientQuote"
           SET "status" = COALESCE($2, "status"),
               "vehicle" = COALESCE($3, "vehicle"),
               "notes" = COALESCE($4, "notes"),
               "itemsJson" = $5,
               "subtotal" = $6,
               "total" = $7,
               "updatedAt" = NOW()
           WHERE "id" = $1 OR "quoteNumber" = $1`,
          id,
          status || null,
          vehicle || null,
          notes !== undefined ? notes : null,
          JSON.stringify(cleanItems),
          subtotal,
          total
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE "ClientQuote"
           SET "status" = COALESCE($2, "status"),
               "vehicle" = COALESCE($3, "vehicle"),
               "notes" = COALESCE($4, "notes"),
               "updatedAt" = NOW()
           WHERE "id" = $1 OR "quoteNumber" = $1`,
          id,
          status || null,
          vehicle || null,
          notes !== undefined ? notes : null
        );
      }

      // Si el cliente aprueba la cotización, crear orden de taller activa en Neon
      if (status === "Aprobada") {
        try {
          const rows: any = await prisma.$queryRawUnsafe(
            'SELECT * FROM "ClientQuote" WHERE "id" = $1 OR "quoteNumber" = $1 LIMIT 1',
            id
          );
          const q = rows?.[0];
          if (q) {
            let parsed: any[] = [];
            try {
              parsed = q.itemsJson ? JSON.parse(q.itemsJson) : [];
            } catch {}
            const srvNames = parsed.map((i) => i.name);
            const ordId = "ord_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
            const ordNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
            await prisma.$executeRawUnsafe(
              `INSERT INTO "WorkshopOrder" ("id", "orderNumber", "vehicle", "plate", "client", "mechanic", "status", "progress", "servicesJson", "notes", "estimatedOut", "totalCost", "dateIn", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, 'Carlos Rodríguez', 'Reparando', 35, $6, $7, '24 Horas', $8, NOW(), NOW(), NOW())`,
              ordId,
              ordNumber,
              q.vehicle,
              q.plate || "ABC-123",
              q.clientName || "Juan Pérez",
              JSON.stringify(srvNames),
              `Generada por aprobación de cotización ${q.quoteNumber}. ${q.notes || ""}`,
              Number(q.total || 0)
            );
          }
        } catch {}
      }

      return NextResponse.json({
        success: true,
        message: "Cotización actualizada en Neon DB.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar cotización:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar cotización en Neon." },
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
        { success: false, error: "ID de cotización requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(
        'DELETE FROM "ClientQuote" WHERE "id" = $1 OR "quoteNumber" = $1',
        id
      );

      return NextResponse.json({
        success: true,
        message: "Cotización eliminada de Neon DB.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar cotización:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar cotización en Neon." },
      { status: 500 }
    );
  }
}
