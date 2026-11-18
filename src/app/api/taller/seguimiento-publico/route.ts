import { NextRequest, NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EtapaTaller = "Diagnóstico" | "Reparación" | "Listo" | "Entregado";
type EstadoOperativo = "Trabajando" | "En Pausa" | "En Espera";

function mapearEtapaTaller(
  statusRaw: string | null | undefined,
  progressRaw?: number | null
): EtapaTaller {
  const s = String(statusRaw || "").toLowerCase();
  const p = Number(progressRaw || 0);
  if (s.includes("entregad") || s.includes("pagad") || s.includes("finalizad") || p >= 100) {
    return "Entregado";
  }
  if (s.includes("listo") || s.includes("terminad") || s.includes("completad") || p >= 75) {
    return "Listo";
  }
  if (
    s.includes("repar") ||
    s.includes("trabaj") ||
    s.includes("proceso") ||
    s.includes("ejecuc") ||
    p >= 45
  ) {
    return "Reparación";
  }
  return "Diagnóstico";
}

function mapearEstadoOperativo(
  statusRaw: string | null | undefined,
  quoteStatusRaw?: string | null
): EstadoOperativo {
  const s = String(statusRaw || "").toLowerCase();
  const q = String(quoteStatusRaw || "").toLowerCase();
  if (s.includes("paus")) {
    return "En Pausa";
  }
  if (
    s.includes("espera") ||
    (q && !q.includes("aprobad") && !s.includes("proceso") && !s.includes("repar") && !s.includes("listo") && !s.includes("entregad"))
  ) {
    return "En Espera";
  }
  return "Trabajando";
}

function normalizarPlaca(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function variantesPlaca(raw: string): string[] {
  const upper = raw.trim().toUpperCase();
  const norm = normalizarPlaca(raw);
  const set = new Set<string>();
  if (upper) set.add(upper);
  if (norm) {
    set.add(norm);
    const match = norm.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      set.add(`${match[1]}-${match[2]}`);
    }
  }
  return Array.from(set);
}

function extraerPrimeraFoto(jsonRaw: string | null | undefined): string | null {
  if (!jsonRaw) return null;
  try {
    const parsed = JSON.parse(jsonRaw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const primera = parsed[0];
      return typeof primera === "string" ? primera : primera?.url || null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const placaParam = req.nextUrl.searchParams.get("placa") || "";
    const placaNorm = normalizarPlaca(placaParam);

    // Nunca exponer vehículos de otros clientes sin una placa específica
    if (placaNorm.length < 3) {
      return NextResponse.json({
        success: true,
        vehiculos: [],
        searched: false,
      });
    }

    const variantes = variantesPlaca(placaParam);
    const plateConditions = variantes.map((v) => ({
      plate: { equals: v, mode: "insensitive" as const },
    }));

    const vehiculoEncontrado = await withRetry(() =>
      prisma.vehicle.findFirst({
        where: { OR: plateConditions },
        select: {
          id: true,
          customerId: true,
          plate: true,
        },
      })
    );

    const ordenEncontrada = await withRetry(() =>
      prisma.workshopOrder.findFirst({
        where: { OR: plateConditions },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          customerId: true,
          vehicleId: true,
          plate: true,
        },
      })
    );

    if (!vehiculoEncontrado && !ordenEncontrada) {
      return NextResponse.json({
        success: true,
        vehiculos: [],
        searched: true,
      });
    }

    const customerId =
      vehiculoEncontrado?.customerId || ordenEncontrada?.customerId || null;

    const resultados: Array<{
      id: string;
      orderNumber: string | null;
      vehicle: string;
      brand: string | null;
      model: string | null;
      year: number | null;
      plate: string;
      color: string | null;
      imageUrl: string | null;
      etapa: EtapaTaller | null;
      estadoOperativo: EstadoOperativo | null;
      progress: number;
      updatedAt: Date | null;
    }> = [];

    const placasAgregadas = new Set<string>();

    if (customerId) {
      // Traer únicamente los vehículos de ESTE cliente
      const vehiculosCliente = await withRetry(() =>
        prisma.vehicle.findMany({
          where: { customerId },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            year: true,
            color: true,
            imageUrl: true,
            photosJson: true,
            updatedAt: true,
            workshopOrders: {
              take: 1,
              orderBy: { updatedAt: "desc" },
              select: {
                id: true,
                orderNumber: true,
                vehicle: true,
                status: true,
                quoteStatus: true,
                progress: true,
                updatedAt: true,
                receptionPhotosJson: true,
              },
            },
          },
        })
      );

      for (const v of vehiculosCliente) {
        const ultimaOrden = v.workshopOrders[0] || null;
        const foto =
          v.imageUrl ||
          extraerPrimeraFoto(v.photosJson) ||
          null;

        const nombreVehiculo =
          [v.brand, v.model].filter(Boolean).join(" ").trim() ||
          ultimaOrden?.vehicle?.trim() ||
          "Vehículo";

        resultados.push({
          id: ultimaOrden?.id || v.id,
          orderNumber: ultimaOrden?.orderNumber || null,
          vehicle: nombreVehiculo,
          brand: v.brand || null,
          model: v.model || null,
          year: v.year ?? null,
          plate: v.plate,
          color: v.color || null,
          imageUrl: foto,
          etapa: ultimaOrden ? mapearEtapaTaller(ultimaOrden.status, ultimaOrden.progress) : null,
          estadoOperativo: ultimaOrden ? mapearEstadoOperativo(ultimaOrden.status, ultimaOrden.quoteStatus) : null,
          progress: ultimaOrden ? Number(ultimaOrden.progress || 0) : 0,
          updatedAt: ultimaOrden?.updatedAt || v.updatedAt || null,
        });

        placasAgregadas.add(normalizarPlaca(v.plate));
      }

      // Incluir órdenes del mismo cliente que no tengan Vehicle vinculado
      const ordenesSueltas = await withRetry(() =>
        prisma.workshopOrder.findMany({
          where: { customerId },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            vehicle: true,
            plate: true,
            status: true,
            quoteStatus: true,
            progress: true,
            updatedAt: true,
            receptionPhotosJson: true,
          },
        })
      );

      for (const o of ordenesSueltas) {
        const norm = normalizarPlaca(o.plate);
        if (placasAgregadas.has(norm)) continue;
        placasAgregadas.add(norm);

        resultados.push({
          id: o.id,
          orderNumber: o.orderNumber,
          vehicle: o.vehicle?.trim() || "Vehículo",
          brand: null,
          model: o.vehicle?.trim() || null,
          year: null,
          plate: o.plate,
          color: null,
          imageUrl: null,
          etapa: mapearEtapaTaller(o.status, o.progress),
          estadoOperativo: mapearEstadoOperativo(o.status, o.quoteStatus),
          progress: Number(o.progress || 0),
          updatedAt: o.updatedAt,
        });
      }
    } else if (ordenEncontrada) {
      // Orden sin customerId vinculado: devolver únicamente esa placa específica
      const ordenesPlaca = await withRetry(() =>
        prisma.workshopOrder.findMany({
          where: { OR: plateConditions },
          take: 1,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            vehicle: true,
            plate: true,
            status: true,
            quoteStatus: true,
            progress: true,
            updatedAt: true,
            receptionPhotosJson: true,
            vehicleRef: {
              select: {
                brand: true,
                model: true,
                year: true,
                color: true,
                imageUrl: true,
                photosJson: true,
              },
            },
          },
        })
      );

      for (const o of ordenesPlaca) {
        const nombreVehiculo =
          [o.vehicleRef?.brand, o.vehicleRef?.model].filter(Boolean).join(" ").trim() ||
          o.vehicle?.trim() ||
          "Vehículo";

        resultados.push({
          id: o.id,
          orderNumber: o.orderNumber,
          vehicle: nombreVehiculo,
          brand: o.vehicleRef?.brand || null,
          model: o.vehicleRef?.model || o.vehicle?.trim() || null,
          year: o.vehicleRef?.year ?? null,
          plate: o.plate,
          color: o.vehicleRef?.color || null,
          imageUrl:
            o.vehicleRef?.imageUrl ||
            extraerPrimeraFoto(o.vehicleRef?.photosJson) ||
            null,
          etapa: mapearEtapaTaller(o.status, o.progress),
          estadoOperativo: mapearEstadoOperativo(o.status, o.quoteStatus),
          progress: Number(o.progress || 0),
          updatedAt: o.updatedAt,
        });
      }
    }

    // Ordenar poniendo primero la placa buscada exactamente
    resultados.sort((a, b) => {
      const aMatch = normalizarPlaca(a.plate) === placaNorm ? 0 : 1;
      const bMatch = normalizarPlaca(b.plate) === placaNorm ? 0 : 1;
      return aMatch - bMatch;
    });

    return NextResponse.json({
      success: true,
      vehiculos: resultados,
      searched: true,
    });
  } catch (err: any) {
    console.error("Error en seguimiento-publico:", err);
    return NextResponse.json(
      { success: false, error: "Error al consultar el vehículo" },
      { status: 500 }
    );
  }
}
