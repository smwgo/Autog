import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET: Listar órdenes de trabajo para el panel de Presupuestos & Repuestos.
 * Incluye conteo de evidencias multimedia (fotos, audios, videos) y estado de cotización/compras.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase() || "";
    const estado = searchParams.get("estado") || "TODOS";
    const tipo = searchParams.get("tipo") || "TODOS"; // Taller, Lubricentro, Carwash, Tecnicentro
    const branch = searchParams.get("branch") || "PRINCIPAL";

    return await withRetry(async () => {
      // Garantizar que la tabla WorkshopEvidence existe para evitar errores en joins
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "WorkshopEvidence" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "orderId" TEXT,
          "orderNumber" TEXT,
          "vehicleId" TEXT,
          "plate" TEXT,
          "type" TEXT NOT NULL,
          "r2Key" TEXT NOT NULL,
          "mimeType" TEXT NOT NULL,
          "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
          "durationSeconds" INTEGER,
          "transcriptionText" TEXT,
          "uploadStatus" TEXT NOT NULL DEFAULT 'COMPLETED',
          "transcriptionStatus" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
          "uploadedBy" TEXT,
          "clientTempId" TEXT,
          "branch" TEXT DEFAULT 'PRINCIPAL',
          "metadataJson" TEXT DEFAULT '{}',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(() => {});

      let query = `
        SELECT 
          o."id",
          o."orderNumber",
          o."customerId",
          o."vehicleId",
          o."vehicle",
          o."plate",
          o."client",
          o."clientPhone",
          o."mechanic",
          o."status",
          o."progress",
          o."mileage",
          o."fuelLevel",
          o."notes",
          o."dateIn",
          o."totalCost",
          o."quoteNumber",
          o."quoteStatus",
          o."quoteApprovedAt",
          o."quoteTaxRate",
          o."quoteDiscount",
          o."itemsJson",
          o."servicesJson",
          o."inspectionFindingsJson",
          o."receptionPhotosJson",
          o."evidencePhotosJson",
          o."posRequestId",
          o."branch",
          o."createdAt",
          o."updatedAt",
          COALESCE(ev.total_evidencias, 0) as total_evidencias,
          COALESCE(ev.total_fotos, 0) as total_fotos,
          COALESCE(ev.total_audios, 0) as total_audios,
          COALESCE(ev.total_videos, 0) as total_videos,
          COALESCE(ev.total_transcripciones, 0) as total_transcripciones
        FROM "WorkshopOrder" o
        LEFT JOIN (
          SELECT 
            COALESCE("orderId", "orderNumber") as ord_ref,
            COUNT(*) as total_evidencias,
            COUNT(CASE WHEN "type" = 'image' THEN 1 END) as total_fotos,
            COUNT(CASE WHEN "type" = 'audio' THEN 1 END) as total_audios,
            COUNT(CASE WHEN "type" = 'video' THEN 1 END) as total_videos,
            COUNT(CASE WHEN "transcriptionText" IS NOT NULL AND length("transcriptionText") > 0 THEN 1 END) as total_transcripciones
          FROM "WorkshopEvidence"
          WHERE "uploadStatus" = 'COMPLETED'
          GROUP BY ord_ref
        ) ev ON (ev.ord_ref = o."id" OR ev.ord_ref = o."orderNumber")
        WHERE 1=1
      `;

      const params: any[] = [];
      let pIdx = 1;

      // Filtro de búsqueda textual (placa, cliente, orden, vehículo, mecánico)
      if (busqueda) {
        query += ` AND (
          LOWER(o."plate") LIKE $${pIdx} OR 
          LOWER(o."client") LIKE $${pIdx} OR 
          LOWER(o."orderNumber") LIKE $${pIdx} OR 
          LOWER(o."vehicle") LIKE $${pIdx} OR
          LOWER(COALESCE(o."mechanic", '')) LIKE $${pIdx}
        )`;
        params.push(`%${busqueda}%`);
        pIdx++;
      }

      // Filtro por estado de cotización / presupuesto
      if (estado !== "TODOS") {
        if (estado === "PENDIENTE") {
          query += ` AND (o."quoteStatus" IS NULL OR o."quoteStatus" = 'Borrador' OR o."quoteStatus" = 'Pendiente' OR o."quoteStatus" = '')`;
        } else if (estado === "APROBADO") {
          query += ` AND (o."quoteStatus" = 'Aprobado' OR o."quoteStatus" = 'AUTORIZADO')`;
        } else if (estado === "EN_CAJA") {
          query += ` AND (o."status" = 'EN_CAJA' OR o."posRequestId" IS NOT NULL)`;
        } else {
          query += ` AND (o."status" ILIKE $${pIdx} OR o."quoteStatus" ILIKE $${pIdx})`;
          params.push(`%${estado}%`);
          pIdx++;
        }
      }

      // Filtro por tipo de negocio (Taller, Lubricentro, Carwash, Tecnicentro)
      if (tipo !== "TODOS") {
        query += ` AND (
          LOWER(COALESCE(o."notes", '')) LIKE $${pIdx} OR 
          LOWER(COALESCE(o."servicesJson", '')) LIKE $${pIdx} OR
          LOWER(COALESCE(o."itemsJson", '')) LIKE $${pIdx}
        )`;
        params.push(`%${tipo.toLowerCase()}%`);
        pIdx++;
      }

      query += ` ORDER BY o."createdAt" DESC LIMIT 150`;

      let rows: any[] = [];
      try {
        rows = (await prisma.$queryRawUnsafe(query, ...params)) as any[];
      } catch {
        rows = (await prisma.workshopOrder.findMany({
          orderBy: { createdAt: "desc" },
          take: 150,
        }).catch(() => [])) as any[];
      }

      // Mapear órdenes con cálculo de totales y desglose de repuestos y servicios
      const ordenes = rows.map((r: any) => {
        let items: any[] = [];
        let services: any[] = [];
        let findings: any[] = [];

        try {
          items = typeof r.itemsJson === "string" ? JSON.parse(r.itemsJson) : (r.itemsJson || []);
        } catch { items = []; }

        try {
          services = typeof r.servicesJson === "string" ? JSON.parse(r.servicesJson) : (r.servicesJson || []);
        } catch { services = []; }

        try {
          findings = typeof r.inspectionFindingsJson === "string" ? JSON.parse(r.inspectionFindingsJson) : (r.inspectionFindingsJson || []);
        } catch { findings = []; }

        // Calcular costo total de compra y valor total de venta
        const totalVentaRepuestos = items.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.qty || 1)), 0);
        const totalCostoRepuestos = items.reduce((acc, it) => acc + (Number(it.costPrice || 0) * Number(it.qty || 1)), 0);
        const totalVentaServicios = services.reduce((acc, sv) => acc + Number(sv.price || 0), 0);
        const rawItemsSum = totalVentaRepuestos + totalVentaServicios;
        const totalVentaEstimada = rawItemsSum > 0 ? rawItemsSum : Number(r.totalCost || 0);
        const totalCostoEstimado = totalCostoRepuestos;
        const utilidadEstimada = totalVentaEstimada - totalCostoEstimado;
        const margenPercent = totalVentaEstimada > 0 ? Math.round((utilidadEstimada / totalVentaEstimada) * 100) : 0;

        // Determinar tipo de negocio según servicios o notas
        let tipoNegocio = "Taller";
        const combined = `${r.notes || ""} ${JSON.stringify(services)} ${JSON.stringify(items)}`.toLowerCase();
        if (combined.includes("lubri") || combined.includes("aceite") || combined.includes("filtro")) tipoNegocio = "Lubricentro";
        else if (combined.includes("lavado") || combined.includes("carwash") || combined.includes("encerado")) tipoNegocio = "Carwash";
        else if (combined.includes("tecni") || combined.includes("alineac") || combined.includes("balanceo")) tipoNegocio = "Tecnicentro";

        return {
          id: r.id,
          orderNumber: r.orderNumber,
          vehicle: r.vehicle,
          plate: r.plate,
          client: r.client,
          clientPhone: r.clientPhone,
          mechanic: r.mechanic,
          status: r.status,
          progress: Number(r.progress || 0),
          mileage: r.mileage,
          fuelLevel: r.fuelLevel,
          notes: r.notes,
          dateIn: r.dateIn,
          createdAt: r.createdAt,
          tipoNegocio,
          quoteNumber: r.quoteNumber || `COT-${r.orderNumber}`,
          quoteStatus: r.quoteStatus || (r.status === "EN_CAJA" ? "Aprobado" : "Pendiente"),
          quoteApprovedAt: r.quoteApprovedAt,
          posRequestId: r.posRequestId,
          itemsCount: items.length,
          servicesCount: services.length,
          findingsCount: findings.length,
          totalVentaEstimada: Number(totalVentaEstimada.toFixed(2)),
          totalCostoEstimado: Number(totalCostoEstimado.toFixed(2)),
          utilidadEstimada: Number(utilidadEstimada.toFixed(2)),
          margenPercent,
          evidencias: {
            total: Number(r.total_evidencias || 0),
            fotos: Number(r.total_fotos || 0),
            audios: Number(r.total_audios || 0),
            videos: Number(r.total_videos || 0),
            transcripciones: Number(r.total_transcripciones || 0),
          },
        };
      });

      // Si no hay órdenes en WorkshopOrder, revisar si existen en clientQuote
      if (ordenes.length === 0) {
        try {
          const quotes: any[] = await prisma.clientQuote.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
          });
          if (quotes && quotes.length > 0) {
            for (const q of quotes) {
              let items: any[] = [];
              try {
                items = typeof q.itemsJson === "string" ? JSON.parse(q.itemsJson) : (q.itemsJson || []);
              } catch { items = []; }
              const totalEst = Number(q.total || q.subtotal || 0);
              ordenes.push({
                id: q.id,
                orderNumber: q.quoteNumber || `COT-${q.id.slice(-4)}`,
                vehicle: q.vehicle || "Vehículo Taller",
                plate: q.plate || "S/P",
                client: q.clientName || "Cliente",
                clientPhone: q.clientPhone || "",
                mechanic: "Carlos Rodríguez",
                status: q.status === "Aprobado" || q.status === "Aprobada" ? "Listo POS" : "En Diagnóstico",
                progress: 25,
                mileage: null,
                fuelLevel: "1/2",
                notes: q.notes || "",
                dateIn: q.date || q.createdAt,
                createdAt: q.createdAt,
                tipoNegocio: "Taller",
                quoteNumber: q.quoteNumber || `COT-${q.id.slice(-4)}`,
                quoteStatus: q.status === "Aprobada" ? "Aprobado" : (q.status || "Pendiente"),
                quoteApprovedAt: q.status === "Aprobada" || q.status === "Aprobado" ? q.updatedAt : null,
                posRequestId: null,
                itemsCount: items.length,
                servicesCount: 0,
                findingsCount: 0,
                totalVentaEstimada: totalEst,
                totalCostoEstimado: 0,
                utilidadEstimada: totalEst,
                margenPercent: 100,
                evidencias: {
                  total: 0,
                  fotos: 0,
                  audios: 0,
                  videos: 0,
                  transcripciones: 0,
                },
              });
            }
          }
        } catch {}
      }

      // Filtrado exacto en memoria para búsquedas y estados
      let ordenesFiltradas = ordenes;
      if (busqueda) {
        ordenesFiltradas = ordenesFiltradas.filter(
          (o) =>
            o.plate.toLowerCase().includes(busqueda) ||
            o.client.toLowerCase().includes(busqueda) ||
            o.orderNumber.toLowerCase().includes(busqueda) ||
            o.vehicle.toLowerCase().includes(busqueda)
        );
      }
      if (estado !== "TODOS") {
        if (estado === "PENDIENTE") {
          ordenesFiltradas = ordenesFiltradas.filter(
            (o) => o.quoteStatus !== "Aprobado" && o.status !== "EN_CAJA"
          );
        } else if (estado === "APROBADO") {
          ordenesFiltradas = ordenesFiltradas.filter(
            (o) => o.quoteStatus === "Aprobado" || o.status === "EN_CAJA"
          );
        } else if (estado === "EN_CAJA") {
          ordenesFiltradas = ordenesFiltradas.filter(
            (o) => o.status === "EN_CAJA" || o.posRequestId
          );
        }
      }

      // Estadísticas rápidas para la cabecera
      const kpis = {
        total: ordenesFiltradas.length,
        pendientesCotizar: ordenesFiltradas.filter(
          (o) => o.quoteStatus !== "Aprobado" && o.status !== "EN_CAJA"
        ).length,
        aprobadas: ordenesFiltradas.filter(
          (o) => o.quoteStatus === "Aprobado" || o.status === "EN_CAJA"
        ).length,
        totalValorizado: Number(
          ordenesFiltradas.reduce((acc, o) => acc + o.totalVentaEstimada, 0).toFixed(2)
        ),
      };

      return NextResponse.json({
        success: true,
        kpis,
        ordenes: ordenesFiltradas,
      });
    });
  } catch (error: any) {
    console.error("Error al listar órdenes en Presupuestos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar órdenes de presupuesto." },
      { status: 500 }
    );
  }
}
