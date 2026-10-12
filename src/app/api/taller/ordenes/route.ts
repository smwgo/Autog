import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Datos iniciales de demostración para auto-seed
const SEED_ORDERS = [
  {
    orderNumber: "ORD-2023-001",
    vehicle: "Toyota Hilux 2020",
    plate: "ABC-123",
    client: "Juan Pérez",
    clientPhone: "+593 99 111 2233",
    mechanic: "Carlos Rodríguez",
    status: "En Diagnóstico",
    progress: 25,
    servicesJson: JSON.stringify(["Mantenimiento y Calibración de Frenos", "Diagnóstico Computarizado OBD2"]),
    notes: "Ruido metálico al frenar y testigo de check engine encendido.",
    estimatedOut: "24 Horas",
    totalCost: 65.00,
  },
  {
    orderNumber: "ORD-2023-002",
    vehicle: "Honda Civic 2018",
    plate: "XYZ-987",
    client: "María Gómez",
    clientPhone: "+593 98 444 5566",
    mechanic: "Luis Martínez",
    status: "Reparando",
    progress: 60,
    servicesJson: JSON.stringify(["Cambio de Aceite y Filtro (Mano de Obra)", "Lavado Premium y Chasis"]),
    notes: "Mantenimiento preventivo por kilometraje.",
    estimatedOut: "Hoy 17:00",
    totalCost: 38.00,
  },
  {
    orderNumber: "ORD-2023-003",
    vehicle: "Ford Ranger 2021",
    plate: "DEF-456",
    client: "Empresa Logística SA",
    clientPhone: "+593 95 777 8899",
    mechanic: "Carlos Rodríguez",
    status: "Espera de Repuestos",
    progress: 40,
    servicesJson: JSON.stringify(["Alineación 3D y Balanceo Computarizado"]),
    notes: "Vibración en volante a más de 80 km/h.",
    estimatedOut: "Pendiente repuestos",
    totalCost: 35.00,
  },
  {
    orderNumber: "ORD-2023-004",
    vehicle: "Chevrolet Spark 2019",
    plate: "GHI-789",
    client: "Ana Torres",
    clientPhone: "+593 99 333 4455",
    mechanic: "Luis Martínez",
    status: "Listo para Entregar",
    progress: 100,
    servicesJson: JSON.stringify(["Lavado Premium y Chasis", "Inspección General de 35 Puntos"]),
    notes: "Revisión previa a viaje y lavado de carrocería.",
    estimatedOut: "Listo para retiro",
    totalCost: 33.00,
  },
];

function generateId(): string {
  return "ord_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
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

// GET: Listar órdenes con filtros
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const busqueda = searchParams.get("busqueda");

    return await withRetry(async () => {
      // Auto-seed si la tabla está vacía
      const countResult: any = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "WorkshopOrder"');
      const count = countResult?.[0]?.count || 0;

      if (count === 0) {
        for (const o of SEED_ORDERS) {
          const id = generateId();
          await prisma.$executeRawUnsafe(
            `INSERT INTO "WorkshopOrder" ("id", "orderNumber", "vehicle", "plate", "client", "clientPhone", "mechanic", "status", "progress", "servicesJson", "notes", "estimatedOut", "totalCost", "dateIn", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW())`,
            id,
            o.orderNumber,
            o.vehicle,
            o.plate,
            o.client,
            o.clientPhone,
            o.mechanic,
            o.status,
            o.progress,
            o.servicesJson,
            o.notes,
            o.estimatedOut,
            o.totalCost
          );
        }
      }

      let query = 'SELECT * FROM "WorkshopOrder" WHERE 1=1';
      const params: any[] = [];
      let pIdx = 1;

      if (estado && estado !== "TODOS") {
        query += ` AND "status" ILIKE $${pIdx++}`;
        params.push(`%${estado}%`);
      }

      if (busqueda) {
        query += ` AND ("vehicle" ILIKE $${pIdx} OR "plate" ILIKE $${pIdx} OR "client" ILIKE $${pIdx} OR "orderNumber" ILIKE $${pIdx})`;
        params.push(`%${busqueda}%`);
        pIdx++;
      }

      query += ' ORDER BY "createdAt" DESC';

      const rows: any = await prisma.$queryRawUnsafe(query, ...params);

      // Mapear campos para la UI
      const orders = rows.map((r: any) => {
        let services: string[] = [];
        try {
          services = r.servicesJson ? JSON.parse(r.servicesJson) : [];
        } catch {}

        let color = "bg-blue-500";
        const st = (r.status || "").toLowerCase();
        if (st.includes("diagnóstico") || st.includes("espera")) color = "bg-amber-500";
        if (st.includes("reparando")) color = "bg-blue-500";
        if (st.includes("repuestos")) color = "bg-rose-500";
        if (st.includes("listo") || st.includes("entregado")) color = "bg-emerald-500";

        return {
          id: r.orderNumber || r.id,
          dbId: r.id,
          vehicle: r.vehicle,
          plate: r.plate,
          client: r.client,
          clientPhone: r.clientPhone,
          mechanic: r.mechanic,
          status: r.status,
          progress: r.progress || 0,
          dateIn: r.dateIn ? new Date(r.dateIn).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          estimatedOut: r.estimatedOut || "En Evaluación",
          color,
          services,
          notes: r.notes,
          totalCost: r.totalCost ? Number(r.totalCost) : 0,
        };
      });

      return NextResponse.json({
        success: true,
        orders,
        total: orders.length,
      });
    });
  } catch (error: any) {
    console.error("Error al obtener órdenes de taller:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar órdenes." },
      { status: 500 }
    );
  }
}

