import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { firmarXmlXadesBes } from "@/lib/sri/firmaXades";
import { SriClient } from "@/lib/sri/sriClient";

export async function POST(
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
    const config = await prisma.companyConfig.findFirst({ where: { id: "default" } });

    if (!config) {
      return NextResponse.json({ error: "Configuración de empresa no encontrada" }, { status: 400 });
    }

    const ambiente = config.ambienteSri || "1";
    const sriClient = new SriClient(ambiente);
    const claveAcceso = invoice.claveAcceso || invoice.uuid;

    // 1. Primero intentar consultar si el SRI ya la autorizó
    const autResult = await sriClient.consultarAutorizacion(claveAcceso);

    if (autResult.estado === "AUTORIZADO") {
      await prisma.$executeRawUnsafe(
        `UPDATE "ClientInvoice"
         SET "status" = 'Autorizado',
             "estadoSri" = 'AUTORIZADO',
             "numeroAutorizacion" = $2,
             "fechaAutorizacion" = $3,
             "xmlAutorizado" = COALESCE($4, "xmlAutorizado"),
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1`,
        invoice.id,
        autResult.numeroAutorizacion || claveAcceso,
        autResult.fechaAutorizacion || new Date().toISOString(),
        autResult.xmlAutorizado || null
      );

      return NextResponse.json({
        success: true,
        estado: "AUTORIZADO",
        mensaje: "Comprobante autorizado oficialmente por el SRI.",
        numeroAutorizacion: autResult.numeroAutorizacion,
      });
    }

    // 2. Si no estaba autorizado, verificar si tenemos XML firmado para reenviar
    let xmlParaEnviar = invoice.xmlFirmado;

    if (!xmlParaEnviar) {
      if (!config.firmaArchivoBase64 || !config.firmaClave) {
        return NextResponse.json(
          { error: "No se puede firmar ni enviar: falta subir el certificado .p12 y contraseña en Gerencia > Configuración." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "La factura no posee XML para reenviar. Emite una nueva factura." },
        { status: 400 }
      );
    }

    // Reenviar a SRI Recepción y Autorización
    const resSri = await sriClient.procesarFacturaCompleta(xmlParaEnviar, claveAcceso);

    let nuevoEstado = "PENDIENTE";
    let statusUi = "Pendiente";
    if (resSri.estadoFinal === "AUTORIZADO") {
      nuevoEstado = "AUTORIZADO";
      statusUi = "Autorizado";
    } else if (resSri.estadoFinal === "DEVUELTA") {
      nuevoEstado = "DEVUELTA";
      statusUi = "Rechazado";
    } else if (resSri.estadoFinal === "NO AUTORIZADO") {
      nuevoEstado = "NO_AUTORIZADO";
      statusUi = "Rechazado";
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "ClientInvoice"
       SET "status" = $2,
           "estadoSri" = $3,
           "numeroAutorizacion" = COALESCE($4, "numeroAutorizacion"),
           "fechaAutorizacion" = COALESCE($5, "fechaAutorizacion"),
           "xmlAutorizado" = COALESCE($6, "xmlAutorizado"),
           "mensajesSri" = $7,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      invoice.id,
      statusUi,
      nuevoEstado,
      resSri.autorizacion?.numeroAutorizacion || null,
      resSri.autorizacion?.fechaAutorizacion || null,
      resSri.autorizacion?.xmlAutorizado || null,
      JSON.stringify(resSri.autorizacion?.mensajes || resSri.recepcion.mensajes || [])
    );

    return NextResponse.json({
      success: nuevoEstado === "AUTORIZADO",
      estado: nuevoEstado,
      mensajes: resSri.autorizacion?.mensajes || resSri.recepcion.mensajes,
    });
  } catch (err: any) {
    console.error("Error al reintentar comprobante SRI:", err);
    return NextResponse.json({ error: err.message || "Error al procesar con SRI" }, { status: 500 });
  }
}

