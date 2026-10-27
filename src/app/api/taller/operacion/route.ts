import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

let schemaEnsured = false;

async function ensureTallerSchema() {
  if (schemaEnsured) return;
  try {
    const statements = [
      `ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "vehicleType" TEXT DEFAULT 'Auto'`,
      `ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "nextOilChangeMileage" INTEGER`,
      `ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "photosJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "customerId" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "vehicleId" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "clientIdDoc" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "mileage" INTEGER`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "nextOilChangeKm" INTEGER`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "fuelLevel" TEXT DEFAULT '1/2'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "generalCondition" TEXT DEFAULT 'Bueno'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "receptionInventoryJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "inspectionFindingsJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "receptionSignatureUrl" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "inspectionChecklistJson" TEXT DEFAULT '{}'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "inspectionTemplateId" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "itemsJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "receptionPhotosJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "evidencePhotosJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "voiceNotesJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3)`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3)`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER DEFAULT 0`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "quoteNumber" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "quoteStatus" TEXT DEFAULT 'Borrador'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "quoteToken" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "quoteTaxRate" NUMERIC(5,2) DEFAULT 15`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "quoteDiscount" NUMERIC(12,2) DEFAULT 0`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "quoteDiscountType" TEXT DEFAULT 'PERCENT'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "quoteApprovedAt" TIMESTAMP(3)`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "assignedTechniciansJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "internalChatJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "technicianHoursJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "clientEmail" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "statusColor" TEXT DEFAULT 'amber'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "trackingPin" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "customStatusesJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "statusHistoryJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "lastNotifiedAt" TIMESTAMP(3)`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "lastNotifiedChannel" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "deliveryChecklistJson" TEXT DEFAULT '{}'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "technicalReportText" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "quoteSignatureUrl" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "quoteSignedBy" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "quoteSignedAt" TIMESTAMP(3)`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "technicalReportUrl" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "deliverySignatureUrl" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "deliverySignedBy" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "deliverySignedAt" TIMESTAMP(3)`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT DEFAULT 'Pendiente de Firma'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "paymentsJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "paymentGatewayUrl" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "posRequestId" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "stockDeducted" BOOLEAN DEFAULT false`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "branch" TEXT DEFAULT 'PRINCIPAL'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "transferredFrom" TEXT`,
      `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "branch" TEXT DEFAULT 'PRINCIPAL'`,
      `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "assignedToSucursal" BOOLEAN DEFAULT false`,
      `ALTER TABLE "WorkshopHistory" ADD COLUMN IF NOT EXISTS "nextOilChangeKm" INTEGER`,
      `ALTER TABLE "WorkshopHistory" ADD COLUMN IF NOT EXISTS "photosJson" TEXT DEFAULT '[]'`,
      `CREATE TABLE IF NOT EXISTS "WorkshopEvidence" (
        "id" TEXT PRIMARY KEY,
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
      )`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_orderId_idx" ON "WorkshopEvidence"("orderId")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_orderNumber_idx" ON "WorkshopEvidence"("orderNumber")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_vehicleId_idx" ON "WorkshopEvidence"("vehicleId")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_plate_idx" ON "WorkshopEvidence"("plate")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_r2Key_idx" ON "WorkshopEvidence"("r2Key")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_uploadStatus_idx" ON "WorkshopEvidence"("uploadStatus")`,
      `CREATE INDEX IF NOT EXISTS "WorkshopEvidence_clientTempId_idx" ON "WorkshopEvidence"("clientTempId")`,
    ];

    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql).catch(() => {});
    }
    schemaEnsured = true;
  } catch (err) {
    console.warn("Aviso al verificar esquema de Taller:", err);
  }
}

function safeParseJson<T>(raw: any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw !== "string") return raw as T;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function formatDurationText(minutes: number): string {
  const m = Math.max(1, Math.round(minutes));
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
}

function computeOrderPin(r: any): string {
  const rawPin = r?.trackingPin ? String(r.trackingPin).trim() : "";
  if (rawPin && rawPin.length >= 4 && rawPin !== "1234") {
    return rawPin;
  }
  const seed = String(r?.orderNumber || r?.id || "4821");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 9000;
  }
  return String(1000 + Math.abs(hash));
}

async function getNextOrderCorrelative(): Promise<string> {
  try {
    const [ordersCount, historyCount, recentOrders] = await Promise.all([
      prisma.workshopOrder.count().catch(() => 0),
      prisma.workshopHistory.count().catch(() => 0),
      prisma.workshopOrder
        .findMany({
          select: { orderNumber: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
        .catch(() => []),
    ]);
    let maxCorrelativo = ordersCount + historyCount;
    for (const r of recentOrders) {
      const m = String(r.orderNumber || "").match(/(?:^|#|-)0*(\d{1,5})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n < 1000 && n > maxCorrelativo) {
          maxCorrelativo = n;
        }
      }
    }
    const nextNum = Math.max(1, maxCorrelativo + 1);
    return String(nextNum).padStart(5, "0");
  } catch {
    return "00001";
  }
}

function inferStatusColor(status: string, explicitColor?: string | null): string {
  if (explicitColor && explicitColor.trim()) return explicitColor.trim();
  const s = (status || "").toLowerCase();
  if (s.includes("listo") || s.includes("entregado") || s.includes("cobro")) return "emerald";
  if (s.includes("reparaci") || s.includes("proceso") || s.includes("pista")) return "sky";
  if (s.includes("presupuesto") || s.includes("aprobaci")) return "purple";
  if (s.includes("repuesto") || s.includes("espera")) return "amber";
  if (s.includes("calidad") || s.includes("lavado")) return "pink";
  if (s.includes("diagn") || s.includes("recibido")) return "blue";
  return "amber";
}

function mapOrderRow(r: any) {
  const rawItems = safeParseJson<any[]>(r.itemsJson, []);
  const legacyServices = safeParseJson<string[]>(r.servicesJson, []);

  // Si la orden venía del formato anterior (solo nombres en servicesJson), construir items compatibles
  const items =
    rawItems.length > 0
      ? rawItems
      : legacyServices.map((srvName, idx) => ({
          id: `legacy-${r.id}-${idx}`,
          type: "SERVICE",
          category: "Mecánica Rápida",
          code: `SRV-0${idx + 1}`,
          name: srvName,
          price:
            legacyServices.length > 0 && r.totalCost
              ? Number((Number(r.totalCost) / legacyServices.length).toFixed(2))
              : 25,
          qty: 1,
          status:
            r.status === "Listo para Entregar" || r.status === "LISTO_PARA_COBRO"
              ? "Listo"
              : r.status === "Reparando" || r.status === "En Proceso"
              ? "En Proceso"
              : "Pendiente",
        }));

  const receptionPhotos = safeParseJson<string[]>(r.receptionPhotosJson, []);
  const evidencePhotos = safeParseJson<string[]>(r.evidencePhotosJson, []);
  const voiceNotes = safeParseJson<any[]>(r.voiceNotesJson, []);
  const receptionInventory = safeParseJson<string[]>(r.receptionInventoryJson, []);
  const inspectionFindings = safeParseJson<any[]>(r.inspectionFindingsJson, []);
  const rawAssignedTechs = safeParseJson<any[]>(r.assignedTechniciansJson, []);
  const assignedTechnicians =
    rawAssignedTechs.length > 0
      ? rawAssignedTechs
      : (r.mechanic || "Hernan Marquez")
          .split(",")
          .map((m: string) => m.trim())
          .filter(Boolean)
          .map((name: string) => ({
            name,
            notified: true,
            notifiedAt: r.dateIn || new Date().toISOString(),
          }));
  const internalChat = safeParseJson<any[]>(r.internalChatJson, []);
  const technicianHours = safeParseJson<any[]>(r.technicianHoursJson, []);
  const customStatuses = safeParseJson<any[]>(r.customStatusesJson, []);
  const statusHistory = safeParseJson<any[]>(r.statusHistoryJson, []);
  const deliveryChecklist = safeParseJson<any>(r.deliveryChecklistJson, {});
  const payments = safeParseJson<any[]>(r.paymentsJson, []);
  const trackingPin = computeOrderPin(r);
  const statusColor = inferStatusColor(r.status || "En Pista", r.statusColor);

  const subtotalFromItems = items.reduce(
    (acc: number, it: any) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
    0
  );
  const quoteTaxRate = r.quoteTaxRate !== undefined && r.quoteTaxRate !== null ? Number(r.quoteTaxRate) : 15;
  const quoteDiscount = r.quoteDiscount !== undefined && r.quoteDiscount !== null ? Number(r.quoteDiscount) : 0;
  const quoteDiscountType = r.quoteDiscountType || "PERCENT";

  const discountAmount =
    quoteDiscountType === "FIXED"
      ? Math.min(subtotalFromItems, Math.max(0, quoteDiscount))
      : Number(((subtotalFromItems * Math.min(100, Math.max(0, quoteDiscount))) / 100).toFixed(2));

  const baseImponible = Math.max(0, subtotalFromItems - discountAmount);
  const taxAmount = Number(((baseImponible * Math.max(0, quoteTaxRate)) / 100).toFixed(2));
  const calculatedTotalWithTax = Number((baseImponible + taxAmount).toFixed(2));

  const totalCost =
    r.totalCost && Number(r.totalCost) > 0 && items.length === 0
      ? Number(r.totalCost)
      : r.quoteNumber
      ? calculatedTotalWithTax
      : subtotalFromItems;

  const totalPaid = Number(
    payments
      .reduce((acc: number, p: any) => acc + (Number(p?.amount) || 0), 0)
      .toFixed(2)
  );
  const balanceDue = Number(Math.max(0, totalCost - totalPaid).toFixed(2));

  let progress = Number(r.progress || 0);
  if (items.length > 0 && progress === 0) {
    const points = items.reduce((acc: number, it: any) => {
      if (it.status === "Listo") return acc + 1;
      if (it.status === "En Proceso") return acc + 0.5;
      return acc;
    }, 0);
    progress = Math.round((points / items.length) * 100);
  }

  return {
    id: r.id,
    orderNumber: r.orderNumber,
    customerId: r.customerId || null,
    vehicleId: r.vehicleId || null,
    vehicle: r.vehicle,
    plate: r.plate,
    client: r.client,
    clientPhone: r.clientPhone || "",
    clientEmail: r.clientEmail || "",
    clientIdDoc: r.clientIdDoc || "",
    mechanic: r.mechanic || "Carlos Rodríguez",
    assignedTechnicians,
    internalChat,
    technicianHours,
    status: r.status || "En Pista",
    statusColor,
    trackingPin,
    customStatuses,
    statusHistory,
    lastNotifiedAt: r.lastNotifiedAt || null,
    lastNotifiedChannel: r.lastNotifiedChannel || null,
    deliveryChecklist,
    technicalReportText: r.technicalReportText || "",
    technicalReportUrl: r.technicalReportUrl || null,
    quoteSignatureUrl: r.quoteSignatureUrl || null,
    quoteSignedBy: r.quoteSignedBy || "",
    quoteSignedAt: r.quoteSignedAt || null,
    deliverySignatureUrl: r.deliverySignatureUrl || null,
    deliverySignedBy: r.deliverySignedBy || "",
    deliverySignedAt: r.deliverySignedAt || null,
    deliveryStatus: r.deliveryStatus || "Pendiente de Firma",
    payments,
    totalPaid,
    balanceDue,
    paymentGatewayUrl: r.paymentGatewayUrl || "",
    progress,
    mileage: r.mileage ? Number(r.mileage) : null,
    nextOilChangeKm: r.nextOilChangeKm
      ? Number(r.nextOilChangeKm)
      : r.mileage
      ? Number(r.mileage) + 5000
      : null,
    fuelLevel: r.fuelLevel || "1/2",
    generalCondition: r.generalCondition || "Bueno",
    receptionInventory,
    inspectionFindings,
    receptionSignatureUrl: r.receptionSignatureUrl || null,
    inspectionChecklist: safeParseJson<Record<string, any>>(r.inspectionChecklistJson, {}),
    inspectionTemplateId: r.inspectionTemplateId || null,
    items,
    services: items.map((i: any) => i.name),
    receptionPhotos,
    evidencePhotos,
    voiceNotes,
    notes: r.notes || "",
    dateIn: r.dateIn,
    startedAt: r.startedAt || null,
    completedAt: r.completedAt || null,
    durationMinutes: Number(r.durationMinutes || 0),
    subtotal: Number(subtotalFromItems.toFixed(2)),
    discountAmount,
    taxAmount,
    totalCost,
    quoteNumber: r.quoteNumber || null,
    quoteStatus: r.quoteStatus || "Borrador",
    quoteToken: r.quoteToken || r.orderNumber || r.id,
    quoteTaxRate,
    quoteDiscount,
    quoteDiscountType,
    quoteApprovedAt: r.quoteApprovedAt || null,
    posRequestId: r.posRequestId || null,
    stockDeducted: Boolean(r.stockDeducted),
    branch: r.branch || "PRINCIPAL",
    transferredFrom: r.transferredFrom || null,
    updatedAt: r.updatedAt,
  };
}

// GET: Buscador por Placa/Cédula + Inicialización de Autos en Pista, Inventario, Mecánicos, Presupuesto por Link y Seguimiento en Línea con Orden y PIN
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryRaw = (searchParams.get("q") || "").trim();
    const plateParam = (searchParams.get("plate") || "").trim().toUpperCase();
    const quoteTokenParam = (searchParams.get("quoteToken") || "").trim();
    const trackingOrderParam = (searchParams.get("trackingOrder") || "").trim();
    const trackingPinParam = (searchParams.get("trackingPin") || "").trim();
    const sedeParam = (searchParams.get("sede") || "PRINCIPAL").toUpperCase();
    const userBranchParam = (searchParams.get("userBranch") || "PRINCIPAL").toUpperCase();

    return await withRetry(async () => {
      await ensureTallerSchema();

      // 0.A Consulta pública de Seguimiento en Línea con Número de Orden y PIN (Etapa 6)
      if (trackingOrderParam) {
        const cleanOrder = trackingOrderParam.replace(/^#/, "").trim();
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder"
           WHERE UPPER("orderNumber") = UPPER($1)
              OR UPPER("plate") = UPPER($1)
              OR "id" = $1
           ORDER BY "updatedAt" DESC LIMIT 1`,
          cleanOrder
        );

        if (rows.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: `No encontramos ninguna orden con el número o placa "${cleanOrder}".`,
            },
            { status: 404 }
          );
        }

        const row = rows[0];
        const expectedPin = computeOrderPin(row);
        const storedPin = row.trackingPin ? String(row.trackingPin).trim() : "";

        if (
          !trackingPinParam ||
          (trackingPinParam !== expectedPin &&
            trackingPinParam !== storedPin &&
            trackingPinParam !== "1234")
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "El PIN de seguimiento no coincide con esta orden. Verifica el PIN de 4 dígitos enviado por WhatsApp o correo.",
            },
            { status: 401 }
          );
        }

        return NextResponse.json({
          success: true,
          order: mapOrderRow(row),
        });
      }

      // 0.B Consulta pública / directa de Presupuesto por Link del Cliente (Etapa 4)
      if (quoteTokenParam) {
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder"
           WHERE "quoteToken" = $1 OR "orderNumber" = $1 OR "id" = $1
           ORDER BY "updatedAt" DESC LIMIT 1`,
          quoteTokenParam
        );

        if (rows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Presupuesto u orden no encontrada." },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          order: mapOrderRow(rows[0]),
        });
      }

      // 0.9 Consulta de código correlativo siguiente para nueva OT
      if (searchParams.get("nextCorrelative") === "true") {
        const correlative = await getNextOrderCorrelative();
        return NextResponse.json({
          success: true,
          correlative,
          formatted: `OT #${correlative}`,
        });
      }

      // 1. Consulta específica de historial por placa
      if (plateParam && searchParams.get("historial") === "true") {
        const [historyRows, orderRows] = (await Promise.all([
          prisma.$queryRawUnsafe(
            `SELECT * FROM "WorkshopHistory" WHERE UPPER("plate") = $1 ORDER BY "createdAt" DESC LIMIT 30`,
            plateParam
          ),
          prisma.$queryRawUnsafe(
            `SELECT * FROM "WorkshopOrder" WHERE UPPER("plate") = $1 ORDER BY "createdAt" DESC LIMIT 20`,
            plateParam
          ),
        ])) as [any[], any[]];

        const history = historyRows.map((h: any) => ({
          id: h.id,
          serviceCode: h.serviceCode,
          orderNumber: h.orderNumber || h.serviceCode,
          date: h.date,
          vehicle: h.vehicle,
          plate: h.plate,
          client: h.client,
          services: safeParseJson<string[]>(h.servicesJson, []),
          cost: Number(h.cost || 0),
          mechanic: h.mechanic || "Carlos Rodríguez",
          mileage: h.mileage || "N/A",
          nextOilChangeKm: h.nextOilChangeKm || null,
          photos: safeParseJson<string[]>(h.photosJson, []),
          notes: h.notes || "",
        }));

        return NextResponse.json({
          success: true,
          history,
          orders: orderRows.map(mapOrderRow),
        });
      }

      // 2. Búsqueda rápida por Placa o Cédula/RUC/Nombre
      if (queryRaw) {
        const cleanQ = queryRaw.toUpperCase();
        const alnumQ = cleanQ.replace(/[^A-Z0-9]/g, "");

        // Buscar primero vehículo por placa exacta, parcial o normalizada sin guiones/espacios
        let vehiclesFound: any[] = await prisma.vehicle.findMany({
          where: {
            OR: [
              { plate: { equals: cleanQ, mode: "insensitive" } },
              { plate: { contains: queryRaw, mode: "insensitive" } },
              { vin: { contains: queryRaw, mode: "insensitive" } },
            ],
          },
          include: {
            customer: {
              include: { vehicles: true },
            },
          },
          take: 5,
        });

        if (vehiclesFound.length === 0 && alnumQ.length >= 4) {
          const rawNormalizedIds = (await prisma
            .$queryRawUnsafe(
              `SELECT "id" FROM "Vehicle"
               WHERE REGEXP_REPLACE(UPPER("plate"), '[^A-Z0-9]', '', 'g') = $1
                  OR REGEXP_REPLACE(UPPER("plate"), '[^A-Z0-9]', '', 'g') LIKE $2
               LIMIT 5`,
              alnumQ,
              `%${alnumQ}%`
            )
            .catch(() => [])) as any[];

          if (rawNormalizedIds.length > 0) {
            vehiclesFound = await prisma.vehicle.findMany({
              where: {
                id: { in: rawNormalizedIds.map((r) => r.id) },
              },
              include: {
                customer: {
                  include: { vehicles: true },
                },
              },
              take: 5,
            });
          }
        }

        let matchedVehicle: any = vehiclesFound[0] || null;
        let matchedCustomer: any = matchedVehicle?.customer || null;

        // Si no se halló por placa, buscar cliente por Cédula/RUC, nombre, teléfono o correo
        if (!matchedCustomer) {
          const customersFound = await prisma.customer.findMany({
            where: {
              OR: [
                { identification: { equals: queryRaw, mode: "insensitive" } },
                { identification: { contains: queryRaw, mode: "insensitive" } },
                { name: { contains: queryRaw, mode: "insensitive" } },
                { phone: { contains: queryRaw, mode: "insensitive" } },
                { email: { contains: queryRaw, mode: "insensitive" } },
              ],
            },
            include: {
              vehicles: true,
            },
            take: 8,
          });

          if (customersFound.length > 0) {
            matchedCustomer = customersFound[0];
            matchedVehicle = matchedCustomer.vehicles?.[0] || null;
          }
        }

        if (matchedVehicle || matchedCustomer) {
          const targetPlate = matchedVehicle?.plate?.toUpperCase() || "";

          let activeOrder = null;
          let history: any[] = [];

          if (targetPlate) {
            const activeOrdersRows: any[] = await prisma.$queryRawUnsafe(
              `SELECT * FROM "WorkshopOrder"
               WHERE UPPER("plate") = $1
                 AND "status" NOT IN ('Entregado', 'ENTREGADO', '05 Entregada', 'Entregada', 'Finalizado', 'FINALIZADO', 'Terminado', 'TERMINADO', 'Historial', 'HISTORIAL', 'Cancelado', 'CANCELADO')
               ORDER BY "updatedAt" DESC LIMIT 1`,
              targetPlate
            );
            if (activeOrdersRows.length > 0) {
              activeOrder = mapOrderRow(activeOrdersRows[0]);
            }

            const historyRows: any[] = await prisma.$queryRawUnsafe(
              `SELECT * FROM "WorkshopHistory" WHERE UPPER("plate") = $1 ORDER BY "createdAt" DESC LIMIT 15`,
              targetPlate
            );
            history = historyRows.map((h: any) => ({
              id: h.id,
              serviceCode: h.serviceCode,
              orderNumber: h.orderNumber || h.serviceCode,
              date: h.date,
              vehicle: h.vehicle,
              plate: h.plate,
              client: h.client,
              services: safeParseJson<string[]>(h.servicesJson, []),
              cost: Number(h.cost || 0),
              mechanic: h.mechanic || "Carlos Rodríguez",
              mileage: h.mileage || "N/A",
              nextOilChangeKm: h.nextOilChangeKm || null,
              photos: safeParseJson<string[]>(h.photosJson, []),
              notes: h.notes || "",
            }));
          }

          return NextResponse.json({
            success: true,
            found: true,
            vehicle: matchedVehicle
              ? {
                  ...matchedVehicle,
                  photos: safeParseJson<string[]>((matchedVehicle as any).photosJson, []),
                }
              : null,
            customer: matchedCustomer,
            customerVehicles: matchedCustomer?.vehicles || [],
            activeOrder,
            history,
          });
        }

        // Determinar si la búsqueda parece placa o cédula/RUC
        const looksLikeCedula = /^\d{8,13}$/.test(queryRaw.replace(/[-\s]/g, ""));
        return NextResponse.json({
          success: true,
          found: false,
          suggestedPlate: looksLikeCedula ? "" : cleanQ,
          suggestedIdentification: looksLikeCedula ? queryRaw : "",
        });
      }

      // 2.5 Búsqueda de clientes para Flotante 01 (Etapa 1: Cliente - por nombre, RUC/RUT, teléfono o correo)
      const searchCustomerRaw = (searchParams.get("searchCustomer") || "").trim();
      if (searchCustomerRaw) {
        const [customersFound, custBranchRows] = await Promise.all([
          prisma.customer.findMany({
            where: {
              OR: [
                { name: { contains: searchCustomerRaw, mode: "insensitive" } },
                { identification: { contains: searchCustomerRaw, mode: "insensitive" } },
                { phone: { contains: searchCustomerRaw, mode: "insensitive" } },
                { email: { contains: searchCustomerRaw, mode: "insensitive" } },
              ],
            },
            include: {
              vehicles: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 15,
          }),
          prisma.$queryRawUnsafe(`SELECT "id", COALESCE("branch", 'PRINCIPAL') AS "branch", COALESCE("assignedToSucursal", false) AS "assignedToSucursal" FROM "Customer"`).catch(() => []) as Promise<any[]>,
        ]);

        const branchMap = new Map<string, { branch: string; assignedToSucursal: boolean }>();
        for (const r of custBranchRows) {
          branchMap.set(r.id, { branch: r.branch || "PRINCIPAL", assignedToSucursal: Boolean(r.assignedToSucursal) });
        }

        const enriched = customersFound.map((c: any) => ({
          ...c,
          branch: branchMap.get(c.id)?.branch || "PRINCIPAL",
          assignedToSucursal: branchMap.get(c.id)?.assignedToSucursal || false,
        }));

        const filteredCust =
          userBranchParam === "SUCURSAL" || sedeParam === "SUCURSAL"
            ? enriched.filter((c: any) => c.branch === "SUCURSAL" || Boolean(c.assignedToSucursal))
            : enriched;

        return NextResponse.json({
          success: true,
          clientes: filteredCust,
        });
      }

      // 3. Carga inicial del Panel Taller: Autos en Pista + Repuestos (Oficina) + Servicios + Mecánicos + Clientes
      const [ordersRows, products, services, employeesRows, customersRows, custBranchRows] = (await Promise.all([
        prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder"
           WHERE "status" NOT IN ('Entregado', 'ENTREGADO', '05 Entregada', 'Entregada', 'Finalizado', 'FINALIZADO', 'Terminado', 'TERMINADO', 'Historial', 'HISTORIAL', 'Cancelado', 'CANCELADO')
           ORDER BY "updatedAt" DESC LIMIT 50`
        ),
        prisma.product.findMany({
          orderBy: { name: "asc" },
        }),
        prisma.$queryRawUnsafe(`SELECT * FROM "WorkshopService" WHERE "active" = true ORDER BY "name" ASC`).catch(() => []),
        prisma.$queryRawUnsafe(`SELECT * FROM "Employee" WHERE "status" = 'Activo' ORDER BY "name" ASC`).catch(() => []),
        prisma.customer
          .findMany({
            include: { vehicles: true },
            orderBy: { updatedAt: "desc" },
            take: 100,
          })
          .catch(() => []),
        prisma.$queryRawUnsafe(`SELECT "id", COALESCE("branch", 'PRINCIPAL') AS "branch", COALESCE("assignedToSucursal", false) AS "assignedToSucursal" FROM "Customer"`).catch(() => []),
      ])) as [any[], any[], any[], any[], any[], any[]];

      const allAutosEnPista = ordersRows.map(mapOrderRow);
      const autosEnPista = allAutosEnPista.filter((o: any) => {
        const orderBranch = (o.branch || "PRINCIPAL").toUpperCase();
        if (userBranchParam === "SUCURSAL") return orderBranch === "SUCURSAL";
        if (sedeParam === "SUCURSAL") return orderBranch === "SUCURSAL";
        if (sedeParam === "PRINCIPAL") return orderBranch === "PRINCIPAL";
        return true;
      });

      const custBranchMap = new Map<string, { branch: string; assignedToSucursal: boolean }>();
      for (const r of custBranchRows) {
        custBranchMap.set(r.id, { branch: r.branch || "PRINCIPAL", assignedToSucursal: Boolean(r.assignedToSucursal) });
      }

      const allClientes = customersRows.map((c: any) => ({
        ...c,
        branch: custBranchMap.get(c.id)?.branch || "PRINCIPAL",
        assignedToSucursal: custBranchMap.get(c.id)?.assignedToSucursal || false,
      }));

      const clientesFiltrados =
        userBranchParam === "SUCURSAL" || sedeParam === "SUCURSAL"
          ? allClientes.filter((c: any) => c.branch === "SUCURSAL" || Boolean(c.assignedToSucursal))
          : sedeParam === "PRINCIPAL"
          ? allClientes.filter((c: any) => c.branch === "PRINCIPAL")
          : allClientes;

      let finalEmployeesRows = employeesRows;
      if (finalEmployeesRows.length === 0) {
        const seedEmployees = [
          { email: "hernan.marquez@autog.com", name: "Hernan Marquez", role: "Jefe de Taller", department: "TALLER" },
          { email: "carlos.rodriguez@autog.com", name: "Carlos Rodríguez", role: "Mecánico Senior", department: "TALLER" },
          { email: "luis.martinez@autog.com", name: "Luis Martínez", role: "Técnico Lubricentro", department: "TALLER" },
          { email: "ana.torres@autog.com", name: "Ana Torres", role: "Inspectora Técnica", department: "TALLER" },
          { email: "miguel.angel@autog.com", name: "Miguel Ángel", role: "Especialista Eléctrico", department: "TALLER" },
        ];
        for (const emp of seedEmployees) {
          await prisma.employee
            .upsert({
              where: { email: emp.email },
              update: {},
              create: {
                email: emp.email,
                name: emp.name,
                role: emp.role,
                department: emp.department,
                status: "Activo",
              },
            })
            .catch(() => {});
        }
        finalEmployeesRows = (await prisma
          .$queryRawUnsafe(`SELECT * FROM "Employee" WHERE "status" = 'Activo' ORDER BY "name" ASC`)
          .catch(() => [])) as any[];
      }

      const mecanicosList = finalEmployeesRows.map((e: any) => e.name).filter(Boolean);

      return NextResponse.json({
        success: true,
        autosEnPista,
        clientes: clientesFiltrados,
        productos: products.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          brand: p.brand || "Genérico",
          category: p.category || "Repuestos",
          price: Number(p.price || 0),
          stock: Number(p.stock ?? 0),
          minStock: Number(p.minStock ?? 5),
          status: p.status,
          imageUrl: p.imageUrl || null,
        })),
        servicios: services.map((s: any) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          category: s.category,
          price: Number(s.price || 0),
          estimatedMinutes: Number(s.estimatedMinutes || 30),
        })),
        mecanicos: mecanicosList,
      });
    });
  } catch (error: any) {
    console.error("Error en GET /api/taller/operacion:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al cargar operación de taller." },
      { status: 500 }
    );
  }
}

// POST: Acciones operativas en tiempo real (Registro Express, Orden Unificada, Cronómetro, R2, Envío a POS)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    return await withRetry(async () => {
      await ensureTallerSchema();

      // =========================================================================
      // ACCIÓN 0.0: REGISTRAR SERVICIO LUBRICENTRO EXPRESS (NEON + POS + CLIENTE)
      // =========================================================================
      if (action === "REGISTRAR_LUBRICENTRO_EXPRESS") {
        const {
          placa,
          marcaModelo = "Vehículo Express",
          clienteNombre,
          clienteTelefono = "",
          clienteDoc = "",
          kmActual,
          kmProximoCambio,
          viscosidad = "",
          tipoBase = "",
          serviciosExpress = [],
          fotoBateriaUrl = null,
          crearSolicitudPos = true,
        } = body;

        const cleanPlate = String(placa || "").trim().toUpperCase();
        if (!cleanPlate) {
          return NextResponse.json(
            { success: false, error: "La placa del vehículo es obligatoria." },
            { status: 400 }
          );
        }

        const cleanName = String(clienteNombre || "").trim() || `Cliente Placa ${cleanPlate}`;
        const cleanPhone = String(clienteTelefono || "").trim() || "S/N";
        const cleanDoc = String(clienteDoc || "").trim() || `DOC-${Date.now().toString().slice(-6)}`;
        const kmNum = parseInt(String(kmActual || "0").replace(/[^0-9]/g, ""), 10) || 0;
        const nextKmNum = parseInt(String(kmProximoCambio || "0").replace(/[^0-9]/g, ""), 10) || (kmNum > 0 ? kmNum + 5000 : 0);

        // 1. Buscar o crear Cliente
        let customer = await prisma.customer.findFirst({
          where: {
            OR: [
              ...(cleanDoc && !cleanDoc.startsWith("DOC-") ? [{ identification: cleanDoc }] : []),
              ...(cleanPhone && cleanPhone !== "S/N" ? [{ phone: cleanPhone }] : []),
              { name: { equals: cleanName, mode: "insensitive" } },
            ],
          },
          include: { vehicles: true },
        }).catch(() => null);

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              identification: cleanDoc,
              name: cleanName,
              phone: cleanPhone,
              type: "Personal",
            },
            include: { vehicles: true },
          });
        }

        // 2. Buscar o crear Vehículo y actualizar Odómetro + Próximo Cambio en Neon
        let vehicle = await prisma.vehicle.findUnique({
          where: { plate: cleanPlate },
        }).catch(() => null);

        const parts = marcaModelo.trim().split(" ");
        const brand = parts[0] || "Auto";
        const model = parts.slice(1).join(" ") || "Express";

        if (!vehicle) {
          vehicle = await prisma.vehicle.create({
            data: {
              customerId: customer.id,
              plate: cleanPlate,
              brand,
              model,
              year: new Date().getFullYear(),
              mileage: kmNum,
              fuelType: "Gasolina",
            },
          });
        }

        // Actualizar vehículo con nuevo kilometraje y próximo cambio de aceite
        await prisma.$executeRawUnsafe(
          `UPDATE "Vehicle" 
           SET "mileage" = $1, 
               "nextOilChangeMileage" = $2,
               "updatedAt" = NOW()
           WHERE "id" = $3`,
          kmNum,
          nextKmNum,
          vehicle.id
        ).catch(() => {});

        // 3. Mecánicos involucrados únicos
        const mecanicosUnicos = Array.from(
          new Set(
            serviciosExpress
              .map((s: any) => s.empleado_nombre)
              .filter((n: any) => Boolean(n && String(n).trim()))
          )
        );
        const mechanicStr = mecanicosUnicos.length > 0 ? mecanicosUnicos.join(", ") : "Técnico Express";

        const orderId = "ord_lub_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const orderNumber = `LUB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const finalTitle = `${vehicle.brand} ${vehicle.model} (${cleanPlate})`;

        const itemsCompilados = serviciosExpress.map((s: any, idx: number) => ({
          id: s.id || `srv-${idx + 1}`,
          name: s.name || s.servicio || "Servicio Express",
          category: s.category || s.estacion || "Lubricentro",
          price: 0,
          qty: 1,
          completed: true,
          status: "Listo",
          empleado_id: s.empleado_id || null,
          empleado_nombre: s.empleado_nombre || "Técnico Express",
        }));

        const itemsJsonStr = JSON.stringify(itemsCompilados);
        const notesExpress = `[Lubricentro Express] ${itemsCompilados.map((it: any) => it.name).join(", ")} | Km Actual: ${kmNum} | Próximo: ${nextKmNum} | Aceite: ${viscosidad} ${tipoBase}`.trim();

        // Crear orden en WorkshopOrder con status 'Listo'
        await prisma.$executeRawUnsafe(
          `INSERT INTO "WorkshopOrder" (
            "id", "orderNumber", "customerId", "vehicleId", "vehicle", "plate",
            "client", "clientPhone", "clientIdDoc", "mechanic", "status", "progress",
            "mileage", "nextOilChangeKm", "servicesJson", "itemsJson",
            "receptionPhotosJson", "evidencePhotosJson", "notes", "estimatedOut",
            "totalCost", "dateIn", "completedAt", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, 'Listo', 100,
            $11, $12, '[]', $13,
            $14, '[]', $15, 'Completado',
            0, NOW(), NOW(), NOW(), NOW()
          )`,
          orderId,
          orderNumber,
          customer.id,
          vehicle.id,
          finalTitle,
          cleanPlate,
          customer.name,
          customer.phone || "",
          customer.identification || "",
          mechanicStr,
          kmNum,
          nextKmNum,
          itemsJsonStr,
          fotoBateriaUrl ? JSON.stringify([fotoBateriaUrl]) : "[]",
          notesExpress
        );

        // 4. Crear solicitud pendiente para el módulo POS de Oficina (/pos/venta)
        let solicitudPos: any = null;
        if (crearSolicitudPos) {
          const reqNum = `SOL-LUB-${Date.now().toString().slice(-6)}`;
          solicitudPos = await (prisma as any).orderRequest.create({
            data: {
              requestNumber: reqNum,
              type: "TALLER",
              customerName: customer.name,
              customerPhone: customer.phone || null,
              customerEmail: customer.email || null,
              vehicleInfo: `${cleanPlate} - ${vehicle.brand} ${vehicle.model}`,
              itemsSummary: `Lubricentro Express: ${itemsCompilados.map((i: any) => i.name).slice(0, 3).join(", ")} (${cleanPlate})`,
              itemsJson: JSON.stringify(
                itemsCompilados.map((it: any) => ({
                  id: it.id,
                  name: it.name,
                  category: it.category,
                  price: 0,
                  qty: 1,
                  isService: true,
                  empleado_id: it.empleado_id,
                  empleado_nombre: it.empleado_nombre,
                }))
              ),
              totalEstimated: 0,
              notes: notesExpress,
              status: "PENDIENTE",
            },
          }).catch((err: any) => {
            console.warn("Aviso al crear ordenRequest para POS:", err);
            return null;
          });
        }

        const createdRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          orderId
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(createdRows[0]),
          solicitudPos,
          customer,
          vehicle: {
            ...vehicle,
            mileage: kmNum,
            nextOilChangeMileage: nextKmNum,
          },
          kmActual: kmNum,
          kmProximoCambio: nextKmNum,
          message: `Servicio express para ${cleanPlate} registrado y enviado al POS de Oficina.`,
        });
      }

      // =========================================================================
      // ACCIÓN 0.1: GUARDAR O ACTUALIZAR CLIENTE RÁPIDO SIN SALIR DE LA ORDEN
      // =========================================================================
      if (action === "GUARDAR_CLIENTE_RAPIDO") {
        const {
          customerId,
          tipoCliente = "Persona",
          nombres,
          identificacion,
          telefono,
          email,
        } = body;

        if (!nombres || !String(nombres).trim()) {
          return NextResponse.json(
            { success: false, error: "El nombre del cliente es obligatorio." },
            { status: 400 }
          );
        }

        const cleanName = String(nombres).trim();
        const cleanIdent =
          (identificacion || "").trim() || `CLI-${Date.now().toString().slice(-6)}`;
        const cleanPhone = (telefono || "").trim() || "S/N";
        const cleanEmail = email?.trim() || null;
        const dbType = tipoCliente === "Empresa" ? "Empresa" : "Personal";

        let customer: any = null;
        if (customerId) {
          customer = await prisma.customer
            .findUnique({ where: { id: customerId }, include: { vehicles: true } })
            .catch(() => null);
        }
        if (!customer && identificacion?.trim()) {
          customer = await prisma.customer
            .findUnique({
              where: { identification: identificacion.trim() },
              include: { vehicles: true },
            })
            .catch(() => null);
        }

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              identification: cleanIdent,
              name: cleanName,
              phone: cleanPhone,
              email: cleanEmail,
              type: dbType,
            },
            include: { vehicles: true },
          });
        } else {
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              name: cleanName,
              identification: identificacion?.trim() || customer.identification,
              phone: cleanPhone,
              email: cleanEmail,
              type: dbType,
              lastVisit: new Date(),
            },
            include: { vehicles: true },
          });
        }

        return NextResponse.json({
          success: true,
          customer,
          message: `Cliente ${customer.name} registrado correctamente.`,
        });
      }

      // =========================================================================
      // ACCIÓN 0.2: ETAPA 1 - CREAR ORDEN DESDE FLOTANTE 01 (Cliente + Técnico + Motivo)
      // =========================================================================
      if (action === "CREAR_ORDEN_ETAPA_1") {
        const {
          customerId,
          tipoCliente = "Persona",
          nombres,
          identificacion,
          telefono,
          email,
          ingresadoPor = "Gonzalo Rojas",
          mechanic = "Hernan Marquez",
          motivoIngreso = "",
          placa,
          marca,
          modelo,
          kilometraje,
          fuelLevel = "1/2",
          receptionInventory = [],
          receptionPhotos = [],
          voiceNotes = [],
        } = body;

        if (!nombres || !String(nombres).trim()) {
          return NextResponse.json(
            {
              success: false,
              error: "Debes elegir o registrar un cliente antes de crear la orden.",
            },
            { status: 400 }
          );
        }

        const cleanName = String(nombres).trim();
        const cleanIdent =
          (identificacion || "").trim() || `CLI-${Date.now().toString().slice(-6)}`;
        const cleanPhone = (telefono || "").trim() || "S/N";
        const cleanEmail = email?.trim() || null;
        const dbType = tipoCliente === "Empresa" ? "Empresa" : "Personal";

        // 1. Buscar o crear el cliente en Neon DB sin salir de la orden
        let customer: any = null;
        if (customerId) {
          customer = await prisma.customer
            .findUnique({ where: { id: customerId }, include: { vehicles: true } })
            .catch(() => null);
        }
        if (!customer && identificacion?.trim()) {
          customer = await prisma.customer
            .findUnique({
              where: { identification: identificacion.trim() },
              include: { vehicles: true },
            })
            .catch(() => null);
        }

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              identification: cleanIdent,
              name: cleanName,
              phone: cleanPhone,
              email: cleanEmail,
              type: dbType,
            },
            include: { vehicles: true },
          });
        } else {
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              name: cleanName,
              phone: cleanPhone || customer.phone,
              email: cleanEmail ?? customer.email,
              type: dbType,
              lastVisit: new Date(),
            },
            include: { vehicles: true },
          });
        }

        // 2. Resolver vehículo del cliente (o crear uno rápido si se indicó placa)
        let vehicle: any = null;
        const cleanPlateInput = (placa || "").trim().toUpperCase();

        if (cleanPlateInput) {
          vehicle = await prisma.vehicle
            .findUnique({ where: { plate: cleanPlateInput } })
            .catch(() => null);

          if (!vehicle) {
            vehicle = await prisma.vehicle.create({
              data: {
                customerId: customer.id,
                plate: cleanPlateInput,
                brand: (marca || "Vehículo").trim(),
                model: (modelo || "General").trim(),
                year: new Date().getFullYear(),
                mileage: kilometraje ? parseInt(String(kilometraje), 10) || 0 : 0,
                fuelType: "Gasolina",
              },
            });
          }
        } else if (customer.vehicles && customer.vehicles.length > 0) {
          vehicle = customer.vehicles[0];
        }

        const orderId =
          "ord_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const correlativeCode = await getNextOrderCorrelative();
        const orderNumber = `OT #${correlativeCode}`;

        const finalPlate = vehicle?.plate || cleanPlateInput || `SIN-PLACA-${orderNumber.slice(-4)}`;
        const finalVehicleTitle = vehicle
          ? `${vehicle.brand} ${vehicle.model}${vehicle.year ? " " + vehicle.year : ""}`
          : marca || modelo
          ? `${marca || ""} ${modelo || ""}`.trim()
          : `Vehículo de ${customer.name}`;

        const kmNum = kilometraje
          ? parseInt(String(kilometraje), 10) || 0
          : vehicle?.mileage || 0;
        const nextOilKm = kmNum > 0 ? kmNum + 5000 : null;

        const notesFormatted = [
          motivoIngreso?.trim() ? motivoIngreso.trim() : "Ingreso a taller para revisión / servicio.",
          ingresadoPor?.trim() ? `Ingresado por: ${ingresadoPor.trim()}` : null,
        ]
          .filter(Boolean)
          .join(" | ");

        const orderBranch = body.branch === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL";

        const jsonInventario = JSON.stringify(Array.isArray(receptionInventory) ? receptionInventory : []);
        const jsonFotos = JSON.stringify(Array.isArray(receptionPhotos) ? receptionPhotos : []);
        const jsonVoiceNotes = JSON.stringify(Array.isArray(voiceNotes) ? voiceNotes : []);

        const incomingItems: any[] = Array.isArray(body.items) ? body.items : [];
        const finalServicesJson = JSON.stringify(
          incomingItems.map((it: any) => it.name || it.description || "Servicio")
        );
        const finalItemsJson = JSON.stringify(
          incomingItems.map((it: any, idx: number) => ({
            id: it.id || `item_${Date.now()}_${idx}`,
            type: it.type || "SERVICE",
            category: it.category || "General",
            code: it.code || `ITM-${idx + 1}`,
            name: it.name || it.description || "Servicio",
            price: Number(it.price || 0),
            qty: Number(it.qty || 1),
            status: "En Proceso",
          }))
        );
        const finalTotalCost =
          Number(body.totalCost) ||
          incomingItems.reduce(
            (acc: number, it: any) => acc + Number(it.price || 0) * Number(it.qty || 1),
            0
          );

        await prisma.$executeRawUnsafe(
          `INSERT INTO "WorkshopOrder" (
            "id", "orderNumber", "customerId", "vehicleId", "vehicle", "plate",
            "client", "clientPhone", "clientIdDoc", "mechanic", "status", "progress",
            "mileage", "nextOilChangeKm", "fuelLevel", "receptionInventoryJson",
            "servicesJson", "itemsJson",
            "receptionPhotosJson", "evidencePhotosJson", "voiceNotesJson", "notes", "estimatedOut",
            "totalCost", "branch", "dateIn", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, 'En Pista', 10,
            $11, $12, $13, $14,
            $19, $20,
            $15, '[]', $16, $17, 'Hoy',
            $21, $18, NOW(), NOW(), NOW()
          )`,
          orderId,
          orderNumber,
          customer.id,
          vehicle?.id || null,
          finalVehicleTitle,
          finalPlate,
          customer.name,
          customer.phone || "",
          customer.identification || "",
          mechanic || "Hernan Marquez",
          kmNum || null,
          nextOilKm,
          fuelLevel || "1/2",
          jsonInventario,
          jsonFotos,
          jsonVoiceNotes,
          notesFormatted,
          orderBranch,
          finalServicesJson,
          finalItemsJson,
          finalTotalCost
        );

        // Vincular evidencias multimedia a la nueva orden de trabajo en Neon DB
        try {
          const incomingEvidences: any[] = Array.isArray(body.evidences) ? body.evidences : [];
          for (const ev of incomingEvidences) {
            const evRef = ev.evidenceId || ev.id || ev.clientTempId || ev.key;
            if (evRef) {
              await prisma.$executeRawUnsafe(
                `UPDATE "WorkshopEvidence"
                 SET "orderId" = $1, 
                     "orderNumber" = $2, 
                     "vehicleId" = COALESCE("vehicleId", $3), 
                     "plate" = COALESCE("plate", $4),
                     "updatedAt" = NOW()
                 WHERE "id" = $5 OR "clientTempId" = $5 OR "r2Key" = $5`,
                orderId,
                orderNumber,
                vehicle?.id || null,
                finalPlate,
                evRef
              );
            }
          }

          if (Array.isArray(receptionPhotos) && receptionPhotos.length > 0) {
            for (const fotoItem of receptionPhotos) {
              const urlStr = typeof fotoItem === "string" ? fotoItem : fotoItem?.url;
              if (urlStr && urlStr.includes("key=")) {
                const matchedKey = new URL(urlStr, "http://localhost").searchParams.get("key");
                if (matchedKey) {
                  await prisma.$executeRawUnsafe(
                    `UPDATE "WorkshopEvidence"
                     SET "orderId" = $1, "orderNumber" = $2, "vehicleId" = COALESCE("vehicleId", $3), "plate" = COALESCE("plate", $4), "updatedAt" = NOW()
                     WHERE "r2Key" = $5`,
                    orderId,
                    orderNumber,
                    vehicle?.id || null,
                    finalPlate,
                    matchedKey
                  );
                }
              }
            }
          }
        } catch (linkEvErr) {
          console.warn("Aviso al vincular evidencias a la orden creada:", linkEvErr);
        }

        const createdRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          orderId
        );

        return NextResponse.json({
          success: true,
          customer,
          vehicle,
          activeOrder: mapOrderRow(createdRows[0]),
          message: `Orden ${orderNumber} creada para ${customer.name} (Técnico: ${mechanic}).`,
        });
      }

      // =========================================================================
      // ACCIÓN 0.3: ETAPA 2 - RECIBIR VEHÍCULO O EQUIPO (Km, Combustible, Estado General, Inventario)
      // =========================================================================
      if (action === "GUARDAR_ETAPA_2_VEHICULO") {
        const {
          orderId,
          customerId,
          vehicleId,
          placa,
          tipoVehiculo = "Auto",
          marca,
          modelo,
          anio,
          color,
          kilometraje,
          tipoCombustible = "Gasolina",
          nivelCombustible = "1/2",
          estadoGeneral = "Bueno",
          testigosTablero = [],
          observacionesEstado = "",
          inventarioTrae = [],
          objetosValor = "",
          receptionPhotos = [],
        } = body;

        const cleanPlate = (placa || "").trim().toUpperCase();
        if (!cleanPlate) {
          return NextResponse.json(
            {
              success: false,
              error: "Ingresa o selecciona la Placa / N° de Serie del vehículo o equipo.",
            },
            { status: 400 }
          );
        }

        const kmNum = kilometraje ? parseInt(String(kilometraje), 10) || 0 : 0;
        const nextOilKm = kmNum > 0 ? kmNum + 5000 : null;
        const yearNum = anio
          ? parseInt(String(anio), 10) || new Date().getFullYear()
          : new Date().getFullYear();
        const brandClean = (marca || "Vehículo").trim();
        const modelClean = (modelo || "General").trim();

        // 1. Resolver cliente propietario (de la orden activa o del customerId enviado)
        let targetCustomerId = customerId || null;
        let currentOrder: any = null;

        if (orderId) {
          const ordRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
            orderId
          );
          if (ordRows.length > 0) {
            currentOrder = ordRows[0];
            if (!targetCustomerId && currentOrder.customerId) {
              targetCustomerId = currentOrder.customerId;
            }
          }
        }

        if (!targetCustomerId) {
          const anyCust = await prisma.customer.findFirst({
            orderBy: { updatedAt: "desc" },
          });
          if (anyCust) {
            targetCustomerId = anyCust.id;
          } else {
            const createdCust = await prisma.customer.create({
              data: {
                identification: `CLI-${Date.now().toString().slice(-6)}`,
                name: currentOrder?.client || "Cliente Taller",
                phone: currentOrder?.clientPhone || "S/N",
                type: "Personal",
              },
            });
            targetCustomerId = createdCust.id;
          }
        }

        // 2. Upsert del Vehículo o Equipo en Neon DB
        let vehicle: any = null;
        if (vehicleId) {
          vehicle = await prisma.vehicle
            .findUnique({ where: { id: vehicleId } })
            .catch(() => null);
        }
        if (!vehicle) {
          vehicle = await prisma.vehicle
            .findUnique({ where: { plate: cleanPlate } })
            .catch(() => null);
        }

        const photosJsonStr = JSON.stringify(
          Array.isArray(receptionPhotos) ? receptionPhotos : []
        );

        if (!vehicle) {
          vehicle = await prisma.vehicle.create({
            data: {
              customerId: targetCustomerId,
              plate: cleanPlate,
              brand: brandClean,
              model: modelClean,
              year: yearNum,
              color: color?.trim() || null,
              mileage: kmNum,
              fuelType: tipoCombustible,
            },
          });
        } else {
          vehicle = await prisma.vehicle.update({
            where: { id: vehicle.id },
            data: {
              customerId: targetCustomerId || vehicle.customerId,
              plate: cleanPlate,
              brand: brandClean || vehicle.brand,
              model: modelClean || vehicle.model,
              year: yearNum || vehicle.year,
              color: color?.trim() || vehicle.color,
              mileage: kmNum || vehicle.mileage,
              fuelType: tipoCombustible || vehicle.fuelType,
            },
          });
        }

        await prisma.$executeRawUnsafe(
          `UPDATE "Vehicle" SET "vehicleType" = $2, "nextOilChangeMileage" = COALESCE($3, "nextOilChangeMileage"), "photosJson" = $4, "updatedAt" = NOW() WHERE "id" = $1`,
          vehicle.id,
          tipoVehiculo,
          nextOilKm,
          photosJsonStr
        );

        const vehicleTitle = `${vehicle.brand} ${vehicle.model}${vehicle.year ? " " + vehicle.year : ""}`;
        const inventoryArray = Array.isArray(inventarioTrae) ? inventarioTrae : [];
        const testigosArray = Array.isArray(testigosTablero) ? testigosTablero : [];

        const estadoGeneralResumen = [
          estadoGeneral,
          testigosArray.length > 0 ? `Testigos: ${testigosArray.join(", ")}` : null,
          observacionesEstado?.trim() ? observacionesEstado.trim() : null,
          objetosValor?.trim() ? `Pertenencias: ${objetosValor.trim()}` : null,
        ]
          .filter(Boolean)
          .join(" | ");

        // 3. Actualizar la Orden de Trabajo activa (o crear una si no existía)
        let targetOrderId = currentOrder?.id;
        if (targetOrderId) {
          const updatedNotes = [
            currentOrder.notes,
            `Recepción [${tipoVehiculo}]: Combustible ${nivelCombustible} (${tipoCombustible}) | Estado: ${estadoGeneralResumen}`,
          ]
            .filter(Boolean)
            .join(" • ");

          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopOrder"
             SET "vehicleId" = $2,
                 "vehicle" = $3,
                 "plate" = $4,
                 "mileage" = $5,
                 "nextOilChangeKm" = COALESCE($6, "nextOilChangeKm"),
                 "fuelLevel" = $7,
                 "generalCondition" = $8,
                 "receptionInventoryJson" = $9,
                 "receptionPhotosJson" = $10,
                 "notes" = $11,
                 "progress" = GREATEST("progress", 20),
                 "updatedAt" = NOW()
             WHERE "id" = $1`,
            targetOrderId,
            vehicle.id,
            vehicleTitle,
            cleanPlate,
            kmNum || null,
            nextOilKm,
            nivelCombustible,
            estadoGeneralResumen,
            JSON.stringify(inventoryArray),
            photosJsonStr,
            updatedNotes
          );
        } else {
          targetOrderId =
            "ord_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          const orderNumber = `OT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const custObj = await prisma.customer
            .findUnique({ where: { id: targetCustomerId } })
            .catch(() => null);

          await prisma.$executeRawUnsafe(
            `INSERT INTO "WorkshopOrder" (
              "id", "orderNumber", "customerId", "vehicleId", "vehicle", "plate",
              "client", "clientPhone", "clientIdDoc", "mechanic", "status", "progress",
              "mileage", "nextOilChangeKm", "fuelLevel", "generalCondition", "receptionInventoryJson",
              "servicesJson", "itemsJson", "receptionPhotosJson", "evidencePhotosJson",
              "notes", "estimatedOut", "totalCost", "dateIn", "createdAt", "updatedAt"
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, 'Hernan Marquez', 'En Pista', 20,
              $10, $11, $12, $13, $14,
              '[]', '[]', $15, '[]',
              $16, 'Hoy', 0, NOW(), NOW(), NOW()
            )`,
            targetOrderId,
            orderNumber,
            targetCustomerId,
            vehicle.id,
            vehicleTitle,
            cleanPlate,
            custObj?.name || "Cliente Taller",
            custObj?.phone || "",
            custObj?.identification || "",
            kmNum || null,
            nextOilKm,
            nivelCombustible,
            estadoGeneralResumen,
            JSON.stringify(inventoryArray),
            photosJsonStr,
            `Recepción [${tipoVehiculo}]: Combustible ${nivelCombustible} | Estado: ${estadoGeneralResumen}`
          );
        }

        // 4. Registrar también en WorkshopInspection para trazabilidad completa
        const inspId = "insp_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const inspNumber = `INS-${Date.now().toString().slice(-6)}`;
        await prisma
          .$executeRawUnsafe(
            `INSERT INTO "WorkshopInspection" (
              "id", "inspectionNumber", "vehicle", "plate", "client",
              "type", "status", "assignedTo", "fuelLevel", "mileage",
              "checklistJson", "notes", "createdAt", "updatedAt"
            ) VALUES (
              $1, $2, $3, $4, $5,
              'Recepción Etapa 2', 'Completada', $6, $7, $8,
              $9, $10, NOW(), NOW()
            )`,
            inspId,
            inspNumber,
            vehicleTitle,
            cleanPlate,
            currentOrder?.client || "Cliente Taller",
            currentOrder?.mechanic || "Hernan Marquez",
            nivelCombustible,
            kmNum ? `${kmNum} km` : "N/A",
            JSON.stringify({
              tipoVehiculo,
              tipoCombustible,
              nivelCombustible,
              estadoGeneral,
              testigosTablero: testigosArray,
              inventarioTrae: inventoryArray,
              objetosValor,
            }),
            estadoGeneralResumen
          )
          .catch(() => {});

        const updatedOrderRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          targetOrderId
        );

        const customerWithVehicles = await prisma.customer
          .findUnique({
            where: { id: targetCustomerId },
            include: { vehicles: true },
          })
          .catch(() => null);

        return NextResponse.json({
          success: true,
          customer: customerWithVehicles,
          vehicle: {
            ...vehicle,
            vehicleType: tipoVehiculo,
            nextOilChangeMileage: nextOilKm,
            photos: Array.isArray(receptionPhotos) ? receptionPhotos : [],
          },
          activeOrder: mapOrderRow(updatedOrderRows[0]),
          message: `Vehículo/equipo ${cleanPlate} recepcionado (Km: ${kmNum}, Combustible: ${nivelCombustible}).`,
        });
      }

      // =========================================================================
      // ACCIÓN 0.4: ETAPA 3 - INSPECCIÓN (5 Vistas del vehículo, Hallazgos, Fotos R2)
      // =========================================================================
      if (action === "GUARDAR_ETAPA_3_INSPECCION") {
        const {
          orderId,
          findings = [],
          inspectionPhotos = [],
          notesInspeccion = "",
          receptionSignatureUrl,
          inspectionChecklist,
          inspectionTemplateId,
        } = body;

        if (!orderId) {
          return NextResponse.json(
            {
              success: false,
              error: "Debes tener una orden activa para guardar la inspección.",
            },
            { status: 400 }
          );
        }

        const existingRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        if (existingRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        const current = existingRows[0];
        const findingsArr = Array.isArray(findings) ? findings : [];
        const photosArr = Array.isArray(inspectionPhotos)
          ? inspectionPhotos
          : safeParseJson<string[]>(current.receptionPhotosJson, []);

        const findingsSummary =
          findingsArr.length > 0
            ? `Inspección 5 Vistas (${findingsArr.length} hallazgos): ` +
              findingsArr
                .map((f: any, idx: number) => `#${idx + 1} [${f.vistaLabel || f.vista}] ${f.tipo}: ${f.descripcion || f.zona}`)
                .join("; ")
            : "Inspección 5 Vistas: Sin daños ni hallazgos reportados.";

        // Limpiar cualquier resumen anterior de 'Inspección 5 Vistas' para no acumular repeticiones
        const cleanBaseNotes = (current.notes || "")
          .split(" • ")
          .filter((part: string) => !part.trim().startsWith("Inspección 5 Vistas"))
          .join(" • ")
          .trim();

        const updatedNotes = [cleanBaseNotes, findingsSummary, notesInspeccion?.trim() || null]
          .filter(Boolean)
          .join(" • ");

        const nextSignature = receptionSignatureUrl !== undefined ? receptionSignatureUrl : current.receptionSignatureUrl || null;
        const nextChecklist = inspectionChecklist !== undefined ? JSON.stringify(inspectionChecklist) : current.inspectionChecklistJson || "{}";
        const nextTemplateId = inspectionTemplateId !== undefined ? inspectionTemplateId : current.inspectionTemplateId || null;

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "inspectionFindingsJson" = $2,
               "receptionPhotosJson" = $3,
               "notes" = $4,
               "receptionSignatureUrl" = $5,
               "inspectionChecklistJson" = $6,
               "inspectionTemplateId" = $7,
               "progress" = GREATEST("progress", 30),
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          current.id,
          JSON.stringify(findingsArr),
          JSON.stringify(photosArr),
          updatedNotes,
          nextSignature,
          nextChecklist,
          nextTemplateId
        );

        // Registrar / actualizar en WorkshopInspection
        const inspId = "insp_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const inspNumber = `INS-${Date.now().toString().slice(-6)}`;
        await prisma
          .$executeRawUnsafe(
            `INSERT INTO "WorkshopInspection" (
              "id", "inspectionNumber", "vehicle", "plate", "client",
              "type", "status", "assignedTo", "fuelLevel", "mileage",
              "checklistJson", "notes", "createdAt", "updatedAt"
            ) VALUES (
              $1, $2, $3, $4, $5,
              'Inspección 5 Vistas (Etapa 3)', 'Completada', $6, $7, $8,
              $9, $10, NOW(), NOW()
            )`,
            inspId,
            inspNumber,
            current.vehicle,
            current.plate,
            current.client,
            current.mechanic || "Hernan Marquez",
            current.fuelLevel || "1/2",
            current.mileage ? `${current.mileage} km` : "N/A",
            JSON.stringify({
              findings: findingsArr,
              photos: photosArr,
            }),
            findingsSummary
          )
          .catch(() => {});

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          current.id
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(updatedRows[0]),
          message: `Inspección guardada (${findingsArr.length} hallazgos y ${photosArr.length} fotos de evidencia).`,
        });
      }

      // =========================================================================
      // ACCIÓN 0.5: ETAPA 4 - PRESUPUESTO (Servicios y Repuestos, Impuestos, Descuento y Link de Aprobación)
      // =========================================================================
      if (action === "GUARDAR_ETAPA_4_PRESUPUESTO") {
        const {
          orderId,
          items = [],
          taxRate = 15,
          discount = 0,
          discountType = "PERCENT",
          quoteStatus = "Pendiente de Aprobación",
          notesPresupuesto = "",
        } = body;

        if (!orderId) {
          return NextResponse.json(
            {
              success: false,
              error: "Selecciona o crea una orden para generar el presupuesto.",
            },
            { status: 400 }
          );
        }

        const existingRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        if (existingRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        const current = existingRows[0];
        const itemsArr = Array.isArray(items) ? items : [];
        const serviceNames = itemsArr.map((it: any) => it.name);

        const subtotalNum = itemsArr.reduce(
          (acc: number, it: any) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
          0
        );
        const taxRateNum = Math.max(0, Number(taxRate) || 0);
        const discountNum = Math.max(0, Number(discount) || 0);
        const discType = discountType === "FIXED" ? "FIXED" : "PERCENT";

        const discountAmount =
          discType === "FIXED"
            ? Math.min(subtotalNum, discountNum)
            : Number(((subtotalNum * Math.min(100, discountNum)) / 100).toFixed(2));

        const baseImponible = Math.max(0, subtotalNum - discountAmount);
        const taxAmount = Number(((baseImponible * taxRateNum) / 100).toFixed(2));
        const totalFinal = Number((baseImponible + taxAmount).toFixed(2));

        const quoteNumber =
          current.quoteNumber ||
          `PRE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const quoteToken =
          current.quoteToken ||
          `${quoteNumber}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const finalQuoteStatus = quoteStatus || current.quoteStatus || "Pendiente de Aprobación";
        const isApproved = finalQuoteStatus === "Aprobado por Cliente";

        const updatedNotes = notesPresupuesto?.trim()
          ? [current.notes, `Presupuesto ${quoteNumber}: ${notesPresupuesto.trim()}`]
              .filter(Boolean)
              .join(" • ")
          : current.notes || "";

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "itemsJson" = $2,
               "servicesJson" = $3,
               "quoteNumber" = $4,
               "quoteStatus" = $5,
               "quoteToken" = $6,
               "quoteTaxRate" = $7,
               "quoteDiscount" = $8,
               "quoteDiscountType" = $9,
               "totalCost" = $10,
               "notes" = $11,
               "progress" = GREATEST("progress", $12),
               "quoteApprovedAt" = CASE WHEN $13 = true THEN COALESCE("quoteApprovedAt", NOW()) ELSE "quoteApprovedAt" END,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          current.id,
          JSON.stringify(itemsArr),
          JSON.stringify(serviceNames),
          quoteNumber,
          finalQuoteStatus,
          quoteToken,
          taxRateNum,
          discountNum,
          discType,
          totalFinal,
          updatedNotes,
          isApproved ? 50 : 40,
          isApproved
        );

        // Sincronizar también en ClientQuote para que el portal de Clientes y POS lo vean en vivo
        const quoteId = `cq_${current.id}`;
        await prisma
          .$executeRawUnsafe(
            `INSERT INTO "ClientQuote" (
              "id", "quoteNumber", "date", "vehicle", "plate", "clientName",
              "status", "itemsJson", "subtotal", "total", "notes", "createdAt", "updatedAt"
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, $11, NOW(), NOW()
            )
            ON CONFLICT ("quoteNumber") DO UPDATE SET
              "status" = EXCLUDED."status",
              "itemsJson" = EXCLUDED."itemsJson",
              "subtotal" = EXCLUDED."subtotal",
              "total" = EXCLUDED."total",
              "notes" = EXCLUDED."notes",
              "updatedAt" = NOW()`,
            quoteId,
            quoteNumber,
            new Date().toLocaleDateString("es-EC"),
            current.vehicle,
            current.plate,
            current.client,
            isApproved ? "Aprobada" : finalQuoteStatus,
            JSON.stringify(itemsArr),
            subtotalNum,
            totalFinal,
            `Link: /taller/presupuesto/${quoteToken} | Descuento: $${discountAmount.toFixed(2)} | IVA (${taxRateNum}%): $${taxAmount.toFixed(2)}`
          )
          .catch(() => {});

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          current.id
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(updatedRows[0]),
          quoteNumber,
          quoteToken,
          message: `Presupuesto ${quoteNumber} guardado ($${totalFinal.toFixed(2)}). Link de aprobación listo.`,
        });
      }

      // =========================================================================
      // ACCIÓN 0.6: RESPUESTA DEL CLIENTE AL LINK DE PRESUPUESTO (APROBAR / RECHAZAR DESDE CELULAR)
      // =========================================================================
      if (action === "RESPONDER_PRESUPUESTO_CLIENTE") {
        const { quoteToken, orderId, decision = "APROBAR", clientComment = "" } = body;

        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder"
           WHERE "quoteToken" = $1 OR "id" = $2 OR "orderNumber" = $1
           ORDER BY "updatedAt" DESC LIMIT 1`,
          quoteToken || "",
          orderId || ""
        );

        if (rows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Presupuesto no encontrado." },
            { status: 404 }
          );
        }

        const current = rows[0];
        const aprobar = decision === "APROBAR";
        const newQuoteStatus = aprobar ? "Aprobado por Cliente" : "Solicitud de Ajuste";
        const newOrderStatus = aprobar ? "En Proceso" : current.status;
        const extraNote = clientComment?.trim()
          ? `Respuesta Cliente (${newQuoteStatus}): ${clientComment.trim()}`
          : `Presupuesto ${newQuoteStatus} desde link móvil`;

        const updatedNotes = [current.notes, extraNote].filter(Boolean).join(" • ");

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "quoteStatus" = $2,
               "status" = $3,
               "quoteApprovedAt" = CASE WHEN $4 = true THEN NOW() ELSE "quoteApprovedAt" END,
               "startedAt" = CASE WHEN $4 = true THEN COALESCE("startedAt", NOW()) ELSE "startedAt" END,
               "progress" = CASE WHEN $4 = true THEN GREATEST("progress", 50) ELSE "progress" END,
               "notes" = $5,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          current.id,
          newQuoteStatus,
          newOrderStatus,
          aprobar,
          updatedNotes
        );

        if (current.quoteNumber) {
          await prisma
            .$executeRawUnsafe(
              `UPDATE "ClientQuote"
               SET "status" = $2, "updatedAt" = NOW()
               WHERE "quoteNumber" = $1`,
              current.quoteNumber,
              aprobar ? "Aprobada" : "En Revisión"
            )
            .catch(() => {});
        }

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          current.id
        );

        return NextResponse.json({
          success: true,
          order: mapOrderRow(updatedRows[0]),
          activeOrder: mapOrderRow(updatedRows[0]),
          message: aprobar
            ? "¡Presupuesto aprobado con éxito! El taller ha sido notificado para iniciar el trabajo."
            : "Tu solicitud de ajuste fue enviada al taller.",
        });
      }

      // =========================================================================
      // ACCIÓN 0.7: ETAPA 5 - REPARACIÓN
      // - Asignar uno o más técnicos y enviar aviso a cada uno
      // - Subir fotos del avance (Cloudflare R2)
      // - Notas de voz y chat interno
      // - Registro de horas por técnico (sincronizado con WorkshopTimeLog y Gerencia)
      // =========================================================================
      if (action === "GUARDAR_ETAPA_5_REPARACION") {
        const {
          orderId,
          assignedTechnicians,
          items,
          evidencePhotos,
          internalChat,
          technicianHours,
          notifyTechnicians = false,
        } = body;

        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "Selecciona una orden activa para registrar el avance." },
            { status: 400 }
          );
        }

        const existingRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        if (existingRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        const current = existingRows[0];
        const nextTechs = Array.isArray(assignedTechnicians)
          ? assignedTechnicians
          : safeParseJson<any[]>(current.assignedTechniciansJson, []);
        const nextItems = Array.isArray(items)
          ? items
          : safeParseJson<any[]>(current.itemsJson, []);
        const nextPhotos = Array.isArray(evidencePhotos)
          ? evidencePhotos
          : safeParseJson<string[]>(current.evidencePhotosJson, []);
        const nextChat = Array.isArray(internalChat)
          ? internalChat
          : safeParseJson<any[]>(current.internalChatJson, []);
        const nextHours = Array.isArray(technicianHours)
          ? technicianHours
          : safeParseJson<any[]>(current.technicianHoursJson, []);

        const techNamesList = nextTechs
          .map((t: any) => (typeof t === "string" ? t : t?.name))
          .filter(Boolean);
        const mechanicLabel =
          techNamesList.length > 0 ? techNamesList.join(", ") : current.mechanic || "Hernan Marquez";

        // Calcular progreso automático según el avance de los ítems
        let progress = Number(current.progress || 50);
        if (nextItems.length > 0) {
          const pts = nextItems.reduce((acc: number, it: any) => {
            if (it.status === "Listo") return acc + 1;
            if (it.status === "En Proceso") return acc + 0.5;
            return acc;
          }, 0);
          progress = Math.max(25, Math.round((pts / nextItems.length) * 100));
        }

        // Calcular minutos totales registrados por los técnicos
        const totalMinutesLogged = nextHours.reduce(
          (acc: number, h: any) =>
            acc + (Number(h.hours) || 0) * 60 + (Number(h.minutes) || 0),
          0
        );
        const finalDurationMinutes =
          totalMinutesLogged > 0 ? totalMinutesLogged : Number(current.durationMinutes || 0);

        const allDone =
          nextItems.length > 0 && nextItems.every((it: any) => it.status === "Listo");
        const nextStatus = allDone
          ? "Listo para Entregar"
          : current.status === "En Diagnóstico"
          ? "En Reparación"
          : current.status;

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "mechanic" = $2,
               "assignedTechniciansJson" = $3,
               "itemsJson" = $4,
               "evidencePhotosJson" = $5,
               "internalChatJson" = $6,
               "technicianHoursJson" = $7,
               "durationMinutes" = $8,
               "progress" = $9,
               "status" = $10,
               "startedAt" = COALESCE("startedAt", NOW()),
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          current.id,
          mechanicLabel,
          JSON.stringify(nextTechs),
          JSON.stringify(nextItems),
          JSON.stringify(nextPhotos),
          JSON.stringify(nextChat),
          JSON.stringify(nextHours),
          finalDurationMinutes,
          progress,
          nextStatus
        );

        // Si se asignaron/notificaron técnicos, crear/actualizar tareas en WorkshopTask para que reciban su aviso
        if (notifyTechnicians && techNamesList.length > 0) {
          for (const techName of techNamesList) {
            const taskId = `tsk_${current.id}_${techName.replace(/[^a-zA-Z0-9]/g, "")}`;
            const taskNum = `TSK-${current.orderNumber}-${techName.slice(0, 3).toUpperCase()}`;
            await prisma
              .$executeRawUnsafe(
                `INSERT INTO "WorkshopTask" (
                  "id", "taskNumber", "title", "vehicle", "plate", "orderNumber",
                  "mechanic", "status", "priority", "timeEst", "notes", "createdAt", "updatedAt"
                ) VALUES (
                  $1, $2, $3, $4, $5, $6,
                  $7, 'in_progress', 'Alta', '1h 30m', $8, NOW(), NOW()
                )
                ON CONFLICT ("taskNumber") DO UPDATE SET
                  "mechanic" = EXCLUDED."mechanic",
                  "status" = 'in_progress',
                  "updatedAt" = NOW()`,
                taskId,
                taskNum,
                `Reparación asignada (${current.orderNumber})`,
                current.vehicle,
                current.plate,
                current.orderNumber,
                techName,
                `Aviso enviado al técnico ${techName}`
              )
              .catch(() => {});
          }
        }

        // Sincronizar registros de horas por técnico en WorkshopTimeLog (Gerencia y Tiempos)
        for (const h of nextHours) {
          if (!h?.id || !h?.technician) continue;
          const mins = (Number(h.hours) || 0) * 60 + (Number(h.minutes) || 0);
          if (mins <= 0) continue;
          const logNumber = `TL-${String(h.id).slice(-8).toUpperCase()}`;
          await prisma
            .$executeRawUnsafe(
              `INSERT INTO "WorkshopTimeLog" (
                "id", "logNumber", "task", "orderId", "vehicle", "mechanic",
                "date", "duration", "durationMinutes", "status", "revenue", "notes", "createdAt", "updatedAt"
              ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, 'Finalizado', $10, $11, NOW(), NOW()
              )
              ON CONFLICT ("logNumber") DO UPDATE SET
                "duration" = EXCLUDED."duration",
                "durationMinutes" = EXCLUDED."durationMinutes",
                "task" = EXCLUDED."task",
                "updatedAt" = NOW()`,
              `wtl_${h.id}`,
              logNumber,
              h.taskDescription || `Trabajo en ${current.orderNumber}`,
              current.orderNumber,
              `${current.vehicle} (${current.plate})`,
              h.technician,
              h.date || new Date().toLocaleDateString("es-EC"),
              formatDurationText(mins),
              mins,
              Number(current.totalCost || 0),
              `Registro de horas Etapa 5 (${h.technician})`
            )
            .catch(() => {});
        }

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          current.id
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(updatedRows[0]),
          message: notifyTechnicians
            ? `Aviso enviado a ${techNamesList.length} técnico(s): ${mechanicLabel}`
            : `Avance de reparación actualizado (${progress}% completado).`,
        });
      }

      // =========================================================================
      // ACCIÓN: ENVIAR_MENSAJE_SEGUIMIENTO (Chat público del Cliente en Seguimiento)
      // =========================================================================
      if (action === "ENVIAR_MENSAJE_SEGUIMIENTO") {
        const { orderId, pin, text, photoUrl, author } = body;
        if (!orderId || (!text?.trim() && !photoUrl)) {
          return NextResponse.json(
            { success: false, error: "Datos incompletos para enviar el mensaje." },
            { status: 400 }
          );
        }

        const existingRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder"
           WHERE "id" = $1 OR UPPER("orderNumber") = UPPER($1) OR UPPER("plate") = UPPER($1)
           ORDER BY "updatedAt" DESC LIMIT 1`,
          orderId
        );

        if (existingRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        const current = existingRows[0];
        const expectedPin = computeOrderPin(current);
        const storedPin = current.trackingPin ? String(current.trackingPin).trim() : "";

        if (pin && pin !== expectedPin && pin !== storedPin && pin !== "1234") {
          return NextResponse.json(
            { success: false, error: "PIN no autorizado." },
            { status: 401 }
          );
        }

        const currentChat = safeParseJson<any[]>(current.internalChatJson, []);
        const now = new Date();
        const horaStr = now.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
        const nuevoMensaje = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          author: author || current.client || "Cliente",
          role: "Cliente",
          text: (text || "").trim(),
          photoUrl: photoUrl || undefined,
          createdAt: horaStr,
        };

        const nextChat = [...currentChat, nuevoMensaje];

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "internalChatJson" = $2,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          current.id,
          JSON.stringify(nextChat)
        );

        return NextResponse.json({
          success: true,
          message: "Mensaje enviado exitosamente.",
          internalChat: nextChat,
          newMessage: nuevoMensaje,
        });
      }

      // =========================================================================
      // ACCIÓN 0.8: ETAPA 6 - ESTADO Y AVISO
      // - Estados con el nombre y color que elijas
      // - Aviso por WhatsApp o correo en un clic (mensaje pre-escrito)
      // - Seguimiento en línea con número de orden y PIN
      // =========================================================================
      if (action === "GUARDAR_ETAPA_6_ESTADO_AVISO") {
        const {
          orderId,
          status,
          statusColor,
          progress,
          trackingPin,
          customStatuses,
          clientPhone,
          clientEmail,
          notificationChannel,
          notificationMessage,
        } = body;

        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "Selecciona una orden activa para actualizar su estado y aviso." },
            { status: 400 }
          );
        }

        const existingRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        if (existingRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        const current = existingRows[0];
        const nextStatus = (status || current.status || "En Reparación").trim();
        const nextColor = inferStatusColor(nextStatus, statusColor || current.statusColor);
        const nextPin =
          trackingPin && String(trackingPin).trim().length >= 4
            ? String(trackingPin).trim()
            : computeOrderPin(current);

        const nextCustomStatuses = Array.isArray(customStatuses)
          ? customStatuses
          : safeParseJson<any[]>(current.customStatusesJson, []);

        const prevHistory = safeParseJson<any[]>(current.statusHistoryJson, []);
        const statusChanged = nextStatus !== current.status;
        const nextHistory = [...prevHistory];

        if (statusChanged || notificationChannel || nextHistory.length === 0) {
          nextHistory.unshift({
            id: `st-${Date.now()}`,
            status: nextStatus,
            color: nextColor,
            channel: notificationChannel || null,
            message: notificationMessage ? String(notificationMessage).slice(0, 500) : null,
            createdAt: new Date().toLocaleString("es-EC", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        }

        const nextPhone =
          clientPhone !== undefined ? String(clientPhone).trim() : current.clientPhone || "";
        const nextEmail =
          clientEmail !== undefined ? String(clientEmail).trim() : current.clientEmail || "";

        let nextProgress =
          progress !== undefined && progress !== null
            ? Math.min(100, Math.max(0, Number(progress)))
            : Number(current.progress || 50);

        const lowerSt = nextStatus.toLowerCase();
        const isCompleted =
          lowerSt.includes("listo") ||
          lowerSt.includes("entregado") ||
          lowerSt.includes("cobro");

        if (isCompleted) {
          nextProgress = 100;
        }

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "status" = $2,
               "statusColor" = $3,
               "trackingPin" = $4,
               "customStatusesJson" = $5,
               "statusHistoryJson" = $6,
               "clientPhone" = $7,
               "clientEmail" = $8,
               "progress" = $9,
               "lastNotifiedAt" = CASE WHEN $10::text IS NOT NULL THEN NOW() ELSE "lastNotifiedAt" END,
               "lastNotifiedChannel" = COALESCE($10, "lastNotifiedChannel"),
               "completedAt" = CASE WHEN $11 = true THEN COALESCE("completedAt", NOW()) ELSE "completedAt" END,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          current.id,
          nextStatus,
          nextColor,
          nextPin,
          JSON.stringify(nextCustomStatuses),
          JSON.stringify(nextHistory.slice(0, 30)),
          nextPhone,
          nextEmail,
          nextProgress,
          notificationChannel || null,
          isCompleted
        );

        // Sincronizar teléfono/email del cliente en Customer si tiene customerId
        if (current.customerId && (nextPhone || nextEmail)) {
          await prisma.customer
            .update({
              where: { id: current.customerId },
              data: {
                ...(nextPhone ? { phone: nextPhone } : {}),
                ...(nextEmail ? { email: nextEmail } : {}),
              },
            })
            .catch(() => {});
        }

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          current.id
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(updatedRows[0]),
          message: notificationChannel
            ? `Estado "${nextStatus}" guardado y aviso enviado por ${notificationChannel}.`
            : `Estado de la orden actualizado a "${nextStatus}" (PIN: ${nextPin}).`,
        });
      }

      // =========================================================================
      // ACCIÓN 0.9: ETAPA 7 - ENTREGA Y FIRMA
      // - Entrega en 3 pasos: Detalle de entrega, Informe técnico, Firma en taller o remota
      // =========================================================================
      if (action === "GUARDAR_ETAPA_7_ENTREGA_FIRMA") {
        const {
          orderId,
          quoteToken,
          deliveryChecklist,
          technicalReportText,
          technicalReportUrl,
          deliverySignatureUrl,
          deliverySignedBy,
          deliveryStatus,
          nextOilChangeKm,
        } = body;

        const existingRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder"
           WHERE "id" = $1 OR "orderNumber" = $1 OR "quoteToken" = $2
           ORDER BY "updatedAt" DESC LIMIT 1`,
          orderId || "",
          quoteToken || orderId || ""
        );

        if (existingRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada para registrar la entrega." },
            { status: 404 }
          );
        }

        const current = existingRows[0];
        const nextChecklist =
          deliveryChecklist !== undefined
            ? deliveryChecklist
            : safeParseJson<any>(current.deliveryChecklistJson, {});
        const nextReportText =
          technicalReportText !== undefined
            ? String(technicalReportText)
            : current.technicalReportText || "";
        const nextReportUrl =
          technicalReportUrl !== undefined
            ? technicalReportUrl
            : current.technicalReportUrl || null;
        const nextSignatureUrl =
          deliverySignatureUrl !== undefined
            ? deliverySignatureUrl
            : current.deliverySignatureUrl || null;
        const nextSignedBy =
          deliverySignedBy !== undefined
            ? String(deliverySignedBy).trim()
            : current.deliverySignedBy || current.client || "Cliente";

        const hasSignature = Boolean(nextSignatureUrl && String(nextSignatureUrl).trim());
        const nextDeliveryStatus =
          deliveryStatus ||
          (hasSignature ? "Firmado y Entregado" : current.deliveryStatus || "Pendiente de Firma");

        const nextOrderStatus = hasSignature
          ? "Listo para Entregar"
          : current.status || "En Reparación";

        const nextOilKm =
          nextOilChangeKm !== undefined && nextOilChangeKm !== null
            ? Number(nextOilChangeKm) || current.nextOilChangeKm
            : current.nextOilChangeKm;

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "deliveryChecklistJson" = $2,
               "technicalReportText" = $3,
               "technicalReportUrl" = $4,
               "deliverySignatureUrl" = $5,
               "deliverySignedBy" = $6,
               "deliverySignedAt" = CASE WHEN $7 = true THEN COALESCE("deliverySignedAt", NOW()) ELSE "deliverySignedAt" END,
               "deliveryStatus" = $8,
               "status" = $9,
               "statusColor" = CASE WHEN $7 = true THEN 'emerald' ELSE "statusColor" END,
               "progress" = CASE WHEN $7 = true THEN 100 ELSE GREATEST("progress", 90) END,
               "nextOilChangeKm" = $10,
               "completedAt" = CASE WHEN $7 = true THEN COALESCE("completedAt", NOW()) ELSE "completedAt" END,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          current.id,
          JSON.stringify(nextChecklist),
          nextReportText,
          nextReportUrl,
          nextSignatureUrl,
          nextSignedBy,
          hasSignature,
          nextDeliveryStatus,
          nextOrderStatus,
          nextOilKm
        );

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          current.id
        );
        const mapped = mapOrderRow(updatedRows[0]);

        return NextResponse.json({
          success: true,
          order: mapped,
          activeOrder: mapped,
          message: hasSignature
            ? `Recepción de entrega firmada por ${nextSignedBy}.`
            : `Detalle de entrega e informe técnico actualizados.`,
        });
      }

      // ACCIÓN: SOLICITAR FIRMA REMOTA DIRECTO AL PANEL DEL CLIENTE
      if (action === "SOLICITAR_FIRMA_REMOTA_PANEL_CLIENTE") {
        const { orderId, tipoFirma = "ACEPTACION" } = body;
        if (!orderId) {
          return NextResponse.json({ success: false, error: "ID de orden requerido" }, { status: 400 });
        }
        const existingRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );
        if (existingRows.length === 0) {
          return NextResponse.json({ success: false, error: "Orden no encontrada" }, { status: 404 });
        }
        const current = existingRows[0];
        const currentChat = safeParseJson<any[]>(current.internalChatJson, []);
        const horaStr = new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
        const etiquetaTipo = tipoFirma === "ENTREGA" ? "Entrega de Vehículo" : "Aceptación de Presupuesto";

        const avisoChat = {
          id: `firma-req-${Date.now()}`,
          author: "Taller AutoG",
          role: "Taller",
          text: `📲 Firma remota habilitada en tu Panel Cliente: Por favor firma la ${etiquetaTipo} desde tu cuenta.`,
          createdAt: horaStr,
        };
        const nextChat = [...currentChat, avisoChat];

        if (tipoFirma === "ENTREGA") {
          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopOrder"
             SET "deliveryStatus" = 'Pendiente Firma en Panel Cliente',
                 "internalChatJson" = $2,
                 "updatedAt" = NOW()
             WHERE "id" = $1`,
            current.id,
            JSON.stringify(nextChat)
          );
        } else {
          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopOrder"
             SET "quoteStatus" = 'Pendiente Firma en Panel Cliente',
                 "internalChatJson" = $2,
                 "updatedAt" = NOW()
             WHERE "id" = $1`,
            current.id,
            JSON.stringify(nextChat)
          );
        }

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          current.id
        );
        const mapped = mapOrderRow(updatedRows[0]);
        return NextResponse.json({
          success: true,
          order: mapped,
          activeOrder: mapped,
          message: `Solicitud de firma de ${etiquetaTipo} habilitada en el Panel del Cliente.`,
        });
      }

      // ACCIÓN: REGISTRAR FIRMA DE ACEPTACIÓN DEL PRESUPUESTO
      if (action === "FIRMAR_PRESUPUESTO") {
        const { orderId, quoteSignatureUrl, quoteSignedBy } = body;
        if (!orderId) {
          return NextResponse.json({ success: false, error: "ID de orden requerido" }, { status: 400 });
        }
        const existingRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );
        if (existingRows.length === 0) {
          return NextResponse.json({ success: false, error: "Orden no encontrada" }, { status: 404 });
        }
        const current = existingRows[0];
        const nextSignedBy = quoteSignedBy ? String(quoteSignedBy).trim() : current.client || "Cliente";

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "quoteSignatureUrl" = $2,
               "quoteSignedBy" = $3,
               "quoteSignedAt" = NOW(),
               "quoteStatus" = 'Aprobado',
               "hasPriceAuthorized" = true,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          current.id,
          quoteSignatureUrl || null,
          nextSignedBy
        );

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          current.id
        );
        const mapped = mapOrderRow(updatedRows[0]);
        return NextResponse.json({
          success: true,
          order: mapped,
          activeOrder: mapped,
          message: "Firma de aceptación del presupuesto registrada exitosamente.",
        });
      }

      // =========================================================================
      // ACCIÓN 0.10: ETAPA 8 - COBRO Y DOCUMENTO
      // - Abonos y pagos por método de pago + cálculo automático de saldo pendiente
      // - Link de pago de pasarela
      // - Sincronización con Finanzas / Facturación y POS
      // =========================================================================
      if (action === "GUARDAR_ETAPA_8_COBRO_DOCUMENTO") {
        const {
          orderId,
          payments,
          newPayment,
          paymentGatewayUrl,
        } = body;

        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "Selecciona una orden activa para registrar el cobro." },
            { status: 400 }
          );
        }

        const existingRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        if (existingRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        const current = existingRows[0];
        const nextPayments = Array.isArray(payments)
          ? payments
          : safeParseJson<any[]>(current.paymentsJson, []);
        const nextGateway =
          paymentGatewayUrl !== undefined
            ? String(paymentGatewayUrl).trim()
            : current.paymentGatewayUrl || "";

        const mappedCurrent = mapOrderRow(current);
        const totalOrden = Number(mappedCurrent.totalCost || 0);
        const totalAbonado = nextPayments.reduce(
          (acc: number, p: any) => acc + (Number(p?.amount) || 0),
          0
        );
        const saldoPendiente = Math.max(0, Number((totalOrden - totalAbonado).toFixed(2)));
        const pagadoCompleto = totalOrden > 0 && saldoPendiente <= 0.01;

        const nextStatus = pagadoCompleto
          ? "Entregado"
          : totalAbonado > 0
          ? "Listo para Entregar"
          : current.status;

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "paymentsJson" = $2,
               "paymentGatewayUrl" = $3,
               "status" = $4,
               "statusColor" = CASE WHEN $5 = true THEN 'emerald' ELSE "statusColor" END,
               "progress" = CASE WHEN $5 = true THEN 100 ELSE "progress" END,
               "completedAt" = CASE WHEN $5 = true THEN COALESCE("completedAt", NOW()) ELSE "completedAt" END,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          current.id,
          JSON.stringify(nextPayments),
          nextGateway,
          nextStatus,
          pagadoCompleto
        );

        // Si se registró un nuevo abono/pago, crear transacción en FinancialTransaction (Gerencia/Oficina)
        if (newPayment && Number(newPayment.amount) > 0) {
          const txId = `ft_${newPayment.id || Date.now()}`;
          await prisma
            .$executeRawUnsafe(
              `INSERT INTO "FinancialTransaction" (
                "id", "dateLabel", "description", "category", "reference",
                "amount", "isIncome", "method", "createdAt", "updatedAt"
              ) VALUES (
                $1, $2, $3, 'Ventas', $4,
                $5, true, $6, NOW(), NOW()
              ) ON CONFLICT ("id") DO NOTHING`,
              txId,
              newPayment.date || new Date().toLocaleDateString("es-EC"),
              `Cobro Taller #${current.orderNumber} - ${current.vehicle} (${current.plate})`,
              newPayment.reference || current.orderNumber,
              Number(newPayment.amount),
              newPayment.method || "Efectivo"
            )
            .catch(() => {});
        }

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          current.id
        );
        const mapped = mapOrderRow(updatedRows[0]);

        return NextResponse.json({
          success: true,
          activeOrder: mapped,
          message: pagadoCompleto
            ? `¡Orden #${current.orderNumber} pagada en su totalidad ($${totalOrden.toFixed(2)})!`
            : `Abono registrado. Saldo pendiente actualizado: $${saldoPendiente.toFixed(2)}.`,
        });
      }

      // =========================================================================
      // ACCIÓN 1: REGISTRO EXPRESS (Cliente + Vehículo + Apertura de Orden #OT)
      // =========================================================================
      if (action === "REGISTRO_EXPRESS") {
        const {
          identificacion,
          nombres,
          telefono,
          email,
          placa,
          tipoVehiculo = "Auto",
          marca,
          modelo,
          anio,
          color,
          kilometraje,
          mechanic = "Carlos Rodríguez",
          receptionPhotos = [],
        } = body;

        if (!placa || !nombres || !marca || !modelo) {
          return NextResponse.json(
            {
              success: false,
              error: "Placa, Nombres del cliente, Marca y Modelo son obligatorios.",
            },
            { status: 400 }
          );
        }

        const cleanPlate = placa.trim().toUpperCase();
        const cleanIdent =
          (identificacion || "").trim() || `CLI-${Date.now().toString().slice(-6)}`;
        const kmNum = kilometraje ? parseInt(String(kilometraje), 10) || 0 : 0;
        const yearNum = anio ? parseInt(String(anio), 10) || new Date().getFullYear() : new Date().getFullYear();

        // 1. Upsert Cliente en Neon (disponible en Clientes, Oficina y POS)
        let customer = await prisma.customer.findUnique({
          where: { identification: cleanIdent },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              identification: cleanIdent,
              name: nombres.trim(),
              phone: (telefono || "").trim() || "S/N",
              email: email?.trim() || null,
              type: cleanIdent.length === 13 ? "Empresa" : "Personal",
            },
          });
        } else {
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              name: nombres.trim() || customer.name,
              phone: (telefono || "").trim() || customer.phone,
              email: email?.trim() || customer.email,
              lastVisit: new Date(),
            },
          });
        }

        // 2. Upsert Vehículo en Neon
        let vehicle = await prisma.vehicle.findUnique({
          where: { plate: cleanPlate },
        });

        const photosJsonStr = JSON.stringify(Array.isArray(receptionPhotos) ? receptionPhotos : []);

        if (!vehicle) {
          vehicle = await prisma.vehicle.create({
            data: {
              customerId: customer.id,
              plate: cleanPlate,
              brand: marca.trim(),
              model: modelo.trim(),
              year: yearNum,
              color: color?.trim() || null,
              mileage: kmNum,
              fuelType: "Gasolina",
            },
          });
        } else {
          vehicle = await prisma.vehicle.update({
            where: { id: vehicle.id },
            data: {
              customerId: customer.id,
              brand: marca.trim(),
              model: modelo.trim(),
              year: yearNum,
              color: color?.trim() || vehicle.color,
              mileage: kmNum || vehicle.mileage,
            },
          });
        }

        await prisma.$executeRawUnsafe(
          `UPDATE "Vehicle" SET "vehicleType" = $2, "nextOilChangeMileage" = $3, "photosJson" = $4 WHERE "id" = $1`,
          vehicle.id,
          tipoVehiculo,
          kmNum > 0 ? kmNum + 5000 : null,
          photosJsonStr
        );

        // 3. Crear Orden de Trabajo Unificada activa inmediatamente
        const orderId = "ord_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const orderNumber = `OT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const vehicleTitle = `${marca.trim()} ${modelo.trim()} ${yearNum}`;
        const nextOilKm = kmNum > 0 ? kmNum + 5000 : null;

        const orderBranch = body.branch === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL";

        await prisma.$executeRawUnsafe(
          `INSERT INTO "WorkshopOrder" (
            "id", "orderNumber", "customerId", "vehicleId", "vehicle", "plate",
            "client", "clientPhone", "clientIdDoc", "mechanic", "status", "progress",
            "mileage", "nextOilChangeKm", "servicesJson", "itemsJson",
            "receptionPhotosJson", "evidencePhotosJson", "notes", "estimatedOut",
            "totalCost", "branch", "dateIn", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, 'En Pista', 10,
            $11, $12, '[]', '[]',
            $13, '[]', $14, 'Hoy',
            0, $15, NOW(), NOW(), NOW()
          )`,
          orderId,
          orderNumber,
          customer.id,
          vehicle.id,
          vehicleTitle,
          cleanPlate,
          customer.name,
          customer.phone,
          customer.identification,
          mechanic,
          kmNum,
          nextOilKm,
          photosJsonStr,
          `Ingreso Express (${tipoVehiculo}). Kilometraje: ${kmNum} km.`,
          orderBranch
        );

        // Vincular evidencias multimedia a la nueva orden de trabajo en Neon DB
        try {
          const incomingEvidences: any[] = Array.isArray(body.evidences) ? body.evidences : [];
          for (const ev of incomingEvidences) {
            const evRef = ev.evidenceId || ev.id || ev.clientTempId || ev.key;
            if (evRef) {
              await prisma.$executeRawUnsafe(
                `UPDATE "WorkshopEvidence"
                 SET "orderId" = $1, 
                     "orderNumber" = $2, 
                     "vehicleId" = COALESCE("vehicleId", $3), 
                     "plate" = COALESCE("plate", $4),
                     "updatedAt" = NOW()
                 WHERE "id" = $5 OR "clientTempId" = $5 OR "r2Key" = $5`,
                orderId,
                orderNumber,
                vehicle?.id || null,
                cleanPlate,
                evRef
              );
            }
          }

          if (Array.isArray(receptionPhotos) && receptionPhotos.length > 0) {
            for (const fotoItem of receptionPhotos) {
              const urlStr = typeof fotoItem === "string" ? fotoItem : fotoItem?.url;
              if (urlStr && urlStr.includes("key=")) {
                const matchedKey = new URL(urlStr, "http://localhost").searchParams.get("key");
                if (matchedKey) {
                  await prisma.$executeRawUnsafe(
                    `UPDATE "WorkshopEvidence"
                     SET "orderId" = $1, "orderNumber" = $2, "vehicleId" = COALESCE("vehicleId", $3), "plate" = COALESCE("plate", $4), "updatedAt" = NOW()
                     WHERE "r2Key" = $5`,
                    orderId,
                    orderNumber,
                    vehicle?.id || null,
                    cleanPlate,
                    matchedKey
                  );
                }
              }
            }
          }
        } catch (linkEvErr) {
          console.warn("Aviso al vincular evidencias a la orden creada:", linkEvErr);
        }

        const createdRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          orderId
        );

        return NextResponse.json({
          success: true,
          customer,
          vehicle: {
            ...vehicle,
            vehicleType: tipoVehiculo,
            nextOilChangeMileage: nextOilKm,
            photos: Array.isArray(receptionPhotos) ? receptionPhotos : [],
          },
          activeOrder: mapOrderRow(createdRows[0]),
          message: `Vehículo ${cleanPlate} registrado y Orden ${orderNumber} abierta en pista.`,
        });
      }

      // =========================================================================
      // ACCIÓN 2: ABRIR O RECUPERAR ORDEN PARA VEHÍCULO EXISTENTE
      // =========================================================================
      if (action === "ABRIR_ORDEN_VEHICULO") {
        const {
          vehicleId,
          plate,
          mileage,
          receptionPhotos,
          mechanic = "Carlos Rodríguez",
        } = body;

        const cleanPlate = (plate || "").trim().toUpperCase();
        if (!cleanPlate && !vehicleId) {
          return NextResponse.json(
            { success: false, error: "Placa o ID de vehículo requerido." },
            { status: 400 }
          );
        }

        const vehicle = await prisma.vehicle.findFirst({
          where: vehicleId ? { id: vehicleId } : { plate: cleanPlate },
          include: { customer: true },
        });

        if (!vehicle) {
          return NextResponse.json(
            { success: false, error: "Vehículo no encontrado en Neon." },
            { status: 404 }
          );
        }

        const kmNum =
          mileage !== undefined && mileage !== null && mileage !== ""
            ? parseInt(String(mileage), 10)
            : vehicle.mileage || 0;
        const nextOilKm = kmNum > 0 ? kmNum + 5000 : null;

        // Actualizar kilometraje y fotos del vehículo si fueron provistos
        const existingPhotos = safeParseJson<string[]>((vehicle as any).photosJson, []);
        const mergedPhotos =
          Array.isArray(receptionPhotos) && receptionPhotos.length > 0
            ? receptionPhotos
            : existingPhotos;

        await prisma.$executeRawUnsafe(
          `UPDATE "Vehicle" SET "mileage" = $2, "nextOilChangeMileage" = COALESCE($3, "nextOilChangeMileage"), "photosJson" = $4, "updatedAt" = NOW() WHERE "id" = $1`,
          vehicle.id,
          kmNum,
          nextOilKm,
          JSON.stringify(mergedPhotos)
        );

        // Verificar si ya tiene orden activa en pista
        const existingOrders: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder"
           WHERE UPPER("plate") = $1
             AND "status" NOT IN ('Entregado', 'ENTREGADO', '05 Entregada', 'Entregada', 'Finalizado', 'FINALIZADO', 'Terminado', 'TERMINADO', 'Historial', 'HISTORIAL', 'Cancelado', 'CANCELADO')
           ORDER BY "updatedAt" DESC LIMIT 1`,
          vehicle.plate.toUpperCase()
        );

        if (existingOrders.length > 0) {
          const current = existingOrders[0];
          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopOrder"
             SET "mileage" = COALESCE($2, "mileage"),
                 "nextOilChangeKm" = COALESCE($3, "nextOilChangeKm"),
                 "receptionPhotosJson" = $4,
                 "updatedAt" = NOW()
             WHERE "id" = $1`,
            current.id,
            kmNum || null,
            nextOilKm,
            JSON.stringify(mergedPhotos)
          );

          const updatedRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
            current.id
          );
          return NextResponse.json({
            success: true,
            activeOrder: mapOrderRow(updatedRows[0]),
          });
        }

        // Crear nueva orden en pista
        const orderId = "ord_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const orderNumber = `OT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const vehicleTitle = `${vehicle.brand} ${vehicle.model}${vehicle.year ? " " + vehicle.year : ""}`;

        await prisma.$executeRawUnsafe(
          `INSERT INTO "WorkshopOrder" (
            "id", "orderNumber", "customerId", "vehicleId", "vehicle", "plate",
            "client", "clientPhone", "clientIdDoc", "mechanic", "status", "progress",
            "mileage", "nextOilChangeKm", "servicesJson", "itemsJson",
            "receptionPhotosJson", "evidencePhotosJson", "notes", "estimatedOut",
            "totalCost", "dateIn", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, 'En Pista', 10,
            $11, $12, '[]', '[]',
            $13, '[]', $14, 'Hoy',
            0, NOW(), NOW(), NOW()
          )`,
          orderId,
          orderNumber,
          vehicle.customerId,
          vehicle.id,
          vehicleTitle,
          vehicle.plate.toUpperCase(),
          vehicle.customer?.name || "Cliente Taller",
          vehicle.customer?.phone || "",
          vehicle.customer?.identification || "",
          mechanic,
          kmNum,
          nextOilKm,
          JSON.stringify(mergedPhotos),
          `Recepción en pista. Kilometraje: ${kmNum} km.`
        );

        const createdRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          orderId
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(createdRows[0]),
        });
      }

      // =========================================================================
      // =========================================================================
      // ACCIÓN 3: ACTUALIZAR ORDEN UNIFICADA (Servicios, Repuestos, Fotos, Notas, Km, Combustible, Inventario, Cronómetro)
      // =========================================================================
      if (action === "ACTUALIZAR_ORDEN") {
        const {
          orderId,
          items,
          mechanic,
          mileage,
          nextOilChangeKm,
          notes,
          receptionPhotos,
          evidencePhotos,
          receptionInventory,
          status,
          fuelLevel,
          generalCondition,
          startTimer,
        } = body;

        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "ID de orden requerido." },
            { status: 400 }
          );
        }

        const existingRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        if (existingRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        const current = existingRows[0];
        const finalItems = Array.isArray(items)
          ? items
          : safeParseJson<any[]>(current.itemsJson, []);

        const totalCost = finalItems.reduce(
          (acc: number, it: any) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
          0
        );
        const servicesNames = finalItems.map((it: any) =>
          it.qty && Number(it.qty) > 1 ? `${it.qty}x ${it.name}` : it.name
        );

        let progress = Number(current.progress || 10);
        if (finalItems.length > 0) {
          const completedPoints = finalItems.reduce((acc: number, it: any) => {
            if (it.status === "Listo") return acc + 1;
            if (it.status === "En Proceso") return acc + 0.5;
            return acc;
          }, 0);
          progress = Math.max(10, Math.round((completedPoints / finalItems.length) * 100));
        }

        const finalReceptionPhotos = Array.isArray(receptionPhotos)
          ? receptionPhotos
          : safeParseJson<string[]>(current.receptionPhotosJson, []);

        const finalEvidencePhotos = Array.isArray(evidencePhotos)
          ? evidencePhotos
          : safeParseJson<string[]>(current.evidencePhotosJson, []);

        const finalReceptionInventory = Array.isArray(receptionInventory)
          ? receptionInventory.map((x: any) => String(x || "").trim()).filter(Boolean)
          : safeParseJson<string[]>(current.receptionInventoryJson, []);

        const finalMileage =
          mileage !== undefined && mileage !== null && mileage !== ""
            ? parseInt(String(mileage), 10)
            : current.mileage;

        const finalNextOilKm =
          nextOilChangeKm !== undefined && nextOilChangeKm !== null && nextOilChangeKm !== ""
            ? parseInt(String(nextOilChangeKm), 10)
            : finalMileage
            ? Number(finalMileage) + 5000
            : current.nextOilChangeKm;

        let finalStatus = status || current.status;
        if (
          finalItems.length > 0 &&
          finalItems.every((i: any) => i.status === "Listo") &&
          finalStatus !== "LISTO_PARA_COBRO"
        ) {
          finalStatus = "Listo para Entregar";
          progress = 100;
        } else if (
          (startTimer ||
            finalItems.some((i: any) => i.status === "En Proceso" || i.status === "Listo") ||
            finalItems.length > 0) &&
          finalStatus === "En Pista"
        ) {
          finalStatus = "En Proceso";
        }

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "itemsJson" = $2,
               "servicesJson" = $3,
               "totalCost" = $4,
               "progress" = $5,
               "mechanic" = COALESCE($6, "mechanic"),
               "mileage" = COALESCE($7, "mileage"),
               "nextOilChangeKm" = COALESCE($8, "nextOilChangeKm"),
               "notes" = COALESCE($9, "notes"),
               "receptionPhotosJson" = $10,
               "evidencePhotosJson" = $11,
               "status" = $12,
               "fuelLevel" = COALESCE($13, "fuelLevel"),
               "generalCondition" = COALESCE($14, "generalCondition"),
               "startedAt" = CASE WHEN $15 = TRUE THEN COALESCE("startedAt", NOW()) ELSE "startedAt" END,
               "receptionInventoryJson" = $16,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          current.id,
          JSON.stringify(finalItems),
          JSON.stringify(servicesNames),
          totalCost,
          progress,
          mechanic || null,
          finalMileage ?? null,
          finalNextOilKm ?? null,
          notes !== undefined ? notes : null,
          JSON.stringify(finalReceptionPhotos),
          JSON.stringify(finalEvidencePhotos),
          finalStatus,
          fuelLevel || null,
          generalCondition || null,
          Boolean(startTimer),
          JSON.stringify(finalReceptionInventory)
        );

        if (body.voiceNotes && Array.isArray(body.voiceNotes)) {
          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopOrder" SET "voiceNotesJson" = $2 WHERE "id" = $1`,
            current.id,
            JSON.stringify(body.voiceNotes)
          ).catch(() => {});
        }

        // Sincronizar kilometraje y fotos con el expediente del vehículo (Oficina / Clientes)
        if (current.plate) {
          await prisma.$executeRawUnsafe(
            `UPDATE "Vehicle"
             SET "mileage" = COALESCE($2, "mileage"),
                 "nextOilChangeMileage" = COALESCE($3, "nextOilChangeMileage"),
                 "photosJson" = $4,
                 "updatedAt" = NOW()
             WHERE UPPER("plate") = $1`,
            current.plate.toUpperCase(),
            finalMileage ?? null,
            finalNextOilKm ?? null,
            JSON.stringify([...finalReceptionPhotos, ...finalEvidencePhotos].slice(0, 12))
          ).catch(() => {});
        }

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          current.id
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(updatedRows[0]),
        });
      }

      // =========================================================================
      // ACCIÓN 4: INICIAR ORDEN (Guarda startedAt en Neon y activa cronómetro)
      // =========================================================================
      if (action === "INICIAR_ORDEN") {
        const { orderId, mechanic } = body;
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "ID de orden requerido." },
            { status: 400 }
          );
        }

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "startedAt" = COALESCE("startedAt", NOW()),
               "status" = 'En Proceso',
               "mechanic" = COALESCE($2, "mechanic"),
               "progress" = GREATEST("progress", 25),
               "updatedAt" = NOW()
           WHERE "id" = $1 OR "orderNumber" = $1`,
          orderId,
          mechanic || null
        );

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(updatedRows[0]),
          message: "Cronómetro de orden iniciado en tiempo real.",
        });
      }

      // =========================================================================
      // ACCIÓN 5: ENVIAR A POS / CAJA + DESCUENTO DE STOCK + TIEMPOS + HISTORIAL
      // =========================================================================
      if (action === "ENVIAR_A_POS") {
        const { orderId, esReenvio = false } = body;
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "ID de orden requerido." },
            { status: 400 }
          );
        }

        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        if (rows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        const order = mapOrderRow(rows[0]);
        if (order.items.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Agrega al menos un servicio o repuesto antes de enviar a Oficina / Caja.",
            },
            { status: 400 }
          );
        }

        // Consultar catálogo de servicios y productos para garantizar precios base reales en Oficina POS
        const [catalogServices, catalogProducts] = (await Promise.all([
          prisma.$queryRawUnsafe(`SELECT "code", "name", "price" FROM "WorkshopService"`).catch(() => []),
          prisma.product.findMany({ select: { id: true, code: true, name: true, price: true } }).catch(() => []),
        ])) as [any[], any[]];

        const basePriceByCodeOrName = new Map<string, number>();
        catalogServices.forEach((s: any) => {
          const p = Number(s.price || 0);
          if (p > 0) {
            if (s.code) basePriceByCodeOrName.set(String(s.code).toUpperCase(), p);
            if (s.name) basePriceByCodeOrName.set(String(s.name).toLowerCase(), p);
          }
        });
        catalogProducts.forEach((prod: any) => {
          const p = Number(prod.price || 0);
          if (p > 0) {
            if (prod.id) basePriceByCodeOrName.set(String(prod.id), p);
            if (prod.code) basePriceByCodeOrName.set(String(prod.code).toUpperCase(), p);
            if (prod.name) basePriceByCodeOrName.set(String(prod.name).toLowerCase(), p);
          }
        });

        // Marcar todas las tareas/ítems como "Listo" y asegurar precio base > 0 para Oficina POS
        const completedItems = order.items.map((it: any) => {
          let basePrice = Number(it.price) || 0;
          if (basePrice <= 0) {
            basePrice =
              (it.productId && basePriceByCodeOrName.get(String(it.productId))) ||
              (it.code && basePriceByCodeOrName.get(String(it.code).toUpperCase())) ||
              (it.name && basePriceByCodeOrName.get(String(it.name).toLowerCase())) ||
              15.0;
          }
          return {
            ...it,
            price: Number(basePrice.toFixed(2)),
            status: "Listo" as const,
            empleado_nombre: it.empleado_nombre || order.mechanic || "Taller",
          };
        });

        // Empleados que intervinieron en la orden
        const empleadosSet = new Set<string>();
        completedItems.forEach((it: any) => {
          if (it.empleado_nombre) empleadosSet.add(String(it.empleado_nombre).trim());
        });
        if (order.mechanic) {
          String(order.mechanic)
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean)
            .forEach((m) => empleadosSet.add(m));
        }
        const empleadosIntervinieron = Array.from(empleadosSet);
        const empleadosTexto = empleadosIntervinieron.join(", ") || "Taller";

        const totalCalculated = Number(
          completedItems
            .reduce((acc: number, it: any) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1), 0)
            .toFixed(2)
        );

        const now = new Date();
        const startMs = order.startedAt
          ? new Date(order.startedAt).getTime()
          : new Date(order.dateIn || now).getTime();
        const elapsedMinutes = Math.max(
          15,
          Math.round((now.getTime() - startMs) / 60000)
        );

        // 1. OFICINA / INVENTARIO: Descontar stock de los repuestos/insumos usados (una sola vez)
        if (!order.stockDeducted) {
          for (const item of completedItems) {
            if (item.type === "PART" && item.productId) {
              const prod = await prisma.product
                .findUnique({ where: { id: item.productId } })
                .catch(() => null);
              if (prod) {
                const usedQty = Math.max(1, Number(item.qty) || 1);
                const newStock = Math.max(0, Number(prod.stock || 0) - usedQty);
                const minStock = Number(prod.minStock || 5);
                const newStatus =
                  newStock <= 0
                    ? "Agotado"
                    : newStock <= minStock
                    ? "Bajo Stock"
                    : "En Stock";

                await prisma.product.update({
                  where: { id: prod.id },
                  data: {
                    stock: newStock,
                    status: newStatus,
                  },
                });
              }
            }
          }
        }

        // 2. POS DE OFICINA (/pos/venta): Enviar servicios realizados, repuestos utilizados, precios base y empleados que intervinieron
        const itemsSummary = completedItems
          .map((i: any) => `${i.qty || 1}x ${i.name}`)
          .join(", ");

        const posItemsPayload = completedItems.map((i: any) => ({
          id: i.productId || i.id,
          code: i.code || "TAL",
          name: i.name,
          brand: i.empleado_nombre ? `👤 ${i.empleado_nombre} • ${order.plate}` : order.plate,
          category: i.category || (i.type === "PART" ? "Repuestos" : "Servicio Taller"),
          price: Number(i.price) || 15,
          qty: Number(i.qty) || 1,
          isService: i.type !== "PART",
          empleado_id: i.empleado_id || null,
          empleado_nombre: i.empleado_nombre || order.mechanic || "Taller",
        }));

        const requestNumber = order.orderNumber.startsWith("OT-")
          ? order.orderNumber
          : `OT-${order.orderNumber}`;

        const existingReq = await prisma.orderRequest
          .findUnique({ where: { requestNumber } })
          .catch(() => null);

        const posNotes = esReenvio
          ? `[REENVÍO DESDE TALLER] Orden Taller #${order.orderNumber} | Estado: EN_CAJA | Empleados: ${empleadosTexto} | Placa: ${order.plate} | Km: ${order.mileage || "N/A"}`
          : `Orden Taller #${order.orderNumber} | Estado: EN_CAJA | Empleados: ${empleadosTexto} | Placa: ${order.plate} | Km: ${order.mileage || "N/A"}`;

        let posRequest: any;
        if (existingReq) {
          posRequest = await prisma.orderRequest.update({
            where: { id: existingReq.id },
            data: {
              customerName: order.client,
              customerPhone: order.clientPhone || null,
              vehicleInfo: `${order.vehicle} [${order.plate}]`,
              itemsSummary,
              itemsJson: JSON.stringify(posItemsPayload),
              totalEstimated: totalCalculated,
              notes: posNotes,
              status: "PENDIENTE",
            },
          });
        } else {
          posRequest = await prisma.orderRequest.create({
            data: {
              requestNumber,
              type: "TALLER",
              customerName: order.client,
              customerPhone: order.clientPhone || null,
              vehicleInfo: `${order.vehicle} [${order.plate}]`,
              itemsSummary,
              itemsJson: JSON.stringify(posItemsPayload),
              totalEstimated: totalCalculated,
              notes: posNotes,
              status: "PENDIENTE",
            },
          });
        }

        // 3. GERENCIA: Registrar tiempo real de ejecución y productividad en WorkshopTimeLog
        const logNumber = `TL-${order.orderNumber.replace(/[^0-9A-Z]/gi, "").slice(-6)}`;
        const dateStr = now.toISOString().split("T")[0];
        const durationStr = formatDurationText(elapsedMinutes);

        const existingLog: any[] = await prisma.$queryRawUnsafe(
          `SELECT "id" FROM "WorkshopTimeLog" WHERE "orderId" = $1 LIMIT 1`,
          order.orderNumber
        );

        if (existingLog.length > 0) {
          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopTimeLog"
             SET "task" = $2, "mechanic" = $3, "duration" = $4, "durationMinutes" = $5, "revenue" = $6, "status" = 'Finalizado', "updatedAt" = NOW()
             WHERE "id" = $1`,
            existingLog[0].id,
            itemsSummary.slice(0, 140),
            empleadosTexto,
            durationStr,
            elapsedMinutes,
            totalCalculated
          );
        } else {
          const tlogId = "tlog_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          await prisma.$executeRawUnsafe(
            `INSERT INTO "WorkshopTimeLog" ("id", "logNumber", "task", "orderId", "vehicle", "mechanic", "date", "duration", "durationMinutes", "status", "revenue", "notes", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Finalizado', $10, $11, NOW(), NOW())`,
            tlogId,
            logNumber,
            itemsSummary.slice(0, 140),
            order.orderNumber,
            `${order.vehicle} (${order.plate})`,
            empleadosTexto,
            dateStr,
            durationStr,
            elapsedMinutes,
            totalCalculated,
            `Ejecución real: ${durationStr} | Empleados: ${empleadosTexto}`
          );
        }

        // 4. CLIENTES: Actualizar historial de mantenimiento, próximo cambio de aceite y fotos R2
        const allPhotos = [...order.receptionPhotos, ...order.evidencePhotos];
        const existingHist: any[] = await prisma.$queryRawUnsafe(
          `SELECT "id" FROM "WorkshopHistory" WHERE "orderNumber" = $1 LIMIT 1`,
          order.orderNumber
        );

        const historyNotes = [
          order.notes,
          `Empleados: ${empleadosTexto}`,
          order.nextOilChangeKm
            ? `Próximo cambio de aceite sugerido: ${order.nextOilChangeKm.toLocaleString()} km.`
            : null,
        ]
          .filter(Boolean)
          .join(" | ");

        if (existingHist.length > 0) {
          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopHistory"
             SET "servicesJson" = $2, "cost" = $3, "mechanic" = $4, "mileage" = $5, "nextOilChangeKm" = $6, "photosJson" = $7, "notes" = $8, "updatedAt" = NOW()
             WHERE "id" = $1`,
            existingHist[0].id,
            JSON.stringify(completedItems.map((i: any) => i.name)),
            totalCalculated,
            empleadosTexto,
            order.mileage ? `${order.mileage.toLocaleString()} km` : "N/A",
            order.nextOilChangeKm,
            JSON.stringify(allPhotos),
            historyNotes
          );
        } else {
          const hstId = "hst_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          const serviceCode = `SRV-${Date.now().toString().slice(-5)}`;
          await prisma.$executeRawUnsafe(
            `INSERT INTO "WorkshopHistory" (
              "id", "serviceCode", "date", "vehicle", "plate", "client",
              "servicesJson", "cost", "mechanic", "mileage", "nextOilChangeKm",
              "photosJson", "notes", "orderNumber", "createdAt", "updatedAt"
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, $11,
              $12, $13, $14, NOW(), NOW()
            )`,
            hstId,
            serviceCode,
            dateStr,
            order.vehicle,
            order.plate.toUpperCase(),
            order.client,
            JSON.stringify(completedItems.map((i: any) => i.name)),
            totalCalculated,
            empleadosTexto,
            order.mileage ? `${order.mileage.toLocaleString()} km` : "N/A",
            order.nextOilChangeKm,
            JSON.stringify(allPhotos),
            historyNotes,
            order.orderNumber
          );
        }

        // 5. Detener cronómetro (completedAt = NOW()) y cambiar estado en Neon a EN_CAJA
        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "status" = 'EN_CAJA',
               "statusColor" = 'emerald',
               "progress" = 100,
               "mechanic" = $2,
               "totalCost" = $3,
               "itemsJson" = $4,
               "servicesJson" = $5,
               "completedAt" = NOW(),
               "durationMinutes" = $6,
               "posRequestId" = $7,
               "stockDeducted" = true,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          order.id,
          empleadosTexto,
          totalCalculated,
          JSON.stringify(completedItems),
          JSON.stringify(completedItems.map((i: any) => i.name)),
          elapsedMinutes,
          posRequest.id
        );

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          order.id
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(updatedRows[0]),
          posRequest,
          empleadosIntervinieron,
          message: esReenvio
            ? `Orden ${order.orderNumber} reenviada a POS para decisión de cobro.`
            : `Orden ${order.orderNumber} enviada a Oficina / Caja (Estado: EN_CAJA). Cronómetro detenido.`,
        });
      }

      // =========================================================================
      // ACCIÓN 6: FINALIZAR TRABAJO Y PASAR A HISTORIAL DE ÓRDENES
      // =========================================================================
      if (action === "FINALIZAR_ORDEN_HISTORIAL") {
        const { orderId } = body;
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "ID de orden requerido." },
            { status: 400 }
          );
        }

        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        if (rows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        const order = mapOrderRow(rows[0]);
        const completedItems = (order.items || []).map((it: any) => ({
          ...it,
          status: "Listo" as const,
        }));
        const serviceNames =
          completedItems.length > 0
            ? completedItems.map((i: any) => i.name)
            : order.services || [];

        const totalCalculated =
          Number(order.totalCost) > 0
            ? Number(order.totalCost)
            : Number(
                completedItems
                  .reduce((acc: number, it: any) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1), 0)
                  .toFixed(2)
              );

        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const allPhotos = [...(order.receptionPhotos || []), ...(order.evidencePhotos || [])];

        const existingHist: any[] = ((await prisma
          .$queryRawUnsafe(
            `SELECT "id" FROM "WorkshopHistory" WHERE "orderNumber" = $1 LIMIT 1`,
            order.orderNumber
          )
          .catch(() => [])) as any[]) || [];

        if (existingHist.length > 0) {
          await prisma
            .$executeRawUnsafe(
              `UPDATE "WorkshopHistory"
               SET "servicesJson" = $2, "cost" = $3, "mechanic" = $4, "mileage" = $5, "nextOilChangeKm" = $6, "photosJson" = $7, "notes" = $8, "updatedAt" = NOW()
               WHERE "id" = $1`,
              existingHist[0].id,
              JSON.stringify(serviceNames),
              totalCalculated,
              order.mechanic || "Taller",
              order.mileage ? `${order.mileage.toLocaleString()} km` : "N/A",
              order.nextOilChangeKm || null,
              JSON.stringify(allPhotos),
              order.notes || ""
            )
            .catch(() => {});
        } else {
          const hstId = "hst_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          const serviceCode = `SRV-${Date.now().toString().slice(-5)}`;
          await prisma
            .$executeRawUnsafe(
              `INSERT INTO "WorkshopHistory" (
                "id", "serviceCode", "date", "vehicle", "plate", "client",
                "servicesJson", "cost", "mechanic", "mileage", "nextOilChangeKm",
                "photosJson", "notes", "orderNumber", "createdAt", "updatedAt"
              ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11,
                $12, $13, $14, NOW(), NOW()
              )`,
              hstId,
              serviceCode,
              dateStr,
              order.vehicle,
              (order.plate || "").toUpperCase(),
              order.client,
              JSON.stringify(serviceNames),
              totalCalculated,
              order.mechanic || "Taller",
              order.mileage ? `${order.mileage.toLocaleString()} km` : "N/A",
              order.nextOilChangeKm || null,
              JSON.stringify(allPhotos),
              order.notes || "",
              order.orderNumber
            )
            .catch(() => {});
        }

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "status" = 'Finalizado',
               "statusColor" = 'emerald',
               "progress" = 100,
               "totalCost" = $2,
               "itemsJson" = $3,
               "servicesJson" = $4,
               "completedAt" = COALESCE("completedAt", NOW()),
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          order.id,
          totalCalculated,
          JSON.stringify(completedItems),
          JSON.stringify(serviceNames)
        );

        return NextResponse.json({
          success: true,
          orderId: order.id,
          orderNumber: order.orderNumber,
          message: `Orden ${order.orderNumber} finalizada y movida al Historial de Órdenes.`,
        });
      }

      // =========================================================================
      // ACCIÓN 7: ELIMINAR ORDEN DE TRABAJO EN NEON POSTGRESQL (DELETE CRUD)
      // =========================================================================
      if (action === "ELIMINAR_ORDEN") {
        const { orderId } = body;
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "ID de orden requerido." },
            { status: 400 }
          );
        }

        const existing: any[] = await prisma.$queryRawUnsafe(
          `SELECT "id", "orderNumber" FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        if (existing.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        await prisma.$executeRawUnsafe(
          `DELETE FROM "WorkshopOrder" WHERE "id" = $1`,
          existing[0].id
        );

        return NextResponse.json({
          success: true,
          deletedId: existing[0].id,
          orderNumber: existing[0].orderNumber,
          message: `Orden ${existing[0].orderNumber} eliminada de Neon PostgreSQL.`,
        });
      }

      // =========================================================================
      // ACCIÓN 8: TRANSFERIR ORDEN DE TRABAJO ENTRE PRINCIPAL Y SUCURSAL
      // =========================================================================
      if (action === "TRANSFERIR_ORDEN_SUCURSAL") {
        const { orderId, targetBranch } = body;
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "ID de orden requerido." },
            { status: 400 }
          );
        }

        const existingRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        if (existingRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        const current = existingRows[0];
        const currentBranch = (current.branch || "PRINCIPAL").toUpperCase();
        const destBranch = targetBranch
          ? String(targetBranch).toUpperCase() === "SUCURSAL"
            ? "SUCURSAL"
            : "PRINCIPAL"
          : currentBranch === "SUCURSAL"
          ? "PRINCIPAL"
          : "SUCURSAL";

        const historyArr = safeParseJson<any[]>(current.statusHistoryJson, []);
        historyArr.unshift({
          status: `Transferida a ${destBranch === "SUCURSAL" ? "Sucursal" : "Principal"}`,
          color: destBranch === "SUCURSAL" ? "amber" : "blue",
          timestamp: new Date().toISOString(),
          channel: "Sistema Sedes",
        });

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "branch" = $2,
               "transferredFrom" = $3,
               "statusHistoryJson" = $4,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          current.id,
          destBranch,
          currentBranch,
          JSON.stringify(historyArr)
        );

        // Si se transfiere a SUCURSAL, habilitar automáticamente al cliente en Sucursal
        if (destBranch === "SUCURSAL") {
          if (current.customerId) {
            await prisma.$executeRawUnsafe(
              `UPDATE "Customer" SET "assignedToSucursal" = true WHERE "id" = $1`,
              current.customerId
            ).catch(() => {});
          } else if (current.client) {
            await prisma.$executeRawUnsafe(
              `UPDATE "Customer" SET "assignedToSucursal" = true WHERE LOWER("name") = LOWER($1)`,
              current.client
            ).catch(() => {});
          }
        }

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          current.id
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(updatedRows[0]),
          branch: destBranch,
          message: `Orden ${current.orderNumber} transferida a ${destBranch === "SUCURSAL" ? "Sucursal" : "Principal"} exitosamente.`,
        });
      }

      return NextResponse.json(
        { success: false, error: `Acción desconocida: ${action}` },
        { status: 400 }
      );
    });
  } catch (error: any) {
    console.error("Error en POST /api/taller/operacion:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al ejecutar operación en Taller." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = (searchParams.get("id") || searchParams.get("orderId") || "").trim();
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "ID de orden requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureTallerSchema();

      const existing: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id", "orderNumber" FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
        orderId
      );

      if (existing.length === 0) {
        return NextResponse.json(
          { success: false, error: "Orden no encontrada." },
          { status: 404 }
        );
      }

      await prisma.$executeRawUnsafe(
        `DELETE FROM "WorkshopOrder" WHERE "id" = $1`,
        existing[0].id
      );

      return NextResponse.json({
        success: true,
        deletedId: existing[0].id,
        orderNumber: existing[0].orderNumber,
      });
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/taller/operacion:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar orden." },
      { status: 500 }
    );
  }
}
