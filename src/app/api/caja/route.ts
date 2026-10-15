import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Consultar lista de sesiones de caja en Neon, métricas y estado activo
export async function GET(request: Request) {
  try {
    // 1. Obtener todas las ventas registradas en Neon
    const sales = await prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
    });

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

    // 2. Obtener movimientos adicionales
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

    const totalExpenses = movements
      .filter((m) => m.type === "GASTO")
      .reduce((acc, m) => acc + m.amount, 0);

    const totalIncome = movements
      .filter((m) => m.type === "INGRESO")
      .reduce((acc, m) => acc + m.amount, 0);

    // 3. Obtener usuario del sistema para asignar como cajero
    let defaultUserName = "Super Administrador";
    try {
      const defaultUser = await prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (defaultUser?.name) {
        defaultUserName = defaultUser.name;
      }
    } catch {
      // fallback
    }

    // 4. Obtener sesiones desde la tabla formal CashRegister
    let dbSessions: any[] = [];
    try {
      dbSessions = await prisma.cashRegister.findMany({
        orderBy: { openedAt: "desc" },
        include: { movements: true },
      });
    } catch (e) {
      console.warn("CashRegister findMany fallback:", e);
    }

    // Si aún no hay sesiones en CashRegister pero hay registros previos en orderRequest
    if (dbSessions.length === 0) {
      try {
        const legacySessions = await (prisma as any).orderRequest.findMany({
          where: { type: { in: ["CAJA_SESSION", "CAJA_CIERRE"] } },
          orderBy: { createdAt: "desc" },
        });

        if (legacySessions.length > 0) {
          dbSessions = legacySessions.map((s: any) => ({
            id: s.id,
            sessionNumber: s.requestNumber || `CAJA-${s.id.slice(-6)}`,
            status: s.status === "CERRADA" ? "CERRADA" : "ABIERTA",
            cashier: s.customerName && s.customerName !== "Apertura de Caja" ? s.customerName : defaultUserName,
            initialCash: parseFloat(s.totalEstimated?.toString() || "0"),
            declaredCash: s.status === "CERRADA" ? parseFloat(s.totalEstimated?.toString() || "0") : null,
            expectedCash: parseFloat(s.totalEstimated?.toString() || "0") + salesCash,
            differenceCash: 0,
            openedAt: s.createdAt,
            closedAt: s.status === "CERRADA" ? s.updatedAt || s.createdAt : null,
            movements: [],
          }));
        }
      } catch {
        // fallback
      }
    }

    // Mapear el cajero en cada sesión si viene de CashRegister
    const sessionsWithCashier = dbSessions.map((s: any) => {
      let cashier = s.cashier || defaultUserName;
      if (s.notes && s.notes.includes("Cajero:")) {
        cashier = s.notes.split("Cajero:")[1].trim();
      }
      return {
        ...s,
        cashier,
      };
    });

    // Buscar sesión activa actualmente
    const activeSession = sessionsWithCashier.find((s) => s.status === "ABIERTA") || null;
    const initialCash = activeSession ? parseFloat(activeSession.initialCash?.toString() || "0") : 0;
    const expectedCash = initialCash + salesCash + totalIncome - totalExpenses;
    const totalSales = salesCash + salesCard + salesTransfer;

    // Métricas para la vista Lista
    const stats = {
      totalSesiones: sessionsWithCashier.length,
      abiertas: sessionsWithCashier.filter((s) => s.status === "ABIERTA").length,
      cerradas: sessionsWithCashier.filter((s) => s.status === "CERRADA").length,
      fondoTotal: initialCash,
      ventasTotal: totalSales,
    };

    return NextResponse.json({
      success: true,
      sessions: sessionsWithCashier,
      stats,
      activeSession,
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
        lastClosed: sessionsWithCashier.find((s) => s.status === "CERRADA") || null,
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

// POST: Registrar apertura de caja o movimiento (Gasto/Ingreso)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, type, amount, concept, initialCash, cashier } = body;

    // Caso 1: Abrir nueva sesión de caja o configurar fondo inicial
    if (action === "SET_INITIAL" || action === "OPEN_SESSION") {
      const monto = parseFloat(initialCash) || 0;
      const sessionNumber = `CAJA-${Date.now().toString().slice(-6)}`;

      let defaultUserName = "Super Administrador";
      try {
        const defaultUser = await prisma.user.findFirst({
          orderBy: { createdAt: "asc" },
        });
        if (defaultUser?.name) {
          defaultUserName = defaultUser.name;
        }
      } catch {
        // fallback
      }
      const cashierName = cashier?.trim() || defaultUserName;

      let nuevaSesion: any = null;
      try {
        nuevaSesion = await prisma.cashRegister.create({
          data: {
            sessionNumber,
            status: "ABIERTA",
            initialCash: monto,
            expectedCash: monto,
            notes: `Cajero: ${cashierName}`,
            openedAt: new Date(),
          },
        });
      } catch (err) {
        console.warn("Error creando en CashRegister, usando orderRequest:", err);
      }

      // Registro complementario en orderRequest
      await (prisma as any).orderRequest.create({
        data: {
          requestNumber: sessionNumber,
          type: "CAJA_SESSION",
          customerName: cashierName,
          itemsSummary: "Fondo inicial asignado",
          totalEstimated: monto,
          status: "ABIERTA",
        },
      });

      return NextResponse.json({
        success: true,
        session: nuevaSesion,
        message: "Caja abierta correctamente en Neon",
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
    console.error("Error al registrar en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar en Neon" },
      { status: 500 }
    );
  }
}

// PUT: Confirmar y guardar el Cierre de Caja en Neon
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      sessionId,
      declaredCash = 0,
      declaredCard = 0,
      declaredTransfer = 0,
      notes = "",
      expectedCash = 0,
      diffCash = 0,
      diffCard = 0,
      diffTransfer = 0,
    } = body;

    const declaredCashNum = parseFloat(declaredCash) || 0;
    const expectedCashNum = parseFloat(expectedCash) || 0;
    const diffCashNum = parseFloat(diffCash) || 0;

    // 1. Actualizar en la tabla CashRegister
    let sesionCerrada: any = null;
    try {
      if (sessionId) {
        sesionCerrada = await prisma.cashRegister.update({
          where: { id: sessionId },
          data: {
            status: "CERRADA",
            declaredCash: declaredCashNum,
            declaredCard: parseFloat(declaredCard) || 0,
            declaredTransfer: parseFloat(declaredTransfer) || 0,
            expectedCash: expectedCashNum,
            differenceCash: diffCashNum,
            differenceCard: parseFloat(diffCard) || 0,
            differenceTransfer: parseFloat(diffTransfer) || 0,
            notes: notes.trim(),
            closedAt: new Date(),
          },
        });
      } else {
        const abierta = await prisma.cashRegister.findFirst({
          where: { status: "ABIERTA" },
          orderBy: { openedAt: "desc" },
        });
        if (abierta) {
          sesionCerrada = await prisma.cashRegister.update({
            where: { id: abierta.id },
            data: {
              status: "CERRADA",
              declaredCash: declaredCashNum,
              declaredCard: parseFloat(declaredCard) || 0,
              declaredTransfer: parseFloat(declaredTransfer) || 0,
              expectedCash: expectedCashNum,
              differenceCash: diffCashNum,
              notes: notes.trim(),
              closedAt: new Date(),
            },
          });
        }
      }
    } catch (e) {
      console.warn("CashRegister update warning:", e);
    }

    // 2. Registro complementario de auditoría en orderRequest
    const cierre = await (prisma as any).orderRequest.create({
      data: {
        requestNumber: `CIERRE-${Date.now().toString().slice(-6)}`,
        type: "CAJA_CIERRE",
        customerName: "Cierre de Caja Diario",
        itemsSummary: `Efectivo: $${declaredCashNum.toFixed(2)} (Dif: $${diffCashNum.toFixed(2)})`,
        itemsJson: JSON.stringify({
          sessionId,
          declaredCash: declaredCashNum,
          declaredCard,
          declaredTransfer,
          expectedCash: expectedCashNum,
          diffCash: diffCashNum,
        }),
        totalEstimated: declaredCashNum,
        notes: notes.trim(),
        status: "CERRADA",
      },
    });

    return NextResponse.json({
      success: true,
      session: sesionCerrada || cierre,
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
