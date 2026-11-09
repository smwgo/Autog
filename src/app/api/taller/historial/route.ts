import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function generateId(): string {
  return "hst_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
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
    CREATE TABLE IF NOT EXISTS "WorkshopHistory" (
      "id" TEXT NOT NULL,
      "serviceCode" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "vehicle" TEXT NOT NULL,
      "plate" TEXT NOT NULL,
      "client" TEXT NOT NULL,
      "servicesJson" TEXT NOT NULL DEFAULT '[]',
      "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "mechanic" TEXT NOT NULL DEFAULT 'Carlos Rodríguez',
      "mileage" TEXT DEFAULT 'N/A',
      "notes" TEXT,
      "orderNumber" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WorkshopHistory_pkey" PRIMARY KEY ("id")
    );
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim() || "";
    const mecanico = searchParams.get("mecanico")?.trim() || "";

    return await withRetry(async () => {
      await ensureTableExists();

      let query = 'SELECT * FROM "WorkshopHistory" WHERE 1=1';
      const params: any[] = [];
      let pIdx = 1;

      if (mecanico && mecanico !== "TODOS") {
        query += ` AND "mechanic" ILIKE $${pIdx++}`;
        params.push(`%${mecanico}%`);
      }

      if (busqueda) {
        query += ` AND ("vehicle" ILIKE $${pIdx} OR "plate" ILIKE $${pIdx} OR "client" ILIKE $${pIdx} OR "serviceCode" ILIKE $${pIdx} OR "mechanic" ILIKE $${pIdx} OR "servicesJson" ILIKE $${pIdx})`;
        params.push(`%${busqueda}%`);
        pIdx++;
      }

      query += ' ORDER BY "createdAt" DESC';

      const rows: any = await prisma.$queryRawUnsafe(query, ...params);

      const history = rows.map((r: any) => {
        let services: string[] = [];
        try {
          services = r.servicesJson ? JSON.parse(r.servicesJson) : [];
        } catch {}

        const costNum = r.cost ? Number(r.cost) : 0;

        return {
          id: r.serviceCode || r.id,
          dbId: r.id,
          serviceCode: r.serviceCode,
          date: r.date,
          vehicle: r.vehicle,
          plate: r.plate,
          client: r.client,
          services,
          cost: `$${costNum.toFixed(2)}`,
          costNumeric: costNum,
          mechanic: r.mechanic || "Carlos Rodríguez",
          mileage: r.mileage || "N/A",
          notes: r.notes || "",
          orderNumber: r.orderNumber || "",
          createdAt: r.createdAt,
        };
      });

      return NextResponse.json({
        success: true,
        history,
        total: history.length,
      });
    });
  } catch (error: any) {
    console.error("Error al consultar historial de taller:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar historial en base de datos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicle, plate, client, services, cost, mechanic, mileage, date, notes, orderNumber } = body;

    if (!vehicle || !plate || !client) {
      return NextResponse.json(
        { success: false, error: "Vehículo, Placa y Cliente son obligatorios." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      const id = generateId();
      const serviceCode = `SRV-${Math.floor(1000 + Math.random() * 9000)}`;
      const parsedServices = Array.isArray(services)
        ? services
        : typeof services === "string"
        ? services.split(",").map((s: string) => s.trim()).filter(Boolean)
        : ["Mantenimiento General"];
      const servicesJson = JSON.stringify(parsedServices);
      const finalDate = date || new Date().toISOString().split("T")[0];
      const finalCost = cost !== undefined ? parseFloat(cost.toString().replace(/[^0-9.]/g, "")) || 0 : 0;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopHistory" ("id", "serviceCode", "date", "vehicle", "plate", "client", "servicesJson", "cost", "mechanic", "mileage", "notes", "orderNumber", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        id,
        serviceCode,
        finalDate,
        vehicle.trim(),
        plate.trim().toUpperCase(),
        client.trim(),
        servicesJson,
        finalCost,
        mechanic || "Carlos Rodríguez",
        mileage ? mileage.trim() : "N/A",
        notes ? notes.trim() : null,
        orderNumber ? orderNumber.trim() : null
      );

      return NextResponse.json({
        success: true,
        serviceCode,
        message: "Servicio registrado en el historial de base de datos.",
      });
    });
  } catch (error: any) {
    console.error("Error al registrar historial en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar historial en base de datos." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, serviceCode, date, vehicle, plate, client, services, cost, mechanic, mileage, nextOilChangeKm, notes, orderNumber } = body;

    const targetId = id || serviceCode;
    if (!targetId) {
      return NextResponse.json(
        { success: false, error: "ID o código de servicio requerido para actualizar." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();

      const existing: any[] = await prisma.$queryRawUnsafe(
        'SELECT * FROM "WorkshopHistory" WHERE "id" = $1 OR "serviceCode" = $1 LIMIT 1',
        targetId
      );

      if (existing.length === 0) {
        return NextResponse.json(
          { success: false, error: "Registro de historial no encontrado." },
          { status: 404 }
        );
      }

      const current = existing[0];
      const servicesJson = services !== undefined
        ? (typeof services === "string" ? services : JSON.stringify(services))
        : current.servicesJson;
      const finalCost = cost !== undefined ? Number(cost) : Number(current.cost || 0);

      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopHistory" SET
           "date" = COALESCE($2, "date"),
           "vehicle" = COALESCE($3, "vehicle"),
           "plate" = COALESCE($4, "plate"),
           "client" = COALESCE($5, "client"),
           "servicesJson" = $6,
           "cost" = $7,
           "mechanic" = COALESCE($8, "mechanic"),
           "mileage" = COALESCE($9, "mileage"),
           "nextOilChangeKm" = COALESCE($10, "nextOilChangeKm"),
           "notes" = COALESCE($11, "notes"),
           "orderNumber" = COALESCE($12, "orderNumber"),
           "updatedAt" = NOW()
         WHERE "id" = $1`,
        current.id,
        date || null,
        vehicle ? vehicle.trim() : null,
        plate ? plate.trim().toUpperCase() : null,
        client ? client.trim() : null,
        servicesJson,
        finalCost,
        mechanic || null,
        mileage || null,
        nextOilChangeKm !== undefined ? Number(nextOilChangeKm) : null,
        notes !== undefined ? notes : null,
        orderNumber || null
      );

      return NextResponse.json({
        success: true,
        message: "Registro de historial actualizado en base de datos.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar historial en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar historial en base de datos." },
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
        { success: false, error: "ID de registro requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(
        'DELETE FROM "WorkshopHistory" WHERE "id" = $1 OR "serviceCode" = $1',
        id
      );

      return NextResponse.json({
        success: true,
        message: "Registro eliminado del historial de base de datos.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar historial:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar historial en base de datos." },
      { status: 500 }
    );
  }
}
