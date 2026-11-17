import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedSessionFromRequest, isStaffSession } from "@/lib/signed-tokens";
import { resolveSessionCustomerScope } from "@/lib/client-scope";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = getVerifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }
    const staff = isStaffSession(session);

    if (!staff) {
      const scoped = await resolveSessionCustomerScope(session, true);
      if (!scoped) {
        return NextResponse.json({
          success: true,
          stats: { vehiculos: 0, citas: 0, historial: 0, cotizaciones: 0, facturas: 0, clientes: 0 },
        });
      }
      const plates = (scoped.vehicles || []).map((v) => v.plate.trim().toUpperCase()).filter(Boolean);
      const name = scoped.name.trim();
      const ident = scoped.identification.trim();

      const [citas, historial, cotizaciones, facturas] = await Promise.all([
        prisma.clientAppointment.count({
          where: {
            OR: [
              { clientName: { equals: name, mode: "insensitive" } },
              ...(plates.length > 0 ? [{ plate: { in: plates } }] : []),
            ],
          },
        }).catch(() => 0),
        prisma.workshopHistory.count({
          where: {
            OR: [
              { client: { equals: name, mode: "insensitive" } },
              ...(plates.length > 0 ? [{ plate: { in: plates } }] : []),
            ],
          },
        }).catch(() => 0),
        prisma.clientQuote.count({
          where: {
            OR: [
              { clientName: { equals: name, mode: "insensitive" } },
              ...(plates.length > 0 ? [{ plate: { in: plates } }] : []),
            ],
          },
        }).catch(() => 0),
        prisma.clientInvoice.count({
          where: {
            OR: [
              { clientName: { equals: name, mode: "insensitive" } },
              ...(ident && ident !== "XAXX010101000" ? [{ clientRfc: ident }] : []),
            ],
          },
        }).catch(() => 0),
      ]);

      return NextResponse.json({
        success: true,
        stats: {
          vehiculos: plates.length,
          citas,
          historial,
          cotizaciones,
          facturas,
          clientes: 1,
        },
      });
    }

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
