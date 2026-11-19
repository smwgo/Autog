import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { emitRealtimeEvent } from "@/lib/realtime";
import {
  getVerifiedSessionFromRequest,
  isStaffSession,
  verifySupplierScope,
} from "@/lib/signed-tokens";

export const dynamic = "force-dynamic";

function normalizarUrlMedia(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("blob:")) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  return `/api/storage/download?key=${encodeURIComponent(trimmed)}`;
}

/**
 * GET: Obtener datos para el portal interactivo de pedidos a proveedores por WhatsApp.
 * Modos admitidos:
 * 1) ?orderId=... (con opcional ?itemId=... o ?item=... o ?pinId=...) -> Pedido individual o completo del vehículo
 * 2) ?mode=daily&date=... -> Consolidado de pedidos a proveedores del día
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId") || searchParams.get("token");
    const mode = searchParams.get("mode"); // "daily" | "individual"
    const dateParam = searchParams.get("date"); // YYYY-MM-DD opcional
    const sig = searchParams.get("sig");
    const targetItemId = searchParams.get("itemId") || "";
    const targetItemsList = (searchParams.get("items") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const targetItemName = searchParams.get("item") || "";
    const targetPinId = searchParams.get("pinId") || "";

    const hasStaffAuth = isStaffSession(getVerifiedSessionFromRequest(request));

    return await withRetry(async () => {
      // MODO 1: Consolidado de pedidos del día
      if (mode === "daily") {
        if (!hasStaffAuth && !verifySupplierScope("daily", sig)) {
          return NextResponse.json(
            { success: false, error: "Enlace de consolidado no autorizado o firma inválida." },
            { status: 401 }
          );
        }
        const todayStr = dateParam || new Date().toISOString().slice(0, 10);

        const orders: any[] = await prisma.$queryRawUnsafe(
          `SELECT "id", "orderNumber", "vehicle", "plate", "mechanic", "itemsJson", "servicesJson", "createdAt", "updatedAt"
           FROM "WorkshopOrder"
           WHERE CAST("updatedAt" AS TEXT) LIKE $1 OR CAST("createdAt" AS TEXT) LIKE $1
           ORDER BY "updatedAt" DESC LIMIT 50`,
          `${todayStr}%`
        );

        const itemsPorComprar: any[] = [];

        orders.forEach((ord: any) => {
          let items: any[] = [];
          let services: any[] = [];
          try {
            items = typeof ord.itemsJson === "string" ? JSON.parse(ord.itemsJson) : (ord.itemsJson || []);
          } catch {
            items = [];
          }
          try {
            services = typeof ord.servicesJson === "string" ? JSON.parse(ord.servicesJson) : (ord.servicesJson || []);
          } catch {
            services = [];
          }

          const combinados = [
            ...items.map((x: any) => ({ ...x, isService: x.type === "SERVICE" })),
            ...services.map((s: any) => (typeof s === "string" ? { name: s, isService: true } : { ...s, isService: true })),
          ];

          combinados.forEach((it: any, idx: number) => {
            const isManual = Boolean(
              it.isManual ||
              String(it.id || "").startsWith("reg-") ||
              String(it.id || "").startsWith("man-")
            );
            const esCompra =
              it.inStock === false ||
              isManual ||
              it.purchaseStatus === "POR_PEDIR" ||
              it.purchaseStatus === "PEDIDO_WHATSAPP" ||
              it.purchaseStatus === "COTIZADO" ||
              it.comprarAProveedor === true;

            if (esCompra || (!("inStock" in it) && !it.isService)) {
              const fotosRaw = Array.isArray(it.fotos) ? it.fotos.map(normalizarUrlMedia).filter(Boolean) : [];
              const imgMain = normalizarUrlMedia(it.imageUrl || it.photoUrl) || fotosRaw[0] || null;
              const audiosRaw = Array.isArray(it.audios)
                ? it.audios
                    .map((a: any, aIdx: number) => {
                      const u = typeof a === "string" ? normalizarUrlMedia(a) : normalizarUrlMedia(a?.url);
                      return u ? { id: `aud_${idx}_${aIdx}`, url: u, transcriptionText: a?.transcriptionText || null } : null;
                    })
                    .filter(Boolean)
                : [];

              itemsPorComprar.push({
                id: it.id || `daily_${ord.id}_${idx}`,
                orderId: ord.id,
                orderNumber: ord.orderNumber,
                vehicle: ord.vehicle,
                plate: ord.plate,
                name: it.name || it.description || "Repuesto / Servicio",
                code: it.code || "",
                qty: Number(it.qty || 1),
                isService: Boolean(it.isService),
                isManual,
                supplierName: it.supplierName || "Proveedor General",
                notes: it.notes || it.descripcion || "",
                imageUrl: imgMain,
                fotos: fotosRaw.length > 0 ? fotosRaw : imgMain ? [imgMain] : [],
                audios: audiosRaw,
                supplierAvailability: it.supplierAvailability || "PENDIENTE",
                supplierPrice: Number(it.supplierPrice ?? it.costPrice ?? 0),
                deliveryTime: it.deliveryTime || "",
                shippingMethod: it.shippingMethod || "",
                supplierNotes: it.supplierNotes || "",
              });
            }
          });
        });

        return NextResponse.json({
          success: true,
          mode: "daily",
          date: todayStr,
          totalItems: itemsPorComprar.length,
          pedidos: itemsPorComprar,
        });
      }

      // MODO 2: Pedido por orderId / token
      if (!orderId) {
        return NextResponse.json(
          { success: false, error: "ID de orden o token requerido" },
          { status: 400 }
        );
      }

      let order: any = null;
      try {
        order = await prisma.workshopOrder.findFirst({
          where: {
            OR: [{ id: orderId }, { orderNumber: orderId }],
          },
        });
      } catch {
        order = null;
      }

      if (!order) {
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );
        if (rows.length > 0) order = rows[0];
      }

      if (!order) {
        return NextResponse.json(
          { success: false, error: "Orden de pedido no encontrada" },
          { status: 404 }
        );
      }

      const tokenValid =
        hasStaffAuth ||
        verifySupplierScope(order.id, sig) ||
        verifySupplierScope(orderId, sig) ||
        verifySupplierScope("daily", sig);
      if (!tokenValid) {
        return NextResponse.json(
          { success: false, error: "Enlace de pedido no autorizado o firma inválida." },
          { status: 401 }
        );
      }

      // Parsear JSONs de la orden
      let items: any[] = [];
      let services: any[] = [];
      let findings: any[] = [];
      let checklist: any = {};

      try {
        items = typeof order.itemsJson === "string" ? JSON.parse(order.itemsJson) : (order.itemsJson || []);
      } catch {
        items = [];
      }
      try {
        services = typeof order.servicesJson === "string" ? JSON.parse(order.servicesJson) : (order.servicesJson || []);
      } catch {
        services = [];
      }
      try {
        findings =
          typeof order.inspectionFindingsJson === "string"
            ? JSON.parse(order.inspectionFindingsJson)
            : (order.inspectionFindingsJson || []);
      } catch {
        findings = [];
      }
      try {
        checklist =
          typeof order.inspectionChecklistJson === "string"
            ? JSON.parse(order.inspectionChecklistJson)
            : (order.inspectionChecklistJson || {});
      } catch {
        checklist = {};
      }

      // Obtener evidencias multimedia (imágenes y audios) desde WorkshopEvidence
      const evRows =
        ((await prisma
          .$queryRawUnsafe(
            `SELECT "id", "type", "r2Key", "mimeType", "durationSeconds", "transcriptionText", "uploadedBy", "createdAt" 
             FROM "WorkshopEvidence" 
             WHERE ("orderId" = $1 OR "orderNumber" = $2 OR "plate" ILIKE $3)
               AND "uploadStatus" = 'COMPLETED'
             ORDER BY "createdAt" ASC`,
            order.id,
            order.orderNumber,
            (order.plate || "").trim()
          )
          .catch(() => [])) as any[]) || [];

      const fotosCatalogo: Array<{ id: string; url: string }> = evRows
        .filter((ev: any) => ev.type === "image" || (ev.mimeType && ev.mimeType.startsWith("image/")))
        .map((ev: any) => ({
          id: ev.id,
          url: `/api/storage/download?key=${encodeURIComponent(ev.r2Key)}`,
        }));

      // Agregar fotos de recepción / evidencia guardadas en la orden
      const extraOrderPhotos: string[] = [];
      for (const field of ["receptionPhotosJson", "evidencePhotosJson", "photosJson"]) {
        try {
          const arr = typeof order[field] === "string" ? JSON.parse(order[field]) : order[field];
          if (Array.isArray(arr)) extraOrderPhotos.push(...arr);
        } catch {}
      }
      extraOrderPhotos.forEach((rawUrl, i) => {
        const u = normalizarUrlMedia(rawUrl);
        if (u && !fotosCatalogo.some((f) => f.url === u)) {
          fotosCatalogo.push({ id: `ord_img_${i}`, url: u });
        }
      });

      const audiosCatalogo: Array<{
        id: string;
        url: string;
        durationSeconds?: number | null;
        transcriptionText?: string | null;
      }> = evRows
        .filter((ev: any) => ev.type === "audio" || (ev.mimeType && ev.mimeType.startsWith("audio/")))
        .map((ev: any) => ({
          id: ev.id,
          url: `/api/storage/download?key=${encodeURIComponent(ev.r2Key)}`,
          durationSeconds: ev.durationSeconds ? Number(ev.durationSeconds) : null,
          transcriptionText: ev.transcriptionText || null,
        }));

      const videosCatalogo: Array<{ id: string; url: string }> = evRows
        .filter((ev: any) => ev.type === "video" || (ev.mimeType && ev.mimeType.startsWith("video/")))
        .map((ev: any) => ({
          id: ev.id,
          url: `/api/storage/download?key=${encodeURIComponent(ev.r2Key)}`,
        }));

      // También recolectar evidencias registradas en RegistroFinalUnificado (checklist.registroEvidencias)
      if (Array.isArray(checklist?.registroEvidencias)) {
        checklist.registroEvidencias.forEach((rev: any, idx: number) => {
          const u = normalizarUrlMedia(rev?.url);
          if (!u) return;
          if (rev.type === "audio") {
            if (!audiosCatalogo.some((a) => a.url === u)) {
              audiosCatalogo.push({ id: rev.id || `rev_aud_${idx}`, url: u });
            }
          } else if (rev.type === "foto") {
            if (!fotosCatalogo.some((f) => f.url === u)) {
              fotosCatalogo.push({ id: rev.id || `rev_img_${idx}`, url: u });
            }
          }
        });
      }

      // Mapa de hallazgos por id y por número de evidencia para enriquecer ítems con fotos/audios del hallazgo
      const findingMap = new Map<string, any>();
      findings.forEach((h: any, idx: number) => {
        const numEv = h.numeroEvidencia || h.pinNumber || idx + 1;
        if (h.id) findingMap.set(String(h.id), { ...h, numEv });
        if (h.originalId) findingMap.set(String(h.originalId), { ...h, numEv });
        findingMap.set(`num_${numEv}`, { ...h, numEv });
      });

      const resolverHallazgoDeItem = (it: any) => {
        if (it.findingId && findingMap.has(String(it.findingId))) {
          return findingMap.get(String(it.findingId));
        }
        if (it.notes) {
          const m = it.notes.match(/\[Evidencia #(\d+)\]/i) || it.notes.match(/Pin #(\d+)/i);
          if (m && findingMap.has(`num_${m[1]}`)) {
            return findingMap.get(`num_${m[1]}`);
          }
        }
        for (const h of findings) {
          if (
            Array.isArray(h.linkedItems) &&
            h.linkedItems.some(
              (li: any) =>
                (li.id && li.id === it.id) ||
                (li.name && it.name && li.name.toLowerCase() === it.name.toLowerCase())
            )
          ) {
            return h;
          }
        }
        return null;
      };

      // Unificar lista de ítems (productos + servicios sin stock o manuales)
      const seenIds = new Set<string>();
      const rawUnificados: any[] = [];

      items.forEach((it: any, idx: number) => {
        const idKey = String(it.id || `rep_${idx}`);
        seenIds.add(idKey);
        rawUnificados.push({
          ...it,
          id: idKey,
          isService: it.type === "SERVICE",
        });
      });

      services.forEach((sv: any, idx: number) => {
        const obj = typeof sv === "string" ? { id: `srv_${idx}`, name: sv } : sv;
        const idKey = String(obj.id || `srv_${idx}`);
        if (seenIds.has(idKey)) return;
        seenIds.add(idKey);
        rawUnificados.push({
          ...obj,
          id: idKey,
          isService: true,
        });
      });

      // Si se solicitó un pinId específico y ese pin no tenía ítems aún, exponer el pin como requerimiento para cotizar
      if (targetPinId && findingMap.has(targetPinId)) {
        const pinObj = findingMap.get(targetPinId);
        const tieneItemsDelPin = rawUnificados.some((u) => {
          const h = resolverHallazgoDeItem(u);
          return h && (h.id === pinObj.id || h.originalId === pinObj.id);
        });
        if (!tieneItemsDelPin) {
          rawUnificados.push({
            id: `pin_req_${pinObj.id}`,
            findingId: pinObj.id,
            name: pinObj.descripcion
              ? `${pinObj.tipo || "Repuesto"}: ${pinObj.descripcion}`
              : pinObj.tipo || "Requerimiento de Inspección",
            code: `EV-${pinObj.numEv || 1}`,
            qty: 1,
            inStock: false,
            isManual: true,
            isService: Boolean(pinObj.solicitaServicio && !pinObj.solicitaRepuesto),
            notes: `[Evidencia #${pinObj.numEv || 1}] ${pinObj.descripcion || ""}`.trim(),
          });
        }
      }

      const todosNormalizados = rawUnificados.map((it: any, idx: number) => {
        const hallazgo = resolverHallazgoDeItem(it);
        const isManual = Boolean(
          it.isManual ||
          String(it.id || "").startsWith("reg-") ||
          String(it.id || "").startsWith("man-") ||
          String(it.code || "").startsWith("MAN-")
        );

        // Recolectar fotos del ítem + fotos del hallazgo vinculado
        const fotosItem: string[] = [];
        if (Array.isArray(it.fotos)) {
          it.fotos.forEach((f: string) => {
            const u = normalizarUrlMedia(f);
            if (u && !fotosItem.includes(u)) fotosItem.push(u);
          });
        }
        const imgDirecta = normalizarUrlMedia(it.imageUrl || it.photoUrl || it.image);
        if (imgDirecta && !fotosItem.includes(imgDirecta)) {
          fotosItem.unshift(imgDirecta);
        }
        if (hallazgo) {
          const hPhotos = Array.isArray(hallazgo.photoUrls)
            ? hallazgo.photoUrls
            : hallazgo.photoUrl
            ? [hallazgo.photoUrl]
            : [];
          hPhotos.forEach((hp: string) => {
            const u = normalizarUrlMedia(hp);
            if (u && !fotosItem.includes(u)) fotosItem.push(u);
          });
        }
        if (fotosItem.length === 0 && fotosCatalogo.length > 0) {
          const fallbackFoto = fotosCatalogo[idx % fotosCatalogo.length]?.url;
          if (fallbackFoto) fotosItem.push(fallbackFoto);
        }

        // Recolectar audios del ítem + audios del hallazgo vinculado
        const audiosItem: Array<{
          id: string;
          url: string;
          durationSeconds?: number | null;
          transcriptionText?: string | null;
        }> = [];

        if (Array.isArray(it.audios)) {
          it.audios.forEach((a: any, aIdx: number) => {
            const u = typeof a === "string" ? normalizarUrlMedia(a) : normalizarUrlMedia(a?.url);
            if (u && !audiosItem.some((x) => x.url === u)) {
              audiosItem.push({
                id: a?.id || `it_aud_${idx}_${aIdx}`,
                url: u,
                durationSeconds: a?.durationSeconds || null,
                transcriptionText: a?.transcriptionText || null,
              });
            }
          });
        }

        if (hallazgo) {
          if (hallazgo.audioUrl) {
            const u = normalizarUrlMedia(hallazgo.audioUrl);
            if (u && !audiosItem.some((x) => x.url === u)) {
              audiosItem.push({
                id: `pin_aud_${hallazgo.id}`,
                url: u,
                durationSeconds: hallazgo.durationSeconds || null,
                transcriptionText: hallazgo.transcriptionText || null,
              });
            }
          }
          if (Array.isArray(hallazgo.voiceNotes)) {
            hallazgo.voiceNotes.forEach((vn: any, vIdx: number) => {
              const u = typeof vn === "string" ? normalizarUrlMedia(vn) : normalizarUrlMedia(vn?.url);
              if (u && !audiosItem.some((x) => x.url === u)) {
                audiosItem.push({
                  id: vn?.id || `pin_vn_${idx}_${vIdx}`,
                  url: u,
                  durationSeconds: vn?.durationSeconds || null,
                  transcriptionText: vn?.transcriptionText || null,
                });
              }
            });
          }
        }

        // Si la orden tiene audios generales y el ítem no tenía audio propio, adjuntar audios de la orden
        if (audiosItem.length === 0 && audiosCatalogo.length > 0) {
          audiosItem.push(...audiosCatalogo);
        }

        const comprarAProveedor =
          it.inStock === false ||
          isManual ||
          it.comprarAProveedor === true ||
          it.enviadoProveedor === true ||
          it.purchaseStatus === "POR_PEDIR" ||
          it.purchaseStatus === "PEDIDO_WHATSAPP" ||
          it.purchaseStatus === "COTIZADO" ||
          it.purchaseStatus === "SIN_STOCK_PROVEEDOR";

        const videosItem: string[] = [];
        if (Array.isArray(it.videos)) {
          it.videos.forEach((v: string) => {
            const u = normalizarUrlMedia(v);
            if (u && !videosItem.includes(u)) videosItem.push(u);
          });
        }
        if (hallazgo?.videoUrl) {
          const u = normalizarUrlMedia(hallazgo.videoUrl);
          if (u && !videosItem.includes(u)) videosItem.push(u);
        }
        if (videosItem.length === 0 && videosCatalogo.length > 0) {
          videosCatalogo.forEach((vc) => {
            if (!videosItem.includes(vc.url)) videosItem.push(vc.url);
          });
        }

        const vistaRaw = String(hallazgo?.vistaLabel || hallazgo?.vista || it.category || "Taller");
        const vistaFormateada =
          vistaRaw === "frontal"
            ? "Frente"
            : vistaRaw === "lateral_der"
            ? "Frente Der."
            : vistaRaw === "lateral_izq"
            ? "Frente Izq."
            : vistaRaw === "posterior" || vistaRaw === "trasera"
            ? "Posterior"
            : vistaRaw.charAt(0).toUpperCase() + vistaRaw.slice(1).replace(/_/g, " ");

        return {
          id: it.id || `rep_${idx}`,
          findingId: it.findingId || hallazgo?.id || null,
          pinNumber: hallazgo?.numEv || hallazgo?.numeroEvidencia || hallazgo?.pinNumber || null,
          vistaLabel: vistaFormateada,
          category: it.category || "Taller",
          name: it.name || it.description || "Repuesto / Servicio",
          code: it.code || "",
          qty: Number(it.qty || 1),
          isService: Boolean(it.isService),
          isManual,
          inStock: Boolean(it.inStock && !isManual),
          comprarAProveedor,
          supplierName: it.supplierName || "Proveedor General",
          supplierPhone: it.supplierPhone || "",
          notes: it.notes || "",
          danio: it.danio || hallazgo?.tipo || "",
          descripcion: it.descripcion || it.description || hallazgo?.descripcion || "",
          imageUrl: fotosItem[0] || null,
          fotos: fotosItem,
          videos: videosItem,
          audios: audiosItem,
          costPrice: Number(it.costPrice || 0),
          price: Number(it.price || 0),
          supplierAvailability:
            it.supplierAvailability ||
            (it.purchaseStatus === "COTIZADO"
              ? "SI_HAY"
              : it.purchaseStatus === "SIN_STOCK_PROVEEDOR"
              ? "NO_HAY"
              : "PENDIENTE"),
          supplierPrice: Number(it.supplierPrice ?? it.costPrice ?? 0),
          deliveryTime: it.deliveryTime || "30 min",
          shippingMethod: it.shippingMethod || "",
          supplierNotes: it.supplierNotes || "",
          supplierRespondedAt: it.supplierRespondedAt || null,
        };
      });

      // Si viene filtrado por items (lista de IDs), itemId, item (nombre) o pinId
      let itemsParaMostrar = todosNormalizados;
      const hayFiltroIndividual = Boolean(
        targetItemsList.length > 0 ||
          targetItemId.trim() ||
          targetItemName.trim() ||
          targetPinId.trim()
      );

      if (hayFiltroIndividual) {
        const filtradosIndividual = todosNormalizados.filter((it) => {
          if (targetItemsList.length > 0 && targetItemsList.includes(String(it.id))) return true;
          if (targetItemId && String(it.id) === targetItemId.trim()) return true;
          if (targetPinId && String(it.findingId) === targetPinId.trim()) return true;
          if (
            targetItemName &&
            it.name.toLowerCase().includes(targetItemName.trim().toLowerCase())
          ) {
            return true;
          }
          return false;
        });
        if (filtradosIndividual.length > 0) {
          itemsParaMostrar = filtradosIndividual;
        }
      } else {
        // En modo masivo ("Mandar Todo el Pedido"): priorizar los que están marcados para proveedor, no están en stock o son manuales
        const marcadosExpresamente = todosNormalizados.filter(
          (it: any) =>
            it.comprarAProveedor ||
            !it.inStock ||
            it.isManual
        );
        itemsParaMostrar = marcadosExpresamente.length > 0 ? marcadosExpresamente : todosNormalizados;
      }

      let vehiclePhoto: string | null = null;
      try {
        const plateSearch = String(order.plate || "").trim();
        const vehId = String(order.vehicleId || "").trim();
        if (vehId || plateSearch) {
          const vRows = (await prisma.$queryRawUnsafe(
            `SELECT "imageUrl" FROM "Vehicle" WHERE "id" = $1 OR "plate" ILIKE $2 LIMIT 1`,
            vehId || "",
            plateSearch || ""
          ).catch(() => [])) as any[];
          const rawVImg = vRows?.[0]?.imageUrl ? String(vRows[0].imageUrl) : "";
          if (rawVImg && !rawVImg.startsWith("blob:")) {
            vehiclePhoto = normalizarUrlMedia(rawVImg) || rawVImg;
          }
        }
      } catch {}

      return NextResponse.json({
        success: true,
        mode: "individual",
        isSingleItemView: hayFiltroIndividual,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          vehicle: order.vehicle,
          plate: order.plate,
          vehiclePhoto,
          dateIn: order.dateIn,
          createdAt: order.createdAt,
        },
        items: itemsParaMostrar,
        allItemsCount: todosNormalizados.length,
        fotos: fotosCatalogo,
        audios: audiosCatalogo,
      });
    });
  } catch (error: any) {
    console.error("Error en GET /api/presupuestos/whatsapp-catalogo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al generar catálogo de pedidos." },
      { status: 500 }
    );
  }
}

/**
 * POST: Guardar la respuesta interactiva del proveedor desde /pedidos-proveedor/[token]
 * (Disponibilidad: Sí hay / No hay, Valor/Costo, Tiempo de llegada, Medio de envío)
 * y sincronizar automáticamente con la Propuesta en Neon PostgreSQL.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, supplierName, supplierPhone, responses = [], sig } = body;
    const hasStaffAuth = isStaffSession(getVerifiedSessionFromRequest(request));

    if (!orderId || !Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json(
        { success: false, error: "Datos de orden y respuestas de ítems son requeridos." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      let order: any = null;
      try {
        order = await prisma.workshopOrder.findFirst({
          where: {
            OR: [{ id: orderId }, { orderNumber: orderId }],
          },
        });
      } catch {
        order = null;
      }

      if (!order) {
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );
        if (rows.length > 0) order = rows[0];
      }

      if (!order) {
        return NextResponse.json(
          { success: false, error: "Orden no encontrada." },
          { status: 404 }
        );
      }

      const tokenValid =
        hasStaffAuth ||
        verifySupplierScope(order.id, sig) ||
        verifySupplierScope(orderId, sig) ||
        verifySupplierScope("daily", sig);
      if (!tokenValid) {
        return NextResponse.json(
          { success: false, error: "No autorizado para confirmar cotización de esta orden." },
          { status: 401 }
        );
      }

      let items: any[] = [];
      let services: any[] = [];
      let findings: any[] = [];

      try {
        items = typeof order.itemsJson === "string" ? JSON.parse(order.itemsJson) : (order.itemsJson || []);
      } catch {
        items = [];
      }
      try {
        services = typeof order.servicesJson === "string" ? JSON.parse(order.servicesJson) : (order.servicesJson || []);
      } catch {
        services = [];
      }
      try {
        findings =
          typeof order.inspectionFindingsJson === "string"
            ? JSON.parse(order.inspectionFindingsJson)
            : (order.inspectionFindingsJson || []);
      } catch {
        findings = [];
      }

      const nowIso = new Date().toISOString();
      const respMap = new Map<string, any>();
      responses.forEach((r: any) => {
        if (r && r.id) respMap.set(String(r.id), r);
        if (r && r.name) respMap.set(`name_${String(r.name).toLowerCase()}`, r);
      });

      const aplicarRespuesta = (it: any) => {
        const match =
          (it.id && respMap.get(String(it.id))) ||
          (it.name && respMap.get(`name_${String(it.name).toLowerCase()}`));
        if (!match) return it;

        const availability: "SI_HAY" | "NO_HAY" | "PENDIENTE" =
          match.supplierAvailability || "PENDIENTE";
        const unitCost =
          availability === "SI_HAY" && match.supplierPrice !== undefined
            ? Math.max(0, Number(match.supplierPrice) || 0)
            : Number(it.costPrice || 0);
        const qty = Number(it.qty || 1);
        const currentPvp = Number(it.price || 0);
        const nextPvp =
          availability === "SI_HAY"
            ? currentPvp > unitCost
              ? currentPvp
              : unitCost
            : currentPvp;

        const subtotalCosto = Number((unitCost * qty).toFixed(2));
        const subtotalVenta = Number((nextPvp * qty).toFixed(2));
        const margin = Number(((nextPvp - unitCost) * qty).toFixed(2));
        const marginPercent =
          nextPvp > 0 ? Math.round(((nextPvp - unitCost) / nextPvp) * 100) : 0;

        return {
          ...it,
          inStock: false,
          costPrice: unitCost,
          price: nextPvp,
          subtotalCosto,
          subtotalVenta,
          margin,
          marginPercent,
          supplierName: match.supplierName || supplierName || it.supplierName || "Proveedor Externo",
          supplierPhone: match.supplierPhone || supplierPhone || it.supplierPhone || "",
          purchaseStatus:
            availability === "SI_HAY"
              ? "COTIZADO"
              : availability === "NO_HAY"
              ? "SIN_STOCK_PROVEEDOR"
              : it.purchaseStatus || "POR_PEDIR",
          supplierAvailability: availability,
          supplierPrice: unitCost,
          deliveryTime: match.deliveryTime !== undefined ? String(match.deliveryTime).trim() : (it.deliveryTime || ""),
          shippingMethod: match.shippingMethod !== undefined ? String(match.shippingMethod).trim() : (it.shippingMethod || ""),
          supplierNotes: match.supplierNotes !== undefined ? String(match.supplierNotes).trim() : (it.supplierNotes || ""),
          supplierRespondedAt: nowIso,
        };
      };

      const nuevosItems = items.map(aplicarRespuesta);
      const nuevosServicios = services.map((sv: any, idx: number) => {
        const obj = typeof sv === "string" ? { id: `srv_${idx}`, name: sv, price: 0, qty: 1 } : sv;
        return aplicarRespuesta(obj);
      });

      // Si el proveedor cotizó un requerimiento nacido de un Pin sin ítem previo (pin_req_...), crearlo en items
      responses.forEach((r: any) => {
        if (String(r.id || "").startsWith("pin_req_") && r.supplierAvailability === "SI_HAY") {
          const pinId = String(r.id).replace("pin_req_", "");
          const yaExiste = nuevosItems.some((it: any) => it.id === r.id);
          if (!yaExiste) {
            const unitCost = Math.max(0, Number(r.supplierPrice) || 0);
            const nextPvp = unitCost;
            nuevosItems.push({
              id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              findingId: pinId,
              name: r.name || "Repuesto Cotizado",
              code: `COT-${Date.now().toString().slice(-4)}`,
              qty: 1,
              costPrice: unitCost,
              price: nextPvp,
              subtotalCosto: unitCost,
              subtotalVenta: nextPvp,
              margin: Number((nextPvp - unitCost).toFixed(2)),
              marginPercent:
                nextPvp > 0 ? Math.round(((nextPvp - unitCost) / nextPvp) * 100) : 0,
              inStock: false,
              origin: "TALLER",
              supplierName: r.supplierName || supplierName || "Proveedor Externo",
              purchaseStatus: "COTIZADO",
              supplierAvailability: "SI_HAY",
              supplierPrice: unitCost,
              deliveryTime: r.deliveryTime || "",
              shippingMethod: r.shippingMethod || "",
              supplierNotes: r.supplierNotes || "",
              supplierRespondedAt: nowIso,
            });
          }
        }
      });

      // También sincronizar linkedItems dentro de inspectionFindings
      const nuevosFindings = findings.map((h: any) => {
        if (Array.isArray(h.linkedItems)) {
          return {
            ...h,
            linkedItems: h.linkedItems.map(aplicarRespuesta),
          };
        }
        return h;
      });

      // Recalcular total de la orden
      const totalItems = nuevosItems.reduce(
        (acc: number, it: any) => acc + Number(it.price || 0) * Number(it.qty || 1),
        0
      );
      const totalServices = nuevosServicios.reduce(
        (acc: number, sv: any) => acc + Number(sv.price || 0) * Number(sv.qty || 1),
        0
      );
      const subtotalBruto = Number((totalItems + totalServices).toFixed(2));
      const discount = Number(order.quoteDiscount || 0);
      const taxRate = Number(order.quoteTaxRate ?? 15);
      const baseImponible = Math.max(0, subtotalBruto - (subtotalBruto * discount) / 100);
      const totalCalculado = Number((baseImponible * (1 + taxRate / 100)).toFixed(2));

      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopOrder"
         SET "itemsJson" = $2,
             "servicesJson" = $3,
             "inspectionFindingsJson" = $4,
             "totalCost" = $5,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1 OR "orderNumber" = $1`,
        order.id,
        JSON.stringify(nuevosItems),
        JSON.stringify(nuevosServicios),
        JSON.stringify(nuevosFindings),
        totalCalculado
      );

      emitRealtimeEvent({ channel: "presupuestos", action: "updated", entityId: order.id });
      emitRealtimeEvent({ channel: "taller", action: "updated", entityId: order.id });

      return NextResponse.json({
        success: true,
        message: "Cotización de proveedor registrada y sincronizada con Propuesta.",
        updatedAt: nowIso,
        total: totalCalculado,
      });
    });
  } catch (error: any) {
    console.error("Error en POST /api/presupuestos/whatsapp-catalogo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar respuesta del proveedor." },
      { status: 500 }
    );
  }
}
