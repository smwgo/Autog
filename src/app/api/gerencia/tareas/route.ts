import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface CeoTask {
  id: string;
  title: string;
  category: "TALLER" | "FINANZAS" | "PROVEEDORES" | "NOMINA" | "VENTAS" | "GENERAL";
  priority: "URGENTE" | "ALTA" | "MEDIA" | "NORMAL";
  status: "PENDIENTE" | "EN_PROCESO" | "COMPLETADA";
  dueDate: string;
  assignedTo: string;
  notes?: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_CEO_TASKS: CeoTask[] = [
  {
    id: "ceo-task-1",
    title: "Arqueo y conciliación de caja del día",
    category: "FINANZAS",
    priority: "URGENTE",
    status: "PENDIENTE",
    dueDate: new Date().toISOString().slice(0, 10),
    assignedTo: "CEO - Dirección",
    notes: "Verificar cuadre de cobros en efectivo, transferencias bancarias y cobros con tarjeta POS antes del cierre.",
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ceo-task-2",
    title: "Supervisión de autos en bahías de taller",
    category: "TALLER",
    priority: "ALTA",
    status: "EN_PROCESO",
    dueDate: new Date().toISOString().slice(0, 10),
    assignedTo: "Jefe de Taller",
    notes: "Revisar tiempos de entrega en órdenes de mantenimiento preventivo y vehículos listos para entrega al cliente.",
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ceo-task-3",
    title: "Autorizar orden de compra de lubricantes y repuestos",
    category: "PROVEEDORES",
    priority: "ALTA",
    status: "PENDIENTE",
    dueDate: new Date().toISOString().slice(0, 10),
    assignedTo: "CEO - Dirección",
    notes: "Aprobar reposición de tambores de aceite 10W-30, 20W-50 y kits de filtros de alta rotación para la semana.",
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ceo-task-4",
    title: "Aprobación de liquidación y comisiones de mecánicos",
    category: "NOMINA",
    priority: "MEDIA",
    status: "PENDIENTE",
    dueDate: new Date().toISOString().slice(0, 10),
    assignedTo: "CEO - Dirección",
    notes: "Validar horas facturadas de mano de obra y porcentaje de bonificación de los técnicos de taller.",
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ceo-task-5",
    title: "Seguimiento a cotizaciones corporativas pendientes",
    category: "VENTAS",
    priority: "MEDIA",
    status: "EN_PROCESO",
    dueDate: new Date().toISOString().slice(0, 10),
    assignedTo: "Asesor de Servicio",
    notes: "Llamar al cliente de flota de camionetas por presupuesto de cambio de suspensión y frenos ($850).",
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ceo-task-6",
    title: "Auditoría preventiva de elevadores y scanner OBD2",
    category: "TALLER",
    priority: "NORMAL",
    status: "COMPLETADA",
    dueDate: new Date().toISOString().slice(0, 10),
    assignedTo: "Mantenimiento Interno",
    notes: "Chequeo de niveles hidráulicos de bahías 1, 2 y 3, y actualización de software de diagnóstico.",
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function getStoredTasks(): Promise<CeoTask[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { id: "ceo_tasks" },
    });
    if (setting?.configJson) {
      const parsed = JSON.parse(setting.configJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading ceo_tasks from prisma:", err);
  }

  // Seed default if empty
  try {
    await prisma.systemSetting.upsert({
      where: { id: "ceo_tasks" },
      update: { configJson: JSON.stringify(DEFAULT_CEO_TASKS) },
      create: { id: "ceo_tasks", configJson: JSON.stringify(DEFAULT_CEO_TASKS) },
    });
  } catch (err) {
    console.error("Error seeding ceo_tasks:", err);
  }

  return DEFAULT_CEO_TASKS;
}

async function saveTasks(tasks: CeoTask[]): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { id: "ceo_tasks" },
    update: { configJson: JSON.stringify(tasks) },
    create: { id: "ceo_tasks", configJson: JSON.stringify(tasks) },
  });
}

// GET: Fetch all CEO tasks
export async function GET() {
  try {
    const tasks = await withRetry(async () => {
      return await getStoredTasks();
    });
    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("GET /api/gerencia/tareas error:", error);
    return NextResponse.json(DEFAULT_CEO_TASKS);
  }
}

// POST: Create a new CEO task
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "El título de la tarea es obligatorio" }, { status: 400 });
    }

    const newTask: CeoTask = {
      id: `ceo-task-${Date.now()}`,
      title: body.title.trim(),
      category: body.category || "GENERAL",
      priority: body.priority || "MEDIA",
      status: body.status || "PENDIENTE",
      dueDate: body.dueDate || new Date().toISOString().slice(0, 10),
      assignedTo: body.assignedTo?.trim() || "CEO - Dirección",
      notes: body.notes?.trim() || "",
      completedAt: body.status === "COMPLETADA" ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedTasks = await withRetry(async () => {
      const current = await getStoredTasks();
      const nextList = [newTask, ...current];
      await saveTasks(nextList);
      return nextList;
    });

    return NextResponse.json({ success: true, task: newTask, tasks: updatedTasks });
  } catch (error: any) {
    console.error("POST /api/gerencia/tareas error:", error);
    return NextResponse.json({ error: error.message || "Error al crear tarea" }, { status: 500 });
  }
}

// PUT: Update an existing CEO task (toggle status, edit details)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "ID de tarea requerido" }, { status: 400 });
    }

    const updatedTasks = await withRetry(async () => {
      const current = await getStoredTasks();
      const index = current.findIndex((t) => t.id === body.id);
      if (index === -1) {
        throw new Error("Tarea no encontrada");
      }

      const existing = current[index];
      const isNowCompleted = body.status === "COMPLETADA";
      const wasCompleted = existing.status === "COMPLETADA";

      const updated: CeoTask = {
        ...existing,
        title: body.title !== undefined ? body.title.trim() : existing.title,
        category: body.category !== undefined ? body.category : existing.category,
        priority: body.priority !== undefined ? body.priority : existing.priority,
        status: body.status !== undefined ? body.status : existing.status,
        dueDate: body.dueDate !== undefined ? body.dueDate : existing.dueDate,
        assignedTo: body.assignedTo !== undefined ? body.assignedTo.trim() : existing.assignedTo,
        notes: body.notes !== undefined ? body.notes.trim() : existing.notes,
        completedAt: isNowCompleted ? (existing.completedAt || new Date().toISOString()) : (wasCompleted ? null : existing.completedAt),
        updatedAt: new Date().toISOString(),
      };

      current[index] = updated;
      await saveTasks(current);
      return current;
    });

    return NextResponse.json({ success: true, tasks: updatedTasks });
  } catch (error: any) {
    console.error("PUT /api/gerencia/tareas error:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar tarea" }, { status: 500 });
  }
}

// DELETE: Delete a task
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID de tarea requerido" }, { status: 400 });
    }

    const updatedTasks = await withRetry(async () => {
      const current = await getStoredTasks();
      const filtered = current.filter((t) => t.id !== id);
      await saveTasks(filtered);
      return filtered;
    });

    return NextResponse.json({ success: true, tasks: updatedTasks });
  } catch (error: any) {
    console.error("DELETE /api/gerencia/tareas error:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar tarea" }, { status: 500 });
  }
}
