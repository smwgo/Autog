import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEED_APPOINTMENTS = [
  {
    appointmentNumber: "CIT-1042",
    vehicle: "Toyota Hilux 2020",
    plate: "ABC-123",
    clientName: "Juan Pérez",
    clientPhone: "+593 99 111 2233",
    serviceName: "Mantenimiento Preventivo (Aceite y Filtros)",
    date: "2026-10-20",
    timeSlot: "08:00 AM",
    status: "Confirmada",
    notes: "Revisión de los 45,000 km y cambio de filtro de cabina.",
  },
  {
    appointmentNumber: "CIT-1048",
    vehicle: "Honda Civic 2018",
    plate: "XYZ-987",
    clientName: "Juan Pérez",
    clientPhone: "+593 99 111 2233",
    serviceName: "Alineación 3D y Balanceo Computarizado",
    date: "2026-10-24",
    timeSlot: "10:00 AM",
    status: "Programada",
    notes: "Ligera vibración en volante a velocidad de autopista.",
  },
];

function generateId(): string {
  return "cit_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
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
    CREATE TABLE IF NOT EXISTS "ClientAppointment" (
      "id" TEXT NOT NULL,
      "appointmentNumber" TEXT NOT NULL,
      "vehicle" TEXT NOT NULL,
      "plate" TEXT NOT NULL,
      "clientName" TEXT NOT NULL DEFAULT 'Juan Pérez',
      "clientPhone" TEXT,
      "serviceName" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "timeSlot" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'Programada',
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ClientAppointment_pkey" PRIMARY KEY ("id")
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

      let query = 'SELECT * FROM "ClientAppointment" WHERE 1=1';
      const params: any[] = [];
      let pIdx = 1;

      if (estado && estado !== "TODAS") {
        query += ` AND "status" ILIKE $${pIdx++}`;
        params.push(`%${estado}%`);
      }

      if (busqueda) {
        query += ` AND ("appointmentNumber" ILIKE $${pIdx} OR "vehicle" ILIKE $${pIdx} OR "plate" ILIKE $${pIdx} OR "serviceName" ILIKE $${pIdx})`;
        params.push(`%${busqueda}%`);
        pIdx++;
      }

      query += ' ORDER BY "date" ASC, "createdAt" DESC';

      const rows: any = await prisma.$queryRawUnsafe(query, ...params);

      const appointments = rows.map((r: any) => ({
        id: r.appointmentNumber || r.id,
        dbId: r.id,
        appointmentNumber: r.appointmentNumber,
        vehicle: r.vehicle,
        plate: r.plate,
        clientName: r.clientName,
        clientPhone: r.clientPhone || "",
        serviceName: r.serviceName,
        date: r.date,
        timeSlot: r.timeSlot,
        status: r.status || "Programada",
        notes: r.notes || "",
        createdAt: r.createdAt,
      }));

      return NextResponse.json({
        success: true,
        appointments,
        total: appointments.length,
      });
    });
  } catch (error: any) {
    console.error("Error al obtener citas en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar citas en base de datos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicle, plate, clientName, clientPhone, serviceName, date, timeSlot, notes } = body;

    if (!vehicle || !serviceName || !date || !timeSlot) {
      return NextResponse.json(
        { success: false, error: "Vehículo, servicio, fecha y horario son obligatorios." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      const id = generateId();
      const appointmentNumber = `CIT-${Math.floor(1000 + Math.random() * 9000)}`;
      const finalPlate = (plate || "S/P").trim().toUpperCase();
      const finalClient = (clientName || "Juan Pérez").trim();

      await prisma.$executeRawUnsafe(
        `INSERT INTO "ClientAppointment" ("id", "appointmentNumber", "vehicle", "plate", "clientName", "clientPhone", "serviceName", "date", "timeSlot", "status", "notes", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Programada', $10, NOW(), NOW())`,
        id,
        appointmentNumber,
        vehicle.trim(),
        finalPlate,
        finalClient,
        clientPhone ? clientPhone.trim() : null,
        serviceName.trim(),
        date.trim(),
        timeSlot.trim(),
        notes ? notes.trim() : null
      );

      // Sincronizar con OrderRequest para notificación en POS/Oficina
      try {
        const solId = "sol_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        await prisma.$executeRawUnsafe(
          `INSERT INTO "OrderRequest" ("id", "requestNumber", "type", "customerName", "customerPhone", "vehicleInfo", "itemsSummary", "totalEstimated", "notes", "status", "createdAt", "updatedAt")
           VALUES ($1, $2, 'SERVICIO', $3, $4, $5, $6, 0, $7, 'PENDIENTE', NOW(), NOW())`,
          solId,
          appointmentNumber,
          finalClient,
          clientPhone ? clientPhone.trim() : null,
          `${vehicle.trim()} (${finalPlate})`,
          `Cita ${date} (${timeSlot}): ${serviceName.trim()}`,
          notes ? notes.trim() : null
        );
      } catch {}

      const rows: any = await prisma.$queryRawUnsafe('SELECT * FROM "ClientAppointment" WHERE "id" = $1', id);

      return NextResponse.json({
        success: true,
        appointmentNumber,
        appointment: rows?.[0],
        message: "Cita agendada exitosamente en base de datos.",
      });
    });
  } catch (error: any) {
    console.error("Error al agendar cita en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al agendar cita en base de datos." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, vehicle, plate, serviceName, date, timeSlot, status, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de cita requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(
        `UPDATE "ClientAppointment"
         SET "vehicle" = COALESCE($2, "vehicle"),
             "plate" = COALESCE($3, "plate"),
             "serviceName" = COALESCE($4, "serviceName"),
             "date" = COALESCE($5, "date"),
             "timeSlot" = COALESCE($6, "timeSlot"),
             "status" = COALESCE($7, "status"),
             "notes" = COALESCE($8, "notes"),
             "updatedAt" = NOW()
         WHERE "id" = $1 OR "appointmentNumber" = $1`,
        id,
        vehicle || null,
        plate ? plate.toUpperCase() : null,
        serviceName || null,
        date || null,
        timeSlot || null,
        status || null,
        notes !== undefined ? notes : null
      );

      return NextResponse.json({
        success: true,
        message: "Cita actualizada en base de datos.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar cita:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar cita en base de datos." },
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
        { success: false, error: "ID de cita requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(
        'DELETE FROM "ClientAppointment" WHERE "id" = $1 OR "appointmentNumber" = $1',
        id
      );

      return NextResponse.json({
        success: true,
        message: "Cita eliminada de base de datos.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar cita:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar cita en base de datos." },
      { status: 500 }
    );
  }
}
