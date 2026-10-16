import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      ordersRes,
      inspectionsRes,
      tasksRes,
      historyRes,
      partsRes,
      timeRes,
    ]: any[] = await Promise.all([
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "WorkshopOrder"').catch(() => [{ count: 0 }]),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "WorkshopInspection"').catch(() => [{ count: 0 }]),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "WorkshopTask" WHERE "status" != \'done\'').catch(() => [{ count: 0 }]),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "WorkshopHistory"').catch(() => [{ count: 0 }]),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "WorkshopPartRequest"').catch(() => [{ count: 0 }]),
      prisma.$queryRawUnsafe('SELECT COALESCE(SUM("durationMinutes"), 0)::int as mins, COUNT(*)::int as count FROM "WorkshopTimeLog"').catch(() => [{ mins: 0, count: 0 }]),
    ]);

    const totalMins = Number(timeRes?.[0]?.mins || 0);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;

    return NextResponse.json({
      success: true,
      stats: {
        ordenes: Number(ordersRes?.[0]?.count || 0),
        inspecciones: Number(inspectionsRes?.[0]?.count || 0),
        tareasActivas: Number(tasksRes?.[0]?.count || 0),
        historial: Number(historyRes?.[0]?.count || 0),
        repuestos: Number(partsRes?.[0]?.count || 0),
        tiemposCount: Number(timeRes?.[0]?.count || 0),
        tiemposFormatted: `${hrs}h ${mins}m`,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener resumen de taller:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar resumen en Neon." },
      { status: 500 }
    );
  }
}
