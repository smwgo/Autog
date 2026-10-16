import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClientQuote" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "quoteNumber" TEXT NOT NULL UNIQUE,
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function GET() {
  try {
    const data = await withRetry(async () => {
      await ensureTables();

      const quotesCount: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "ClientQuote"`);
      if (!quotesCount[0] || quotesCount[0].cnt === 0) {
        const seedQuotes = [
          {
            id: "cot_of_1",
            quoteNumber: "COT-00105",
            date: "Hoy, 09:30 AM",
            vehicle: "PCE-1234 (Toyota Yaris)",
            plate: "PCE-1234",
            clientName: "Ricardo Montero",
            status: "Pendiente Aprobación",
            itemsJson: JSON.stringify([{ description: "Mantenimiento Preventivo", qty: 1, price: 185 }]),
            subtotal: 160.87,
            total: 185.00,
            notes: "Revisión de frenos e inyectores"
          },
          {
            id: "cot_of_2",
            quoteNumber: "COT-00104",
            date: "Ayer",
            vehicle: "GBA-5678 (Hino)",
            plate: "GBA-5678",
            clientName: "Logística Express",
            status: "Aprobada",
            itemsJson: JSON.stringify([{ description: "Servicio Flota Pesada", qty: 1, price: 420.50 }]),
            subtotal: 365.65,
            total: 420.50,
            notes: "Flota corporativa"
          },
          {
            id: "cot_of_3",
            quoteNumber: "COT-00103",
            date: "24 Oct 2026",
            vehicle: "GSD-9012 (Chevrolet)",
            plate: "GSD-9012",
            clientName: "Daniela Alvarado",
            status: "Rechazada",
            itemsJson: JSON.stringify([{ description: "Diagnóstico Eléctrico", qty: 1, price: 85.00 }]),
            subtotal: 73.91,
            total: 85.00,
            notes: "Cliente pospuso reparación"
          },
          {
            id: "cot_of_4",
            quoteNumber: "COT-00102",
            date: "23 Oct 2026",
            vehicle: "UBT-1122 (Ford 150)",
            plate: "UBT-1122",
            clientName: "Andrea Suárez",
            status: "Facturada",
            itemsJson: JSON.stringify([{ description: "Cambio de Suspensión Delantera", qty: 1, price: 310.00 }]),
            subtotal: 269.57,
            total: 310.00,
            notes: "Entregado y facturado"
          },
        ];

        for (const q of seedQuotes) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "ClientQuote" ("id", "quoteNumber", "date", "vehicle", "plate", "clientName", "status", "itemsJson", "subtotal", "total", "notes", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
             ON CONFLICT ("quoteNumber") DO NOTHING`,
            q.id, q.quoteNumber, q.date, q.vehicle, q.plate, q.clientName, q.status, q.itemsJson, q.subtotal, q.total, q.notes
          );
        }
      }

      const quotes: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "ClientQuote" ORDER BY "createdAt" DESC`);
      const orders = await prisma.workshopOrder.findMany({
        orderBy: { createdAt: "desc" }
      });

      return { quotes, orders };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener órdenes y cotizaciones" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { docType } = body; // "cotizacion" | "orden"

    const result = await withRetry(async () => {
      await ensureTables();

      if (docType === "orden") {
        const orderNumber = body.orderNumber || `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
        const created = await prisma.workshopOrder.create({
          data: {
            orderNumber,
            client: body.clientName || "Cliente Oficina",
            clientPhone: body.clientPhone || "",
            vehicle: body.vehicle || "Vehículo",
            plate: body.plate || "S/P",
            mechanic: body.mechanic || "Carlos Rodríguez",
            status: body.status || "En Taller",
            progress: body.status === "Terminado" || body.status === "Entregado" ? 100 : 35,
            totalCost: Number(body.total || 0),
            notes: body.notes || "Creada desde Oficina",
            servicesJson: JSON.stringify([{ name: body.notes || "Servicio General", price: Number(body.total || 0) }]),
          }
        });
        return { type: "orden", item: created };
      } else {
        const id = `cot_${Date.now()}`;
        const quoteNumber = body.quoteNumber || `COT-${Math.floor(10000 + Math.random() * 90000)}`;
        const total = Number(body.total || 0);
        const subtotal = +(total / 1.15).toFixed(2);
        const date = body.date || "Hoy";

        await prisma.$executeRawUnsafe(
          `INSERT INTO "ClientQuote" ("id", "quoteNumber", "date", "vehicle", "plate", "clientName", "status", "itemsJson", "subtotal", "total", "notes", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
          id,
          quoteNumber,
          date,
          body.vehicle || "Vehículo General",
          body.plate || "",
          body.clientName || "Cliente",
          body.status || "Pendiente Aprobación",
          body.itemsJson || JSON.stringify([{ description: body.notes || "Servicio Cotizado", qty: 1, price: total }]),
          subtotal,
          total,
          body.notes || ""
        );

        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "ClientQuote" WHERE "id" = $1`, id);
        return { type: "cotizacion", item: rows[0] };
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear registro" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, docType } = body;

    const result = await withRetry(async () => {
      await ensureTables();

      if (docType === "orden") {
        const updated = await prisma.workshopOrder.update({
          where: { id },
          data: {
            client: body.clientName,
            vehicle: body.vehicle,
            plate: body.plate,
            status: body.status,
            mechanic: body.mechanic,
            totalCost: body.total !== undefined ? Number(body.total) : undefined,
            notes: body.notes,
            progress: body.status === "Terminado" || body.status === "Entregado" ? 100 : 50,
          }
        });
        return { type: "orden", item: updated };
      } else {
        const total = Number(body.total || 0);
        const subtotal = +(total / 1.15).toFixed(2);
        await prisma.$executeRawUnsafe(
          `UPDATE "ClientQuote"
           SET "clientName" = COALESCE($2, "clientName"),
               "vehicle" = COALESCE($3, "vehicle"),
               "plate" = COALESCE($4, "plate"),
               "status" = COALESCE($5, "status"),
               "total" = $6,
               "subtotal" = $7,
               "notes" = COALESCE($8, "notes"),
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $1`,
          id,
          body.clientName ?? null,
          body.vehicle ?? null,
          body.plate ?? null,
          body.status ?? null,
          total,
          subtotal,
          body.notes ?? null
        );

        // If approved and convertToOrder flag is set, also create a WorkshopOrder in Neon
        if (body.convertToOrder && body.status === "Aprobada") {
          const orderNum = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
          await prisma.workshopOrder.create({
            data: {
              orderNumber: orderNum,
              client: body.clientName || "Cliente",
              vehicle: body.vehicle || "Vehículo",
              plate: body.plate || "S/P",
              status: "En Taller",
              progress: 25,
              totalCost: total,
              notes: `Generada desde cotización ${body.quoteNumber || ""}`,
            }
          });
        }

        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "ClientQuote" WHERE "id" = $1`, id);
        return { type: "cotizacion", item: rows[0] };
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar registro" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const docType = searchParams.get("docType") || "cotizacion";

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    await withRetry(async () => {
      if (docType === "orden") {
        await prisma.workshopOrder.delete({ where: { id } });
      } else {
        await prisma.$executeRawUnsafe(`DELETE FROM "ClientQuote" WHERE "id" = $1`, id);
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar registro" }, { status: 500 });
  }
}
