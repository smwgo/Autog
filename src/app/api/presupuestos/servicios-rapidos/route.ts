import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET: Buscar servicios técnicos para autocompletado en presupuestos.
 * POST: Crear nuevo servicio de taller al vuelo.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";

    return await withRetry(async () => {
      let query = `SELECT "id", "code", "name", "price", "category", "estimatedMinutes" FROM "WorkshopService" WHERE "active" = true`;
      const params: any[] = [];

      if (q) {
        query += ` AND (LOWER("name") LIKE $1 OR LOWER("code") LIKE $1 OR LOWER("category") LIKE $1)`;
        params.push(`%${q}%`);
      }

      query += ` ORDER BY "name" ASC LIMIT 30`;

      const rows: any[] = await prisma.$queryRawUnsafe(query, ...params).catch(() => []);
      return NextResponse.json({ success: true, servicios: rows });
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, price, category = "Mano de Obra", estimatedMinutes = 30 } = body;

    if (!name || Number(price) <= 0) {
      return NextResponse.json(
        { success: false, error: "Nombre del servicio y precio son requeridos." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      const generatedCode = code?.trim() || `SRV-${Date.now().toString().slice(-6)}`;
      const srvId = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopService" ("id", "code", "name", "price", "category", "estimatedMinutes", "active", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT ("code") DO UPDATE SET "price" = $4, "name" = $3, "updatedAt" = CURRENT_TIMESTAMP`,
        srvId,
        generatedCode,
        name.trim(),
        Number(price),
        category,
        Number(estimatedMinutes || 30)
      );

      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id", "code", "name", "price", "category", "estimatedMinutes" FROM "WorkshopService" WHERE "code" = $1 LIMIT 1`,
        generatedCode
      );

      return NextResponse.json({
        success: true,
        message: "Servicio registrado con éxito.",
        servicio: rows[0],
      });
    });
  } catch (error: any) {
    console.error("Error al registrar servicio rápido:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear servicio." },
      { status: 500 }
    );
  }
}
