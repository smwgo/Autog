import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const xmlContent = invoice.xmlAutorizado || invoice.xmlFirmado;

    if (!xmlContent) {
      return NextResponse.json({ error: "La factura aún no posee un archivo XML generado o firmado" }, { status: 400 });
    }

    return new Response(xmlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="Factura_${invoice.invoiceNumber}.xml"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al descargar XML" }, { status: 500 });
  }
}

