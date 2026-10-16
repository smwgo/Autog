import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const INITIAL_CREDITS = [
  {
    id: "cred-1",
    customerName: "Flota Taxis El Sol S.A.",
    identification: "1792345678001",
    phone: "0991234567",
    creditLimit: 1500,
    currentBalance: 650.0,
    dueDate: "2026-11-15",
    status: "AL_DIA",
    lastPaymentDate: "2026-10-10",
    lastPaymentAmount: 300,
    notes: "Cuenta corporativa flota de taxis",
  },
  {
    id: "cred-2",
    customerName: "Carlos Méndez (Taller Aliado)",
    identification: "1718293041",
    phone: "0987654321",
    creditLimit: 800,
    currentBalance: 780.0,
    dueDate: "2026-10-18",
    status: "POR_VENCER",
    lastPaymentDate: "2026-09-25",
    lastPaymentAmount: 150,
    notes: "Descuento aliado en repuestos",
  },
  {
    id: "cred-3",
    customerName: "Transportes Andinos Cía. Ltda.",
    identification: "1790011223001",
    phone: "0998877665",
    creditLimit: 3000,
    currentBalance: 1200.0,
    dueDate: "2026-09-30",
    status: "VENCIDO",
    lastPaymentDate: "2026-08-20",
    lastPaymentAmount: 500,
    notes: "Contactar departamento contable",
  },
  {
    id: "cred-4",
    customerName: "María Belén Andrade",
    identification: "1723456789",
    phone: "0981122334",
    creditLimit: 400,
    currentBalance: 95.0,
    dueDate: "2026-11-05",
    status: "AL_DIA",
    lastPaymentDate: "2026-10-01",
    lastPaymentAmount: 100,
    notes: "Cliente frecuente mostrador",
  },
];

let isTableEnsured = false;

