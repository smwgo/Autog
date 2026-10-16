import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

async function ensureFinanzasTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FinancialTransaction" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "dateLabel" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'Ventas',
      "reference" TEXT NOT NULL,
      "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "isIncome" BOOLEAN NOT NULL DEFAULT true,
      "method" TEXT NOT NULL DEFAULT 'Efectivo',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function GET() {
  try {
    const transactions = await withRetry(async () => {
      await ensureFinanzasTable();

      const countRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "FinancialTransaction"`);
      if (!countRes[0] || countRes[0].cnt === 0) {
        const seeds = [
          { id: "fin_1", dateLabel: "24 Oct 2026", description: "Pago Orden de Reparación #1042", category: "Ventas", reference: "F-001-042", amount: 450.00, isIncome: true, method: "Tarjeta" },
          { id: "fin_2", dateLabel: "24 Oct 2026", description: "Compra Repuestos Proveedor AutoParts", category: "Compras", reference: "OC-0091", amount: 120.00, isIncome: false, method: "Transferencia" },
          { id: "fin_3", dateLabel: "23 Oct 2026", description: "Venta Mostrador Repuestos", category: "Ventas", reference: "F-001-041", amount: 85.50, isIncome: true, method: "Efectivo" },
          { id: "fin_4", dateLabel: "22 Oct 2026", description: "Pago Servicios Básicos y SRI", category: "Impuestos SRI", reference: "TRF-441", amount: 320.00, isIncome: false, method: "Transferencia" },
          { id: "fin_5", dateLabel: "22 Oct 2026", description: "Pago Orden de Reparación #1040", category: "Ventas", reference: "F-001-040", amount: 1250.00, isIncome: true, method: "Transferencia" },
        ];
        for (const s of seeds) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "FinancialTransaction" ("id", "dateLabel", "description", "category", "reference", "amount", "isIncome", "method", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
             ON CONFLICT ("id") DO NOTHING`,
            s.id, s.dateLabel, s.description, s.category, s.reference, s.amount, s.isIncome, s.method
          );
        }
      }

      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "FinancialTransaction" ORDER BY "createdAt" DESC`);
      return rows;
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener finanzas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await withRetry(async () => {
      await ensureFinanzasTable();
      const id = `fin_${Date.now()}`;
      const isIncome = body.isIncome !== undefined ? Boolean(body.isIncome) : body.category === "Ventas";
      await prisma.$executeRawUnsafe(
        `INSERT INTO "FinancialTransaction" ("id", "dateLabel", "description", "category", "reference", "amount", "isIncome", "method", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        id,
        body.dateLabel || new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }),
        body.description || "Movimiento Financiero",
        body.category || "Ventas",
        body.reference || `REF-${Math.floor(100 + Math.random() * 900)}`,
        Number(body.amount || 0),
        isIncome,
        body.method || "Transferencia"
      );
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "FinancialTransaction" WHERE "id" = $1`, id);
      return rows[0];
    });
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear transacción" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    const updated = await withRetry(async () => {
      await ensureFinanzasTable();
      await prisma.$executeRawUnsafe(
        `UPDATE "FinancialTransaction"
         SET "dateLabel" = COALESCE($2, "dateLabel"),
             "description" = COALESCE($3, "description"),
             "category" = COALESCE($4, "category"),
             "reference" = COALESCE($5, "reference"),
             "amount" = COALESCE($6, "amount"),
             "isIncome" = COALESCE($7, "isIncome"),
             "method" = COALESCE($8, "method"),
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1`,
        id,
        body.dateLabel ?? null,
        body.description ?? null,
        body.category ?? null,
        body.reference ?? null,
        body.amount !== undefined ? Number(body.amount) : null,
        body.isIncome !== undefined ? Boolean(body.isIncome) : null,
        body.method ?? null
      );
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "FinancialTransaction" WHERE "id" = $1`, id);
      return rows[0];
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar transacción" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      await prisma.$executeRawUnsafe(`DELETE FROM "FinancialTransaction" WHERE "id" = $1`, id);
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar transacción" }, { status: 500 });
  }
}
