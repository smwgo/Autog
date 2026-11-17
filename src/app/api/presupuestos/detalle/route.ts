import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { signSupplierScope } from "@/lib/signed-tokens";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function limpiarNum(val?: string | null): string {
  if (!val) return "";
  return String(val)
    .replace(/\b(COT|COTIZACION|COTIZACIÓN|OT|ORD)\b[-\s#]*/gi, "")
    .replace(/#+/g, "")
    .trim()
    .toLowerCase();
}

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
      const cleanId = limpiarNum(id);

      // 1. Obtener la orden principal (sin importar si está Pagada, Pendiente, Aprobada o Pausada)
      let order: any = null;
      try {
        order = await prisma.workshopOrder.findFirst({
          where: {
            OR: [
              { id },
              { orderNumber: id },
              { quoteNumber: id },
              { orderNumber: id.replace(/\bOT\b/gi, "").replace(/#+/g, "").trim() },
            ],
          },
        });
      } catch {
        order = null;
      }

      if (!order) {
        const rows = (await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 OR "quoteNumber" = $1 LIMIT 1`,
          id
        ).catch(() => [])) as any[];
        if (rows && rows.length > 0) order = rows[0];
      }

      // 1.0b Fallback directo sobre el mirror local (por si la orden fue guardada o pagada en mirror)
      if (!order) {
        try {
          const mirrorPath = path.join(process.cwd(), "prisma", "neon-local-mirror.json");
          if (fs.existsSync(mirrorPath)) {
            const mirrorData = JSON.parse(fs.readFileSync(mirrorPath, "utf-8"));
            if (Array.isArray(mirrorData?.workshopOrder) && mirrorData.workshopOrder.length > 0) {
              order =
                mirrorData.workshopOrder.find(
                  (mo: any) =>
                    mo?.id === id ||
                    mo?.orderNumber === id ||
                    mo?.quoteNumber === id ||
                    (cleanId && limpiarNum(mo?.orderNumber) === cleanId) ||
                    (cleanId && limpiarNum(mo?.quoteNumber) === cleanId)
                ) || null;
            }
          }
        } catch {}
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
          await prisma.$executeRawUnsafe(
            `UPDATE "Vehicle" SET "imageUrl" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
            vehiclePhoto,
            vehicleRecord.id
          ).catch(() => {});
        }
      }

      // Cargar catálogo de productos y servicios para resolver precios de ítems no manuales con precio 0
      let catalogProducts: any[] = [];
      let catalogServices: any[] = [];
      try {
        const [pRows, sRows] = await Promise.all([
          prisma.$queryRawUnsafe(`SELECT "id", "code", "name", "price" FROM "Product"`).catch(() => []),
          prisma.$queryRawUnsafe(`SELECT "id", "code", "name", "price" FROM "WorkshopService"`).catch(() => []),
        ]);
        if (Array.isArray(pRows)) catalogProducts = pRows;
        if (Array.isArray(sRows)) catalogServices = sRows;
      } catch {}

      const PRECIOS_RAPIDOS_MAP: Record<string, number> = {
        "cambio de aceite": 10,
        "cambio de amortiguadores delanteros": 25,
        "cambio de amortiguadores posteriores": 20,
        "cambio de ruliman delantero": 20,
        "cambio de ruliman posterior": 20,
        "cambio de aceite de caja": 10,
        "cambio de aceite corona": 10,
        "lavado completo": 12,
        "lavado completo mas grafito": 15,
        "lavado completo más grafito": 15,
        "lavado exterior": 6,
        "aspirador interior": 5,
        "limpieza tapicería más lavado": 45,
        "limpieza tapiceria mas lavado": 45,
        "lavado chasis": 10,
        "alineación": 15,
        "alineacion": 15,
        "balanceo": 12,
        "rotación": 8,
        "rotacion": 8,
        "corrección caída": 20,
        "correccion caida": 20,
        "corrección camber": 20,
        "correccion camber": 20,
        "corrección caster": 20,
        "correccion caster": 20,
      };

      // Separar ítems de itemsJson que fueron guardados como SERVICE desde RegistroFinalUnificado en Taller
      const rawParts: any[] = [];
      const rawExtraServices: any[] = [];
      if (Array.isArray(items)) {
        for (const it of items) {
          if (it && it.type === "SERVICE") {
            rawExtraServices.push(it);
          } else if (it) {
            rawParts.push(it);
          }
        }
      }

      // Normalizar estructura de repuestos para presupuestos y compras
      const repuestosNormalizados = rawParts.map((it: any, index: number) => {
        const isManual = Boolean(
          it.isManual ||
          String(it.id || "").startsWith("reg-") ||
          String(it.id || "").startsWith("man-") ||
          String(it.code || "").startsWith("MAN-")
        );
        const costPrice = Number(it.supplierPrice || it.costPrice || it.cost || 0);
        const rawPrice = Number(it.price || 0);
        let catalogPrice = 0;
        if (!isManual && rawPrice <= 0) {
          const normName = String(it.name || it.description || "").trim().toLowerCase();
          const matchProd = catalogProducts.find(
            (p: any) =>
              (it.productId && p.id === it.productId) ||
              (it.id && p.id === it.id) ||
              (it.code && p.code && String(p.code).toLowerCase() === String(it.code).toLowerCase()) ||
              (normName && String(p.name || "").trim().toLowerCase() === normName)
          );
          if (matchProd && Number(matchProd.price) > 0) {
            catalogPrice = Number(matchProd.price);
          }
        }
        const price =
          rawPrice > 0
            ? rawPrice
            : catalogPrice > 0
            ? catalogPrice
            : costPrice > 0 && it.supplierAvailability === "SI_HAY"
            ? Number((costPrice * 1.3).toFixed(2))
            : 0;
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
          presentation: it.presentation || it.viscosity || "",
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
          purchaseStatus: it.purchaseStatus || (it.inStock ? "STOCK_LOCAL" : "POR_PEDIR"),
          notes: it.notes || "",
          danio: it.danio || "",
          descripcion: it.descripcion || it.description || "",
          imageUrl:
            it.imageUrl ||
            it.photoUrl ||
            it.image ||
            (Array.isArray(it.fotos) && it.fotos.length > 0 ? it.fotos[0] : (todasLasFotosOrden[index] ?? null)),
          fotos: Array.isArray(it.fotos) ? it.fotos : (it.imageUrl ? [it.imageUrl] : []),
          audios: Array.isArray(it.audios) ? it.audios : [],
          isManual,
          enviadoProveedor: Boolean(
            it.enviadoProveedor ||
              it.purchaseStatus === "PEDIDO_WHATSAPP" ||
              it.purchaseStatus === "COTIZADO"
          ),
          inStock: it.inStock !== undefined ? Boolean(it.inStock) : (!isManual && Boolean(it.purchaseStatus === "STOCK_LOCAL")),
          origin: it.origin || null,
          supplierAvailability: it.supplierAvailability || (it.purchaseStatus === "COTIZADO" ? "SI_HAY" : it.purchaseStatus === "SIN_STOCK_PROVEEDOR" ? "NO_HAY" : "PENDIENTE"),
          supplierPrice: Number(it.supplierPrice ?? costPrice ?? 0),
          deliveryTime: it.deliveryTime || "",
          shippingMethod: it.shippingMethod || "",
          supplierNotes: it.supplierNotes || "",
          supplierRespondedAt: it.supplierRespondedAt || null,
        };
      });

      // Combinar servicesJson con servicios que venían en itemsJson (priorizando objetos ricos y filtrando duplicados o productos)
      const partNamesSet = new Set<string>();
      for (const p of rawParts) {
        const n1 = String(p?.name || "").trim().toLowerCase().replace(/^\d+x\s+/i, "");
        const n2 = String(p?.fullName || "").trim().toLowerCase().replace(/^\d+x\s+/i, "");
        if (n1) partNamesSet.add(n1);
        if (n2) partNamesSet.add(n2);
      }

      const seenSrvIds = new Set<string>();
      const seenSrvNames = new Set<string>();
      const combinedServices: any[] = [];

      // Mapear objetos de servicesJson para dar prioridad a los precios editados en Propuesta
      const savedServicesObjects = (Array.isArray(services) ? services : []).filter(
        (sv) => sv && typeof sv === "object"
      );

      // Primero agregar servicios con estructura completa desde servicesJson (donde Propuesta guarda los precios editados)
      for (const sv of savedServicesObjects) {
        const idKey = sv.id ? String(sv.id) : "";
        const normName = String(sv.name || sv.description || "").trim().toLowerCase().replace(/^\d+x\s+/i, "");
        if (!normName && !idKey) continue;
        if (idKey && seenSrvIds.has(idKey)) continue;
        if (partNamesSet.has(normName)) continue;
        if (idKey) seenSrvIds.add(idKey);
        if (normName) seenSrvNames.add(normName);
        combinedServices.push(sv);
      }

      // Luego agregar servicios desde itemsJson (rawExtraServices) que no hayan sido ya incluidos
      for (const sv of rawExtraServices) {
        if (!sv) continue;
        const idKey = sv.id ? String(sv.id) : "";
        const normName = String(sv.name || sv.description || "").trim().toLowerCase().replace(/^\d+x\s+/i, "");
        if (idKey && seenSrvIds.has(idKey)) continue;
        if (normName && seenSrvNames.has(normName)) continue;
        if (idKey) seenSrvIds.add(idKey);
        if (normName) seenSrvNames.add(normName);
        combinedServices.push(sv);
      }

      // Finalmente agregar servicios tipo string de servicesJson que no sean duplicados
      for (const sv of Array.isArray(services) ? services : []) {
        if (!sv || typeof sv !== "string") continue;
        const normName = String(sv).trim().toLowerCase().replace(/^\d+x\s+/i, "");
        if (!normName) continue;
        if (partNamesSet.has(normName)) continue;
        if (seenSrvNames.has(normName)) continue;
        seenSrvNames.add(normName);
        combinedServices.push(sv);
      }

      // Normalizar estructura de servicios / mano de obra
      const serviciosNormalizados = combinedServices.map((sv: any, index: number) => {
        const isString = typeof sv === "string";
        const name = isString ? sv : (sv.name || sv.description || "Servicio Técnico");
        const isManual = !isString && Boolean(
          sv.isManual ||
          String(sv.id || "").startsWith("reg-") ||
          String(sv.id || "").startsWith("man-") ||
          String(sv.code || "").startsWith("MAN-")
        );
        const costPrice = isString ? 0 : Number(sv.supplierPrice || sv.costPrice || 0);
        const rawPrice = isString ? 0 : Number(sv.price || 0);
        let catalogPrice = 0;
        if (!isManual && rawPrice <= 0) {
          const normName = String(name || "").trim().toLowerCase().replace(/^\d+x\s+/i, "");
          if (PRECIOS_RAPIDOS_MAP[normName]) {
            catalogPrice = PRECIOS_RAPIDOS_MAP[normName];
          } else {
            const matchSrv = catalogServices.find(
              (s: any) =>
                (!isString && sv.id && s.id === sv.id) ||
                (!isString && sv.code && s.code && String(s.code).toLowerCase() === String(sv.code).toLowerCase()) ||
                (normName && String(s.name || "").trim().toLowerCase() === normName)
            );
            if (matchSrv && Number(matchSrv.price) > 0) {
              catalogPrice = Number(matchSrv.price);
            }
          }
        }
        const price =
          rawPrice > 0
            ? rawPrice
            : catalogPrice > 0
            ? catalogPrice
            : costPrice > 0 && !isString && sv.supplierAvailability === "SI_HAY"
            ? Number((costPrice * 1.3).toFixed(2))
            : 0;
        const code = isString ? `SRV-${index + 1}` : (sv.code || `SRV-${index + 1}`);
        const category = isString ? "Mano de Obra" : (sv.category || "Mano de Obra");
        const qty = isString ? 1 : Number(sv.qty || 1);
        return {
          id: isString ? `srv_${index}_${Date.now()}` : (sv.id || `srv_${index}_${Date.now()}`),
          findingId: isString ? null : (sv.findingId || null),
          code,
          name,
          category,
          qty,
          costPrice,
          price,
          estimatedMinutes: isString ? 30 : Number(sv.estimatedMinutes || 30),
          mechanic: isString ? (order.mechanic || "Taller") : (sv.mechanic || order.mechanic || "Taller"),
          imageUrl: isString ? null : (sv.imageUrl || sv.photoUrl || (Array.isArray(sv.fotos) && sv.fotos.length > 0 ? sv.fotos[0] : null)),
          fotos: !isString && Array.isArray(sv.fotos) ? sv.fotos : [],
          audios: !isString && Array.isArray(sv.audios) ? sv.audios : [],
          isManual,
          enviadoProveedor: Boolean(
            !isString &&
              (sv.enviadoProveedor ||
                sv.purchaseStatus === "PEDIDO_WHATSAPP" ||
                sv.purchaseStatus === "COTIZADO")
          ),
          inStock: !isString && sv.inStock !== undefined ? Boolean(sv.inStock) : !isManual,
          supplierId: isString ? null : (sv.supplierId || null),
          supplierName: isString ? "Proveedor General" : (sv.supplierName || "Proveedor General"),
          supplierPhone: isString ? "" : (sv.supplierPhone || ""),
          purchaseStatus: isString ? "INTERNO" : (sv.purchaseStatus || (isManual ? "POR_PEDIR" : "INTERNO")),
          supplierAvailability: isString ? "PENDIENTE" : (sv.supplierAvailability || "PENDIENTE"),
          supplierPrice: isString ? 0 : Number(sv.supplierPrice ?? costPrice ?? 0),
          deliveryTime: isString ? "" : (sv.deliveryTime || ""),
          shippingMethod: isString ? "" : (sv.shippingMethod || ""),
          supplierNotes: isString ? "" : (sv.supplierNotes || ""),
          supplierRespondedAt: isString ? null : (sv.supplierRespondedAt || null),
          origin: isString ? null : (sv.origin || null),
          notes: isString ? "" : (sv.notes || ""),
          danio: isString ? "" : (sv.danio || ""),
          descripcion: isString ? "" : (sv.descripcion || sv.description || ""),
        };
      });

      // 4. Obtener proveedores disponibles para el autocompletado
      let proveedores: any[] = [];
      try {
        proveedores = await prisma.supplier.findMany({
          where: { status: { notIn: ["Inactivo", "Eliminado"] } },
          orderBy: { name: "asc" },
        });
      } catch {
        proveedores = ((await prisma.$queryRawUnsafe(
          `SELECT "id", "name", "contact", "phone", "email" FROM "Supplier" WHERE COALESCE("status", '') NOT IN ('Inactivo', 'Eliminado') ORDER BY "name" ASC`
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
          quoteTaxRate: order.quoteTaxRate !== null && order.quoteTaxRate !== undefined ? Number(order.quoteTaxRate) : 15,
          quoteDiscount: Number(order.quoteDiscount ?? 0),
          posRequestId: order.posRequestId,
          supplierSig: signSupplierScope(order.id),
          dailySupplierSig: signSupplierScope("daily"),
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
