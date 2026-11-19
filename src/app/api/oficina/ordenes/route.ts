import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { ensureSchemaOnce } from "@/lib/runtime-ddl";

async function ensureTables() {
  await ensureSchemaOnce("OficinaOrdenes", async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ClientQuote" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "quoteNumber" TEXT NOT NULL UNIQUE,
        "date" TEXT NOT NULL,
        "vehicle" TEXT NOT NULL,
        "plate" TEXT,
        "clientName" TEXT NOT NULL DEFAULT 'Cliente',
        "status" TEXT NOT NULL DEFAULT 'Pendiente',
        "itemsJson" TEXT NOT NULL DEFAULT '[]',
        "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });
}

export async function GET() {
  try {
    const data = await withRetry(async () => {
      await ensureTables();

      // 1. Obtener todas las órdenes de taller registradas (mismas de POS y Taller)
      const rawOrders = await prisma.workshopOrder.findMany({
        orderBy: { createdAt: "desc" },
      });

      // 2. Obtener cotizaciones tanto de OrderRequest (POS) como de ClientQuote
      const [posQuotes, clientQuotes] = (await Promise.all([
        (prisma as any).orderRequest.findMany({
          where: { type: "COTIZACION" },
          orderBy: { createdAt: "desc" },
        }).catch(() => []),
        prisma.$queryRawUnsafe(`SELECT * FROM "ClientQuote" ORDER BY "createdAt" DESC`).catch(() => []) as Promise<any[]>,
      ])) as [any[], any[]];

      const formattedQuotes = [
        ...clientQuotes.map((q: any) => ({
          id: q.id,
          quoteNumber: q.quoteNumber,
          clientName: q.clientName,
          vehicle: q.vehicle,
          plate: q.plate || "",
          date: q.date,
          status: q.status,
          total: Number(q.total || 0),
          notes: q.notes || "",
          createdAt: q.createdAt,
        })),
        ...posQuotes.map((q: any) => ({
          id: q.id,
          quoteNumber: q.requestNumber,
          clientName: q.customerName,
          vehicle: q.vehicleInfo || q.vehicleModel || "Vehículo",
          plate: q.vehiclePlate || "",
          date: new Date(q.createdAt).toLocaleDateString("es-EC"),
          status: q.status || "Pendiente",
          total: Number(q.totalEstimated || 0),
          notes: q.notes || q.itemsSummary || "",
          createdAt: q.createdAt,
        })),
      ];

      return {
        quotes: formattedQuotes,
        orders: rawOrders.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          client: o.client,
          clientPhone: o.clientPhone || "",
          vehicle: o.vehicle,
          plate: o.plate || "",
          mechanic: o.mechanic,
          status: o.status,
          progress: o.progress,
          totalCost: Number(o.totalCost || 0),
          isBilled: o.isBilled,
          billingStatus: o.billingStatus,
          createdAt: o.createdAt,
          notes: o.notes || "",
        })),
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al obtener órdenes y cotizaciones" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { docType } = body;

    const result = await withRetry(async () => {
      await ensureTables();

      if (docType === "orden") {
        const orderNumber = body.orderNumber || `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
        const created = await prisma.workshopOrder.create({
          data: {
            orderNumber,
            client: body.clientName || "Cliente",
            clientPhone: body.clientPhone || "",
            vehicle: body.vehicle || "Vehículo",
            plate: body.plate || "",
            mechanic: body.mechanic || "Técnico Asignado",
            status: body.status || "En Taller",
            progress: body.status === "Terminado" || body.status === "Entregado" ? 100 : 35,
            totalCost: Number(body.total || 0),
            notes: body.notes || "Creada desde Oficina",
            servicesJson: JSON.stringify([{ name: body.notes || "Servicio General", price: Number(body.total || 0) }]),
          },
        });
        return { type: "orden", item: created };
      } else {
        const id = `cot_${Date.now()}`;
        const quoteNumber = body.quoteNumber || `COT-${Math.floor(10000 + Math.random() * 90000)}`;
        const total = Number(body.total || 0);
        const subtotal = +(total / 1.15).toFixed(2);
        const date = body.date || new Date().toISOString().slice(0, 10);

        await prisma.$executeRawUnsafe(
          `INSERT INTO "ClientQuote" ("id", "quoteNumber", "date", "vehicle", "plate", "clientName", "status", "itemsJson", "subtotal", "total", "notes", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
          id,
          quoteNumber,
          date,
          body.vehicle || "Vehículo",
          body.plate || "",
          body.clientName || "Cliente",
          body.status || "Pendiente",
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
          },
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

        if (body.convertToOrder && body.status === "Aprobada") {
          const orderNum = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
          await prisma.workshopOrder.create({
            data: {
              orderNumber: orderNum,
              client: body.clientName || "Cliente",
              vehicle: body.vehicle || "Vehículo",
              plate: body.plate || "",
              status: "En Taller",
              progress: 25,
              totalCost: Number(body.total || 0),
              notes: `Derivado de cotización ${body.quoteNumber || ""}`,
              servicesJson: JSON.stringify([{ name: "Servicio de Cotización", price: Number(body.total || 0) }]),
            },
          });
        }

        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "ClientQuote" WHERE "id" = $1`, id);
        return { type: "cotizacion", item: rows[0] };
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const docType = searchParams.get("docType");

    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      await ensureTables();
      if (docType === "orden") {
        const existingOrd = await prisma.workshopOrder
          .findUnique({ where: { id }, select: { vehicleId: true, plate: true } })
          .catch(() => null);
        await prisma.workshopOrder.delete({ where: { id } });
        const deletedVehicleId = existingOrd?.vehicleId || null;
        const deletedPlate = String(existingOrd?.plate || "").trim().toUpperCase();
        if (deletedVehicleId || deletedPlate) {
          const refs = (await prisma
            .$queryRawUnsafe(
              `SELECT
                (SELECT COUNT(*)::int FROM "WorkshopOrder" WHERE ($1::text IS NOT NULL AND "vehicleId" = $1) OR ($2::text != '' AND UPPER("plate") = $2)) AS orders_cnt,
                (SELECT COUNT(*)::int FROM "WorkshopHistory" WHERE $2::text != '' AND UPPER("plate") = $2) AS hist_cnt`,
              deletedVehicleId,
              deletedPlate
            )
            .catch(() => [])) as any[];
          const r = refs[0];
          if (r && Number(r.orders_cnt || 0) === 0 && Number(r.hist_cnt || 0) === 0) {
            if (deletedVehicleId) {
              await prisma.vehicle.deleteMany({ where: { id: deletedVehicleId } }).catch(() => {});
            } else if (deletedPlate) {
              await prisma.vehicle.deleteMany({ where: { plate: { equals: deletedPlate, mode: "insensitive" } } }).catch(() => {});
            }
          }
        }
      } else {
        await prisma.$executeRawUnsafe(`DELETE FROM "ClientQuote" WHERE "id" = $1`, id);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar" }, { status: 500 });
  }
}