// POST: Crear nueva orden de taller
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicle, plate, client, clientPhone, mechanic, notes, services, totalEstimated, estimatedOut } = body;

    if (!vehicle || !plate || !client) {
      return NextResponse.json(
        { success: false, error: "Vehículo, Placa y Cliente son requeridos." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      const id = generateId();
      const orderNumber = `ORD-2024-${Math.floor(100 + Math.random() * 900)}`;
      const servicesJson = JSON.stringify(Array.isArray(services) ? services : []);

      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopOrder" ("id", "orderNumber", "vehicle", "plate", "client", "clientPhone", "mechanic", "status", "progress", "servicesJson", "notes", "estimatedOut", "totalCost", "dateIn", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW())`,
        id,
        orderNumber,
        vehicle.trim(),
        plate.trim().toUpperCase(),
        client.trim(),
        clientPhone ? clientPhone.trim() : null,
        mechanic || "Carlos Rodríguez",
        "En Diagnóstico",
        15,
        servicesJson,
        notes ? notes.trim() : null,
        estimatedOut || "24 Horas",
        totalEstimated ? parseFloat(totalEstimated) : 0
      );

      const rows: any = await prisma.$queryRawUnsafe('SELECT * FROM "WorkshopOrder" WHERE id = $1', id);

      return NextResponse.json({
        success: true,
        order: rows?.[0],
        message: "Orden de taller creada exitosamente.",
      });
    });
  } catch (error: any) {
    console.error("Error al crear orden de taller:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear la orden." },
      { status: 500 }
    );
  }
}

// PUT: Actualizar estado o datos de una orden
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, progress, mechanic, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID o número de orden es requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopOrder"
         SET "status" = COALESCE($2, "status"),
             "progress" = COALESCE($3, "progress"),
             "mechanic" = COALESCE($4, "mechanic"),
             "notes" = COALESCE($5, "notes"),
             "updatedAt" = NOW()
         WHERE id = $1 OR "orderNumber" = $1`,
        id,
        status || null,
        progress !== undefined ? parseInt(progress) : null,
        mechanic || null,
        notes || null
      );

      return NextResponse.json({
        success: true,
        message: "Orden actualizada correctamente.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar orden:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar la orden." },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una orden de taller
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID o número de orden es requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await prisma.$executeRawUnsafe(
        'DELETE FROM "WorkshopOrder" WHERE id = $1 OR "orderNumber" = $1',
        id
      );

      return NextResponse.json({
        success: true,
        message: "Orden eliminada exitosamente.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar orden:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar la orden." },
      { status: 500 }
    );
  }
}
