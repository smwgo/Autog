import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET: Buscar productos/repuestos en el catálogo para el autocompletado del presupuesto.
 * POST: Crear repuesto/producto nuevo al vuelo si no existe en el catálogo.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";

    return await withRetry(async () => {
      let query = `SELECT "id", "code", "name", "price", "costPrice", "stock", "category" FROM "Product" WHERE 1=1`;
      const params: any[] = [];

      if (q) {
        query += ` AND (LOWER("name") LIKE $1 OR LOWER("code") LIKE $1 OR LOWER("category") LIKE $1)`;
        params.push(`%${q}%`);
      }

      query += ` ORDER BY "name" ASC LIMIT 30`;

      const rows = ((await prisma.$queryRawUnsafe(query, ...params).catch(() => [])) as any[]) || [];
      return NextResponse.json({ success: true, productos: rows });
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, price, costPrice = 0, category = "Repuestos", stock = 1 } = body;

    if (!name || Number(price) <= 0) {
      return NextResponse.json(
        { success: false, error: "Nombre del producto y precio de venta son requeridos." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      const generatedCode = code?.trim() || `REP-${Date.now().toString().slice(-6)}`;
      const prodId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "Product" ("id", "code", "name", "price", "costPrice", "stock", "category", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'En Stock', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT ("code") DO UPDATE SET "price" = $4, "costPrice" = $5, "updatedAt" = CURRENT_TIMESTAMP`,
        prodId,
        generatedCode,
        name.trim(),
        Number(price),
        Number(costPrice || 0),
        Number(stock || 1),
        category
      );

      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id", "code", "name", "price", "costPrice", "stock", "category" FROM "Product" WHERE "code" = $1 LIMIT 1`,
        generatedCode
      );

      return NextResponse.json({
        success: true,
        message: "Producto/repuesto registrado con éxito en el catálogo.",
        producto: rows[0],
      });
    });
  } catch (error: any) {
    console.error("Error al registrar producto rápido:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear producto." },
      { status: 500 }
    );
  }
}
