import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function generateId(): string {
  return "tsk_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
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
    CREATE TABLE IF NOT EXISTS "WorkshopTask" (
      "id" TEXT NOT NULL,
      "taskNumber" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "vehicle" TEXT NOT NULL,
      "plate" TEXT,
      "orderNumber" TEXT,
      "mechanic" TEXT NOT NULL DEFAULT 'Carlos Rodríguez',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "priority" TEXT NOT NULL DEFAULT 'Media',
      "timeEst" TEXT NOT NULL DEFAULT '1h 00m',
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WorkshopTask_pkey" PRIMARY KEY ("id")
    );
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim() || "";
    const mecanico = searchParams.get("mecanico")?.trim() || "";
    const estado = searchParams.get("estado")?.trim() || "";

    return await withRetry(async () => {
      await ensureTableExists();

      let query = 'SELECT * FROM "WorkshopTask" WHERE 1=1';
      const params: any[] = [];
      let pIdx = 1;

      if (estado && estado !== "TODOS") {
        query += ` AND "status" = $${pIdx++}`;
        params.push(estado);
      }

      if (mecanico && mecanico !== "TODOS") {
        query += ` AND "mechanic" ILIKE $${pIdx++}`;
        params.push(`%${mecanico}%`);
      }

      if (busqueda) {
        query += ` AND ("title" ILIKE $${pIdx} OR "vehicle" ILIKE $${pIdx} OR "taskNumber" ILIKE $${pIdx} OR "mechanic" ILIKE $${pIdx} OR COALESCE("orderNumber", '') ILIKE $${pIdx})`;
        params.push(`%${busqueda}%`);
        pIdx++;
      }

      query += ' ORDER BY "createdAt" DESC';

      const rows: any = await prisma.$queryRawUnsafe(query, ...params);

      const tasks = rows.map((r: any) => ({
        id: r.taskNumber || r.id,
        dbId: r.id,
        taskNumber: r.taskNumber,
        title: r.title,
        vehicle: r.vehicle,
        plate: r.plate || "",
        orderNumber: r.orderNumber || "",
        mechanic: r.mechanic || "Carlos Rodríguez",
        status: r.status || "pending",
        priority: r.priority || "Media",
        timeEst: r.timeEst || "1h 00m",
        notes: r.notes || "",
        createdAt: r.createdAt,
      }));

      return NextResponse.json({
        success: true,
        tasks,
        total: tasks.length,
      });
    });
  } catch (error: any) {
    console.error("Error al obtener tareas de taller:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar tareas en Neon." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, vehicle, plate, orderNumber, mechanic, priority, timeEst, status, notes } = body;

    if (!title || !vehicle) {
      return NextResponse.json(
        { success: false, error: "El título de la tarea y el vehículo son requeridos." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      const id = generateId();
      const taskNumber = `TSK-${Math.floor(100 + Math.random() * 900)}`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopTask" ("id", "taskNumber", "title", "vehicle", "plate", "orderNumber", "mechanic", "status", "priority", "timeEst", "notes", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        id,
        taskNumber,
        title.trim(),
        vehicle.trim(),
        plate ? plate.trim().toUpperCase() : null,
        orderNumber ? orderNumber.trim() : null,
        mechanic || "Carlos Rodríguez",
        status || "pending",
        priority || "Media",
        timeEst || "1h 00m",
        notes ? notes.trim() : null
      );

      const rows: any = await prisma.$queryRawUnsafe('SELECT * FROM "WorkshopTask" WHERE "id" = $1', id);
      const r = rows?.[0];

      return NextResponse.json({
        success: true,
        task: r
          ? {
              id: r.taskNumber || r.id,
              dbId: r.id,
              taskNumber: r.taskNumber,
              title: r.title,
              vehicle: r.vehicle,
              plate: r.plate || "",
              orderNumber: r.orderNumber || "",
              mechanic: r.mechanic,
              status: r.status,
              priority: r.priority,
              timeEst: r.timeEst,
              notes: r.notes || "",
            }
          : null,
        message: "Tarea creada exitosamente en Neon.",
      });
    });
  } catch (error: any) {
    console.error("Error al crear tarea de taller:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear tarea en Neon." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, priority, mechanic, title, vehicle, timeEst, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID de la tarea es requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopTask"
         SET "status" = COALESCE($2, "status"),
             "priority" = COALESCE($3, "priority"),
             "mechanic" = COALESCE($4, "mechanic"),
             "title" = COALESCE($5, "title"),
             "vehicle" = COALESCE($6, "vehicle"),
             "timeEst" = COALESCE($7, "timeEst"),
             "notes" = COALESCE($8, "notes"),
             "updatedAt" = NOW()
         WHERE "id" = $1 OR "taskNumber" = $1`,
        id,
        status || null,
        priority || null,
        mechanic || null,
        title || null,
        vehicle || null,
        timeEst || null,
        notes !== undefined ? notes : null
      );

      return NextResponse.json({
        success: true,
        message: "Tarea actualizada en Neon.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar tarea:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar tarea en Neon." },
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
        { success: false, error: "El ID de la tarea es requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(
        'DELETE FROM "WorkshopTask" WHERE "id" = $1 OR "taskNumber" = $1',
        id
      );

      return NextResponse.json({
        success: true,
        message: "Tarea eliminada de Neon.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar tarea:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar tarea en Neon." },
      { status: 500 }
    );
  }
}
