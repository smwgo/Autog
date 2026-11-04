import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "este_mes";
    const desdeParam = searchParams.get("desde");
    const hastaParam = searchParams.get("hasta");
    const sucursalParam = searchParams.get("sucursal") || searchParams.get("branch") || searchParams.get("sede");

    const rawBranch = (sucursalParam || "").trim().toUpperCase();
    const filterBranch = (rawBranch === "PRINCIPAL" || rawBranch === "SUCURSAL") ? rawBranch : null;

    return await withRetry(async () => {
      // 1. Determinar rango de fechas
      const now = new Date();
      let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const mesCorto = (d: Date) => d.toLocaleString("es-ES", { month: "short" }).toUpperCase().replace(".", "");
      const pad2 = (n: number) => String(n).padStart(2, "0");

      let dateLabel = `${pad2(1)} ${mesCorto(now)} ${now.getFullYear()} — ${pad2(endDate.getDate())} ${mesCorto(now)} ${now.getFullYear()}`;

      if (desdeParam && hastaParam) {
        const partsStart = desdeParam.split("-").map(Number);
        const partsEnd = hastaParam.split("-").map(Number);
        if (partsStart.length === 3 && partsEnd.length === 3) {
          startDate = new Date(partsStart[0], partsStart[1] - 1, partsStart[2], 0, 0, 0, 0);
          endDate = new Date(partsEnd[0], partsEnd[1] - 1, partsEnd[2], 23, 59, 59, 999);
        } else {
          startDate = new Date(desdeParam);
          endDate = new Date(hastaParam);
          endDate.setHours(23, 59, 59, 999);
        }
        dateLabel = `${pad2(startDate.getDate())} ${mesCorto(startDate)} ${startDate.getFullYear()} — ${pad2(endDate.getDate())} ${mesCorto(endDate)} ${endDate.getFullYear()}`;
      } else if (periodo === "hoy") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        dateLabel = `HOY, ${pad2(now.getDate())} ${mesCorto(now)} ${now.getFullYear()}`;
      } else if (periodo === "esta_semana") {
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
        endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000 + 86399999);
        dateLabel = `${pad2(startDate.getDate())} ${mesCorto(startDate)} — ${pad2(endDate.getDate())} ${mesCorto(endDate)} ${now.getFullYear()}`;
      } else if (periodo === "este_anio") {
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        dateLabel = `AÑO ${now.getFullYear()} (ENE — DIC)`;
      } else if (periodo === "todo") {
        startDate = new Date(2020, 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear() + 2, 11, 31, 23, 59, 59, 999);
        dateLabel = `HISTÓRICO COMPLETO`;
      }

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // Helper para extraer fecha real de un registro
      const getRecordDate = (rec: any): Date => {
        if (rec.completedAt) {
          const d = new Date(rec.completedAt);
          if (!isNaN(d.getTime())) return d;
        }
        if (rec.dateIn) {
          const d = new Date(rec.dateIn);
          if (!isNaN(d.getTime())) return d;
        }
        if (rec.createdAt) {
          const d = new Date(rec.createdAt);
          if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
        }
        if (rec.updatedAt) {
          const d = new Date(rec.updatedAt);
          if (!isNaN(d.getTime())) return d;
        }
        return now;
      };

      // 2. Consultar entidades del sistema
      const [
        salesPeriod,
        salesToday,
        workshopOrders,
        posCredits,
        cashMovements,
        clientQuotes,
        clientInvoices,
        financialTransactions,
      ] = await Promise.all([
        prisma.sale.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
          select: {
            id: true,
            total: true,
            paymentMethod: true,
            createdAt: true,
            customer: { select: { branch: true, assignedToSucursal: true } },
          },
        }).catch(() => []),
        prisma.sale.findMany({
          where: { createdAt: { gte: todayStart, lte: todayEnd } },
          select: {
            id: true,
            total: true,
            customer: { select: { branch: true, assignedToSucursal: true } },
          },
        }).catch(() => []),
        prisma.workshopOrder.findMany({
          select: {
            id: true,
            orderNumber: true,
            status: true,
            branch: true,
            client: true,
            vehicle: true,
            plate: true,
            totalCost: true,
            createdAt: true,
            dateIn: true,
            updatedAt: true,
            completedAt: true,
            itemsJson: true,
            quoteNumber: true,
          },
        }).catch(() => []),
        prisma.posCreditAccount.findMany({
          select: { id: true, currentBalance: true, status: true },
        }).catch(() => []),
        prisma.cashMovement.findMany({
          select: { id: true, amount: true, type: true, createdAt: true },
        }).catch(() => []),
        prisma.clientQuote.findMany({
          select: { id: true, quoteNumber: true, total: true, subtotal: true, status: true, createdAt: true, updatedAt: true },
        }).catch(() => []),
        prisma.clientInvoice.findMany({
          select: { id: true, invoiceNumber: true, amount: true, status: true, createdAt: true },
        }).catch(() => []),
        prisma.financialTransaction.findMany({
          select: { id: true, amount: true, isIncome: true, createdAt: true },
        }).catch(() => []),
      ]);

      // Mapeo de cotizaciones por quoteNumber para valorización precisa de órdenes
      const quoteMap = new Map<string, number>();
      clientQuotes.forEach((q) => {
        if (q.quoteNumber) quoteMap.set(q.quoteNumber, Number(q.total || q.subtotal || 0));
      });

      // Calcular valor de orden de trabajo
      const getOrderValue = (o: any): number => {
        if (o.quoteNumber && quoteMap.has(o.quoteNumber)) {
          const qVal = quoteMap.get(o.quoteNumber)!;
          if (qVal > 0) return qVal;
        }
        if (o.totalCost && Number(o.totalCost) > 0) return Number(o.totalCost);
        if (o.itemsJson) {
          try {
            const items = typeof o.itemsJson === "string" ? JSON.parse(o.itemsJson) : o.itemsJson;
            if (Array.isArray(items)) {
              const sum = items.reduce((acc: number, it: any) => acc + (Number(it.price || 0) * Number(it.qty || 1)), 0);
              if (sum > 0) return Number(sum.toFixed(2));
            }
          } catch {}
        }
        return 0;
      };

      // Filtrar por sucursal / sede (PRINCIPAL, SUCURSAL o null/AMBAS)
      const isSaleInBranch = (s: any) => {
        if (!filterBranch) return true;
        const b = (s.customer?.branch || "PRINCIPAL").toUpperCase();
        if (filterBranch === "SUCURSAL") {
          return b === "SUCURSAL" || s.customer?.assignedToSucursal === true;
        }
        return b === "PRINCIPAL" && !s.customer?.assignedToSucursal;
      };

      const branchSalesPeriod = filterBranch ? salesPeriod.filter(isSaleInBranch) : salesPeriod;
      const branchSalesToday = filterBranch ? salesToday.filter(isSaleInBranch) : salesToday;

      const branchWorkshopOrders = filterBranch
        ? workshopOrders.filter((o: any) => (o.branch || "PRINCIPAL").toUpperCase() === filterBranch)
        : workshopOrders;

      const orderBranchMap = new Map<string, string>();
      workshopOrders.forEach((o: any) => {
        const b = (o.branch || "PRINCIPAL").toUpperCase();
        if (o.id) orderBranchMap.set(o.id, b);
        if (o.orderNumber) orderBranchMap.set(o.orderNumber, b);
      });

      const branchInvoices = filterBranch
        ? clientInvoices.filter((inv: any) => {
            if (!inv.orderId) return filterBranch === "PRINCIPAL";
            const b = orderBranchMap.get(inv.orderId) || "PRINCIPAL";
            return b === filterBranch;
          })
        : clientInvoices;

      const branchMovements = filterBranch
        ? cashMovements.filter((m: any) => {
            const b = (m.branch || "PRINCIPAL").toUpperCase();
            return b === filterBranch;
          })
        : cashMovements;

      const branchTransactions = filterBranch
        ? financialTransactions.filter((t: any) => {
            const b = (t.branch || "PRINCIPAL").toUpperCase();
            return b === filterBranch;
          })
        : financialTransactions;

      const branchCredits = filterBranch
        ? posCredits.filter((c: any) => {
            const b = (c.branch || "PRINCIPAL").toUpperCase();
            return b === filterBranch;
          })
        : posCredits;

      // 3. Filtrar por fechas
      const ordersInPeriod = branchWorkshopOrders.filter((o) => {
        const d = getRecordDate(o);
        return d >= startDate && d <= endDate;
      });

      const movementsInPeriod = branchMovements.filter((m) => {
        const d = getRecordDate(m);
        return d >= startDate && d <= endDate;
      });

      const invoicesInPeriod = branchInvoices.filter((inv) => {
        const d = getRecordDate(inv);
        return d >= startDate && d <= endDate;
      });

      const transactionsInPeriod = branchTransactions.filter((t) => {
        const d = getRecordDate(t);
        return d >= startDate && d <= endDate;
      });

      // 1. VENTAS TOTALES (Taller + Tienda POS + Facturación Electrónica SRI)
      const ventasPosPeriodo = branchSalesPeriod.reduce((acc, s) => acc + Number(s.total || 0), 0);
      const tallerFacturadoPeriodo = ordersInPeriod.reduce((acc, o) => acc + getOrderValue(o), 0);
      const facturasMontoPeriodo = invoicesInPeriod
        .filter((i) => i.status === "Autorizado" || i.status === "Pagada")
        .reduce((acc, i) => acc + Number(i.amount || 0), 0);
      const ingresosFinancieros = transactionsInPeriod
        .filter((t) => t.isIncome)
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      const ventasTotales = Number(
        (ventasPosPeriodo + tallerFacturadoPeriodo + facturasMontoPeriodo + ingresosFinancieros).toFixed(2)
      );

      // 2. COBRADO EN CAJA (Ventas POS en efectivo/transferencia + Órdenes terminadas/cobradas + Movimientos INGRESO)
      const cobradoPos = branchSalesPeriod.reduce((acc, s) => {
        if (s.paymentMethod === "Crédito") return acc;
        return acc + Number(s.total || 0);
      }, 0);
      const cobradoTaller = ordersInPeriod.reduce((acc, o) => {
        const st = (o.status || "").toLowerCase();
        if (st.includes("finaliz") || st.includes("entregad") || st.includes("caja") || st.includes("cobrad")) {
          return acc + getOrderValue(o);
        }
        return acc;
      }, 0);
      const ingresosCaja = movementsInPeriod
        .filter((m) => m.type === "INGRESO" || m.type === "VENTA")
        .reduce((acc, m) => acc + Number(m.amount || 0), 0);

      const cobradoEnCaja = Number((cobradoPos + cobradoTaller + facturasMontoPeriodo + ingresosCaja).toFixed(2));

      // 3. VENTAS HOY (Órdenes de hoy + Ventas POS de hoy + Transacciones de hoy)
      const ordersToday = branchWorkshopOrders.filter((o) => {
        const d = getRecordDate(o);
        return d >= todayStart && d <= todayEnd;
      });
      const tallerHoy = ordersToday.reduce((acc, o) => acc + getOrderValue(o), 0);
      const ventasPosHoy = branchSalesToday.reduce((acc, s) => acc + Number(s.total || 0), 0);
      const montoHoy = Number((ventasPosHoy + tallerHoy).toFixed(2));

      // 4. TICKET PROMEDIO POR AUTO / TRANSACCIÓN
      const totalTransacciones = branchSalesPeriod.length + ordersInPeriod.length + invoicesInPeriod.length;
      const ticketPromedio = totalTransacciones > 0
        ? Number((ventasTotales / totalTransacciones).toFixed(2))
        : ventasTotales > 0 ? ventasTotales : 0;

      // 5. AUTOS EN PISTA (Vehículos activos en bahías de taller/lubricentro)
      const autosEnPista = branchWorkshopOrders.filter((o) => {
        const st = (o.status || "").toLowerCase();
        return !st.includes("finaliz") && !st.includes("entregad") && !st.includes("cancelad");
      }).length;

      // 6. AUTOS ENTREGADOS / SERVICIOS COMPLETADOS
      const ordenesTerminadas = branchWorkshopOrders.filter((o) => {
        const st = (o.status || "").toLowerCase();
        return st.includes("finaliz") || st.includes("entregad") || st.includes("caja");
      }).length;
      const autosEntregados = branchSalesPeriod.length + ordenesTerminadas;

      // 7. GASTOS Y REPUESTOS (Egresos de caja, compras operativas, gastos financieros)
      const egresosCaja = movementsInPeriod
        .filter((m) => m.type === "GASTO" || m.type === "RETIRO")
        .reduce((acc, m) => acc + Number(m.amount || 0), 0);
      const egresosFinancieros = transactionsInPeriod
        .filter((t) => !t.isIncome)
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const gastosYRepuestos = Number((egresosCaja + egresosFinancieros).toFixed(2));

      // 8. CUENTAS POR COBRAR (Cartera de clientes con crédito pendiente)
      const carteraCreditoTotal = Number(
        branchCredits.reduce((acc, c) => acc + Number(c.currentBalance || 0), 0).toFixed(2)
      );
      // Incluir órdenes de taller entregadas pendientes de cobro
      const ordenesPorCobrar = branchWorkshopOrders.reduce((acc, o) => {
        const st = (o.status || "").toLowerCase();
        if (st.includes("entregad") || st.includes("por cobrar") || st.includes("pendiente de pago")) {
          return acc + getOrderValue(o);
        }
        return acc;
      }, 0);
      const cuentasPorCobrar = Number((carteraCreditoTotal + ordenesPorCobrar).toFixed(2));

      // 9. CÁLCULO REAL DE GRÁFICO SEMANAL (Lunes a Domingo)
      const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const weekOrder = [1, 2, 3, 4, 5, 6, 0]; // Lun a Dom

      const dayData = weekOrder.map((dayIdx) => {
        const dayLabel = dayNames[dayIdx];
        const daySales = branchSalesPeriod
          .filter((s) => new Date(s.createdAt).getDay() === dayIdx)
          .reduce((acc, s) => acc + Number(s.total || 0), 0);
        const dayOrders = ordersInPeriod
          .filter((o) => getRecordDate(o).getDay() === dayIdx)
          .reduce((acc, o) => acc + getOrderValue(o), 0);
        const income = Number((daySales + dayOrders).toFixed(2));

        const expense = Number(
          movementsInPeriod
            .filter((m) => (m.type === "GASTO" || m.type === "RETIRO") && new Date(m.createdAt).getDay() === dayIdx)
            .reduce((acc, m) => acc + Number(m.amount || 0), 0)
            .toFixed(2)
        );

        return { day: dayLabel, income, expense };
      });

      const maxChartVal = Math.max(...dayData.map((d) => Math.max(d.income, d.expense)), 1);
      const weeklyChart = dayData.map((d) => ({
        ...d,
        heightIncome: d.income > 0 ? Math.max(8, Math.min(100, Math.round((d.income / maxChartVal) * 100))) : 4,
        heightExpense: d.expense > 0 ? Math.max(8, Math.min(100, Math.round((d.expense / maxChartVal) * 100))) : 4,
      }));

      return NextResponse.json({
        success: true,
        periodo,
        dateLabel,
        ingresosHoy: montoHoy,
        ordenesActivas: autosEnPista,
        egresosTotal: gastosYRepuestos,
        ticketPromedio: ticketPromedio,
        capitalActivo: ventasTotales,
        cobrado: cobradoEnCaja,
        metrics: {
          ventasTotales,
          cobradoEnCaja,
          montoHoy,
          ticketPromedio,
          autosEnPista,
          autosEntregados,
          gastosYRepuestos,
          cuentasPorCobrar,
          // Compatibilidad
          capitalActivo: ventasTotales,
          cobrado: cobradoEnCaja,
          autosActivos: autosEnPista,
          pagadosTotal: autosEntregados,
          egresosTotal: gastosYRepuestos,
          moraTotal: cuentasPorCobrar,
          carteraCreditoTotal,
        },
        weeklyChart,
        sucursal: filterBranch || "AMBAS",
        ultimasOrdenes: branchWorkshopOrders.slice(0, 8).map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          client: o.client,
          vehicle: o.vehicle,
          status: o.status,
          amount: getOrderValue(o),
          createdAt: getRecordDate(o).toISOString(),
        })),
      });
    });
  } catch (error: any) {
    console.error("Error en resumen gerencial:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al calcular métricas de gerencia" },
      { status: 500 }
    );
  }
}
