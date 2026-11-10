import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarRidePdf, RideItem } from "@/lib/sri/ride";
import { enviarFacturaPorCorreo } from "@/lib/sri/mailer";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const targetEmail = body.email;

    const invoiceRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "ClientInvoice" WHERE "id" = $1 OR "invoiceNumber" = $1 OR "claveAcceso" = $1 LIMIT 1`,
      id
    );

    if (!invoiceRows || invoiceRows.length === 0) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }

    const invoice = invoiceRows[0];
    const destinationEmail = targetEmail || invoice.clientEmail;

    if (!destinationEmail || !destinationEmail.includes("@")) {
      return NextResponse.json(
        { error: "El cliente no tiene un correo válido registrado. Por favor ingresa una dirección de correo." },
        { status: 400 }
      );
    }

    const config = await prisma.companyConfig.findFirst({
      where: { id: "default" },
    });

    let items: RideItem[] = [];
    try {
      const rawItems = JSON.parse(invoice.itemsJson || "[]");
      items = rawItems.map((it: any, idx: number) => ({
        codigoPrincipal: it.code || it.codigo || `ITEM-${idx + 1}`,
        descripcion: it.name || it.descripcion || "Servicio / Repuesto",
        cantidad: Number(it.quantity || it.cantidad || 1),
        precioUnitario: Number(it.price || it.precioUnitario || 0),
        descuento: Number(it.discount || it.descuento || 0),
        precioTotalSinImpuesto: Number(it.total || (it.price * it.quantity) || 0),
      }));
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
        email: destinationEmail,
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

    const xmlContent = invoice.xmlAutorizado || invoice.xmlFirmado || `<factura>${invoice.invoiceNumber}</factura>`;

    const mailRes = await enviarFacturaPorCorreo({
      to: destinationEmail,
      clienteNombre: invoice.clientName || "Estimado Cliente",
      numeroFactura: invoice.invoiceNumber,
      claveAcceso: invoice.claveAcceso || invoice.uuid,
      fechaEmision: invoice.date || new Date().toISOString().split("T")[0],
      total,
      pdfBuffer,
      xmlContent,
      empresaNombre: config?.nombreComercial || config?.razonSocial,
    });

    if (!mailRes.success) {
      return NextResponse.json({ error: mailRes.error }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "ClientInvoice" 
       SET "correoEnviado" = true, 
           "fechaEnvioCorreo" = CURRENT_TIMESTAMP,
           "clientEmail" = COALESCE($2, "clientEmail")
       WHERE "id" = $1`,
      invoice.id,
      destinationEmail
    );

    return NextResponse.json({
      success: true,
      message: `Factura enviada exitosamente a ${destinationEmail}`,
    });
  } catch (err: any) {
    console.error("Error al enviar factura por correo:", err);
    return NextResponse.json({ error: err.message || "Error al enviar correo" }, { status: 500 });
  }
}

