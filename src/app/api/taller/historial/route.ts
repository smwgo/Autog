import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEED_HISTORY = [
  {
    serviceCode: "SRV-8901",
    date: "2024-10-12",
    vehicle: "Toyota Corolla 2020",
    plate: "ABC-123",
    client: "Juan Pérez",
    servicesJson: JSON.stringify([
      "Cambio de aceite sintético",
      "Cambio de filtro de aire",
      "Revisión de niveles y fluidos",
    ]),
    cost: 120.0,
    mechanic: "Carlos Rodríguez",
    mileage: "45,200 km",
    notes: "Mantenimiento preventivo completado. Próximo cambio a los 50,000 km.",
    orderNumber: "ORD-2023-001",
  },
  {
    serviceCode: "SRV-8845",
    date: "2024-10-05",
    vehicle: "Honda Civic 2018",
    plate: "XYZ-987",
    client: "María Gómez",
    servicesJson: JSON.stringify([
      "Cambio de pastillas de freno",
      "Rectificación de discos delanteros",
      "Purga de líquido de frenos DOT 4",
    ]),
    cost: 250.0,
    mechanic: "Luis Martínez",
    mileage: "68,100 km",
    notes: "Sistema de frenado calibrado y probado en ruta.",
    orderNumber: "ORD-2023-002",
  },
  {
    serviceCode: "SRV-8712",
    date: "2024-09-24",
    vehicle: "Ford Ranger 2021",
    plate: "DEF-456",
    client: "Empresa Logística SA",
    servicesJson: JSON.stringify([
      "Mantenimiento preventivo 50K",
      "Alineación 3D y balanceo computarizado",
      "Rotación de neumáticos",
    ]),
    cost: 480.0,
    mechanic: "Ana Torres",
    mileage: "50,050 km",
    notes: "Unidad de flota corporativa entregada en óptimas condiciones.",
    orderNumber: "ORD-2023-003",
  },
  {
    serviceCode: "SRV-8650",
    date: "2024-09-14",
    vehicle: "Nissan Versa 2019",
    plate: "JHF-432",
    client: "Roberto Sánchez",
    servicesJson: JSON.stringify([
      "Diagnóstico electrónico de motor",
      "Cambio de bujías Iridium",
      "Limpieza ultrasónica de inyectores",
    ]),
    cost: 190.0,
    mechanic: "Carlos Rodríguez",
    mileage: "82,400 km",
    notes: "Se eliminó código P0300 y mejoró consumo de combustible.",
    orderNumber: "ORD-2023-004",
  },
];

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

      const countResult: any = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "WorkshopHistory"');
      const count = countResult?.[0]?.count || 0;

      if (count === 0) {
        for (const h of SEED_HISTORY) {
          const id = generateId();
          await prisma.$executeRawUnsafe(
            `INSERT INTO "WorkshopHistory" ("id", "serviceCode", "date", "vehicle", "plate", "client", "servicesJson", "cost", "mechanic", "mileage", "notes", "orderNumber", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
            id,
            h.serviceCode,
            h.date,
            h.vehicle,
            h.plate,
            h.client,
            h.servicesJson,
            h.cost,
            h.mechanic,
            h.mileage,
            h.notes,
            h.orderNumber
          );
        }
      }

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
      { success: false, error: error.message || "Error al consultar historial en Neon." },
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
        message: "Servicio registrado en el historial de Neon.",
      });
    });
  } catch (error: any) {
    console.error("Error al registrar historial en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar historial en Neon." },
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
        message: "Registro eliminado del historial de Neon.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar historial:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar historial en Neon." },
      { status: 500 }
    );
  }
}
