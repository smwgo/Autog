import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      vehiculosRes,
      citasRes,
      historialRes,
      cotizacionesRes,
      facturasRes,
      clientesRes,
    ]: any[] = await Promise.all([
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "Vehicle"').catch(() => [{ count: 0 }]),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "ClientAppointment"').catch(() => [{ count: 0 }]),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "WorkshopHistory"').catch(() => [{ count: 0 }]),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "ClientQuote"').catch(() => [{ count: 0 }]),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "ClientInvoice"').catch(() => [{ count: 0 }]),
      prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "Customer"').catch(() => [{ count: 0 }]),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        vehiculos: Number(vehiculosRes?.[0]?.count || 0),
        citas: Number(citasRes?.[0]?.count || 0),
        historial: Number(historialRes?.[0]?.count || 0),
        cotizaciones: Number(cotizacionesRes?.[0]?.count || 0),
        facturas: Number(facturasRes?.[0]?.count || 0),
        clientes: Number(clientesRes?.[0]?.count || 0),
      },
    });
  } catch (error: any) {
    console.error("Error al obtener resumen de cliente:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar resumen en base de datos." },
      { status: 500 }
    );
  }
}
