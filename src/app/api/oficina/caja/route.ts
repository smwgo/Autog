import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

async function ensureCajaTables() {
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
    const data = await withRetry(async () => {
      await ensureCajaTables();

      let activeRegister = await prisma.cashRegister.findFirst({
        where: { status: "ABIERTA" },
        orderBy: { openedAt: "desc" },
      });

      if (!activeRegister) {
        activeRegister = await prisma.cashRegister.findFirst({
          orderBy: { openedAt: "desc" },
        });
      }

      if (!activeRegister) {
        activeRegister = await prisma.cashRegister.create({
          data: {
            sessionNumber: `CAJ-${Math.floor(1000 + Math.random() * 9000)}`,
            status: "ABIERTA",
            initialCash: 100.00,
            notes: "Apertura de turno por Ana Torres",
          }
        });
      }

      const txCount: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "FinancialTransaction"`);
      if (!txCount[0] || txCount[0].cnt === 0) {
        const seeds = [
          { id: "ft_1", dateLabel: "10:45 AM", description: "Cobro Factura F-001-1042", category: "Ventas", reference: "Voucher #4592", amount: 350.00, isIncome: true, method: "Tarjeta Crédito (POS)" },
          { id: "ft_2", dateLabel: "09:30 AM", description: "Cobro Factura F-001-1041", category: "Ventas", reference: "Comprobante #990123", amount: 1250.00, isIncome: true, method: "Transferencia Banco Pichincha" },
          { id: "ft_3", dateLabel: "09:15 AM", description: "Pago proveedor de agua (Botellones)", category: "Operativos", reference: "Vale de Caja #12", amount: 15.00, isIncome: false, method: "Efectivo" },
          { id: "ft_4", dateLabel: "08:30 AM", description: "Venta Mostrador (Filtros)", category: "Ventas", reference: "F-001-1040", amount: 45.50, isIncome: true, method: "Efectivo" },
          { id: "ft_5", dateLabel: "08:00 AM", description: "Fondo de Apertura (Caja Chica)", category: "Apertura", reference: "Apertura Turno", amount: 100.00, isIncome: true, method: "Efectivo" },
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

      const transactions: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "FinancialTransaction" ORDER BY "createdAt" DESC`);
      return { register: activeRegister, transactions };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al cargar caja" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body; // "movement" | "toggle_register"

    const result = await withRetry(async () => {
      await ensureCajaTables();

      if (action === "toggle_register") {
        const current = await prisma.cashRegister.findFirst({ orderBy: { openedAt: "desc" } });
        if (current && current.status === "ABIERTA") {
          const closed = await prisma.cashRegister.update({
            where: { id: current.id },
            data: {
              status: "CERRADA",
              closedAt: new Date(),
              declaredCash: body.declaredCash ? Number(body.declaredCash) : 485.50,
              notes: body.notes || "Cierre y cuadre realizado desde Oficina",
            }
          });
          return { register: closed };
        } else {
          const opened = await prisma.cashRegister.create({
            data: {
              sessionNumber: `CAJ-${Math.floor(1000 + Math.random() * 9000)}`,
              status: "ABIERTA",
              initialCash: Number(body.initialCash || 100),
              notes: body.notes || "Apertura de turno desde Oficina",
            }
          });
          return { register: opened };
        }
      }

      const id = `ft_${Date.now()}`;
      const nowTime = new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
      const isIncome = body.type !== "EGRESO";
      const amount = Number(body.amount || 0);

      await prisma.$executeRawUnsafe(
        `INSERT INTO "FinancialTransaction" ("id", "dateLabel", "description", "category", "reference", "amount", "isIncome", "method", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        id,
        body.dateLabel || nowTime,
        body.description || "Movimiento Manual",
        body.category || (isIncome ? "Ventas" : "Operativos"),
        body.reference || `MOV-${Math.floor(100 + Math.random() * 900)}`,
        amount,
        isIncome,
        body.method || "Efectivo"
      );

      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "FinancialTransaction" WHERE "id" = $1`, id);
      return { transaction: rows[0] };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al registrar en caja" }, { status: 500 });
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
    return NextResponse.json({ error: error.message || "Error al eliminar movimiento" }, { status: 500 });
  }
}
