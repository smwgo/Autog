import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function generateId(): string {
  return "insp_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
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

// GET: Listar inspecciones
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const busqueda = searchParams.get("busqueda");

    return await withRetry(async () => {
      let query = 'SELECT * FROM "WorkshopInspection" WHERE 1=1';
      const params: any[] = [];
      let pIdx = 1;

      if (estado && estado !== "TODOS" && estado !== "Estado") {
        query += ` AND "status" ILIKE $${pIdx++}`;
        params.push(`%${estado}%`);
      }

      if (busqueda) {
        query += ` AND ("vehicle" ILIKE $${pIdx} OR "plate" ILIKE $${pIdx} OR "inspectionNumber" ILIKE $${pIdx} OR "assignedTo" ILIKE $${pIdx})`;
        params.push(`%${busqueda}%`);
        pIdx++;
      }

      query += ' ORDER BY "createdAt" DESC';

      const rows: any = await prisma.$queryRawUnsafe(query, ...params);

      const inspections = rows.map((r: any) => {
        let checklist = {};
        try {
          checklist = r.checklistJson ? JSON.parse(r.checklistJson) : {};
        } catch {}

        let color = "bg-amber-500";
        const st = (r.status || "").toLowerCase();
        if (st.includes("progreso")) color = "bg-blue-500";
        if (st.includes("completado")) color = "bg-emerald-500";

        return {
          id: r.inspectionNumber || r.id,
          dbId: r.id,
          vehicle: r.vehicle,
          plate: r.plate,
          client: r.client || "Cliente Mostrador",
          type: r.type,
          status: r.status,
          assignedTo: r.assignedTo || "Sin asignar",
          date: r.createdAt ? new Date(r.createdAt).toISOString().replace("T", " ").substring(0, 16) : "",
          fuelLevel: r.fuelLevel,
          mileage: r.mileage,
          checklist,
          notes: r.notes,
          color,
        };
      });

      return NextResponse.json({
        success: true,
        inspections,
        total: inspections.length,
      });
    });
  } catch (error: any) {
    console.error("Error al obtener inspecciones:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar inspecciones." },
      { status: 500 }
    );
  }
}

// POST: Crear nueva inspección
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicle, plate, client, type, assignedTo, fuelLevel, mileage, checklist, notes } = body;

    if (!vehicle || !plate) {
      return NextResponse.json(
        { success: false, error: "Vehículo y Placa son obligatorios." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      const id = generateId();
      const inspectionNumber = `INSP-${Math.floor(100 + Math.random() * 900)}`;
      const checklistJson = JSON.stringify(checklist || {});

      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopInspection" ("id", "inspectionNumber", "vehicle", "plate", "client", "type", "status", "assignedTo", "fuelLevel", "mileage", "checklistJson", "notes", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        id,
        inspectionNumber,
        vehicle.trim(),
        plate.trim().toUpperCase(),
        client ? client.trim() : "Cliente General",
        type || "Recepción",
        "Pendiente",
        assignedTo || "Carlos Rodríguez",
        fuelLevel || "Medio",
        mileage ? mileage.trim() : null,
        checklistJson,
        notes ? notes.trim() : null
      );

      const rows: any = await prisma.$queryRawUnsafe('SELECT * FROM "WorkshopInspection" WHERE id = $1', id);

      return NextResponse.json({
        success: true,
        inspection: rows?.[0],
        message: "Inspección registrada exitosamente.",
      });
    });
  } catch (error: any) {
    console.error("Error al crear inspección:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear inspección." },
      { status: 500 }
    );
  }
}

// PUT: Actualizar estado de una inspección
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, assignedTo, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID de inspección es requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopInspection"
         SET "status" = COALESCE($2, "status"),
             "assignedTo" = COALESCE($3, "assignedTo"),
             "notes" = COALESCE($4, "notes"),
             "updatedAt" = NOW()
         WHERE id = $1 OR "inspectionNumber" = $1`,
        id,
        status || null,
        assignedTo || null,
        notes || null
      );

      return NextResponse.json({
        success: true,
        message: "Inspección actualizada correctamente.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar inspección:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar la inspección." },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar inspección
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID de inspección es requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await prisma.$executeRawUnsafe(
        'DELETE FROM "WorkshopInspection" WHERE id = $1 OR "inspectionNumber" = $1',
        id
      );

      return NextResponse.json({
        success: true,
        message: "Inspección eliminada exitosamente.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar inspección:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar la inspección." },
      { status: 500 }
    );
  }
}
