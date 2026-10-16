import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

async function ensureBranchStockColumn() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stockNorte" INTEGER NOT NULL DEFAULT 10;`);
}

export async function GET() {
  try {
    const products = await withRetry(async () => {
      await ensureBranchStockColumn();

      const countRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "Product"`);
      if (!countRes[0] || countRes[0].cnt === 0) {
        const seeds = [
          { id: "prd_g1", code: "ACE-10W40-1L", name: "Aceite Sintético 10W-40 1L", category: "Lubricantes", price: 12.50, costPrice: 8.50, stock: 45, stockNorte: 30, minStock: 10 },
          { id: "prd_g2", code: "FIL-ACE-001", name: "Filtro de Aceite Universal", category: "Filtros", price: 5.00, costPrice: 2.80, stock: 12, stockNorte: 5, minStock: 10 },
          { id: "prd_g3", code: "PAS-FRE-DEL", name: "Pastillas de Freno Delanteras", category: "Frenos", price: 45.00, costPrice: 28.00, stock: 8, stockNorte: 12, minStock: 5 },
          { id: "prd_g4", code: "BUI-NGK-01", name: "Bujía Iridium NGK", category: "Eléctrico", price: 8.50, costPrice: 5.00, stock: 0, stockNorte: 4, minStock: 6 },
          { id: "prd_g5", code: "BAT-12V-60A", name: "Batería 12V 60Ah", category: "Eléctrico", price: 85.00, costPrice: 60.00, stock: 15, stockNorte: 8, minStock: 4 },
        ];
        for (const p of seeds) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "Product" ("id", "code", "name", "category", "price", "costPrice", "stock", "stockNorte", "minStock", "status", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'En Stock', CURRENT_TIMESTAMP)
             ON CONFLICT ("code") DO NOTHING`,
            p.id, p.code, p.name, p.category, p.price, p.costPrice, p.stock, p.stockNorte, p.minStock
          );
        }
      }

      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Product" ORDER BY "createdAt" DESC`);
      return rows;
    });

    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener inventario global" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    const result = await withRetry(async () => {
      await ensureBranchStockColumn();

      if (action === "transfer") {
        const { productId, fromBranch, quantity } = body;
        const qty = Math.max(1, Number(quantity || 1));
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Product" WHERE "id" = $1`, productId);
        if (!rows[0]) throw new Error("Producto no encontrado");

        const prod = rows[0];
        let s1 = Number(prod.stock || 0);
        let s2 = Number(prod.stockNorte || 0);

        if (fromBranch === "Principal") {
          s1 = Math.max(0, s1 - qty);
          s2 = s2 + qty;
        } else {
          s2 = Math.max(0, s2 - qty);
          s1 = s1 + qty;
        }

        await prisma.$executeRawUnsafe(
          `UPDATE "Product" SET "stock" = $2, "stockNorte" = $3, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
          productId, s1, s2
        );
        const updated: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Product" WHERE "id" = $1`, productId);
        return updated[0];
      }

      const id = `prd_${Date.now()}`;
      const code = body.code || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
      const stock = Number(body.stock ?? 10);
      const stockNorte = Number(body.stockNorte ?? 5);
      const minStock = Number(body.minStock ?? 5);
      const status = (stock <= minStock || stockNorte <= minStock) ? "Stock Bajo" : "En Stock";

      await prisma.$executeRawUnsafe(
        `INSERT INTO "Product" ("id", "code", "name", "category", "price", "costPrice", "stock", "stockNorte", "minStock", "status", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
        id,
        code,
        body.name || "Nuevo Producto",
        body.category || "General",
        Number(body.price || 0),
        Number(body.costPrice || (Number(body.price || 0) * 0.7)),
        stock,
        stockNorte,
        minStock,
        status
      );
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Product" WHERE "id" = $1`, id);
      return rows[0];
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error en inventario" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    const updated = await withRetry(async () => {
      await ensureBranchStockColumn();
      await prisma.$executeRawUnsafe(
        `UPDATE "Product"
         SET "code" = COALESCE($2, "code"),
             "name" = COALESCE($3, "name"),
             "category" = COALESCE($4, "category"),
             "price" = COALESCE($5, "price"),
             "stock" = COALESCE($6, "stock"),
             "stockNorte" = COALESCE($7, "stockNorte"),
             "minStock" = COALESCE($8, "minStock"),
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1`,
        id,
        body.code ?? null,
        body.name ?? null,
        body.category ?? null,
        body.price !== undefined ? Number(body.price) : null,
        body.stock !== undefined ? Number(body.stock) : null,
        body.stockNorte !== undefined ? Number(body.stockNorte) : null,
        body.minStock !== undefined ? Number(body.minStock) : null
      );
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Product" WHERE "id" = $1`, id);
      return rows[0];
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar producto" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      await prisma.$executeRawUnsafe(`DELETE FROM "Product" WHERE "id" = $1`, id);
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar producto" }, { status: 500 });
  }
}
