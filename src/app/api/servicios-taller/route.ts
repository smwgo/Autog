import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Seed inicial con servicios automotrices reales
const INITIAL_SERVICES = [
  {
    code: "SRV-LAV-01",
    name: "Lavado Premium y Chasis",
    category: "Lavado y Estética",
    price: 18.00,
    estimatedMinutes: 45,
    description: "Lavado exterior a presión con espuma activa, desengrase de chasis, aspirado profundo y silicona de llantas.",
    requiresBay: true,
    active: true,
  },
  {
    code: "SRV-LAV-02",
    name: "Lavado de Motor y Vano",
    category: "Lavado y Estética",
    price: 15.00,
    estimatedMinutes: 30,
    description: "Limpieza detallada con desengrasante dieléctrico y secado con aire a presión para proteger componentes electrónicos.",
    requiresBay: false,
    active: true,
  },
  {
    code: "SRV-ACT-01",
    name: "Cambio de Aceite y Filtro (Mano de Obra)",
    category: "Mantenimiento Rápido",
    price: 20.00,
    estimatedMinutes: 35,
    description: "Drenado seguro de aceite usado, cambio de filtro de aceite, purga e inspección de fugas en tapón de cárter.",
    requiresBay: true,
    active: true,
  },
  {
    code: "SRV-ALN-01",
    name: "Alineación 3D y Balanceo Computarizado",
    category: "Suspensión y Dirección",
    price: 35.00,
    estimatedMinutes: 45,
    description: "Calibración con sensores láser computarizados para los 4 ejes y balanceo dinámico de ruedas.",
    requiresBay: true,
    active: true,
  },
  {
    code: "SRV-FRN-01",
    name: "Mantenimiento y Calibración de Frenos",
    category: "Frenos",
    price: 40.00,
    estimatedMinutes: 60,
    description: "Limpieza y lubricación de mordazas, rectificación de discos y purga de líquido de frenos.",
    requiresBay: true,
    active: true,
  },
  {
    code: "SRV-OBD-01",
    name: "Diagnóstico Computarizado Escáner OBD2",
    category: "Diagnóstico",
    price: 25.00,
    estimatedMinutes: 30,
    description: "Lectura profunda de códigos de avería (DTC), test de actuadores y reporte técnico impreso/digital.",
    requiresBay: false,
    active: true,
  },
  {
    code: "SRV-AEC-01",
    name: "Mantenimiento de Aire Acondicionado",
    category: "Climatización",
    price: 45.00,
    estimatedMinutes: 50,
    description: "Vacío del sistema, recarga de gas ecológico R134a/R1234yf y desinfección antibacteriana de ductos.",
    requiresBay: true,
    active: true,
  },
  {
    code: "SRV-REV-01",
    name: "Inspección General de 35 Puntos",
    category: "Mantenimiento Rápido",
    price: 15.00,
    estimatedMinutes: 40,
    description: "Revisión preventiva de niveles de fluidos, tren delantero, luces, batería, neumáticos y amortiguadores.",
    requiresBay: true,
    active: true,
  },
];

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

// GET: Listar servicios con filtro opcional por categoría o búsqueda
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get("categoria");
    const busqueda = searchParams.get("busqueda");
    const soloActivos = searchParams.get("activos") !== "false";

    return await withRetry(async () => {
      const db = await executeDbOperation();

      if (db.type === "prisma") {
        const count = await db.model.count();
        if (count === 0) {
          for (const s of INITIAL_SERVICES) {
            await db.model.create({ data: s });
          }
        }

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
        const categories = categoriesRaw.map((c: any) => c.category);

        return NextResponse.json({
          success: true,
          servicios,
          categories,
          total: servicios.length,
          connectedToNeon: true,
        });
      } else {
        // Fallback SQL directo sobre la tabla "WorkshopService" en Neon
        const countResult: any = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "WorkshopService"');
        const count = countResult?.[0]?.count || 0;

        if (count === 0) {
          for (const s of INITIAL_SERVICES) {
            const id = generateId();
            await prisma.$executeRawUnsafe(
              `INSERT INTO "WorkshopService" ("id", "code", "name", "category", "price", "estimatedMinutes", "description", "requiresBay", "active", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
              id,
              s.code,
              s.name,
              s.category,
              s.price,
              s.estimatedMinutes,
              s.description,
              s.requiresBay,
              s.active
            );
          }
        }

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
        const categories = catRows.map((r: any) => r.category);

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
    console.error("Neon temporalmente no disponible, retornando servicios de respaldo:", error.message);
    
    // Retornar lista de servicios con flag de reconexión para que la app no colapse
    let fallbackServices = INITIAL_SERVICES.map((s, idx) => ({
      ...s,
      id: `srv_init_${idx + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    if (request.url.includes("categoria=") && !request.url.includes("categoria=TODAS")) {
      const url = new URL(request.url);
      const cat = url.searchParams.get("categoria");
      fallbackServices = fallbackServices.filter((s) => s.category === cat);
    }

    const categories = Array.from(new Set(INITIAL_SERVICES.map((s) => s.category)));

    return NextResponse.json({
      success: true,
      servicios: fallbackServices,
      categories,
      total: fallbackServices.length,
      connectedToNeon: false,
      warning: "Neon DB se está iniciando (cold-start). Mostrando catálogo en modo seguro.",
    });
  }
}

// POST: Crear un nuevo servicio
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
          category: category?.trim() || "Mantenimiento Rápido",
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
        message: "Servicio registrado exitosamente.",
      });
    } else {
      const id = generateId();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopService" ("id", "code", "name", "category", "price", "estimatedMinutes", "description", "requiresBay", "active", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        id,
        generatedCode,
        name.trim(),
        category?.trim() || "Mantenimiento Rápido",
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
        message: "Servicio registrado exitosamente.",
      });
    }
  } catch (error: any) {
    console.error("Error al crear servicio:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear servicio." },
      { status: 500 }
    );
  }
}

// PUT: Actualizar un servicio
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
        message: "Servicio actualizado correctamente.",
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
        message: "Servicio actualizado correctamente.",
      });
    }
  } catch (error: any) {
    console.error("Error al actualizar servicio:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar servicio." },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un servicio por ID
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
      message: "Servicio eliminado exitosamente.",
    });
  } catch (error: any) {
    console.error("Error al eliminar servicio:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar servicio." },
      { status: 500 }
    );
  }
}
