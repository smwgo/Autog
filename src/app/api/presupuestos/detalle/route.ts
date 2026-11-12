import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET: Obtener el expediente completo de una orden de trabajo para el presupuestista.
 * Incluye datos de cliente/vehículo, inventario de recepción, hallazgos de inspección,
 * evidencias multimedia con audio + transcripciones en Neon, y repuestos/servicios presupuestados.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("orderNumber");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID o número de orden requerido" },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      // 1. Obtener la orden principal
      let order: any = null;
      try {
        order = await prisma.workshopOrder.findFirst({
          where: {
            OR: [
              { id },
              { orderNumber: id },
              { orderNumber: id.replace(/\bOT\b/gi, "").replace(/#+/g, "").trim() },
            ],
          },
        });
      } catch {
        order = null;
      }

      if (!order) {
        const rows = (await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          id
        ).catch(() => [])) as any[];
        if (rows && rows.length > 0) order = rows[0];
      }

      if (!order) {
        return NextResponse.json(
          { success: false, error: "Orden no encontrada" },
          { status: 404 }
        );
      }

      // 1.1 Obtener datos y fotos de perfil de Cliente y Vehículo
      let clientPhoto: string | null = null;
      let customerRecord: any = null;
      try {
        const idSearch = (order.clientIdDoc || "").trim();
        const nameSearch = (order.client || "").trim();
        const custId = order.customerId;

        if (custId || idSearch || nameSearch) {
          try {
            customerRecord = await (prisma as any).customer.findFirst({
              where: {
                OR: [
                  custId ? { id: custId } : null,
                  idSearch ? { identification: idSearch } : null,
                  nameSearch ? { name: nameSearch } : null,
                ].filter(Boolean) as any,
              },
            });
          } catch {}

          if (!customerRecord) {
            const cRows = (await prisma.$queryRawUnsafe(
              `SELECT * FROM "Customer" WHERE "id" = $1 OR "identification" = $2 OR "name" ILIKE $3 LIMIT 1`,
              custId || "",
              idSearch || "",
              nameSearch || ""
            ).catch(() => [])) as any[];
            if (cRows && cRows.length > 0) customerRecord = cRows[0];
          }
        }
      } catch (cErr) {
        console.warn("Aviso al buscar datos de cliente:", cErr);
      }

      if (customerRecord) {
        clientPhoto = customerRecord.avatar || customerRecord.imageUrl || null;
      }

      let vehiclePhoto: string | null = null;
      let vehicleRecord: any = null;
      try {
        const plateSearch = (order.plate || "").trim();
        const vehId = order.vehicleId;

        if (vehId || plateSearch) {
          try {
            vehicleRecord = await (prisma as any).vehicle.findFirst({
              where: {
                OR: [
                  vehId ? { id: vehId } : null,
                  plateSearch ? { plate: plateSearch } : null,
                ].filter(Boolean) as any,
              },
            });
          } catch {}

          if (!vehicleRecord) {
            const vRows = (await prisma.$queryRawUnsafe(
              `SELECT * FROM "Vehicle" WHERE "id" = $1 OR "plate" ILIKE $2 LIMIT 1`,
              vehId || "",
              plateSearch || ""
            ).catch(() => [])) as any[];
            if (vRows && vRows.length > 0) vehicleRecord = vRows[0];
          }
        }
      } catch (vErr) {
        console.warn("Aviso al buscar datos de vehículo:", vErr);
      }

      if (vehicleRecord) {
        let vImg = vehicleRecord.imageUrl || null;
        if (vImg && (vImg.startsWith("blob:") || !vImg.trim())) {
          vImg = null;
        }
        vehiclePhoto = vImg;
      }

      // 1.2 Calcular historial: si ha venido antes o es primera vez
      let previousVisitsCount = 0;
      try {
        const pPlate = (order.plate || "").trim();
        const pIdDoc = (order.clientIdDoc || "").trim();
        const pCustId = (order.customerId || "").trim();
        if (pPlate || pIdDoc || pCustId) {
          const countRows = (await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int AS count FROM "WorkshopOrder" 
             WHERE "id" != $1 
               AND (
                 ($2 != '' AND "plate" ILIKE $2) 
                 OR ($3 != '' AND "clientIdDoc" = $3) 
                 OR ($4 != '' AND "customerId" = $4)
               )`,
            order.id || "",
            pPlate ? `%${pPlate}%` : "",
            pIdDoc,
            pCustId
          ).catch(() => [])) as any[];
          previousVisitsCount = Number(countRows?.[0]?.count || 0);
        }
      } catch (errCount) {
        console.warn("Aviso al contar historial de visitas:", errCount);
      }

      // 2. Obtener todas las evidencias multimedia asociadas desde Neon
      let evRows: any[] = [];
      try {
        evRows = await prisma.workshopEvidence.findMany({
          where: {
            OR: [
              { orderId: order.id },
              { orderNumber: order.orderNumber },
              { plate: { contains: order.plate || "" } },
            ],
            uploadStatus: "COMPLETED",
          },
          orderBy: { createdAt: "asc" },
        });
      } catch {
        evRows = ((await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopEvidence" 
           WHERE ("orderId" = $1 OR "orderNumber" = $2 OR "plate" ILIKE $3)
             AND "uploadStatus" = 'COMPLETED'
           ORDER BY "createdAt" ASC`,
          order.id,
          order.orderNumber,
          (order.plate || "").trim()
        ).catch(() => [])) as any[]) || [];
      }

      const evidencias = evRows.map((ev: any) => ({
        id: ev.id,
        type: ev.type, // 'image' | 'video' | 'audio'
        r2Key: ev.r2Key,
        mimeType: ev.mimeType,
        fileSizeBytes: Number(ev.fileSizeBytes || 0),
        durationSeconds: ev.durationSeconds ? Number(ev.durationSeconds) : null,
        transcriptionText: ev.transcriptionText || null,
        transcriptionStatus: ev.transcriptionStatus || "NOT_APPLICABLE",
        uploadedBy: ev.uploadedBy,
        url: `/api/storage/download?key=${encodeURIComponent(ev.r2Key)}`,
        createdAt: ev.createdAt ? new Date(ev.createdAt).toISOString() : null,
      }));

      // 3. Parsear JSONs operativos de la orden
      let items: any[] = [];
      let services: any[] = [];
      let inspectionFindings: any[] = [];
      let receptionInventory: any[] = [];

      try {
        items = typeof order.itemsJson === "string" ? JSON.parse(order.itemsJson) : (order.itemsJson || []);
      } catch { items = []; }

      try {
        services = typeof order.servicesJson === "string" ? JSON.parse(order.servicesJson) : (order.servicesJson || []);
      } catch { services = []; }

      try {
        inspectionFindings = typeof order.inspectionFindingsJson === "string" ? JSON.parse(order.inspectionFindingsJson) : (order.inspectionFindingsJson || []);
      } catch { inspectionFindings = []; }

      try {
        receptionInventory = typeof order.receptionInventoryJson === "string" ? JSON.parse(order.receptionInventoryJson) : (order.receptionInventoryJson || []);
      } catch { receptionInventory = []; }

      // 3.1 Unificar fotos guardadas en WorkshopOrder (receptionPhotos, evidencePhotos, photosJson, hallazgos de inspección)
      let receptionPhotos: string[] = [];
      let evidencePhotos: string[] = [];
      let photosJson: string[] = [];

      try {
        receptionPhotos = typeof order.receptionPhotosJson === "string" ? JSON.parse(order.receptionPhotosJson) : (order.receptionPhotosJson || []);
      } catch { receptionPhotos = []; }

      try {
        evidencePhotos = typeof order.evidencePhotosJson === "string" ? JSON.parse(order.evidencePhotosJson) : (order.evidencePhotosJson || []);
      } catch { evidencePhotos = []; }

      try {
        photosJson = typeof order.photosJson === "string" ? JSON.parse(order.photosJson) : (order.photosJson || []);
      } catch { photosJson = []; }

      const findingPhotos: string[] = [];
      if (Array.isArray(inspectionFindings)) {
        for (const f of inspectionFindings) {
          if (Array.isArray(f?.photos)) {
            for (const p of f.photos) {
              if (typeof p === "string" && p.trim()) findingPhotos.push(p.trim());
              else if (p && typeof p.url === "string") findingPhotos.push(p.url.trim());
            }
          }
          if (typeof f?.photoUrl === "string" && f.photoUrl.trim()) {
            findingPhotos.push(f.photoUrl.trim());
          }
        }
      }

      const seenUrls = new Set(evidencias.map((e: any) => e.url));
      const todasLasFotosOrden = [
        ...(Array.isArray(receptionPhotos) ? receptionPhotos : []),
        ...(Array.isArray(evidencePhotos) ? evidencePhotos : []),
        ...(Array.isArray(photosJson) ? photosJson : []),
        ...findingPhotos,
      ];

      todasLasFotosOrden.forEach((foto, i) => {
        if (!foto || typeof foto !== "string") return;
        const urlNormal = foto.startsWith("http") || foto.startsWith("/") || foto.startsWith("data:")
          ? foto
          : `/api/storage/download?key=${encodeURIComponent(foto)}`;
        if (!seenUrls.has(urlNormal) && !seenUrls.has(foto)) {
          seenUrls.add(urlNormal);
          seenUrls.add(foto);
          evidencias.push({
            id: `foto_ord_${i}_${Date.now()}`,
            type: "image",
            r2Key: foto,
            mimeType: "image/jpeg",
            fileSizeBytes: 0,
            durationSeconds: null,
            transcriptionText: null,
            transcriptionStatus: "NOT_APPLICABLE",
            uploadedBy: order.mechanic || "Taller",
            url: urlNormal,
            createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
          });
        }
      });

      // Auto-resolver vehiclePhoto si está vacía o era un blob temporal
      if (!vehiclePhoto) {
        const candidateEv = evidencias.find((e: any) => e.type === "image" && e.url && !e.url.startsWith("blob:"));
        if (candidateEv) {
          vehiclePhoto = candidateEv.url;
        } else {
          const candidatePhoto = todasLasFotosOrden.find((p: any) => typeof p === "string" && p.trim() && !p.startsWith("blob:"));
          if (candidatePhoto) {
            vehiclePhoto = candidatePhoto.startsWith("http") || candidatePhoto.startsWith("/") || candidatePhoto.startsWith("data:")
              ? candidatePhoto
              : `/api/storage/download?key=${encodeURIComponent(candidatePhoto)}`;
          }
        }

        // Si encontramos una foto real y hay registro de vehículo, guardar en Neon para persistencia
        if (vehiclePhoto && vehicleRecord?.id) {
          prisma.$executeRawUnsafe(
            `UPDATE "Vehicle" SET "imageUrl" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
            vehiclePhoto,
            vehicleRecord.id
          ).catch(() => {});
        }
      }

      // Normalizar estructura de repuestos para presupuestos y compras
      const repuestosNormalizados = items.map((it: any, index: number) => {
        const costPrice = Number(it.costPrice || it.cost || 0);
        const price = Number(it.price || 0);
        const qty = Number(it.qty || 1);
        const margin = price - costPrice;
        const marginPercent = price > 0 ? Math.round((margin / price) * 100) : 0;

        return {
          id: it.id || `rep_${index}_${Date.now()}`,
          productId: it.productId || null,
          findingId: it.findingId || null,
          code: it.code || `REP-${index + 1}`,
          name: it.name || it.description || "Repuesto / Insumo",
          category: it.category || "",
          qty,
          costPrice,
          price,
          subtotalVenta: Number((price * qty).toFixed(2)),
          subtotalCosto: Number((costPrice * qty).toFixed(2)),
          margin: Number((margin * qty).toFixed(2)),
          marginPercent,
          supplierId: it.supplierId || null,
          supplierName: it.supplierName || "Proveedor General",
          supplierPhone: it.supplierPhone || "",
          purchaseStatus: it.purchaseStatus || "POR_PEDIR", // POR_PEDIR, PEDIDO_WHATSAPP, COMPRADO, RECIBIDO
          notes: it.notes || "",
          imageUrl: it.imageUrl || it.photoUrl || it.image || (todasLasFotosOrden[index] ?? null),
          inStock: it.inStock !== undefined ? Boolean(it.inStock) : Boolean(it.purchaseStatus === "STOCK_LOCAL"),
          origin: it.origin || null,
        };
      });

      // Normalizar estructura de servicios / mano de obra
      const serviciosNormalizados = services.map((sv: any, index: number) => {
        const isString = typeof sv === "string";
        const name = isString ? sv : (sv.name || sv.description || "Servicio Técnico");
        const price = isString ? 0 : Number(sv.price || 0);
        const code = isString ? `SRV-${index + 1}` : (sv.code || `SRV-${index + 1}`);
        const category = isString ? "Mano de Obra" : (sv.category || "Mano de Obra");
        return {
          id: sv.id || `srv_${index}_${Date.now()}`,
          findingId: sv.findingId || null,
          code,
          name,
          category,
          price,
          estimatedMinutes: Number(sv.estimatedMinutes || 30),
          mechanic: sv.mechanic || order.mechanic || "Taller",
          imageUrl: sv.imageUrl || sv.photoUrl || null,
          origin: sv.origin || null,
          notes: sv.notes || "",
        };
      });

      // 4. Obtener proveedores disponibles para el autocompletado
      let proveedores: any[] = [];
      try {
        proveedores = await prisma.supplier.findMany({
          where: { status: "Activo" },
          orderBy: { name: "asc" },
        });
      } catch {
        proveedores = ((await prisma.$queryRawUnsafe(
          `SELECT "id", "name", "contact", "phone", "email" FROM "Supplier" WHERE "status" = 'Activo' ORDER BY "name" ASC`
        ).catch(() => [])) as any[]) || [];
      }

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          vehicle: order.vehicle,
          plate: order.plate,
          client: order.client,
          clientPhone: order.clientPhone,
          clientIdDoc: order.clientIdDoc,
          mechanic: order.mechanic ? order.mechanic.replace(/\s*\([^)]*\)/g, "").trim() : "",
          status: order.status,
          progress: Number(order.progress || 0),
          mileage: order.mileage,
          fuelLevel: order.fuelLevel,
          generalCondition: order.generalCondition,
          notes: order.notes,
          dateIn: order.dateIn,
          createdAt: order.createdAt,
          quoteNumber: order.quoteNumber || `COT-${order.orderNumber}`,
          quoteStatus: order.quoteStatus || (order.status === "EN_CAJA" ? "Aprobado" : "Borrador"),
          quoteApprovedAt: order.quoteApprovedAt,
          quoteTaxRate: Number(order.quoteTaxRate || 15),
          quoteDiscount: Number(order.quoteDiscount || 0),
          posRequestId: order.posRequestId,
          items: repuestosNormalizados,
          services: serviciosNormalizados,
          inspectionFindings,
          receptionInventory,
          evidencias,
          photos: todasLasFotosOrden,
          evidencePhotos,
          receptionPhotos,
          clientPhoto: clientPhoto && !clientPhoto.startsWith("blob:") ? clientPhoto : (customerRecord?.avatar && !customerRecord.avatar.startsWith("blob:") ? customerRecord.avatar : (customerRecord?.imageUrl && !customerRecord.imageUrl.startsWith("blob:") ? customerRecord.imageUrl : null)),
          vehiclePhoto: vehiclePhoto && !vehiclePhoto.startsWith("blob:") ? vehiclePhoto : null,
          customerId: customerRecord?.id || order.customerId || null,
          vehicleId: vehicleRecord?.id || order.vehicleId || null,
          customerType: customerRecord?.type || "Personal",
          previousVisitsCount,
          isFirstVisit: previousVisitsCount === 0,
        },
        proveedores,
      });
    });
  } catch (error: any) {
    console.error("Error al obtener detalle de orden en Presupuestos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al cargar detalle de la orden." },
      { status: 500 }
    );
  }
}
