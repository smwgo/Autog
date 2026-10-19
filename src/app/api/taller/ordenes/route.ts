import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function generateId(): string {
  return "ord_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
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

// GET: Listar órdenes reales con filtros directamente desde Neon DB
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const busqueda = searchParams.get("busqueda");
    const idParam = searchParams.get("id") || searchParams.get("orderNumber");

    return await withRetry(async () => {
      let query = 'SELECT * FROM "WorkshopOrder" WHERE 1=1';
      const params: any[] = [];
      let pIdx = 1;

      if (idParam) {
        query += ` AND ("id" = $${pIdx} OR "orderNumber" = $${pIdx})`;
        params.push(idParam);
        pIdx++;
      }

      if (estado && estado !== "TODOS") {
        query += ` AND "status" ILIKE $${pIdx++}`;
        params.push(`%${estado}%`);
      }

      if (busqueda) {
        query += ` AND ("vehicle" ILIKE $${pIdx} OR "plate" ILIKE $${pIdx} OR "client" ILIKE $${pIdx} OR "orderNumber" ILIKE $${pIdx})`;
        params.push(`%${busqueda}%`);
        pIdx++;
      }

      query += ' ORDER BY "createdAt" DESC';

      const rows: any = await prisma.$queryRawUnsafe(query, ...params);

      // Consultar facturas para verificar estado de facturación de cada orden
      let invoiceByOrder = new Map<string, any>();
      try {
        const invoices = await prisma.clientInvoice.findMany({
          select: { id: true, invoiceNumber: true, orderId: true, status: true, amount: true, date: true, paymentMethod: true },
        });
        invoices.forEach((inv) => {
          if (inv.orderId) {
            invoiceByOrder.set(inv.orderId, inv);
          }
        });
      } catch (invErr) {
        console.warn("Aviso al consultar facturas de clientes:", invErr);
      }

      // Mapear campos para la UI
      const orders = rows.map((r: any) => {
        let services: string[] = [];
        try {
          services = r.servicesJson ? JSON.parse(r.servicesJson) : [];
        } catch {}

        let items: any[] = [];
        try {
          items = r.itemsJson ? JSON.parse(r.itemsJson) : [];
        } catch {}

        let inspectionFindings: any[] = [];
        try {
          inspectionFindings = r.inspectionFindingsJson ? JSON.parse(r.inspectionFindingsJson) : [];
        } catch {}

        let receptionInventory: any[] = [];
        try {
          receptionInventory = r.receptionInventoryJson ? JSON.parse(r.receptionInventoryJson) : [];
        } catch {}

        let receptionPhotos: string[] = [];
        try {
          receptionPhotos = r.receptionPhotosJson ? JSON.parse(r.receptionPhotosJson) : [];
        } catch {}

        let payments: any[] = [];
        try {
          payments = r.paymentsJson ? JSON.parse(r.paymentsJson) : [];
        } catch {}

        const linkedInvoice = invoiceByOrder.get(r.orderNumber) || invoiceByOrder.get(r.id);
        const st = (r.status || "").toLowerCase();
        const deliv = (r.deliveryStatus || "").toLowerCase();

        const isBilled =
          st.includes("factur") ||
          deliv.includes("factur") ||
          deliv.includes("pagad") ||
          (Boolean(linkedInvoice) && linkedInvoice.status?.toLowerCase() !== "anulada") ||
          (Array.isArray(payments) && payments.length > 0) ||
          Boolean(r.notes && (r.notes.includes("[Facturada]") || r.notes.includes("Facturada")));

        const billingStatus = isBilled ? "Facturada" : "En Proceso";

        let color = "bg-blue-500";
        if (st.includes("diagnóstico") || st.includes("espera")) color = "bg-amber-500";
        if (st.includes("reparando")) color = "bg-blue-500";
        if (st.includes("repuestos")) color = "bg-rose-500";
        if (st.includes("listo") || st.includes("entregado")) color = "bg-emerald-500";

        return {
          id: r.orderNumber || r.id,
          dbId: r.id,
          orderNumber: r.orderNumber,
          vehicle: r.vehicle,
          plate: r.plate,
          client: r.client,
          clientPhone: r.clientPhone,
          clientIdDoc: r.clientIdDoc,
          clientEmail: r.clientEmail,
          mechanic: r.mechanic,
          status: r.status,
          progress: r.progress || 0,
          dateIn: r.dateIn ? new Date(r.dateIn).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          estimatedOut: r.estimatedOut || "En Evaluación",
          color,
          services,
          items,
          inspectionFindings,
          receptionInventory,
          receptionPhotos,
          payments,
          mileage: r.mileage,
          fuelLevel: r.fuelLevel,
          generalCondition: r.generalCondition,
          deliveryStatus: r.deliveryStatus,
          quoteNumber: r.quoteNumber,
          quoteStatus: r.quoteStatus,
          notes: r.notes,
          totalCost: r.totalCost ? Number(r.totalCost) : 0,
          isBilled,
          billingStatus,
          invoiceInfo: linkedInvoice
            ? {
                invoiceNumber: linkedInvoice.invoiceNumber,
                amount: Number(linkedInvoice.amount || 0),
                status: linkedInvoice.status,
                date: linkedInvoice.date,
                paymentMethod: linkedInvoice.paymentMethod,
              }
            : null,
        };
      });

      return NextResponse.json({
        success: true,
        order: orders.length > 0 ? orders[0] : null,
        orders,
        total: orders.length,
      });
    });
  } catch (error: any) {
    console.error("Error al obtener órdenes de taller:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar órdenes." },
      { status: 500 }
    );
  }
}

