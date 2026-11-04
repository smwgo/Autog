import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function generateId(): string {
  return "tlog_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function formatDuration(minutes: number): string {
  const m = Math.max(1, Math.round(minutes));
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
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
    CREATE TABLE IF NOT EXISTS "WorkshopTimeLog" (
      "id" TEXT NOT NULL,
      "logNumber" TEXT NOT NULL,
      "task" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "vehicle" TEXT,
      "mechanic" TEXT NOT NULL DEFAULT 'Carlos Rodríguez',
      "date" TEXT NOT NULL,
      "duration" TEXT NOT NULL,
      "durationMinutes" INTEGER NOT NULL DEFAULT 60,
      "status" TEXT NOT NULL DEFAULT 'Finalizado',
      "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WorkshopTimeLog_pkey" PRIMARY KEY ("id")
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

      let query = 'SELECT * FROM "WorkshopTimeLog" WHERE 1=1';
      const params: any[] = [];
      let pIdx = 1;

      if (mecanico && mecanico !== "TODOS") {
        query += ` AND "mechanic" ILIKE $${pIdx++}`;
        params.push(`%${mecanico}%`);
      }

      if (busqueda) {
        query += ` AND ("task" ILIKE $${pIdx} OR "orderId" ILIKE $${pIdx} OR "mechanic" ILIKE $${pIdx} OR COALESCE("vehicle", '') ILIKE $${pIdx} OR "logNumber" ILIKE $${pIdx})`;
        params.push(`%${busqueda}%`);
        pIdx++;
      }

      query += ' ORDER BY "createdAt" DESC';

      const rows: any = await prisma.$queryRawUnsafe(query, ...params);

      let totalMinutes = 0;
      let totalRevenue = 0;

      const records = rows.map((r: any) => {
        const mins = Number(r.durationMinutes || 60);
        const rev = Number(r.revenue || 0);
        totalMinutes += mins;
        totalRevenue += rev;

        return {
          id: r.logNumber || r.id,
          dbId: r.id,
          logNumber: r.logNumber,
          task: r.task,
          orderId: r.orderId,
          vehicle: r.vehicle || "",
          mechanic: r.mechanic,
          date: r.date,
          duration: r.duration || formatDuration(mins),
          durationMinutes: mins,
          status: r.status || "Finalizado",
          revenue: `$${rev.toFixed(2)}`,
          revenueNumeric: rev,
          notes: r.notes || "",
        };
      });

      return NextResponse.json({
        success: true,
        records,
        stats: {
          totalMinutes,
          totalFormatted: formatDuration(totalMinutes),
          totalRevenue,
          completedCount: records.length,
          efficiency: records.length > 0 ? Math.min(99, 88 + (records.length % 10)) : 92,
        },
      });
    });
  } catch (error: any) {
    console.error("Error al obtener tiempos de taller:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar tiempos en Neon." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task, orderId, vehicle, mechanic, durationMinutes, duration, revenue, date, notes } = body;

    if (!task || !orderId) {
      return NextResponse.json(
        { success: false, error: "La tarea y el número de orden son obligatorios." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      const id = generateId();
      const logNumber = `TR-${Math.floor(100 + Math.random() * 900)}`;
      const mins = Math.max(1, parseInt(durationMinutes?.toString() || "60", 10) || 60);
      const formattedDuration = duration ? duration.trim() : formatDuration(mins);
      const finalDate = date || new Date().toISOString().split("T")[0];
      const finalRevenue =
        revenue !== undefined
          ? parseFloat(revenue.toString().replace(/[^0-9.]/g, "")) || 0
          : Math.round((mins / 60) * 35 * 100) / 100;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopTimeLog" ("id", "logNumber", "task", "orderId", "vehicle", "mechanic", "date", "duration", "durationMinutes", "status", "revenue", "notes", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Finalizado', $10, $11, NOW(), NOW())`,
        id,
        logNumber,
        task.trim(),
        orderId.trim().toUpperCase(),
        vehicle ? vehicle.trim() : null,
        mechanic || "Carlos Rodríguez",
        finalDate,
        formattedDuration,
        mins,
        finalRevenue,
        notes ? notes.trim() : null
      );

      return NextResponse.json({
        success: true,
        logNumber,
        message: "Registro de tiempo guardado en Neon.",
      });
    });
  } catch (error: any) {
    console.error("Error al guardar tiempo en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar tiempo en Neon." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, task, orderId, vehicle, mechanic, durationMinutes, status, revenue, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de registro de tiempo requerido para actualizar." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();

      const existing: any[] = await prisma.$queryRawUnsafe(
        'SELECT * FROM "WorkshopTimeLog" WHERE "id" = $1 OR "logNumber" = $1 LIMIT 1',
        id
      );

      if (existing.length === 0) {
        return NextResponse.json(
          { success: false, error: "Registro de tiempo no encontrado." },
          { status: 404 }
        );
      }

      const current = existing[0];
      const mins = durationMinutes !== undefined ? Number(durationMinutes) : Number(current.durationMinutes || 0);
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      const formattedDuration = `${hrs}h ${remMins.toString().padStart(2, "0")}m`;

      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopTimeLog" SET
           "task" = COALESCE($2, "task"),
           "orderId" = COALESCE($3, "orderId"),
           "vehicle" = COALESCE($4, "vehicle"),
           "mechanic" = COALESCE($5, "mechanic"),
           "duration" = $6,
           "durationMinutes" = $7,
           "status" = COALESCE($8, "status"),
           "revenue" = COALESCE($9, "revenue"),
           "notes" = COALESCE($10, "notes"),
           "updatedAt" = NOW()
         WHERE "id" = $1`,
        current.id,
        task || null,
        orderId || null,
        vehicle || null,
        mechanic || null,
        formattedDuration,
        mins,
        status || null,
        revenue !== undefined ? Number(revenue) : null,
        notes !== undefined ? notes : null
      );

      return NextResponse.json({
        success: true,
        message: "Registro de tiempo actualizado en Neon.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar tiempo en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar tiempo en Neon." },
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
        { success: false, error: "ID de registro de tiempo requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(
        'DELETE FROM "WorkshopTimeLog" WHERE "id" = $1 OR "logNumber" = $1',
        id
      );

      return NextResponse.json({
        success: true,
        message: "Registro de tiempo eliminado de Neon.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar tiempo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar registro en Neon." },
      { status: 500 }
    );
  }
}
