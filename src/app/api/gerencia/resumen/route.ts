import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "este_mes";
    const desdeParam = searchParams.get("desde");
    const hastaParam = searchParams.get("hasta");

    return await withRetry(async () => {
      // 1. Determinar rango de fechas
      const now = new Date();
      let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const mesCorto = (d: Date) => d.toLocaleString("es-ES", { month: "short" }).toUpperCase().replace(".", "");
      const pad2 = (n: number) => String(n).padStart(2, "0");

      let dateLabel = `${pad2(1)} ${mesCorto(now)} ${now.getFullYear()} — ${pad2(endDate.getDate())} ${mesCorto(now)} ${now.getFullYear()}`;

      if (periodo === "hoy") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        dateLabel = `HOY, ${pad2(now.getDate())} ${mesCorto(now)} ${now.getFullYear()}`;
      } else if (periodo === "esta_semana") {
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
        endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000 + 86399999);
        dateLabel = `${pad2(startDate.getDate())} ${mesCorto(startDate)} — ${pad2(endDate.getDate())} ${mesCorto(endDate)} ${now.getFullYear()}`;
      } else if (periodo === "este_anio") {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        dateLabel = `AÑO ${now.getFullYear()} (ENE — DIC)`;
      } else if (periodo === "todo") {
        startDate = new Date(2020, 0, 1);
        endDate = new Date(now.getFullYear() + 1, 11, 31);
        dateLabel = `HISTÓRICO COMPLETO`;
      } else if (desdeParam && hastaParam) {
        startDate = new Date(desdeParam);
        endDate = new Date(hastaParam);
        dateLabel = `${pad2(startDate.getDate())} ${mesCorto(startDate)} — ${pad2(endDate.getDate())} ${mesCorto(endDate)} ${endDate.getFullYear()}`;
      }

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // 2. Consultar ventas en periodo y hoy
      const [salesPeriod, salesToday, workshopOrders, posCredits, cashMovements] = await Promise.all([
        prisma.sale.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
          select: { id: true, total: true, paymentMethod: true, createdAt: true },
        }).catch(() => []),
        prisma.sale.findMany({
          where: { createdAt: { gte: todayStart, lte: todayEnd } },
          select: { id: true, total: true },
        }).catch(() => []),
        prisma.workshopOrder.findMany({
          select: { id: true, orderNumber: true, status: true, client: true, vehicle: true, plate: true, totalCost: true, createdAt: true, completedAt: true },
        }).catch(() => []),
        prisma.posCreditAccount.findMany({
          select: { id: true, currentBalance: true, status: true },
        }).catch(() => []),
        prisma.cashMovement.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
          select: { id: true, amount: true, type: true, createdAt: true },
        }).catch(() => []),
      ]);

      // 3. Cálculos de Facturación y Cobro
      const ventasTotal = salesPeriod.reduce((acc, s) => acc + Number(s.total || 0), 0);
      
      const ordersInPeriod = workshopOrders.filter((o) => {
        const d = new Date(o.completedAt || o.createdAt);
        return d >= startDate && d <= endDate;
      });
      const tallerFacturado = ordersInPeriod.reduce((acc, o) => acc + Number(o.totalCost || 0), 0);

      // 1. VENTAS TOTALES / FACTURACIÓN TOTAL (Taller + Lubricentro + Tienda)
      const ventasTotales = Number((ventasTotal + tallerFacturado).toFixed(2));

      // 2. COBRADO EN CAJA: Ventas de contado/transferencia + Órdenes terminadas/cobradas
      const cobradoVentas = salesPeriod.reduce((acc, s) => {
        if (s.paymentMethod === "Crédito") return acc;
        return acc + Number(s.total || 0);
      }, 0);
      const tallerCobrado = ordersInPeriod.reduce((acc, o) => {
        const st = (o.status || "").toLowerCase();
        if (st.includes("finaliz") || st.includes("entregad") || st.includes("caja")) {
          return acc + Number(o.totalCost || 0);
        }
        return acc;
      }, 0);
      const cobradoEnCaja = Number((cobradoVentas + tallerCobrado).toFixed(2));

      // 3. $ HOY: Facturación y órdenes del día de hoy
      const ordersToday = workshopOrders.filter((o) => {
        const d = new Date(o.completedAt || o.createdAt);
        return d >= todayStart && d <= todayEnd;
      });
      const tallerHoy = ordersToday.reduce((acc, o) => acc + Number(o.totalCost || 0), 0);
      const ventasHoy = salesToday.reduce((acc, s) => acc + Number(s.total || 0), 0);
      const montoHoy = Number((ventasHoy + tallerHoy).toFixed(2));

      // 4. TICKET PROMEDIO POR AUTO / ORDEN
      const totalTransacciones = salesPeriod.length + ordersInPeriod.length;
      const ticketPromedio = totalTransacciones > 0
        ? Number((ventasTotales / totalTransacciones).toFixed(2))
        : 0;

      // 5. AUTOS EN PISTA: Vehículos en atención en bahías de taller y lubricentro
      const autosEnPista = workshopOrders.filter((o) => {
        const st = (o.status || "").toLowerCase();
        return !st.includes("finaliz") && !st.includes("entregad") && !st.includes("cancelad");
      }).length;

      // 6. AUTOS ENTREGADOS / SERVICIOS COMPLETADOS
      const ordenesTerminadas = workshopOrders.filter((o) => {
        const st = (o.status || "").toLowerCase();
        return st.includes("finaliz") || st.includes("entregad") || st.includes("caja");
      }).length;
      const autosEntregados = salesPeriod.length + ordenesTerminadas;

      // 7. GASTOS Y REPUESTOS: Salidas de caja menor, compras operativas
      const gastosYRepuestos = Number(
        cashMovements
          .filter((m) => m.type === "GASTO" || m.type === "RETIRO")
          .reduce((acc, m) => acc + Number(m.amount || 0), 0)
          .toFixed(2)
      );

      // 8. CUENTAS POR COBRAR: Créditos pendientes de cobro a clientes
      const carteraCreditoTotal = Number(
        posCredits.reduce((acc, c) => acc + Number(c.currentBalance || 0), 0).toFixed(2)
      );
      const cuentasPorCobrar = carteraCreditoTotal;

      // 9. CÁLCULO REAL DE GRÁFICO SEMANAL (Lunes a Domingo) sin Mock Data
      const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const weekOrder = [1, 2, 3, 4, 5, 6, 0]; // Lun a Dom

      const dayData = weekOrder.map((dayIdx) => {
        const dayLabel = dayNames[dayIdx];
        const daySales = salesPeriod
          .filter((s) => new Date(s.createdAt).getDay() === dayIdx)
          .reduce((acc, s) => acc + Number(s.total || 0), 0);
        const dayOrders = ordersInPeriod
          .filter((o) => new Date(o.completedAt || o.createdAt).getDay() === dayIdx)
          .reduce((acc, o) => acc + Number(o.totalCost || 0), 0);
        const income = Number((daySales + dayOrders).toFixed(2));

        const expense = Number(
          cashMovements
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
        // Compatibilidad con vistas previas
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
          // Compatibilidad con nombres anteriores
          capitalActivo: ventasTotales,
          cobrado: cobradoEnCaja,
          autosActivos: autosEnPista,
          pagadosTotal: autosEntregados,
          egresosTotal: gastosYRepuestos,
          moraTotal: cuentasPorCobrar,
          carteraCreditoTotal,
        },
        weeklyChart,
        ultimasOrdenes: workshopOrders.slice(0, 8).map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          client: o.client,
          vehicle: o.vehicle,
          status: o.status,
          amount: Number(o.totalCost || 0),
          createdAt: o.createdAt,
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
