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
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
        id
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Orden no encontrada" },
          { status: 404 }
        );
      }

      const order = rows[0];

      // 2. Obtener todas las evidencias multimedia asociadas desde Neon
      const evRows = ((await prisma.$queryRawUnsafe(
        `SELECT * FROM "WorkshopEvidence" 
         WHERE ("orderId" = $1 OR "orderNumber" = $2 OR "plate" ILIKE $3)
           AND "uploadStatus" = 'COMPLETED'
         ORDER BY "createdAt" ASC`,
        order.id,
        order.orderNumber,
        (order.plate || "").trim()
      ).catch(() => [])) as any[]) || [];

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
          code: it.code || `REP-${index + 1}`,
          name: it.name || it.description || "Repuesto / Insumo",
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
        };
      });

      // Normalizar estructura de servicios / mano de obra
      const serviciosNormalizados = services.map((sv: any, index: number) => ({
        id: sv.id || `srv_${index}_${Date.now()}`,
        code: sv.code || `SRV-${index + 1}`,
        name: sv.name || "Servicio Técnico",
        category: sv.category || "Mano de Obra",
        price: Number(sv.price || 0),
        estimatedMinutes: Number(sv.estimatedMinutes || 30),
        mechanic: sv.mechanic || order.mechanic || "Taller",
      }));

      // 4. Obtener proveedores disponibles para el autocompletado
      const proveedores = ((await prisma.$queryRawUnsafe(
        `SELECT "id", "name", "contact", "phone", "email" FROM "Supplier" WHERE "status" = 'Activo' ORDER BY "name" ASC`
      ).catch(() => [])) as any[]) || [];

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
          mechanic: order.mechanic,
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
