import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Consultar lista de sesiones de caja en Neon, métricas y estado activo
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sedeParam = (searchParams.get("sede") || "").toUpperCase();
    const userBranchParam = (searchParams.get("userBranch") || "").toUpperCase();

    // Determinar modo de sede
    const isSucursal = userBranchParam === "SUCURSAL" || sedeParam === "SUCURSAL";
    const isAmbos = !isSucursal && (sedeParam === "AMBOS" || sedeParam === "AMBAS");
    const targetBranch = isSucursal ? "SUCURSAL" : "PRINCIPAL";

    // 1. Obtener usuario del sistema para asignar como cajero por defecto
    let defaultUserName = "POS";
    try {
      const defaultUser = await prisma.user.findFirst({
        select: { name: true },
        orderBy: { createdAt: "asc" },
      });
      if (defaultUser?.name) {
        defaultUserName = defaultUser.name;
      }
    } catch {
      // fallback
    }

    // 2. Obtener sesiones desde la tabla formal CashRegister
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
          dbSessions = legacySessions.map((s: any) => {
            const initial = parseFloat(s.totalEstimated?.toString() || "0");
            return {
              id: s.id,
              sessionNumber: s.requestNumber || `CAJA-${s.id.slice(-6)}`,
              status: s.status === "CERRADA" ? "CERRADA" : "ABIERTA",
              cashier: s.customerName && s.customerName !== "Apertura de Caja" ? s.customerName : defaultUserName,
              initialCash: initial,
              declaredCash: s.status === "CERRADA" ? initial : null,
              expectedCash: initial,
              differenceCash: 0,
              openedAt: s.createdAt,
              closedAt: s.status === "CERRADA" ? s.updatedAt || s.createdAt : null,
              movements: [],
            };
          });
        }
      } catch {
        // fallback
      }
    }

    // Obtener sedes asignadas de CashRegister de la base de datos
    const branchRows = (await prisma.$queryRawUnsafe(
      `SELECT "id", COALESCE("branch", 'PRINCIPAL') AS "branch" FROM "CashRegister"`
    ).catch(() => [])) as any[];
    const branchMap = new Map<string, string>();
    for (const r of branchRows) {
      branchMap.set(r.id, (r.branch || "PRINCIPAL").toUpperCase());
    }

    // Mapear y filtrar sesiones según la sede activa
    const sessionsWithCashier = dbSessions
      .map((s: any) => {
        let cashier = s.cashier || defaultUserName;
        if (s.notes && s.notes.includes("Cajero:")) {
          cashier = s.notes.split("Cajero:")[1].trim();
        }
        const sBranch = branchMap.get(s.id) || (s.branch || "PRINCIPAL").toUpperCase();
        return {
          ...s,
          branch: sBranch === "SUCURSAL" ? "Sucursal" : "Principal",
          _branchUpper: sBranch,
          initialCash: parseFloat(s.initialCash?.toString() || "0"),
          declaredCash: s.declaredCash != null ? parseFloat(s.declaredCash?.toString() || "0") : null,
          expectedCash: s.expectedCash != null ? parseFloat(s.expectedCash?.toString() || "0") : parseFloat(s.initialCash?.toString() || "0"),
          differenceCash: s.differenceCash != null ? parseFloat(s.differenceCash?.toString() || "0") : 0,
          cashier,
        };
      })
      .filter((s: any) => {
        // En Sucursal: ÚNICAMENTE sesiones de Sucursal
        if (isSucursal) {
          return s._branchUpper === "SUCURSAL";
        }
        // En Principal con "Ambas": ver todas las sesiones combinadas
        if (isAmbos) {
          return true;
        }
        // En Principal por defecto: ver solo sesiones de Principal
        return s._branchUpper !== "SUCURSAL";
      });

    // 3. Buscar sesión activa actualmente en la sede seleccionada
    const activeSession = sessionsWithCashier.find((s) => s.status === "ABIERTA") || null;
    const initialCash = activeSession ? parseFloat(activeSession.initialCash?.toString() || "0") : 0;

    // 4. Obtener ÚNICAMENTE las ventas realizadas durante la sesión activa actual en la sede correspondiente
    let salesCash = 0;
    let salesCard = 0;
    let salesTransfer = 0;
    let totalSales = 0;
    let sessionSalesCount = 0;

    if (activeSession && activeSession.openedAt) {
      try {
        const sessionBranch = activeSession._branchUpper || targetBranch;

        const saleBranchRows = (await prisma.$queryRawUnsafe(
          `SELECT "id", COALESCE("branch", 'PRINCIPAL') AS "branch" FROM "Sale"`
        ).catch(() => [])) as any[];
        const saleBranchMap = new Map<string, string>();
        for (const r of saleBranchRows) {
          saleBranchMap.set(r.id, (r.branch || "PRINCIPAL").toUpperCase());
        }

        const rawSessionSales = await prisma.sale.findMany({
          where: {
            createdAt: { gte: new Date(activeSession.openedAt) },
            status: { not: "ANULADA" },
          },
          orderBy: { createdAt: "desc" },
        });

        const sessionSales = rawSessionSales.filter((s) => {
          const b = saleBranchMap.get(s.id) || "PRINCIPAL";
          if (sessionBranch === "SUCURSAL") return b === "SUCURSAL";
          return b !== "SUCURSAL";
        });

        sessionSalesCount = sessionSales.length;

        sessionSales.forEach((s) => {
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

        totalSales = salesCash + salesCard + salesTransfer;
      } catch (err) {
        console.warn("Error consultando ventas de sesión activa:", err);
      }
    }

    // 5. Movimientos (Gastos e Ingresos) de la sesión activa actual en la sede
    let movements: any[] = [];
    let totalExpenses = 0;
    let totalIncome = 0;

    if (activeSession && activeSession.openedAt) {
      try {
        const records = await (prisma as any).orderRequest.findMany({
          where: {
            type: "CAJA_MOV",
            createdAt: { gte: new Date(activeSession.openedAt) },
          },
          orderBy: { createdAt: "desc" },
        });

        const movBranchRows = (await prisma.$queryRawUnsafe(
          `SELECT "id", COALESCE("branch", 'PRINCIPAL') AS "branch" FROM "OrderRequest"`
        ).catch(() => [])) as any[];
        const movBranchMap = new Map<string, string>();
        for (const r of movBranchRows) {
          movBranchMap.set(r.id, (r.branch || "PRINCIPAL").toUpperCase());
        }

        const sessionBranch = activeSession._branchUpper || targetBranch;
        const filteredRecords = records.filter((r: any) => {
          const b = movBranchMap.get(r.id) || "PRINCIPAL";
          if (sessionBranch === "SUCURSAL") return b === "SUCURSAL";
          return b !== "SUCURSAL";
        });

        movements = filteredRecords.map((r: any) => ({
          id: r.id,
          type: r.status === "INGRESO" ? "INGRESO" : "GASTO",
          concept: r.itemsSummary,
          amount: parseFloat(r.totalEstimated?.toString() || "0"),
          createdAt: r.createdAt,
        }));

        totalExpenses = movements
          .filter((m) => m.type === "GASTO")
          .reduce((acc, m) => acc + m.amount, 0);

        totalIncome = movements
          .filter((m) => m.type === "INGRESO")
          .reduce((acc, m) => acc + m.amount, 0);
      } catch {
        // fallback
      }
    }

    // El efectivo esperado en caja es: Fondo Inicial + Ventas en Efectivo de la Sesión + Ingresos - Gastos
    const expectedCash = activeSession
      ? initialCash + salesCash + totalIncome - totalExpenses
      : 0;

    // Actualizar expectedCash en la sesión activa dentro de la lista
    if (activeSession) {
      activeSession.expectedCash = expectedCash;
    }

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
        totalTransactions: sessionSalesCount,
        lastClosed: sessionsWithCashier.find((s) => s.status === "CERRADA") || null,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener datos de caja de base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar caja en base de datos" },
      { status: 500 }
    );
  }
}

