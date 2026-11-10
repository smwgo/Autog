import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { generarRidePdf, RideItem } from "@/lib/sri/ride";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoiceRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "ClientInvoice" WHERE "id" = $1 OR "invoiceNumber" = $1 OR "claveAcceso" = $1 LIMIT 1`,
      id
    );

    if (!invoiceRows || invoiceRows.length === 0) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }

    const invoice = invoiceRows[0];

    const config = await prisma.companyConfig.findFirst({
      where: { id: "default" },
    });

    // Parsear itemsJson
    let items: RideItem[] = [];
    try {
      const rawItems = JSON.parse(invoice.itemsJson || "[]");
      items = rawItems.map((it: any, idx: number) => {
        const cant = Number(it.quantity || it.cantidad || 1);
        const pUnit = Number(it.price || it.precioUnitario || it.total || 0);
        const desc = Number(it.discount || it.descuento || 0);
        const total = Number((cant * pUnit - desc).toFixed(2));
        return {
          codigoPrincipal: it.code || it.codigo || `ITEM-${idx + 1}`,
          descripcion: it.name || it.descripcion || "Servicio / Repuesto",
          cantidad: cant,
          precioUnitario: pUnit,
          descuento: desc,
          precioTotalSinImpuesto: total,
        };
      });
    } catch {
      items = [
        {
          codigoPrincipal: "SERV-001",
          descripcion: invoice.concept || "Servicio Automotriz",
          cantidad: 1,
          precioUnitario: Number(invoice.amount || 0),
          descuento: 0,
          precioTotalSinImpuesto: Number(invoice.amount || 0),
        },
      ];
    }

    if (items.length === 0) {
      items = [
        {
          codigoPrincipal: "SERV-001",
          descripcion: invoice.concept || "Servicio Automotriz",
          cantidad: 1,
          precioUnitario: Number(invoice.amount || 0),
          descuento: 0,
          precioTotalSinImpuesto: Number(invoice.amount || 0),
        },
      ];
    }

    const subtotal = Number(invoice.subtotal || invoice.amount || 0);
    const iva = Number(invoice.iva || 0);
    const total = Number(invoice.amount || 0);

    const pdfBuffer = await generarRidePdf({
      emisor: {
        razonSocial: config?.razonSocial || "TALLER AUTOMOTRIZ",
        nombreComercial: config?.nombreComercial || undefined,
        ruc: config?.ruc || "1790000000001",
        dirMatriz: config?.direccion || "Matriz",
        dirEstablecimiento: config?.direccion || "Sucursal",
        obligadoContabilidad: Boolean(config?.obligadoContabilidad),
        regimenTributario: config?.regimenTributario || "General",
        logoUrl: config?.logoUrl || undefined,
      },
      factura: {
        numero: invoice.invoiceNumber,
        claveAcceso: invoice.claveAcceso || invoice.uuid,
        numeroAutorizacion: invoice.numeroAutorizacion || invoice.claveAcceso || undefined,
        fechaAutorizacion: invoice.fechaAutorizacion || undefined,
        ambiente: config?.ambienteSri || "1",
        tipoEmision: "1",
        fechaEmision: invoice.date || new Date().toISOString().split("T")[0],
      },
      comprador: {
        razonSocial: invoice.clientName || "Consumidor Final",
        identificacion: invoice.clientRfc || "9999999999999",
        direccion: invoice.clientAddress || undefined,
        telefono: invoice.clientPhone || undefined,
        email: invoice.clientEmail || undefined,
      },
      items,
      totales: {
        subtotal15: subtotal,
        subtotal0: 0,
        subtotalSinImpuestos: subtotal,
        totalDescuento: 0,
        iva15: iva,
        propina: 0,
        importeTotal: total,
      },
      pagos: [
        {
          formaPago: invoice.paymentMethod || "Sin utilización del sistema financiero (Efectivo)",
          total,
        },
      ],
      infoAdicional: [
        ...(invoice.vehicle ? [{ nombre: "Vehículo", valor: invoice.vehicle }] : []),
      ],
    });

    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="RIDE_${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("Error al generar PDF RIDE:", err);
    return NextResponse.json({ error: err.message || "Error al generar RIDE" }, { status: 500 });
  }
}

