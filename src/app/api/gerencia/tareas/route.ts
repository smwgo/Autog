import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface CeoTask {
  id: string;
  title: string;
  category: string;
  priority: "URGENTE" | "ALTA" | "MEDIA" | "NORMAL";
  status: "PENDIENTE" | "EN_PROCESO" | "COMPLETADA";
  dueDate: string;
  assignedTo: string;
  notes?: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapTask(t: any): CeoTask {
  return {
    id: t.id,
    title: t.title,
    category: t.category || "General",
    priority: (t.priority as any) || "NORMAL",
    status: (t.status as any) || "PENDIENTE",
    dueDate: t.dueDate || "",
    assignedTo: t.assignedTo || "",
    notes: t.notes || "",
    completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : null,
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// GET: Cargar tareas reales desde Neon
export async function GET() {
  try {
    const rawTasks = await withRetry(async () => {
      return await (prisma as any).managementTask.findMany({
        orderBy: { createdAt: "desc" },
      });
    });

    const tasks: CeoTask[] = rawTasks.map(mapTask);
    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("GET /api/gerencia/tareas error:", error);
    return NextResponse.json({ error: error.message || "Error al obtener tareas" }, { status: 500 });
  }
}

// POST: Crear una tarea real en Neon
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "El título de la tarea es obligatorio" }, { status: 400 });
    }

    const isCompleted = body.status === "COMPLETADA";

    const created = await withRetry(async () => {
      return await (prisma as any).managementTask.create({
        data: {
          title: body.title.trim(),
          category: body.category?.trim() || "General",
          priority: body.priority || "MEDIA",
          status: body.status || "PENDIENTE",
          dueDate: body.dueDate || null,
          assignedTo: body.assignedTo !== undefined ? body.assignedTo.trim() : null,
          notes: body.notes?.trim() || null,
          completedAt: isCompleted ? new Date() : null,
        },
      });
    });

    const allTasks = await withRetry(async () => {
      return await (prisma as any).managementTask.findMany({
        orderBy: { createdAt: "desc" },
      });
    });

    return NextResponse.json({ success: true, task: mapTask(created), tasks: allTasks.map(mapTask) });
  } catch (error: any) {
    console.error("POST /api/gerencia/tareas error:", error);
    return NextResponse.json({ error: error.message || "Error al crear tarea" }, { status: 500 });
  }
}

// PUT: Actualizar una tarea real en Neon (estado, fecha, notas, etc.)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "ID de tarea requerido" }, { status: 400 });
    }

    const isCompleted = body.status === "COMPLETADA";

    const updated = await withRetry(async () => {
      return await (prisma as any).managementTask.update({
        where: { id: body.id },
        data: {
          title: body.title !== undefined ? body.title.trim() : undefined,
          category: body.category !== undefined ? body.category.trim() : undefined,
          priority: body.priority !== undefined ? body.priority : undefined,
          status: body.status !== undefined ? body.status : undefined,
          dueDate: body.dueDate !== undefined ? body.dueDate : undefined,
          assignedTo: body.assignedTo !== undefined ? body.assignedTo.trim() : undefined,
          notes: body.notes !== undefined ? body.notes.trim() : undefined,
          completedAt: body.status !== undefined ? (isCompleted ? new Date() : null) : undefined,
        },
      });
    });

    const allTasks = await withRetry(async () => {
      return await (prisma as any).managementTask.findMany({
        orderBy: { createdAt: "desc" },
      });
    });

    return NextResponse.json({ success: true, task: mapTask(updated), tasks: allTasks.map(mapTask) });
  } catch (error: any) {
    console.error("PUT /api/gerencia/tareas error:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar tarea" }, { status: 500 });
  }
}

// DELETE: Eliminar una tarea real de Neon
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID de tarea requerido" }, { status: 400 });
    }

    await withRetry(async () => {
      await (prisma as any).managementTask.delete({
        where: { id },
      });
    });

    const allTasks = await withRetry(async () => {
      return await (prisma as any).managementTask.findMany({
        orderBy: { createdAt: "desc" },
      });
    });

    return NextResponse.json({ success: true, tasks: allTasks.map(mapTask) });
  } catch (error: any) {
    console.error("DELETE /api/gerencia/tareas error:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar tarea" }, { status: 500 });
  }
}
