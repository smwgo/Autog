import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Buscar factura o listar devoluciones reales registradas en Neon
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceNumber = searchParams.get("invoiceNumber")?.trim();

    // Si viene invoiceNumber, buscar la venta específica en Neon
    if (invoiceNumber) {
      const sale = await prisma.sale.findFirst({
        where: {
          saleNumber: {
            contains: invoiceNumber,
            mode: "insensitive",
          },
        },
        include: {
          items: true,
          customer: true,
        },
      });

      if (!sale) {
        return NextResponse.json(
          { success: false, error: `Factura o venta "${invoiceNumber}" no encontrada.` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        sale,
      });
    }

    // Si no viene parámetro, consultar el historial de devoluciones guardadas en Neon
    const devoluciones = await (prisma as any).orderRequest.findMany({
      where: { type: "DEVOLUCION" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      devoluciones,
    });
  } catch (error: any) {
    console.error("Error al consultar devoluciones en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar consulta" },
      { status: 500 }
    );
  }
}

// POST: Registrar devolución real, reincorporar stock en Neon y emitir Nota de Crédito / Reembolso
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      saleId,
      saleNumber,
      customerName = "Consumidor Final",
      items = [], // array con { id, productId, code, name, price, quantity }
      reason,
      refundMethod = "Nota de Crédito",
      refundTotal = 0,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selecciona al menos un artículo para devolver." },
        { status: 400 }
      );
    }

    // 1. Reincorporar stock de los productos devueltos en Neon
    for (const item of items) {
      if (item.productId) {
        try {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity || 1,
              },
            },
          });
        } catch (e) {
          console.warn(`No se pudo reintegrar stock para producto ${item.productId}:`, e);
        }
      }
    }

    // 2. Registrar la Devolución / Nota de Crédito en Neon
    const noteNumber = `NC-${Date.now().toString().slice(-6)}`;
    const itemsSummary = items
      .map((it: any) => `${it.quantity || 1}x ${it.name}`)
      .join(", ");

    const devolucion = await (prisma as any).orderRequest.create({
      data: {
        requestNumber: noteNumber,
        type: "DEVOLUCION",
        customerName: `${customerName} (Ref: ${saleNumber})`,
        itemsSummary: `Devolución: ${itemsSummary}`,
        itemsJson: JSON.stringify({
          saleId,
          saleNumber,
          refundMethod,
          reason,
          items,
          refundTotal,
        }),
        totalEstimated: refundTotal,
        notes: `Motivo: ${reason || "No especificado"} | Método: ${refundMethod}`,
        status: "COMPLETADA",
      },
    });

    return NextResponse.json({
      success: true,
      devolucion,
      noteNumber,
      message: `Devolución procesada con éxito. Nota de Crédito: ${noteNumber}`,
    });
  } catch (error: any) {
    console.error("Error al registrar devolución en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar devolución" },
      { status: 500 }
    );
  }
}