// POST: Crear nueva orden de taller
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicle, plate, client, clientPhone, mechanic, notes, services, totalEstimated, estimatedOut } = body;

    if (!vehicle || !plate || !client) {
      return NextResponse.json(
        { success: false, error: "Vehículo, Placa y Cliente son requeridos." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      const id = generateId();
      const orderNumber = `ORD-2024-${Math.floor(100 + Math.random() * 900)}`;
      const servicesJson = JSON.stringify(Array.isArray(services) ? services : []);

      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopOrder" ("id", "orderNumber", "vehicle", "plate", "client", "clientPhone", "mechanic", "status", "progress", "servicesJson", "notes", "estimatedOut", "totalCost", "dateIn", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW())`,
        id,
        orderNumber,
        vehicle.trim(),
        plate.trim().toUpperCase(),
        client.trim(),
        clientPhone ? clientPhone.trim() : null,
        mechanic || "Carlos Rodríguez",
        "En Diagnóstico",
        15,
        servicesJson,
        notes ? notes.trim() : null,
        estimatedOut || "24 Horas",
        totalEstimated ? parseFloat(totalEstimated) : 0
      );

      const rows: any = await prisma.$queryRawUnsafe('SELECT * FROM "WorkshopOrder" WHERE id = $1', id);

      // Sincronizar tareas automáticamente en WorkshopTask en Neon
      try {
        const srvList = Array.isArray(services) && services.length > 0 ? services : ["Revisión General"];
        for (const srvName of srvList) {
          const tId = "tsk_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          const tNum = `TSK-${Math.floor(100 + Math.random() * 900)}`;
          await prisma.$executeRawUnsafe(
            `INSERT INTO "WorkshopTask" ("id", "taskNumber", "title", "vehicle", "plate", "orderNumber", "mechanic", "status", "priority", "timeEst", "notes", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'Media', $8, $9, NOW(), NOW())`,
            tId,
            tNum,
            String(srvName),
            `${vehicle.trim()} (${plate.trim().toUpperCase()})`,
            plate.trim().toUpperCase(),
            orderNumber,
            mechanic || "Carlos Rodríguez",
            estimatedOut || "1h 00m",
            notes ? notes.trim() : null
          );
        }
      } catch (e) {
        console.warn("Aviso al crear tareas automáticas:", e);
      }

      // Sincronizar vehículo automáticamente en la tabla Vehicle
      try {
        const cleanPlate = plate.trim().toUpperCase();
        const existingVehicle = await prisma.vehicle.findUnique({ where: { plate: cleanPlate } });
        if (!existingVehicle) {
          let customer = await prisma.customer.findFirst({
            where: { name: { contains: client.trim(), mode: "insensitive" } },
          });
          if (!customer) {
            customer = await prisma.customer.create({
              data: {
                identification: `CLI-${Date.now().toString().slice(-4)}`,
                name: client.trim(),
                phone: clientPhone ? clientPhone.trim() : "N/A",
                type: "Taller",
              },
            });
          }
          const parts = vehicle.trim().split(" ");
          const brand = parts[0] || "General";
          const model = parts.slice(1).join(" ") || "Vehículo";
          await prisma.vehicle.create({
            data: {
              plate: cleanPlate,
              brand,
              model,
              customerId: customer.id,
            },
          });
        }
      } catch (vehSyncErr) {
        console.warn("Aviso al sincronizar vehículo con taller:", vehSyncErr);
      }

      return NextResponse.json({
        success: true,
        order: rows?.[0],
        message: "Orden de taller creada exitosamente.",
      });
    });
  } catch (error: any) {
    console.error("Error al crear orden de taller:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear la orden." },
      { status: 500 }
    );
  }
}

