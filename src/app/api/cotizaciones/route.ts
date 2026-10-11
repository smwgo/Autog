import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Consultar cotizaciones registradas en Neon
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase() || "";

    const cotizaciones = await (prisma as any).orderRequest.findMany({
      where: { type: "COTIZACION" },
      orderBy: { createdAt: "desc" },
    });

    const filtradas = cotizaciones.filter((c: any) => {
      if (!busqueda) return true;
      return (
        c.requestNumber.toLowerCase().includes(busqueda) ||
        c.customerName.toLowerCase().includes(busqueda) ||
        (c.customerPhone && c.customerPhone.toLowerCase().includes(busqueda)) ||
        c.itemsSummary.toLowerCase().includes(busqueda)
      );
    });

    return NextResponse.json({
      success: true,
      cotizaciones: filtradas,
    });
  } catch (error: any) {
    console.error("Error al obtener cotizaciones:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar cotizaciones" },
      { status: 500 }
    );
  }
}

// POST: Crear nueva cotización en Neon
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName = "Cliente Mostrador",
      customerPhone,
      customerEmail,
      items = [],
      total = 0,
      notes = "",
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "La cotización debe contener al menos un producto." },
        { status: 400 }
      );
    }

    const folio = `COT-${Date.now().toString().slice(-6)}`;
    const itemsSummary = items
      .map((i: any) => `${i.qty || 1}x ${i.name || i.product?.name}`)
      .join(", ");

    const cotizacion = await (prisma as any).orderRequest.create({
      data: {
        requestNumber: folio,
        type: "COTIZACION",
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        itemsSummary,
        itemsJson: JSON.stringify(items),
        totalEstimated: total,
        notes: notes || `Cotización mostrador. Total: $${Number(total).toFixed(2)}`,
        status: "PENDIENTE",
      },
    });

    return NextResponse.json({
      success: true,
      cotizacion,
      folio,
      message: `Cotización ${folio} guardada con éxito.`,
    });
  } catch (error: any) {
    console.error("Error al guardar cotización:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar cotización" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar cotización de Neon
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de cotización requerido." },
        { status: 400 }
      );
    }

    await (prisma as any).orderRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Cotización eliminada." });
  } catch (error: any) {
    console.error("Error al eliminar cotización:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar cotización" },
      { status: 500 }
    );
  }
}
