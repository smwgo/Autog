import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedSessionFromRequest, isStaffSession } from "@/lib/signed-tokens";
import { resolveSessionCustomerScope } from "@/lib/client-scope";

export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  try {
    const session = getVerifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }
    const staff = isStaffSession(session);
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim() || "";
    const vehiculo = searchParams.get("vehiculo")?.trim() || "";

    return await withRetry(async () => {
      let query = 'SELECT * FROM "WorkshopHistory" WHERE 1=1';
      const params: any[] = [];
      let pIdx = 1;

      if (!staff) {
        const scoped = await resolveSessionCustomerScope(session, true);
        const nameCandidates = Array.from(
          new Set([scoped?.name, session.name].map((v) => String(v || "").trim()).filter(Boolean))
        );
        const plateCandidates = (scoped?.vehicles || []).map((v) => v.plate.trim().toUpperCase()).filter(Boolean);
        const scopeClauses: string[] = [];
        for (const nm of nameCandidates) {
          scopeClauses.push(`LOWER("client") = LOWER($${pIdx++})`);
          params.push(nm);
        }
        for (const pl of plateCandidates) {
          scopeClauses.push(`UPPER("plate") = UPPER($${pIdx++})`);
          params.push(pl);
        }
        if (scopeClauses.length === 0) {
          return NextResponse.json({ success: true, history: [], total: 0 });
        }
        query += ` AND (${scopeClauses.join(" OR ")})`;
      }

      if (vehiculo && vehiculo !== "Todos") {
        query += ` AND ("vehicle" ILIKE $${pIdx} OR "plate" ILIKE $${pIdx})`;
        params.push(`%${vehiculo}%`);
        pIdx++;
      }

      if (busqueda) {
        query += ` AND ("serviceCode" ILIKE $${pIdx} OR "vehicle" ILIKE $${pIdx} OR "plate" ILIKE $${pIdx} OR "servicesJson" ILIKE $${pIdx} OR COALESCE("notes", '') ILIKE $${pIdx} OR COALESCE("orderNumber", '') ILIKE $${pIdx})`;
        params.push(`%${busqueda}%`);
        pIdx++;
      }

      query += ' ORDER BY "createdAt" DESC';

      const rows: any = await prisma.$queryRawUnsafe(query, ...params);

      // Consultar facturas reales asociadas por orden o número de servicio
      const orderKeys = rows
        .map((r: any) => String(r.orderNumber || r.serviceCode || "").trim())
        .filter(Boolean);
      const realInvoices = orderKeys.length > 0
        ? await prisma.clientInvoice.findMany({
            where: { orderId: { in: orderKeys } },
            select: { orderId: true, invoiceNumber: true, uuid: true },
          }).catch(() => [])
        : [];
      const invoiceByOrder = new Map<string, { invoiceNumber: string; uuid: string }>();
      for (const inv of realInvoices) {
        if (inv.orderId) invoiceByOrder.set(inv.orderId, inv);
      }

      const history = rows.map((r: any) => {
        let services: string[] = [];
        try {
          services = r.servicesJson ? JSON.parse(r.servicesJson) : [];
        } catch {}

        const cost = Number(r.cost || 0);
        const type = services[0] || "Mantenimiento General";
        const details =
          services.length > 0
            ? `${services.join(", ")}.${r.notes ? " " + r.notes : ""}`
            : r.notes || "Servicio técnico automotriz completado.";

        const matchedInvoice = r.orderNumber ? invoiceByOrder.get(String(r.orderNumber).trim()) : undefined;
        const invoiceId = matchedInvoice?.invoiceNumber || null;

        // Calcular vigencia de garantía (6 meses desde fecha o creación)
        const recDate = r.date ? new Date(r.date) : new Date(r.createdAt || Date.now());
        const expDate = new Date(recDate.getTime() + 180 * 24 * 60 * 60 * 1000);
        const isActive = expDate.getTime() >= Date.now();
        const expStr = expDate.toISOString().split("T")[0];

        let photos: string[] = [];
        try {
          photos = r.photosJson ? JSON.parse(r.photosJson) : [];
        } catch {}

        return {
          id: r.orderNumber || r.serviceCode || r.id,
          dbId: r.id,
          serviceCode: r.serviceCode,
          invoiceId,
          uuid: matchedInvoice?.uuid || null,
          date: r.date,
          vehicle: `${r.vehicle} (${r.plate})`,
          rawVehicle: r.vehicle,
          plate: r.plate,
          client: r.client,
          mileage: r.mileage || "N/A",
          nextOilChangeKm: r.nextOilChangeKm ? Number(r.nextOilChangeKm) : null,
          photos,
          type,
          details,
          services,
          mechanic: r.mechanic || "Por asignar",
          laborCost: null,
          partsCost: null,
          cost,
          paymentMethod: "Tarjeta / Transferencia",
          warranty: {
            active: isActive,
            expires: r.nextOilChangeKm
              ? `${expStr} o ${Number(r.nextOilChangeKm).toLocaleString()} km`
              : `${expStr} o +5,000 km`,
            coverage: `Cubre mano de obra certificada por ${
              r.mechanic || "Taller AutoG"
            } y garantía de ajuste en: ${services.join(", ") || "servicio realizado"}.`,
          },
        };
      });

      return NextResponse.json({
        success: true,
        history,
        total: history.length,
      });
    });
  } catch (error: any) {
    console.error("Error al consultar historial de cliente en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar historial en base de datos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicle, plate, client, type, details, cost, mileage, date } = body;

    if (!vehicle || !plate || !type) {
      return NextResponse.json(
        { success: false, error: "Vehículo, placa y tipo de servicio son requeridos." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      const id = "hst_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const serviceCode = `SRV-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const finalDate = date || new Date().toISOString().split("T")[0];
      const servicesJson = JSON.stringify([type.trim()]);
      const numCost = parseFloat(cost?.toString() || "0") || 0;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopHistory" ("id", "serviceCode", "date", "vehicle", "plate", "client", "servicesJson", "cost", "mechanic", "mileage", "notes", "orderNumber", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Carlos Rodríguez', $9, $10, $11, NOW(), NOW())`,
        id,
        serviceCode,
        finalDate,
        vehicle.trim(),
        plate.trim().toUpperCase(),
        (client || "Cliente").trim(),
        servicesJson,
        numCost,
        mileage ? mileage.trim() : "N/A",
        details ? details.trim() : null,
        orderNumber
      );

      return NextResponse.json({
        success: true,
        serviceCode,
        orderNumber,
        message: "Registro de historial guardado en base de datos.",
      });
    });
  } catch (error: any) {
    console.error("Error al crear registro en historial:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar en base de datos." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, vehicle, plate, type, details, cost, mileage } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID requerido para actualizar." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      const servicesJson = type ? JSON.stringify([type.trim()]) : null;
      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopHistory"
         SET "vehicle" = COALESCE($2, "vehicle"),
             "plate" = COALESCE($3, "plate"),
             "servicesJson" = COALESCE($4, "servicesJson"),
             "notes" = COALESCE($5, "notes"),
             "cost" = COALESCE($6, "cost"),
             "mileage" = COALESCE($7, "mileage"),
             "updatedAt" = NOW()
         WHERE "id" = $1 OR "serviceCode" = $1 OR "orderNumber" = $1`,
        id,
        vehicle || null,
        plate ? plate.toUpperCase() : null,
        servicesJson,
        details !== undefined ? details : null,
        cost !== undefined ? parseFloat(cost.toString()) : null,
        mileage || null
      );

      return NextResponse.json({
        success: true,
        message: "Historial actualizado en base de datos.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar historial:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar historial en base de datos." },
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
        { success: false, error: "ID requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await prisma.$executeRawUnsafe(
        'DELETE FROM "WorkshopHistory" WHERE "id" = $1 OR "serviceCode" = $1 OR "orderNumber" = $1',
        id
      );

      return NextResponse.json({
        success: true,
        message: "Registro eliminado de base de datos.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar historial:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar en base de datos." },
      { status: 500 }
    );
  }
}