// PUT: Actualizar estado o datos de una orden
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, progress, mechanic, notes, billingStatus, isBilled } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID o número de orden es requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      let deliveryStatusVal: string | null = null;
      if (billingStatus === "Facturada" || isBilled === true) {
        deliveryStatusVal = "Facturado";
      } else if (billingStatus === "En Proceso" || isBilled === false) {
        deliveryStatusVal = "Pendiente";
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopOrder"
         SET "status" = COALESCE($2, "status"),
             "progress" = COALESCE($3, "progress"),
             "mechanic" = COALESCE($4, "mechanic"),
             "notes" = COALESCE($5, "notes"),
             "deliveryStatus" = COALESCE($6, "deliveryStatus"),
             "updatedAt" = NOW()
         WHERE id = $1 OR "orderNumber" = $1`,
        id,
        status || null,
        progress !== undefined ? parseInt(progress) : null,
        mechanic || null,
        notes || null,
        deliveryStatusVal
      );

      // Si pasa a Listo para Entregar, registrar automáticamente en WorkshopHistory si no existe
      if (status && status.toLowerCase().includes("listo")) {
        try {
          const ordRows: any = await prisma.$queryRawUnsafe(
            'SELECT * FROM "WorkshopOrder" WHERE id = $1 OR "orderNumber" = $1 LIMIT 1',
            id
          );
          const ord = ordRows?.[0];
          if (ord) {
            const existingHist: any = await prisma.$queryRawUnsafe(
              'SELECT "id" FROM "WorkshopHistory" WHERE "orderNumber" = $1 LIMIT 1',
              ord.orderNumber
            );
            if (!existingHist || existingHist.length === 0) {
              const hId = "hst_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
              const srvCode = `SRV-${Math.floor(1000 + Math.random() * 9000)}`;
              const todayStr = new Date().toISOString().split("T")[0];
              await prisma.$executeRawUnsafe(
                `INSERT INTO "WorkshopHistory" ("id", "serviceCode", "date", "vehicle", "plate", "client", "servicesJson", "cost", "mechanic", "mileage", "notes", "orderNumber", "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Reciente', $10, $11, NOW(), NOW())`,
                hId,
                srvCode,
                todayStr,
                ord.vehicle,
                ord.plate,
                ord.client,
                ord.servicesJson || '["Revisión General"]',
                Number(ord.totalCost || 0),
                ord.mechanic || "Carlos Rodríguez",
                ord.notes || "Orden completada en taller.",
                ord.orderNumber
              );
            }
          }
        } catch (e) {
          console.warn("Aviso al sincronizar orden con historial:", e);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Orden actualizada correctamente.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar orden:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar la orden." },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una orden de taller
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID o número de orden es requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await prisma.$executeRawUnsafe(
        'DELETE FROM "WorkshopOrder" WHERE id = $1 OR "orderNumber" = $1',
        id
      );

      return NextResponse.json({
        success: true,
        message: "Orden eliminada exitosamente.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar orden:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar la orden." },
      { status: 500 }
    );
  }
}
