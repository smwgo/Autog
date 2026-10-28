import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function generateId(): string {
  return "srv_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// Helper con reintentos para soportar cold-starts / suspensión automática de Neon
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 600): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || String(err);
      console.warn(`[Neon DB Retry] Intento ${attempt}/${maxRetries} falló (${msg}). Reintentando...`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

// Helper para operaciones seguras en Neon (usa prisma model si existe o SQL directo si no)
async function executeDbOperation() {
  const ws = (prisma as any).workshopService;

  if (ws && typeof ws.findMany === "function") {
    return {
      type: "prisma",
      model: ws,
    };
  }

  return {
    type: "raw",
  };
}

// GET: Listar servicios REALES directamente desde Neon
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get("categoria");
    const busqueda = searchParams.get("busqueda");
    const soloActivos = searchParams.get("activos") !== "false";

    return await withRetry(async () => {
      const db = await executeDbOperation();

      if (db.type === "prisma") {
        const where: any = {};
        if (soloActivos) where.active = true;
        if (categoria && categoria !== "TODAS") where.category = categoria;
        if (busqueda) {
          where.OR = [
            { name: { contains: busqueda, mode: "insensitive" } },
            { code: { contains: busqueda, mode: "insensitive" } },
            { description: { contains: busqueda, mode: "insensitive" } },
          ];
        }

        const servicios = await db.model.findMany({
          where,
          orderBy: [{ category: "asc" }, { name: "asc" }],
        });

        const categoriesRaw = await db.model.findMany({
          select: { category: true },
          distinct: ["category"],
        });
        const categories = Array.from(new Set(categoriesRaw.map((c: any) => c.category).filter(Boolean)));

        return NextResponse.json({
          success: true,
          servicios,
          categories,
          total: servicios.length,
          connectedToNeon: true,
        });
      } else {
        let query = 'SELECT * FROM "WorkshopService" WHERE 1=1';
        const params: any[] = [];
        let pIdx = 1;

        if (soloActivos) {
          query += ` AND "active" = true`;
        }
        if (categoria && categoria !== "TODAS") {
          query += ` AND "category" = $${pIdx++}`;
          params.push(categoria);
        }
        if (busqueda) {
          query += ` AND ("name" ILIKE $${pIdx} OR "code" ILIKE $${pIdx} OR "description" ILIKE $${pIdx})`;
          params.push(`%${busqueda}%`);
          pIdx++;
        }

        query += ' ORDER BY "category" ASC, "name" ASC';

        const servicios: any = await prisma.$queryRawUnsafe(query, ...params);

        const catRows: any = await prisma.$queryRawUnsafe('SELECT DISTINCT "category" FROM "WorkshopService" ORDER BY "category" ASC');
        const categories = Array.from(new Set(catRows.map((r: any) => r.category).filter(Boolean)));

        return NextResponse.json({
          success: true,
          servicios,
          categories,
          total: servicios.length,
          connectedToNeon: true,
        });
      }
    });
  } catch (error: any) {
    console.error("Error al consultar Neon DB:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: "Error al conectar con la base de datos Neon: " + error.message,
        servicios: [],
        categories: [],
        total: 0,
        connectedToNeon: false,
      },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo servicio REAL en Neon
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, category, price, estimatedMinutes, description, requiresBay, active } = body;

    if (!name || price === undefined || price === null || price === "") {
      return NextResponse.json(
        { success: false, error: "Nombre y Precio son requeridos." },
        { status: 400 }
      );
    }

    const generatedCode =
      code?.trim().toUpperCase() ||
      `SRV-${Math.floor(1000 + Math.random() * 9000)}`;

    const db = await executeDbOperation();

    if (db.type === "prisma") {
      const nuevoServicio = await db.model.create({
        data: {
          code: generatedCode,
          name: name.trim(),
          category: category?.trim() || "General",
          price: parseFloat(price),
          estimatedMinutes: parseInt(estimatedMinutes) || 30,
          description: description?.trim() || null,
          requiresBay: requiresBay !== false,
          active: active !== false,
        },
      });

      return NextResponse.json({
        success: true,
        servicio: nuevoServicio,
        message: "Servicio registrado exitosamente en Neon.",
      });
    } else {
      const id = generateId();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopService" ("id", "code", "name", "category", "price", "estimatedMinutes", "description", "requiresBay", "active", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        id,
        generatedCode,
        name.trim(),
        category?.trim() || "General",
        parseFloat(price),
        parseInt(estimatedMinutes) || 30,
        description?.trim() || null,
        requiresBay !== false,
        active !== false
      );

      const rows: any = await prisma.$queryRawUnsafe('SELECT * FROM "WorkshopService" WHERE id = $1', id);

      return NextResponse.json({
        success: true,
        servicio: rows?.[0],
        message: "Servicio registrado exitosamente en Neon.",
      });
    }
  } catch (error: any) {
    console.error("Error al crear servicio en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear servicio en Neon." },
      { status: 500 }
    );
  }
}

