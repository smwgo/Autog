import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET: Obtener catálogo de proveedores activos con teléfono para WhatsApp.
 * POST: Registrar proveedor nuevo de forma rápida.
 */
export async function GET() {
  try {
    return await withRetry(async () => {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id", "name", "contact", "phone", "email", "categories" 
         FROM "Supplier" 
         WHERE "status" = 'Activo' 
         ORDER BY "name" ASC`
      ).catch(() => []);

      return NextResponse.json({ success: true, proveedores: rows });
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, contact = "Ventas", email, categories = "Repuestos" } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nombre del proveedor requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      const supId = `sup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const randomRuc = `099${Math.floor(1000000 + Math.random() * 9000000)}001`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "Supplier" ("id", "ruc", "name", "contact", "phone", "email", "categories", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        supId,
        randomRuc,
        name.trim(),
        contact.trim(),
        phone?.trim() || null,
        email?.trim() || null,
        JSON.stringify([categories])
      );

      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id", "name", "contact", "phone", "email" FROM "Supplier" WHERE "id" = $1 LIMIT 1`,
        supId
      );

      return NextResponse.json({
        success: true,
        message: "Proveedor registrado con éxito.",
        proveedor: rows[0],
      });
    });
  } catch (error: any) {
    console.error("Error al registrar proveedor rápido:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear proveedor." },
      { status: 500 }
    );
  }
}
