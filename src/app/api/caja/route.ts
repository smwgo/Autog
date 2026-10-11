import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Consultar estado actual de caja, ventas del día en Neon y movimientos
export async function GET(request: Request) {
  try {
    // 1. Obtener todas las ventas registradas en Neon
    const sales = await prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Calcular ventas por método de pago desde la base de datos real
    let salesCash = 0;
    let salesCard = 0;
    let salesTransfer = 0;

    sales.forEach((s) => {
      const total = parseFloat(s.total.toString()) || 0;
      const method = (s.paymentMethod || "").toLowerCase();
      if (method.includes("efectivo") || method.includes("cash")) {
        salesCash += total;
      } else if (method.includes("tarjeta") || method.includes("card") || method.includes("pos")) {
        salesCard += total;
      } else if (method.includes("transfer") || method.includes("banco")) {
        salesTransfer += total;
      } else {
        salesCash += total;
      }
    });

    // 2. Obtener movimientos de gastos o ingresos adicionales
    // Almacenados mediante la tabla OrderRequest tipo CAJA_MOV o registrados como movimientos
    let movements: any[] = [];
    try {
      const records = await (prisma as any).orderRequest.findMany({
        where: { type: "CAJA_MOV" },
        orderBy: { createdAt: "desc" },
      });
      movements = records.map((r: any) => ({
        id: r.id,
        type: r.status === "INGRESO" ? "INGRESO" : "GASTO",
        concept: r.itemsSummary,
        amount: parseFloat(r.totalEstimated?.toString() || "0"),
        createdAt: r.createdAt,
      }));
    } catch {
      // fallback
    }

    // 3. Obtener fondo inicial y estado de cierre
    let initialCash = 0;
    let lastClosed: any = null;
    try {
      const config = await (prisma as any).orderRequest.findFirst({
        where: { type: "CAJA_SESSION" },
        orderBy: { createdAt: "desc" },
      });
      if (config) {
        initialCash = parseFloat(config.totalEstimated?.toString() || "0");
        lastClosed = config;
      }
    } catch {
      // fallback
    }

    const totalExpenses = movements
      .filter((m) => m.type === "GASTO")
      .reduce((acc, m) => acc + m.amount, 0);

    const totalIncome = movements
      .filter((m) => m.type === "INGRESO")
      .reduce((acc, m) => acc + m.amount, 0);

    const expectedCash = initialCash + salesCash + totalIncome - totalExpenses;
    const totalSales = salesCash + salesCard + salesTransfer;

    return NextResponse.json({
      success: true,
      data: {
        initialCash,
        salesCash,
        salesCard,
        salesTransfer,
        totalSales,
        totalExpenses,
        totalIncome,
        expectedCash,
        movements,
        totalTransactions: sales.length,
        lastClosed,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener datos de caja de Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar caja en Neon" },
      { status: 500 }
    );
  }
}

// POST: Registrar movimiento de caja (Gasto o Ingreso) o Actualizar Fondo Inicial
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, type, amount, concept, initialCash } = body;

    // Caso 1: Configurar fondo inicial de caja
    if (action === "SET_INITIAL") {
      const monto = parseFloat(initialCash) || 0;
      await (prisma as any).orderRequest.create({
        data: {
          requestNumber: `FONDO-${Date.now().toString().slice(-6)}`,
          type: "CAJA_SESSION",
          customerName: "Apertura de Caja",
          itemsSummary: "Fondo inicial asignado",
          totalEstimated: monto,
          status: "ABIERTA",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Fondo inicial actualizado correctamente en Neon",
      });
    }

    // Caso 2: Registrar un egreso o ingreso en efectivo
    const monto = parseFloat(amount) || 0;
    const nuevoMov = await (prisma as any).orderRequest.create({
      data: {
        requestNumber: `MOV-${Date.now().toString().slice(-6)}`,
        type: "CAJA_MOV",
        customerName: type === "INGRESO" ? "Ingreso Extra" : "Gasto / Salida",
        itemsSummary: concept?.trim() || (type === "INGRESO" ? "Ingreso a caja" : "Gasto de caja"),
        totalEstimated: monto,
        status: type === "INGRESO" ? "INGRESO" : "GASTO",
      },
    });

    return NextResponse.json({
      success: true,
      movement: nuevoMov,
    });
  } catch (error: any) {
    console.error("Error al registrar movimiento en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar movimiento en Neon" },
      { status: 500 }
    );
  }
}

// PUT: Confirmar y guardar el Cierre de Caja en Neon
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      declaredCash = 0,
      declaredCard = 0,
      declaredTransfer = 0,
      notes = "",
      expectedCash = 0,
      diffCash = 0,
      diffCard = 0,
      diffTransfer = 0,
    } = body;

    const cierre = await (prisma as any).orderRequest.create({
      data: {
        requestNumber: `CIERRE-${Date.now().toString().slice(-6)}`,
        type: "CAJA_CIERRE",
        customerName: "Cierre de Caja Diario",
        itemsSummary: `Efectivo: $${declaredCash} (Dif: $${diffCash}) | Tarjetas: $${declaredCard} | Transf: $${declaredTransfer}`,
        itemsJson: JSON.stringify({
          declaredCash,
          declaredCard,
          declaredTransfer,
          expectedCash,
          diffCash,
          diffCard,
          diffTransfer,
        }),
        totalEstimated: parseFloat(declaredCash) || 0,
        notes: notes.trim(),
        status: "CERRADA",
      },
    });

    return NextResponse.json({
      success: true,
      cierre,
      message: "Cierre de caja guardado con éxito en Neon",
    });
  } catch (error: any) {
    console.error("Error al procesar cierre de caja en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar cierre de caja" },
      { status: 500 }
    );
  }
}