async function ensureCreditsTable() {
  if (isTableEnsured) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PosCreditAccount" (
        "id" TEXT NOT NULL,
        "customerName" TEXT NOT NULL,
        "identification" TEXT NOT NULL,
        "phone" TEXT NOT NULL DEFAULT 'N/A',
        "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 500,
        "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "dueDate" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'AL_DIA',
        "lastPaymentDate" TEXT,
        "lastPaymentAmount" DECIMAL(12,2),
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PosCreditAccount_pkey" PRIMARY KEY ("id")
      );
    `);
    isTableEnsured = true;
  } catch (err) {
    console.warn("ensureCreditsTable warning:", err);
  }
}

function mapCreditRow(r: any) {
  return {
    id: r.id,
    customerName: r.customerName,
    identification: r.identification,
    phone: r.phone || "N/A",
    creditLimit: Number(r.creditLimit ?? 0),
    currentBalance: Number(r.currentBalance ?? 0),
    dueDate: r.dueDate || "2026-12-31",
    status: (r.status || "AL_DIA") as "AL_DIA" | "POR_VENCER" | "VENCIDO",
    lastPaymentDate: r.lastPaymentDate || undefined,
    lastPaymentAmount: r.lastPaymentAmount !== null && r.lastPaymentAmount !== undefined ? Number(r.lastPaymentAmount) : undefined,
    notes: r.notes || "",
    createdAt: r.createdAt,
  };
}

export async function GET() {
  try {
    await ensureCreditsTable();
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "PosCreditAccount" ORDER BY "createdAt" DESC`
    );
    const creditos = rows.map(mapCreditRow);

    return NextResponse.json(
      { success: true, creditos },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error("Error GET /api/pos/creditos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar créditos en Neon DB" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      customerName,
      identification,
      phone = "N/A",
      creditLimit = 500,
      currentBalance = 0,
      dueDate = "2026-12-31",
      status = "AL_DIA",
      notes = "",
    } = body;

    if (!customerName || !identification) {
      return NextResponse.json(
        { success: false, error: "Nombre del cliente y RUC/Cédula son obligatorios" },
        { status: 400 }
      );
    }

    const id = `cred-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const created = await withRetry(async () => {
      await ensureCreditsTable();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "PosCreditAccount" ("id", "customerName", "identification", "phone", "creditLimit", "currentBalance", "dueDate", "status", "notes", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        id,
        String(customerName).trim(),
        String(identification).trim(),
        String(phone || "N/A").trim(),
        Number(creditLimit) || 500,
        Number(currentBalance) || 0,
        String(dueDate),
        String(status || "AL_DIA"),
        String(notes || "")
      );

      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "PosCreditAccount" WHERE "id" = $1 LIMIT 1`,
        id
      );
      return mapCreditRow(rows[0]);
    });

    return NextResponse.json({ success: true, credito: created });
  } catch (error: any) {
    console.error("Error POST /api/pos/creditos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear línea de crédito en Neon DB" },
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
        { success: false, error: "ID de cuenta de crédito requerido" },
        { status: 400 }
      );
    }

    const updated = await withRetry(async () => {
      await ensureCreditsTable();
      const existingRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "PosCreditAccount" WHERE "id" = $1 LIMIT 1`,
        id
      );

      if (existingRows.length === 0) {
        throw new Error("Cuenta de crédito no encontrada en Neon DB");
      }

      const curr = existingRows[0];

      // Si viene un abono (paymentAmount)
      if (body.paymentAmount !== undefined && Number(body.paymentAmount) > 0) {
        const abono = Number(body.paymentAmount);
        const prevBalance = Number(curr.currentBalance || 0);
        const nextBalance = Math.max(0, prevBalance - abono);
        const nextStatus = nextBalance === 0 ? "AL_DIA" : body.status || curr.status;
        const today = new Date().toISOString().split("T")[0];
        const nextNotes = body.paymentNote
          ? `${curr.notes ? curr.notes + " | " : ""}Abono $${abono.toFixed(2)} (${body.paymentMethod || "Efectivo"}): ${body.paymentNote}`
          : curr.notes;

        await prisma.$executeRawUnsafe(
          `UPDATE "PosCreditAccount"
           SET "currentBalance" = $1, "status" = $2, "lastPaymentDate" = $3,
               "lastPaymentAmount" = $4, "notes" = $5, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $6`,
          nextBalance,
          nextStatus,
          today,
          abono,
          nextNotes,
          curr.id
        );
      } else {
        // Edición general de la cuenta de crédito
        const nextName =
          body.customerName !== undefined ? String(body.customerName).trim() : curr.customerName;
        const nextIdent =
          body.identification !== undefined
            ? String(body.identification).trim()
            : curr.identification;
        const nextPhone = body.phone !== undefined ? String(body.phone).trim() : curr.phone;
        const nextLimit =
          body.creditLimit !== undefined ? Number(body.creditLimit) : Number(curr.creditLimit);
        const nextBalance =
          body.currentBalance !== undefined
            ? Number(body.currentBalance)
            : Number(curr.currentBalance);
        const nextDue = body.dueDate !== undefined ? String(body.dueDate) : curr.dueDate;
        const nextStatus = body.status !== undefined ? String(body.status) : curr.status;
        const nextNotes = body.notes !== undefined ? String(body.notes) : curr.notes;

        await prisma.$executeRawUnsafe(
          `UPDATE "PosCreditAccount"
           SET "customerName" = $1, "identification" = $2, "phone" = $3,
               "creditLimit" = $4, "currentBalance" = $5, "dueDate" = $6,
               "status" = $7, "notes" = $8, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $9`,
          nextName,
          nextIdent,
          nextPhone,
          nextLimit,
          nextBalance,
          nextDue,
          nextStatus,
          nextNotes,
          curr.id
        );
      }

      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "PosCreditAccount" WHERE "id" = $1 LIMIT 1`,
        curr.id
      );
      return mapCreditRow(rows[0]);
    });

    return NextResponse.json({ success: true, credito: updated });
  } catch (error: any) {
    console.error("Error PUT /api/pos/creditos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar cuenta de crédito en Neon DB" },
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
        { success: false, error: "ID de crédito requerido" },
        { status: 400 }
      );
    }

    await ensureCreditsTable();
    const count = await prisma.$executeRawUnsafe(
      `DELETE FROM "PosCreditAccount" WHERE "id" = $1`,
      id
    );

    return NextResponse.json({ success: true, deletedId: id, count });
  } catch (error: any) {
    console.error("Error DELETE /api/pos/creditos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar crédito de Neon DB" },
      { status: 500 }
    );
  }
}