// POST: Registrar apertura de caja o movimiento (Gasto/Ingreso)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, type, amount, concept, initialCash, cashier } = body;
    const postBranch = String(body.branch || body.sede || "").toUpperCase().includes("SUCURSAL")
      ? "SUCURSAL"
      : "PRINCIPAL";

    // Caso 1: Abrir nueva sesión de caja o configurar fondo inicial
    if (action === "SET_INITIAL" || action === "OPEN_SESSION") {
      const monto = parseFloat(initialCash) || 0;
      const sessionNumber = `CAJA-${Date.now().toString().slice(-6)}`;

      // Evitar dos cajas abiertas en la misma sede
      const yaAbierta = await prisma.cashRegister.findFirst({
        where: { status: "ABIERTA", branch: postBranch },
      });
      if (yaAbierta) {
        return NextResponse.json({
          success: true,
          session: yaAbierta,
          message: "Ya existe una caja abierta en esta sede",
        });
      }

      let defaultUserName = "POS";
      try {
        const defaultUser = await prisma.user.findFirst({
          select: { name: true },
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
            branch: postBranch,
            openedAt: new Date(),
          },
        });
      } catch (err) {
        console.warn("Error creando en CashRegister, usando orderRequest:", err);
      }

      // Registro complementario en orderRequest
      const legacy = await (prisma as any).orderRequest.create({
        data: {
          requestNumber: sessionNumber,
          type: "CAJA_SESSION",
          customerName: cashierName,
          itemsSummary: "Fondo inicial asignado",
          totalEstimated: monto,
          status: "ABIERTA",
        },
      });
      await prisma
        .$executeRawUnsafe(`UPDATE "OrderRequest" SET "branch" = $1 WHERE "id" = $2`, postBranch, legacy.id)
        .catch(() => {});

      return NextResponse.json({
        success: true,
        session: nuevaSesion,
        message: "Caja abierta correctamente en base de datos",
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
    await prisma
      .$executeRawUnsafe(`UPDATE "OrderRequest" SET "branch" = $1 WHERE "id" = $2`, postBranch, nuevoMov.id)
      .catch(() => {});

    return NextResponse.json({
      success: true,
      movement: nuevoMov,
    });
  } catch (error: any) {
    console.error("Error al registrar en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar en base de datos" },
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

    let sesionCerrada: any = null;

    // 1. Intentar actualizar en CashRegister si existe sessionId
    if (sessionId) {
      try {
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
      } catch {}

      // 2. Intentar actualizar en orderRequest (por id directo)
      try {
        const updatedLegacy = await (prisma as any).orderRequest.update({
          where: { id: sessionId },
          data: {
            status: "CERRADA",
            totalEstimated: declaredCashNum,
            itemsSummary: `Cierre de caja - Efectivo: $${declaredCashNum.toFixed(2)} (Esperado: $${expectedCashNum.toFixed(2)})`,
            notes: notes.trim(),
            updatedAt: new Date(),
          },
        });
        if (!sesionCerrada) sesionCerrada = updatedLegacy;
      } catch {}
    }

    // 3. Si aún no se cerró ninguna sesión, buscar y cerrar cualquier sesión ABIERTA activa
    if (!sesionCerrada) {
      try {
        const putBranch = String(body.branch || body.sede || "").toUpperCase().includes("SUCURSAL")
          ? "SUCURSAL"
          : "PRINCIPAL";
        const abiertaReg = await prisma.cashRegister.findFirst({
          where: { status: "ABIERTA", branch: putBranch },
          orderBy: { openedAt: "desc" },
        });
        if (abiertaReg) {
          sesionCerrada = await prisma.cashRegister.update({
            where: { id: abiertaReg.id },
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
      } catch {}

      try {
        const abiertasLegacy = await (prisma as any).orderRequest.findMany({
          where: { type: "CAJA_SESSION", status: "ABIERTA" },
          orderBy: { createdAt: "desc" },
          take: 1,
        });
        if (abiertasLegacy.length > 0) {
          const updated = await (prisma as any).orderRequest.update({
            where: { id: abiertasLegacy[0].id },
            data: {
              status: "CERRADA",
              totalEstimated: declaredCashNum,
              itemsSummary: `Cierre de caja - Efectivo: $${declaredCashNum.toFixed(2)} (Esperado: $${expectedCashNum.toFixed(2)})`,
              notes: notes.trim(),
              updatedAt: new Date(),
            },
          });
          if (!sesionCerrada) sesionCerrada = updated;
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      session: sesionCerrada,
      message: "Cierre de caja guardado con éxito en base de datos",
    });
  } catch (error: any) {
    console.error("Error al procesar cierre de caja en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar cierre de caja" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una sesión de caja
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de sesión requerido" },
        { status: 400 }
      );
    }

    // 1. Eliminar movimientos asociados en CashMovement si existen
    try {
      await (prisma as any).cashMovement.deleteMany({
        where: { cashRegisterId: id },
      });
    } catch {}

    // 2. Eliminar de CashRegister
    let deleted = false;
    try {
      await prisma.cashRegister.delete({
        where: { id },
      });
      deleted = true;
    } catch {}

    // 3. Eliminar de orderRequest si está allí
    try {
      await (prisma as any).orderRequest.delete({
        where: { id },
      });
      deleted = true;
    } catch {}

    // 4. Intentar por requestNumber si el ID correspondía al número de sesión
    try {
      await (prisma as any).orderRequest.deleteMany({
        where: { requestNumber: id },
      });
      deleted = true;
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Sesión eliminada con éxito",
    });
  } catch (error: any) {
    console.error("Error al eliminar sesión de caja:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar sesión" },
      { status: 500 }
    );
  }
}
