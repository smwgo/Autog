import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await withRetry(async () => {
      let defaultUserName = "POS";
      try {
        const defaultUser = await prisma.user.findFirst({
          select: { name: true },
          orderBy: { createdAt: "asc" },
        });
        if (defaultUser?.name) defaultUserName = defaultUser.name;
      } catch {}

      const rawSessions = await prisma.cashRegister.findMany({
        orderBy: { openedAt: "desc" },
        include: { movements: true },
      });

      const sessions = rawSessions.map((s) => {
        let cashier = defaultUserName;
        if (s.notes && s.notes.includes("Cajero:")) {
          cashier = s.notes.split("Cajero:")[1].trim();
        } else if (s.notes && s.notes.includes("por ")) {
          cashier = s.notes.split("por ")[1].trim();
        }

        const initialCash = Number(s.initialCash || 0);
        const totalSalesCash = Number(s.totalSalesCash || 0);
        const totalSalesCard = Number(s.totalSalesCard || 0);
        const totalSalesTransfer = Number(s.totalSalesTransfer || 0);
        const totalSales = totalSalesCash + totalSalesCard + totalSalesTransfer;
        const totalExpenses = Number(s.totalExpenses || 0);
        const declaredCash = s.declaredCash !== null && s.declaredCash !== undefined ? Number(s.declaredCash) : null;
        const differenceCash = s.differenceCash !== null && s.differenceCash !== undefined ? Number(s.differenceCash) : null;

        return {
          id: s.id,
          sessionNumber: s.sessionNumber,
          status: s.status,
          cashier,
          branch: s.branch || "Principal",
          openedAt: s.openedAt,
          closedAt: s.closedAt,
          initialCash,
          totalSalesCash,
          totalSalesCard,
          totalSalesTransfer,
          totalSales,
          totalExpenses,
          declaredCash,
          differenceCash,
          notes: s.notes,
          movements: (s.movements || []).map((m) => ({
            id: m.id,
            type: m.type,
            amount: Number(m.amount || 0),
            reason: m.reason,
            createdAt: m.createdAt,
          })),
        };
      });

      const totalSesiones = sessions.length;
      const abiertas = sessions.filter((s) => s.status === "ABIERTA").length;
      const cerradas = sessions.filter((s) => s.status === "CERRADA").length;
      const ventasTotal = sessions.reduce((acc, s) => acc + s.totalSales, 0);
      const fondoTotal = sessions.reduce((acc, s) => acc + s.initialCash, 0);

      return {
        sessions,
        stats: {
          totalSesiones,
          abiertas,
          cerradas,
          ventasTotal,
          fondoTotal,
        },
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al cargar cajas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await withRetry(async () => {
      const sessionNumber = body.sessionNumber || `CAJ-${Math.floor(1000 + Math.random() * 9000)}`;
      const cashierName = body.cashier || "Administrador";
      const notes = body.notes ? `${body.notes} (Cajero: ${cashierName})` : `Apertura por ${cashierName}`;

      const reg = await prisma.cashRegister.create({
        data: {
          sessionNumber,
          status: body.status || "ABIERTA",
          branch: body.branch || "Principal",
          initialCash: Number(body.initialCash || 0),
          notes,
        },
      });

      return {
        ...reg,
        initialCash: Number(reg.initialCash || 0),
      };
    });

    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear caja en Neon" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const updated = await withRetry(async () => {
      const dataToUpdate: any = {};
      if (body.status) {
        dataToUpdate.status = body.status;
        if (body.status === "CERRADA" && !body.closedAt) {
          dataToUpdate.closedAt = new Date();
        } else if (body.status === "ABIERTA") {
          dataToUpdate.closedAt = null;
        }
      }
      if (body.branch) dataToUpdate.branch = body.branch;
      if (body.notes !== undefined) dataToUpdate.notes = body.notes;
      if (body.initialCash !== undefined) dataToUpdate.initialCash = Number(body.initialCash);
      if (body.declaredCash !== undefined) dataToUpdate.declaredCash = Number(body.declaredCash);

      const reg = await prisma.cashRegister.update({
        where: { id },
        data: dataToUpdate,
      });

      return {
        ...reg,
        initialCash: Number(reg.initialCash || 0),
      };
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar caja en Neon" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      // 1. Eliminar movimientos asociados
      try {
        await prisma.cashMovement.deleteMany({
          where: { cashRegisterId: id },
        });
      } catch {}

      // 2. Eliminar sesión de caja
      await prisma.cashRegister.delete({
        where: { id },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar caja en Neon" }, { status: 500 });
  }
}
