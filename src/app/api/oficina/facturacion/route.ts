import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { emitirFacturaElectronica } from "@/lib/sri/facturaService";
import { createAuditLog } from "@/lib/audit";

async function ensureFacturacionTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClientInvoice" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "invoiceNumber" TEXT NOT NULL UNIQUE,
      "uuid" TEXT NOT NULL UNIQUE,
      "claveAcceso" TEXT,
      "date" TEXT NOT NULL,
      "concept" TEXT NOT NULL,
      "vehicle" TEXT,
      "clientName" TEXT NOT NULL DEFAULT 'Consumidor Final',
      "clientRfc" TEXT NOT NULL DEFAULT '9999999999999',
      "tipoIdentificacion" TEXT DEFAULT '07',
      "clientEmail" TEXT,
      "clientPhone" TEXT,
      "clientAddress" TEXT,
      "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "iva" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "propina" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'Pendiente',
      "estadoSri" TEXT NOT NULL DEFAULT 'PENDIENTE',
      "numeroAutorizacion" TEXT,
      "fechaAutorizacion" TEXT,
      "mensajesSri" TEXT,
      "xmlFirmado" TEXT,
      "xmlAutorizado" TEXT,
      "correoEnviado" BOOLEAN NOT NULL DEFAULT false,
      "fechaEnvioCorreo" TIMESTAMP(3),
      "paymentMethod" TEXT NOT NULL DEFAULT 'Efectivo',
      "itemsJson" TEXT NOT NULL DEFAULT '[]',
      "orderId" TEXT,
      "saleId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CreditNote" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "noteNumber" TEXT NOT NULL UNIQUE,
      "date" TEXT NOT NULL,
      "clientName" TEXT NOT NULL,
      "clientRuc" TEXT NOT NULL DEFAULT '9999999999999',
      "invoiceRef" TEXT NOT NULL,
      "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'Autorizado',
      "accessKey" TEXT NOT NULL DEFAULT '',
      "reason" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();

    const data = await withRetry(async () => {
      await ensureFacturacionTables();

      let facturas: any[] = await prisma.$queryRawUnsafe(`
        SELECT * FROM "ClientInvoice" 
        ORDER BY "createdAt" DESC 
        LIMIT 200
      `);

      let notas: any[] = await prisma.$queryRawUnsafe(`
        SELECT * FROM "CreditNote" 
        ORDER BY "createdAt" DESC 
        LIMIT 200
      `);

      if (search) {
        facturas = facturas.filter((f) =>
          (f.clientName && f.clientName.toLowerCase().includes(search)) ||
          (f.clientRfc && f.clientRfc.includes(search)) ||
          (f.invoiceNumber && f.invoiceNumber.toLowerCase().includes(search)) ||
          (f.claveAcceso && f.claveAcceso.includes(search))
        );
        notas = notas.filter((n) =>
          (n.clientName && n.clientName.toLowerCase().includes(search)) ||
          (n.clientRuc && n.clientRuc.includes(search)) ||
          (n.noteNumber && n.noteNumber.toLowerCase().includes(search))
        );
      }

      // Calcular métricas reales
      const totalAutorizado = facturas
        .filter((f) => f.estadoSri === "AUTORIZADO" || f.status === "Autorizado")
        .reduce((sum, f) => sum + Number(f.amount || 0), 0);

      const countPendientes = facturas.filter(
        (f) =>
          f.estadoSri === "PENDIENTE_ENVIO" ||
          f.estadoSri === "PENDIENTE" ||
          f.estadoSri === "RECIBIDA" ||
          f.estadoSri === "EN_PROCESO" ||
          f.estadoSri === "PENDIENTE_FIRMA"
      ).length;

      const countRechazados = facturas.filter(
        (f) => f.estadoSri === "DEVUELTA" || f.estadoSri === "NO_AUTORIZADO" || f.status === "Rechazado"
      ).length;

      const countNoEnviar = facturas.filter((f) => f.estadoSri === "NO_ENVIAR").length;
      const countNotasCredito = notas.length;

      return {
        facturas,
        notas,
        metrics: {
          totalAutorizado,
          countPendientes,
          countRechazados,
          countNoEnviar,
          countNotasCredito,
        },
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error en GET /api/oficina/facturacion:", error);
    return NextResponse.json({ error: error.message || "Error al obtener facturación" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { docType } = body; // "factura" | "nota"

    if (docType === "nota") {
      const created = await withRetry(async () => {
        await ensureFacturacionTables();
        const id = `nc_${Date.now()}`;
        const noteNumber = body.noteNumber || `001-001-000000001`;
        const accessKey = body.accessKey || "";

        await prisma.$executeRawUnsafe(
          `INSERT INTO "CreditNote" ("id", "noteNumber", "date", "clientName", "clientRuc", "invoiceRef", "total", "status", "accessKey", "reason", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
          id,
          noteNumber,
          body.date || new Date().toISOString().split("T")[0],
          body.clientName || "Cliente",
          body.clientRuc || "9999999999999",
          body.invoiceRef || "Factura",
          Number(body.total || 0),
          body.status || "Autorizado",
          accessKey,
          body.reason || "Devolución / Descuento"
        );
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "CreditNote" WHERE "id" = $1`, id);
        return rows[0];
      });

      void createAuditLog({
        module: "FACTURACION",
        action: `Nota de crédito ${created?.noteNumber || created?.id || ""}`,
        entityName: "CreditNote",
        entityId: created?.id,
        details: `Cliente: ${body.clientName || "Cliente"} | Total: $${Number(body.total || 0).toFixed(2)}`,
        level: "INFO",
      });

      return NextResponse.json(created);
    } else {
      // Emitir Factura Electrónica Real con SRI
      const items = Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : [
            {
              descripcion: body.concept || "Servicio / Venta de mostrador",
              cantidad: 1,
              precioUnitario: Number(body.amount || 0),
              descuento: 0,
              tarifaIva: 15,
            },
          ];

      const resultado = await emitirFacturaElectronica({
        clienteNombre: body.clientName || "Consumidor Final",
        clienteIdentificacion: body.clientRfc || "9999999999999",
        clienteEmail: body.clientEmail || undefined,
        clienteTelefono: body.clientPhone || undefined,
        clienteDireccion: body.clientAddress || undefined,
        items,
        metodoPago: body.paymentMethod || "Efectivo",
        observaciones: body.concept || "Emisión Manual Oficina",
        vehiculoInfo: body.vehicle || undefined,
        options: {
          enviarCorreo: Boolean(body.enviarCorreo),
        },
      });

      // Retornar la fila creada
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "ClientInvoice" WHERE "id" = $1`,
        resultado.invoiceId
      );

      void createAuditLog({
        module: "FACTURACION",
        action: `Factura electrónica emitida`,
        entityName: "ClientInvoice",
        entityId: resultado.invoiceId,
        details: `Cliente: ${body.clientName || "Consumidor Final"} | Identificación: ${body.clientRfc || "9999999999999"}`,
        level: "INFO",
      });

      return NextResponse.json(rows[0] || resultado);
    }
  } catch (error: any) {
    console.error("Error al emitir documento en facturación:", error);
    return NextResponse.json({ error: error.message || "Error al emitir documento" }, { status: 500 });
  }
}
