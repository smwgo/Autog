import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

let isTableEnsured = false;

async function ensureCreditsTable() {
  if (isTableEnsured) return;
  if (process.env.NODE_ENV === "production" && process.env.RUN_RUNTIME_DDL !== "true") {
    isTableEnsured = true;
    return;
  }

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
        "branch" TEXT DEFAULT 'PRINCIPAL',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PosCreditAccount_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "PosCreditAccount" ADD COLUMN IF NOT EXISTS "branch" TEXT DEFAULT 'PRINCIPAL'`).catch(() => {});
    isTableEnsured = true;
  } catch (err) {
    console.warn("ensureCreditsTable warning:", err);
  }
}

function mapCreditRow(r: any) {
  const b = (r.branch || "PRINCIPAL").toUpperCase();
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
    branch: b === "SUCURSAL" ? "Sucursal" : "Principal",
    _branchUpper: b,
    createdAt: r.createdAt,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sedeParam = (searchParams.get("sede") || "").toUpperCase();
    const userBranchParam = (searchParams.get("userBranch") || "").toUpperCase();
    const isSucursal = userBranchParam === "SUCURSAL" || sedeParam === "SUCURSAL";
    const isAmbos = !isSucursal && (sedeParam === "AMBOS" || sedeParam === "AMBAS");

    await ensureCreditsTable();

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "PosCreditAccount" ORDER BY "createdAt" DESC`
    );
    const allCredits = rows.map(mapCreditRow);
    const creditos = allCredits.filter((c: any) => {
      if (isSucursal) return c._branchUpper === "SUCURSAL";
      if (isAmbos) return true;
      return c._branchUpper !== "SUCURSAL";
    });

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
      { success: false, error: error.message || "Error al consultar créditos en base de datos" },
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
      branch,
      sede,
    } = body;

    const credBranch = (branch || sede || "").toString().toUpperCase().includes("SUCURSAL")
      ? "SUCURSAL"
      : "PRINCIPAL";

    if (!customerName || !identification) {
      return NextResponse.json(
        { success: false, error: "Nombre del cliente y RUC/Cédula son obligatorios" },
        { status: 400 }
      );
    }

    const created = await withRetry(async () => {
      await ensureCreditsTable();

      // Verificar si ya existe una cuenta de crédito con esa identificación en esta sede
      const existingRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "PosCreditAccount" WHERE "identification" = $1 AND COALESCE("branch", 'PRINCIPAL') = $2 LIMIT 1`,
        String(identification).trim(),
        credBranch
      );

      if (existingRows.length > 0) {
        const curr = existingRows[0];
        const prevBal = Number(curr.currentBalance || 0);
        const addBal = Number(currentBalance || 0);
        const nextBalance = prevBal + addBal;
        const nextLimit = Math.max(Number(curr.creditLimit || 0), nextBalance + 200, Number(creditLimit || 500));
        const nextNotes = notes
          ? (curr.notes ? curr.notes + " | " + notes : notes)
          : curr.notes;
        const nextStatus = nextBalance > 0 ? "AL_DIA" : curr.status;

        await prisma.$executeRawUnsafe(
          `UPDATE "PosCreditAccount"
           SET "currentBalance" = $1, "creditLimit" = $2, "dueDate" = $3, "status" = $4, "notes" = $5, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $6`,
          nextBalance,
          nextLimit,
          String(dueDate),
          nextStatus,
          nextNotes,
          curr.id
        );

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "PosCreditAccount" WHERE "id" = $1 LIMIT 1`,
          curr.id
        );
        return mapCreditRow(updatedRows[0]);
      }

      const id = `cred-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "PosCreditAccount" ("id", "customerName", "identification", "phone", "creditLimit", "currentBalance", "dueDate", "status", "notes", "branch", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        id,
        String(customerName).trim(),
        String(identification).trim(),
        String(phone || "N/A").trim(),
        Math.max(Number(creditLimit) || 500, (Number(currentBalance) || 0) + 200),
        Number(currentBalance) || 0,
        String(dueDate),
        String(status || "AL_DIA"),
        String(notes || ""),
        credBranch
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
      { success: false, error: error.message || "Error al crear línea de crédito en base de datos" },
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
        throw new Error("Cuenta de crédito no encontrada en base de datos");
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

        // Registrar ingreso en sesión de caja abierta para trazabilidad contable
        try {
          const targetBranch =
            String(body.branch || curr.branch || "PRINCIPAL").toUpperCase().includes("SUCURSAL")
              ? "SUCURSAL"
              : "PRINCIPAL";
          const activeSession = await prisma.cashRegister.findFirst({
            where: { status: "ABIERTA", branch: targetBranch },
            orderBy: { openedAt: "desc" },
          });
          if (activeSession) {
            const metodo = String(body.paymentMethod || "Efectivo");
            const metodoLower = metodo.toLowerCase();
            await prisma.cashMovement.create({
              data: {
                cashRegisterId: activeSession.id,
                type: "INGRESO",
                amount: abono,
                reason: `Abono crédito ${curr.customerName} (${metodo})${body.paymentNote ? ` - ${body.paymentNote}` : ""}`,
              },
            });
            const updateCashData: any = {};
            if (metodoLower.includes("tarjet")) {
              updateCashData.totalSalesCard = { increment: abono };
            } else if (metodoLower.includes("transfer")) {
              updateCashData.totalSalesTransfer = { increment: abono };
            } else {
              updateCashData.totalSalesCash = { increment: abono };
              updateCashData.expectedCash = { increment: abono };
            }
            await prisma.cashRegister.update({
              where: { id: activeSession.id },
              data: updateCashData,
            });
          }
        } catch (cashErr) {
          console.warn("Aviso al registrar abono de crédito en caja:", cashErr);
        }
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
      { success: false, error: error.message || "Error al actualizar cuenta de crédito en base de datos" },
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
      { success: false, error: error.message || "Error al eliminar crédito de base de datos" },
      { status: 500 }
    );
  }
}
