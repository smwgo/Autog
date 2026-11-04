import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function generateId(): string {
  return "req_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 600): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

async function ensureTableExists() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WorkshopPartRequest" (
      "id" TEXT NOT NULL,
      "requestNumber" TEXT NOT NULL,
      "mechanic" TEXT NOT NULL,
      "orderId" TEXT NOT NULL DEFAULT 'ORD-GENERAL',
      "vehicle" TEXT NOT NULL,
      "itemsJson" TEXT NOT NULL DEFAULT '[]',
      "status" TEXT NOT NULL DEFAULT 'Pendiente',
      "urgency" TEXT NOT NULL DEFAULT 'Normal',
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WorkshopPartRequest_pkey" PRIMARY KEY ("id")
    );
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim() || "";
    const estado = searchParams.get("estado")?.trim() || "";

    return await withRetry(async () => {
      await ensureTableExists();

      // Consultar productos reales en inventario de Neon para verificar stock real
      let products: any[] = [];
      try {
        products = await prisma.$queryRawUnsafe('SELECT "id", "code", "name", "stock", "price" FROM "Product"');
      } catch {}

      let query = 'SELECT * FROM "WorkshopPartRequest" WHERE 1=1';
      const params: any[] = [];
      let pIdx = 1;

      if (estado && estado !== "TODOS") {
        query += ` AND "status" ILIKE $${pIdx++}`;
        params.push(`%${estado}%`);
      }

      if (busqueda) {
        query += ` AND ("requestNumber" ILIKE $${pIdx} OR "vehicle" ILIKE $${pIdx} OR "mechanic" ILIKE $${pIdx} OR "orderId" ILIKE $${pIdx} OR "itemsJson" ILIKE $${pIdx})`;
        params.push(`%${busqueda}%`);
        pIdx++;
      }

      query += ' ORDER BY "createdAt" DESC';

      const rows: any = await prisma.$queryRawUnsafe(query, ...params);

      const requests = rows.map((r: any) => {
        let items: Array<{ name: string; quantity: number; available: boolean; code?: string; stock?: number }> = [];
        try {
          const parsed = r.itemsJson ? JSON.parse(r.itemsJson) : [];
          if (Array.isArray(parsed)) {
            items = parsed.map((it: any) => {
              const itemName = (it.name || "").toString();
              const matchedProd = products.find(
                (p) =>
                  p.name?.toLowerCase().includes(itemName.toLowerCase()) ||
                  itemName.toLowerCase().includes(p.name?.toLowerCase()) ||
                  (it.code && p.code === it.code)
              );
              const available = matchedProd
                ? Number(matchedProd.stock) >= Number(it.quantity || 1)
                : it.available !== undefined
                ? Boolean(it.available)
                : true;
              return {
                name: itemName,
                quantity: Number(it.quantity) || 1,
                available,
                stock: matchedProd ? Number(matchedProd.stock) : undefined,
                code: matchedProd?.code || it.code,
              };
            });
          }
        } catch {}

        const dt = r.createdAt ? new Date(r.createdAt) : new Date();
        const formattedDate = dt.toLocaleDateString("es-EC", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return {
          id: r.requestNumber || r.id,
          dbId: r.id,
          requestNumber: r.requestNumber,
          date: formattedDate,
          mechanic: r.mechanic,
          orderId: r.orderId || "ORD-GENERAL",
          vehicle: r.vehicle,
          items,
          status: r.status || "Pendiente",
          urgency: r.urgency || "Normal",
          notes: r.notes || "",
        };
      });

      return NextResponse.json({
        success: true,
        requests,
        products: products.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          stock: Number(p.stock || 0),
          price: Number(p.price || 0),
        })),
        total: requests.length,
      });
    });
  } catch (error: any) {
    console.error("Error al obtener peticiones de repuestos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar peticiones en Neon." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mechanic, orderId, vehicle, items, repuestosText, urgency, notes } = body;

    if (!mechanic || (!items && !repuestosText)) {
      return NextResponse.json(
        { success: false, error: "El mecánico y los repuestos solicitados son obligatorios." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      const id = generateId();
      const requestNumber = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;

      let parsedItems: Array<{ name: string; quantity: number; available: boolean }> = [];
      if (Array.isArray(items) && items.length > 0) {
        parsedItems = items.map((i: any) => ({
          name: String(i.name || "").trim(),
          quantity: Number(i.quantity) || 1,
          available: i.available !== undefined ? Boolean(i.available) : true,
        }));
      } else if (typeof repuestosText === "string" && repuestosText.trim()) {
        // Parsear líneas o comas, ej: "2x Pastillas de freno, 1x Filtro de aire"
        const lines = repuestosText
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        parsedItems = lines.map((line) => {
          const match = line.match(/^(\d+)\s*[xX*]?\s+(.+)$/);
          if (match) {
            return {
              quantity: parseInt(match[1], 10) || 1,
              name: match[2].trim(),
              available: true,
            };
          }
          return {
            quantity: 1,
            name: line,
            available: true,
          };
        });
      }

      const itemsJson = JSON.stringify(parsedItems);
      const finalVehicle = (vehicle || "Vehículo en Taller").trim();
      const finalOrderId = (orderId || "ORD-TALLER").trim();
      const finalUrgency = urgency || "Normal";

      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopPartRequest" ("id", "requestNumber", "mechanic", "orderId", "vehicle", "itemsJson", "status", "urgency", "notes", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        id,
        requestNumber,
        mechanic.trim(),
        finalOrderId,
        finalVehicle,
        itemsJson,
        "Pendiente",
        finalUrgency,
        notes ? notes.trim() : null
      );

      // También sincronizar con OrderRequest (tipo TALLER) para que el mostrador POS reciba la alerta en tiempo real
      try {
        const summaryText = parsedItems.map((i) => `${i.quantity}x ${i.name}`).join(", ");
        const solId = "sol_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        await prisma.$executeRawUnsafe(
          `INSERT INTO "OrderRequest" ("id", "requestNumber", "type", "customerName", "vehicleInfo", "itemsSummary", "itemsJson", "totalEstimated", "notes", "status", "createdAt", "updatedAt")
           VALUES ($1, $2, 'TALLER', $3, $4, $5, $6, 0, $7, 'PENDIENTE', NOW(), NOW())`,
          solId,
          requestNumber,
          `Mecánico: ${mechanic.trim()}`,
          `${finalVehicle} (${finalOrderId})`,
          `Petición Taller (${finalUrgency}): ${summaryText}`,
          itemsJson,
          notes ? notes.trim() : null
        );
      } catch (e) {
        console.warn("Aviso: no se pudo duplicar en OrderRequest:", e);
      }

      return NextResponse.json({
        success: true,
        requestNumber,
        message: "Solicitud de repuestos registrada en Neon y enviada a Bodega/POS.",
      });
    });
  } catch (error: any) {
    console.error("Error al crear solicitud de repuestos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear solicitud en Neon." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, urgency, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de solicitud requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopPartRequest"
         SET "status" = COALESCE($2, "status"),
             "urgency" = COALESCE($3, "urgency"),
             "notes" = COALESCE($4, "notes"),
             "updatedAt" = NOW()
         WHERE "id" = $1 OR "requestNumber" = $1`,
        id,
        status || null,
        urgency || null,
        notes !== undefined ? notes : null
      );

      // Si se marca como Entregado o Rechazado, actualizar también en OrderRequest si existe con el mismo requestNumber
      if (status) {
        try {
          const mappedStatus =
            status === "Entregado"
              ? "DESPACHADO"
              : status === "Aprobado"
              ? "EN_DESPACHO"
              : status === "Rechazado"
              ? "CANCELADO"
              : "PENDIENTE";
          await prisma.$executeRawUnsafe(
            `UPDATE "OrderRequest" SET "status" = $2, "updatedAt" = NOW() WHERE "requestNumber" = $1`,
            id,
            mappedStatus
          );
        } catch {}
      }

      return NextResponse.json({
        success: true,
        message: "Estado de solicitud actualizado en Neon.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar solicitud de repuestos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar solicitud en Neon." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de solicitud requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTableExists();
      await prisma.$executeRawUnsafe(
        'DELETE FROM "WorkshopPartRequest" WHERE "id" = $1 OR "requestNumber" = $1',
        id
      );

      return NextResponse.json({
        success: true,
        message: "Solicitud eliminada de Neon.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar solicitud de repuestos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar solicitud en Neon." },
      { status: 500 }
    );
  }
}
