import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const transactions = await withRetry(async () => {
      return await prisma.financialTransaction.findMany({
        orderBy: { createdAt: "desc" },
      });
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
      const isIncome = body.isIncome !== undefined ? Boolean(body.isIncome) : body.category === "Ventas";
      return await prisma.financialTransaction.create({
        data: {
          dateLabel: body.dateLabel || new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }),
          description: body.description || "Movimiento Financiero",
          category: body.category || "Ventas",
          reference: body.reference || `REF-${Math.floor(100 + Math.random() * 900)}`,
          amount: Number(body.amount || 0),
          isIncome,
          method: body.method || "Transferencia",
        },
      });
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
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const updated = await withRetry(async () => {
      return await prisma.financialTransaction.update({
        where: { id },
        data: {
          dateLabel: body.dateLabel !== undefined ? body.dateLabel : undefined,
          description: body.description !== undefined ? body.description : undefined,
          category: body.category !== undefined ? body.category : undefined,
          reference: body.reference !== undefined ? body.reference : undefined,
          amount: body.amount !== undefined ? Number(body.amount) : undefined,
          isIncome: body.isIncome !== undefined ? Boolean(body.isIncome) : undefined,
          method: body.method !== undefined ? body.method : undefined,
        },
      });
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
      await prisma.financialTransaction.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar transacción" }, { status: 500 });
  }
}
