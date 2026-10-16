import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const INITIAL_PROMOTIONS = [
  {
    id: "promo-1",
    code: "CAMBIO-ACEITE20",
    title: "20% en Cambio de Aceite y Filtro",
    discountType: "PERCENT",
    discountValue: 20,
    minPurchase: 35,
    category: "Servicios",
    validUntil: "2026-12-31",
    active: true,
    usesCount: 42,
  },
  {
    id: "promo-2",
    code: "FRENOS15",
    title: "$15 de Descuento en Pastillas de Freno",
    discountType: "FIXED",
    discountValue: 15,
    minPurchase: 60,
    category: "Repuestos",
    validUntil: "2026-11-30",
    active: true,
    usesCount: 18,
  },
  {
    id: "promo-3",
    code: "LLANTAS-COMBO",
    title: "Alineación Gratis por Compra de 2 Llantas",
    discountType: "FIXED",
    discountValue: 25,
    minPurchase: 120,
    category: "Llantas",
    validUntil: "2026-12-15",
    active: true,
    usesCount: 9,
  },
  {
    id: "promo-4",
    code: "BIENVENIDA10",
    title: "10% en tu primera compra en mostrador",
    discountType: "PERCENT",
    discountValue: 10,
    minPurchase: 20,
    category: "General",
    validUntil: "2026-10-31",
    active: false,
    usesCount: 65,
  },
];

async function ensurePromotionsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PosPromotion" (
      "id" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "discountType" TEXT NOT NULL DEFAULT 'PERCENT',
      "discountValue" DECIMAL(12,2) NOT NULL DEFAULT 10,
      "minPurchase" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "category" TEXT NOT NULL DEFAULT 'General',
      "validUntil" TEXT NOT NULL,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "usesCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PosPromotion_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "PosPromotion_code_key" ON "PosPromotion"("code");`
  );

  const countRes: any[] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int as cnt FROM "PosPromotion"`
  );
  const count = countRes[0]?.cnt ?? 0;

  if (count === 0) {
    for (const p of INITIAL_PROMOTIONS) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "PosPromotion" ("id", "code", "title", "discountType", "discountValue", "minPurchase", "category", "validUntil", "active", "usesCount", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT ("code") DO NOTHING`,
        p.id,
        p.code,
        p.title,
        p.discountType,
        p.discountValue,
        p.minPurchase,
        p.category,
        p.validUntil,
        p.active,
        p.usesCount
      );
    }
  }
}

function mapRow(r: any) {
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    discountType: r.discountType === "FIXED" ? "FIXED" : "PERCENT",
    discountValue: Number(r.discountValue ?? 0),
    minPurchase: Number(r.minPurchase ?? 0),
    category: r.category || "General",
    validUntil: r.validUntil || "2026-12-31",
    active: Boolean(r.active),
    usesCount: Number(r.usesCount ?? 0),
    createdAt: r.createdAt,
  };
}

export async function GET() {
  try {
    const promociones = await withRetry(async () => {
      await ensurePromotionsTable();
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "PosPromotion" ORDER BY "createdAt" DESC`
      );
      return rows.map(mapRow);
    });

    return NextResponse.json({ success: true, promociones });
  } catch (error: any) {
    console.error("Error GET /api/pos/promociones:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar promociones en Neon DB" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      code,
      title,
      discountType = "PERCENT",
      discountValue = 10,
      minPurchase = 0,
      category = "General",
      validUntil = "2026-12-31",
      active = true,
    } = body;

    if (!code || !title) {
      return NextResponse.json(
        { success: false, error: "Código y título son obligatorios" },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();
    const id = `promo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const created = await withRetry(async () => {
      await ensurePromotionsTable();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "PosPromotion" ("id", "code", "title", "discountType", "discountValue", "minPurchase", "category", "validUntil", "active", "usesCount", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        id,
        cleanCode,
        String(title).trim(),
        discountType === "FIXED" ? "FIXED" : "PERCENT",
        Number(discountValue) || 0,
        Number(minPurchase) || 0,
        String(category || "General").trim(),
        String(validUntil || "2026-12-31"),
        Boolean(active)
      );

      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "PosPromotion" WHERE "id" = $1 LIMIT 1`,
        id
      );
      return mapRow(rows[0]);
    });

    return NextResponse.json({ success: true, promocion: created });
  } catch (error: any) {
    console.error("Error POST /api/pos/promociones:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear promoción en Neon DB" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de promoción requerido" },
        { status: 400 }
      );
    }

    const updated = await withRetry(async () => {
      await ensurePromotionsTable();
      const existingRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "PosPromotion" WHERE "id" = $1 OR "code" = $1 LIMIT 1`,
        id
      );

      if (existingRows.length === 0) {
        throw new Error("Promoción no encontrada en Neon DB");
      }

      const curr = existingRows[0];
      const nextCode = body.code ? String(body.code).trim().toUpperCase() : curr.code;
      const nextTitle = body.title !== undefined ? String(body.title).trim() : curr.title;
      const nextType = body.discountType !== undefined ? body.discountType : curr.discountType;
      const nextVal =
        body.discountValue !== undefined ? Number(body.discountValue) : Number(curr.discountValue);
      const nextMin =
        body.minPurchase !== undefined ? Number(body.minPurchase) : Number(curr.minPurchase);
      const nextCat = body.category !== undefined ? String(body.category).trim() : curr.category;
      const nextValid = body.validUntil !== undefined ? String(body.validUntil) : curr.validUntil;
      const nextActive = body.active !== undefined ? Boolean(body.active) : Boolean(curr.active);
      const nextUses =
        body.incrementUse === true
          ? Number(curr.usesCount || 0) + 1
          : body.usesCount !== undefined
          ? Number(body.usesCount)
          : Number(curr.usesCount || 0);

      await prisma.$executeRawUnsafe(
        `UPDATE "PosPromotion"
         SET "code" = $1, "title" = $2, "discountType" = $3, "discountValue" = $4,
             "minPurchase" = $5, "category" = $6, "validUntil" = $7, "active" = $8,
             "usesCount" = $9, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $10`,
        nextCode,
        nextTitle,
        nextType,
        nextVal,
        nextMin,
        nextCat,
        nextValid,
        nextActive,
        nextUses,
        curr.id
      );

      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "PosPromotion" WHERE "id" = $1 LIMIT 1`,
        curr.id
      );
      return mapRow(rows[0]);
    });

    return NextResponse.json({ success: true, promocion: updated });
  } catch (error: any) {
    console.error("Error PUT /api/pos/promociones:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar promoción en Neon DB" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de promoción requerido" },
        { status: 400 }
      );
    }

    await withRetry(async () => {
      await ensurePromotionsTable();
      await prisma.$executeRawUnsafe(
        `DELETE FROM "PosPromotion" WHERE "id" = $1 OR "code" = $1`,
        id
      );
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("Error DELETE /api/pos/promociones:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar promoción de Neon DB" },
      { status: 500 }
    );
  }
}