// PUT: Actualizar un servicio REAL en Neon
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category, price, estimatedMinutes, description, requiresBay, active, code } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID del servicio es requerido." },
        { status: 400 }
      );
    }

    const db = await executeDbOperation();

    if (db.type === "prisma") {
      const dataToUpdate: any = {};
      if (code !== undefined) dataToUpdate.code = code.trim().toUpperCase();
      if (name !== undefined) dataToUpdate.name = name.trim();
      if (category !== undefined) dataToUpdate.category = category.trim();
      if (price !== undefined) dataToUpdate.price = parseFloat(price);
      if (estimatedMinutes !== undefined) dataToUpdate.estimatedMinutes = parseInt(estimatedMinutes);
      if (description !== undefined) dataToUpdate.description = description?.trim() || null;
      if (requiresBay !== undefined) dataToUpdate.requiresBay = Boolean(requiresBay);
      if (active !== undefined) dataToUpdate.active = Boolean(active);

      const servicioActualizado = await db.model.update({
        where: { id },
        data: dataToUpdate,
      });

      return NextResponse.json({
        success: true,
        servicio: servicioActualizado,
        message: "Servicio actualizado correctamente en Neon.",
      });
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopService"
         SET "code" = COALESCE($2, "code"),
             "name" = COALESCE($3, "name"),
             "category" = COALESCE($4, "category"),
             "price" = COALESCE($5, "price"),
             "estimatedMinutes" = COALESCE($6, "estimatedMinutes"),
             "description" = $7,
             "requiresBay" = COALESCE($8, "requiresBay"),
             "active" = COALESCE($9, "active"),
             "updatedAt" = NOW()
         WHERE id = $1`,
        id,
        code ? code.trim().toUpperCase() : null,
        name ? name.trim() : null,
        category ? category.trim() : null,
        price !== undefined ? parseFloat(price) : null,
        estimatedMinutes !== undefined ? parseInt(estimatedMinutes) : null,
        description !== undefined ? description?.trim() : null,
        requiresBay !== undefined ? Boolean(requiresBay) : null,
        active !== undefined ? Boolean(active) : null
      );

      const rows: any = await prisma.$queryRawUnsafe('SELECT * FROM "WorkshopService" WHERE id = $1', id);

      return NextResponse.json({
        success: true,
        servicio: rows?.[0],
        message: "Servicio actualizado correctamente en Neon.",
      });
    }
  } catch (error: any) {
    console.error("Error al actualizar servicio en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar servicio en Neon." },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un servicio REAL en Neon
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID del servicio es requerido." },
        { status: 400 }
      );
    }

    const db = await executeDbOperation();

    if (db.type === "prisma") {
      await db.model.delete({
        where: { id },
      });
    } else {
      await prisma.$executeRawUnsafe('DELETE FROM "WorkshopService" WHERE id = $1', id);
    }

    return NextResponse.json({
      success: true,
      message: "Servicio eliminado exitosamente de Neon.",
    });
  } catch (error: any) {
    console.error("Error al eliminar servicio en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar servicio en Neon." },
      { status: 500 }
    );
  }
}
