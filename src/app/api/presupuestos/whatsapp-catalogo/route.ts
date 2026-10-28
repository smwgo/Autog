import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET: Obtener datos para el catálogo visual de pedidos a proveedores por WhatsApp.
 * Modos admitidos:
 * 1) ?orderId=... o ?token=... -> Pedido individual del vehículo
 * 2) ?mode=daily&date=... -> Consolidado de pedidos a proveedores del día (o fecha seleccionada)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId") || searchParams.get("token");
    const mode = searchParams.get("mode"); // "daily" | "individual"
    const dateParam = searchParams.get("date"); // YYYY-MM-DD opcional

    return await withRetry(async () => {
      // MODO 1: Consolidado de pedidos del día
      if (mode === "daily") {
        const todayStr = dateParam || new Date().toISOString().slice(0, 10);

        const orders: any[] = await prisma.$queryRawUnsafe(
          `SELECT "id", "orderNumber", "vehicle", "plate", "client", "clientPhone", "mechanic", "itemsJson", "createdAt", "updatedAt"
           FROM "WorkshopOrder"
           WHERE CAST("updatedAt" AS TEXT) LIKE $1 OR CAST("createdAt" AS TEXT) LIKE $1
           ORDER BY "updatedAt" DESC LIMIT 50`,
          `${todayStr}%`
        );

        const itemsPorComprar: any[] = [];

        orders.forEach((ord: any) => {
          let items: any[] = [];
          try {
            items = typeof ord.itemsJson === "string" ? JSON.parse(ord.itemsJson) : (ord.itemsJson || []);
          } catch { items = []; }

          items.forEach((it: any, idx: number) => {
            // Filtrar ítems que requieran compra externa (por defecto todo repuesto sin flag inStock o marcado POR_PEDIR)
            const esCompra = it.inStock === false || it.purchaseStatus === "POR_PEDIR" || it.purchaseStatus === "PEDIDO_WHATSAPP" || it.comprarAProveedor === true;
            if (esCompra || (!("inStock" in it) && !("comprarAProveedor" in it))) {
              itemsPorComprar.push({
                id: it.id || `daily_${ord.id}_${idx}`,
                orderId: ord.id,
                orderNumber: ord.orderNumber,
                vehicle: ord.vehicle,
                plate: ord.plate,
                client: ord.client,
                name: it.name || it.description || "Repuesto / Insumo",
                code: it.code || "",
                qty: Number(it.qty || 1),
                supplierName: it.supplierName || "Proveedor General",
                notes: it.notes || "",
                imageUrl: it.imageUrl || it.photoUrl || null,
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

      // MODO 2: Pedido individual por orderId / token
      if (!orderId) {
        return NextResponse.json(
          { success: false, error: "ID de orden o token requerido" },
          { status: 400 }
        );
      }

      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
        orderId
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Orden de pedido no encontrada" },
          { status: 404 }
        );
      }

      const order = rows[0];

      // Parsear ítems
      let items: any[] = [];
      try {
        items = typeof order.itemsJson === "string" ? JSON.parse(order.itemsJson) : (order.itemsJson || []);
      } catch { items = []; }

      // Obtener evidencias / fotos del vehículo para el catálogo
      const evRows = ((await prisma.$queryRawUnsafe(
        `SELECT "id", "type", "r2Key", "mimeType", "uploadedBy", "createdAt" 
         FROM "WorkshopEvidence" 
         WHERE ("orderId" = $1 OR "orderNumber" = $2 OR "plate" ILIKE $3)
           AND "uploadStatus" = 'COMPLETED'
         ORDER BY "createdAt" ASC`,
        order.id,
        order.orderNumber,
        (order.plate || "").trim()
      ).catch(() => [])) as any[]) || [];

      const fotosCatalogo = evRows
        .filter((ev: any) => ev.type === "image" || (ev.mimeType && ev.mimeType.startsWith("image/")))
        .map((ev: any) => ({
          id: ev.id,
          url: `/api/storage/download?key=${encodeURIComponent(ev.r2Key)}`,
        }));

      // Filtrar ítems para compras a proveedores externos
      const itemsFiltrados = items.map((it: any, idx: number) => ({
        id: it.id || `rep_${idx}`,
        name: it.name || it.description || "Repuesto / Insumo",
        code: it.code || "",
        qty: Number(it.qty || 1),
        inStock: Boolean(it.inStock),
        comprarAProveedor: it.inStock === false || it.comprarAProveedor === true || it.purchaseStatus === "POR_PEDIR",
        supplierName: it.supplierName || "Proveedor General",
        supplierPhone: it.supplierPhone || "",
        notes: it.notes || "",
        imageUrl: it.imageUrl || it.photoUrl || (fotosCatalogo[idx % fotosCatalogo.length]?.url || null),
      }));

      return NextResponse.json({
        success: true,
        mode: "individual",
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          vehicle: order.vehicle,
          plate: order.plate,
          client: order.client,
          clientPhone: order.clientPhone,
          dateIn: order.dateIn,
          createdAt: order.createdAt,
          notes: order.notes,
        },
        items: itemsFiltrados,
        fotos: fotosCatalogo,
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
