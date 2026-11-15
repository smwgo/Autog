import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitRealtimeEvent } from "@/lib/realtime";
import fs from "fs";
import path from "path";

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
    const sede = (searchParams.get("sede") || "PRINCIPAL").toUpperCase();
    const userBranch = (searchParams.get("userBranch") || "PRINCIPAL").toUpperCase();

    return await withRetry(async () => {
      await prisma.$executeRawUnsafe(`ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "branch" TEXT DEFAULT 'PRINCIPAL'`).catch(() => {});
      await prisma.$executeRawUnsafe(`ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "transferredFrom" TEXT`).catch(() => {});

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

      // Filtrar por jerarquía Principal + Sucursal si no es consulta por id específico
      const filteredRows = idParam
        ? rows
        : rows.filter((r: any) => {
            const orderBranch = (r.branch || "PRINCIPAL").toUpperCase();
            if (userBranch === "SUCURSAL") return orderBranch === "SUCURSAL";
            if (sede === "SUCURSAL") return orderBranch === "SUCURSAL";
            if (sede === "PRINCIPAL") return orderBranch === "PRINCIPAL";
            return true;
          });

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

      // Consultar evidencias multimedia estructuradas desde Neon DB
      let evidencesByOrder = new Map<string, any[]>();
      try {
        const orderIds = filteredRows.map((r: any) => r.id);
        const orderNumbers = filteredRows.map((r: any) => r.orderNumber);
        const allKeys = [...new Set([...orderIds, ...orderNumbers])].filter(Boolean);

        if (allKeys.length > 0) {
          const evidenceRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "WorkshopEvidence" 
             WHERE ("orderId" = ANY($1::text[]) OR "orderNumber" = ANY($1::text[]))
               AND "uploadStatus" = 'COMPLETED'
             ORDER BY "createdAt" ASC`,
            allKeys
          );

          evidenceRows.forEach((ev: any) => {
            const mappedEv = {
              id: ev.id,
              orderId: ev.orderId,
              orderNumber: ev.orderNumber,
              vehicleId: ev.vehicleId,
              plate: ev.plate,
              type: ev.type,
              r2Key: ev.r2Key,
              mimeType: ev.mimeType,
              fileSizeBytes: Number(ev.fileSizeBytes || 0),
              durationSeconds: ev.durationSeconds ? Number(ev.durationSeconds) : null,
              transcriptionText: ev.transcriptionText,
              uploadStatus: ev.uploadStatus,
              transcriptionStatus: ev.transcriptionStatus,
              uploadedBy: ev.uploadedBy,
              url: `/api/storage/download?key=${encodeURIComponent(ev.r2Key)}`,
              createdAt: ev.createdAt ? new Date(ev.createdAt).toISOString() : null,
            };

            if (ev.orderId) {
              const list = evidencesByOrder.get(ev.orderId) || [];
              list.push(mappedEv);
              evidencesByOrder.set(ev.orderId, list);
            }
            if (ev.orderNumber) {
              const list = evidencesByOrder.get(ev.orderNumber) || [];
              if (!list.some((x: any) => x.id === ev.id)) {
                list.push(mappedEv);
                evidencesByOrder.set(ev.orderNumber, list);
              }
            }
          });
        }
      } catch (evErr) {
        console.warn("Aviso al consultar evidencias en ordenes:", evErr);
      }

      // Mapear campos para la UI
      const orders = filteredRows.map((r: any) => {
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

        const evidences = evidencesByOrder.get(r.id) || evidencesByOrder.get(r.orderNumber) || [];
        const mergedReceptionPhotos =
          receptionPhotos.length > 0
            ? receptionPhotos
            : evidences.filter((e: any) => e.type === "image").map((e: any) => e.url);

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
          receptionPhotos: mergedReceptionPhotos,
          evidences,
          payments,
          mileage: r.mileage,
          fuelLevel: r.fuelLevel,
          generalCondition: r.generalCondition,
          deliveryStatus: r.deliveryStatus,
          quoteNumber: r.quoteNumber,
          quoteStatus: r.quoteStatus,
          notes: r.notes,
          totalCost: r.totalCost ? Number(r.totalCost) : 0,
          branch: r.branch || "PRINCIPAL",
          transferredFrom: r.transferredFrom || null,
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
      const orderNumber = `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`;
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

      emitRealtimeEvent({ channel: "taller", action: "created", entityId: rows?.[0]?.id });
      emitRealtimeEvent({ channel: "presupuestos", action: "created", entityId: rows?.[0]?.id });
      emitRealtimeEvent({ channel: "clientes", action: "updated" });
      emitRealtimeEvent({ channel: "vehiculos", action: "updated" });

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
    const { id, action, targetBranch, status, progress, mechanic, notes, billingStatus, isBilled } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID o número de orden es requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await prisma.$executeRawUnsafe(`ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "branch" TEXT DEFAULT 'PRINCIPAL'`).catch(() => {});
      await prisma.$executeRawUnsafe(`ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "transferredFrom" TEXT`).catch(() => {});

      if (action === "TRANSFERIR_SUCURSAL") {
        const ordRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE id = $1 OR "orderNumber" = $1 LIMIT 1`,
          id
        );
        if (!ordRows || ordRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }
        const ord = ordRows[0];
        const currentBranch = (ord.branch || "PRINCIPAL").toUpperCase();
        const destBranch = targetBranch
          ? String(targetBranch).toUpperCase() === "SUCURSAL"
            ? "SUCURSAL"
            : "PRINCIPAL"
          : currentBranch === "SUCURSAL"
          ? "PRINCIPAL"
          : "SUCURSAL";

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "branch" = $2,
               "transferredFrom" = $3,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          ord.id,
          destBranch,
          currentBranch
        );

        if (destBranch === "SUCURSAL") {
          if (ord.customerId) {
            await prisma.$executeRawUnsafe(
              `UPDATE "Customer" SET "assignedToSucursal" = true WHERE "id" = $1`,
              ord.customerId
            ).catch(() => {});
          } else if (ord.client) {
            await prisma.$executeRawUnsafe(
              `UPDATE "Customer" SET "assignedToSucursal" = true WHERE LOWER("name") = LOWER($1)`,
              ord.client
            ).catch(() => {});
          }
        }

        emitRealtimeEvent({ channel: "taller", action: "updated", entityId: id });
        emitRealtimeEvent({ channel: "presupuestos", action: "updated", entityId: id });

        return NextResponse.json({
          success: true,
          branch: destBranch,
          message: `Orden ${ord.orderNumber} transferida a ${destBranch === "SUCURSAL" ? "Sucursal" : "Principal"} exitosamente.`,
        });
      }

      let statusOverride: string | null = status || null;
      let quoteStatusOverride: string | null = null;
      if (billingStatus === "Facturada" || isBilled === true) {
        statusOverride = status || "Pagado";
        quoteStatusOverride = "Pagado";
      } else if (billingStatus === "En Proceso" || isBilled === false) {
        statusOverride = status || "En Proceso";
        quoteStatusOverride = "Aprobado";
      }
      const deliveryStatusVal = billingStatus === "Facturada" || isBilled === true ? "Facturado" : billingStatus === "En Proceso" || isBilled === false ? "Pendiente" : null;

      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopOrder"
         SET "status" = COALESCE($2, "status"),
             "progress" = COALESCE($3, "progress"),
             "mechanic" = COALESCE($4, "mechanic"),
             "notes" = COALESCE($5, "notes"),
             "deliveryStatus" = COALESCE($6, "deliveryStatus"),
             "quoteStatus" = COALESCE($7, "quoteStatus"),
             "updatedAt" = NOW()
         WHERE id = $1 OR "orderNumber" = $1`,
        id,
        statusOverride,
        progress !== undefined ? parseInt(progress) : null,
        mechanic || null,
        notes || null,
        deliveryStatusVal,
        quoteStatusOverride
      );

      // Si pasa a Listo para Entregar, registrar automáticamente en WorkshopHistory si no existe
      if ((status && status.toLowerCase().includes("listo")) || deliveryStatusVal === "Facturado") {
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

      emitRealtimeEvent({ channel: "taller", action: "status_changed", entityId: id });
      emitRealtimeEvent({ channel: "presupuestos", action: "status_changed", entityId: id });

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

// DELETE: Eliminar una orden de taller y sus registros asociados (solicitud, historial, factura/venta vinculada, mirror)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = (searchParams.get("id") || "").trim();
    const orderNumberParam = (searchParams.get("orderNumber") || "").trim();

    if (!id && !orderNumberParam) {
      return NextResponse.json(
        { success: false, error: "El ID o número de orden es requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      let ordRows: any[] = [];
      try {
        ordRows = (await prisma.$queryRawUnsafe(
          'SELECT "id", "orderNumber", "client", "plate" FROM "WorkshopOrder" WHERE id = $1 OR "orderNumber" = $1 OR ($2 != \'\' AND "orderNumber" = $2) LIMIT 1',
          id || orderNumberParam,
          orderNumberParam || ""
        ).catch(() => [])) as any[];
      } catch {}

      let ord = ordRows?.[0];

      // Buscar también en ClientQuote si no está en WorkshopOrder (ej. propuestas #PRE-...)
      if (!ord) {
        try {
          const cqRows = (await prisma.$queryRawUnsafe(
            'SELECT "id", "quoteNumber" as "orderNumber", "clientName" as "client", "plate" FROM "ClientQuote" WHERE "id" = $1 OR "quoteNumber" = $1 OR ($2 != \'\' AND "quoteNumber" = $2) LIMIT 1',
            id || orderNumberParam,
            orderNumberParam || ""
          ).catch(() => [])) as any[];
          if (cqRows?.[0]) ord = cqRows[0];
        } catch {}
      }

      // Fallback: si no está en Neon, buscar datos en el mirror local
      if (!ord) {
        try {
          const mirrorPath = path.join(process.cwd(), "prisma", "neon-local-mirror.json");
          if (fs.existsSync(mirrorPath)) {
            const mirrorData = JSON.parse(fs.readFileSync(mirrorPath, "utf-8"));
            const list = [
              ...(mirrorData.workshopOrder || mirrorData.WorkshopOrder || []),
              ...(mirrorData.clientQuote || mirrorData.ClientQuote || []),
            ];
            ord = list.find(
              (o: any) =>
                (id && o.id === id) ||
                (id && (o.orderNumber === id || o.quoteNumber === id)) ||
                (orderNumberParam && (o.orderNumber === orderNumberParam || o.quoteNumber === orderNumberParam))
            );
          }
        } catch {}
      }

      const orderNum = (ord?.orderNumber || orderNumberParam || id).toString().trim();
      const rawNum = orderNum.replace(/^(ot|ord)[-\s#]*/gi, "").replace(/#+/g, "").trim();
      const candidateNums = Array.from(
        new Set([
          id,
          orderNumberParam,
          ord?.id,
          orderNum,
          rawNum,
          `#${rawNum}`,
          `OT #${rawNum}`,
          `OT-${rawNum}`,
          `OT-OT ${rawNum}`,
          `OT ${rawNum}`,
        ].filter(Boolean))
      ) as string[];

      // 1. Eliminar solicitudes POS/Taller vinculadas
      for (const num of candidateNums) {
        await prisma
          .$executeRawUnsafe('DELETE FROM "OrderRequest" WHERE "requestNumber" = $1', num)
          .catch(() => {});
      }

      // 2. Eliminar historial de taller vinculado
      for (const num of candidateNums) {
        await prisma
          .$executeRawUnsafe('DELETE FROM "WorkshopHistory" WHERE "orderNumber" = $1', num)
          .catch(() => {});
      }

      // 3. Eliminar facturas electrónicas vinculadas
      await prisma
        .$executeRawUnsafe(
          'DELETE FROM "ClientInvoice" WHERE "orderId" = $1 OR "orderId" = $2',
          ord?.id || id,
          orderNum
        )
        .catch(() => {});

      // 4. Eliminar ventas POS vinculadas por sourceOrderNumber
      for (const num of candidateNums) {
        try {
          const linkedSales = await prisma.sale.findMany({
            where: { sourceOrderNumber: num },
            select: { id: true },
          }).catch(() => []);
          for (const s of linkedSales) {
            await prisma.saleItem.deleteMany({ where: { saleId: s.id } }).catch(() => {});
            await prisma.sale.delete({ where: { id: s.id } }).catch(() => {});
          }
        } catch {}
      }

      // 5. Eliminar evidencias vinculadas
      for (const num of candidateNums) {
        await prisma
          .$executeRawUnsafe('DELETE FROM "WorkshopEvidence" WHERE "orderId" = $1 OR "orderNumber" = $1', num)
          .catch(() => {});
      }

      // 6. Eliminar la orden de taller y/o propuesta (ClientQuote) en Neon PostgreSQL
      for (const num of candidateNums) {
        await prisma
          .$executeRawUnsafe('DELETE FROM "WorkshopOrder" WHERE id = $1 OR "orderNumber" = $1', num)
          .catch(() => {});
        await prisma
          .$executeRawUnsafe('DELETE FROM "ClientQuote" WHERE id = $1 OR "quoteNumber" = $1', num)
          .catch(() => {});
      }

      // 7. Eliminar del mirror local (neon-local-mirror.json)
      try {
        const mirrorPath = path.join(process.cwd(), "prisma", "neon-local-mirror.json");
        if (fs.existsSync(mirrorPath)) {
          const mirrorData = JSON.parse(fs.readFileSync(mirrorPath, "utf-8"));
          const matchIds = new Set(
            candidateNums.map((x) => String(x).toLowerCase().trim())
          );

          let modified = false;
          ["workshopOrder", "WorkshopOrder"].forEach((key) => {
            if (Array.isArray(mirrorData[key])) {
              const beforeLen = mirrorData[key].length;
              mirrorData[key] = mirrorData[key].filter((o: any) => {
                const oid = String(o.id || "").toLowerCase().trim();
                const onum = String(o.orderNumber || "").toLowerCase().trim();
                const oraw = onum.replace(/^(ot|ord)[-\s#]*/gi, "").replace(/#+/g, "").trim();
                return !matchIds.has(oid) && !matchIds.has(onum) && !matchIds.has(oraw);
              });
              if (mirrorData[key].length !== beforeLen) modified = true;
            }
          });

          ["clientQuote", "ClientQuote"].forEach((key) => {
            if (Array.isArray(mirrorData[key])) {
              const beforeLen = mirrorData[key].length;
              mirrorData[key] = mirrorData[key].filter((q: any) => {
                const qid = String(q.id || "").toLowerCase().trim();
                const qnum = String(q.quoteNumber || "").toLowerCase().trim();
                const qraw = qnum.replace(/^#+/g, "").trim();
                return !matchIds.has(qid) && !matchIds.has(qnum) && !matchIds.has(qraw);
              });
              if (mirrorData[key].length !== beforeLen) modified = true;
            }
          });

          ["orderRequest", "OrderRequest"].forEach((key) => {
            if (Array.isArray(mirrorData[key])) {
              const beforeLen = mirrorData[key].length;
              mirrorData[key] = mirrorData[key].filter((r: any) => {
                const rid = String(r.id || "").toLowerCase().trim();
                const rnum = String(r.requestNumber || "").toLowerCase().trim();
                return !matchIds.has(rid) && !matchIds.has(rnum);
              });
              if (mirrorData[key].length !== beforeLen) modified = true;
            }
          });

          ["workshopEvidence", "WorkshopEvidence"].forEach((key) => {
            if (Array.isArray(mirrorData[key])) {
              const beforeLen = mirrorData[key].length;
              mirrorData[key] = mirrorData[key].filter((e: any) => {
                const eoid = String(e.orderId || "").toLowerCase().trim();
                const eonum = String(e.orderNumber || "").toLowerCase().trim();
                return !matchIds.has(eoid) && !matchIds.has(eonum);
              });
              if (mirrorData[key].length !== beforeLen) modified = true;
            }
          });

          if (modified) {
            fs.writeFileSync(mirrorPath, JSON.stringify(mirrorData, null, 2), "utf-8");
          }
        }
      } catch (mirrorErr) {
        console.warn("Aviso al remover orden del mirror local:", mirrorErr);
      }

      emitRealtimeEvent({ channel: "taller", action: "deleted", entityId: id ?? undefined });
      emitRealtimeEvent({ channel: "presupuestos", action: "deleted", entityId: id ?? undefined });
      emitRealtimeEvent({ channel: "ordenes", action: "deleted", entityId: id ?? undefined });

      return NextResponse.json({
        success: true,
        message: `Orden #${rawNum || orderNum} eliminada exitosamente.`,
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
