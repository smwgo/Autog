import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Consultar solicitudes de Landing Page, Tienda o Taller en Neon
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase() || "";
    const estado = searchParams.get("estado") || "";
    const tipo = searchParams.get("tipo") || "";
    const countOnly = searchParams.get("countOnly") === "true";

    if (countOnly) {
      const pendientes = await (prisma as any).orderRequest.count({
        where: { status: "PENDIENTE" },
      });
      return NextResponse.json({
        success: true,
        stats: { pendientes },
      });
    }

    const where: any = {};
    if (estado) where.status = estado;
    if (tipo) where.type = tipo;
    if (busqueda) {
      where.OR = [
        { requestNumber: { contains: busqueda, mode: "insensitive" } },
        { customerName: { contains: busqueda, mode: "insensitive" } },
        { customerPhone: { contains: busqueda, mode: "insensitive" } },
        { itemsSummary: { contains: busqueda, mode: "insensitive" } },
      ];
    }

    const [solicitudes, total, pendientes, despachados] = await Promise.all([
      (prisma as any).orderRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      (prisma as any).orderRequest.count(),
      (prisma as any).orderRequest.count({ where: { status: "PENDIENTE" } }),
      (prisma as any).orderRequest.count({ where: { status: "DESPACHADO" } }),
    ]);

    return NextResponse.json({
      success: true,
      solicitudes,
      stats: { total, pendientes, despachados },
    });
  } catch (error: any) {
    console.error("Error al obtener solicitudes de Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar solicitudes en Neon" },
      { status: 500 }
    );
  }
}

// POST: Crear nueva solicitud desde Landing Page, Tienda o Taller
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type = "TIENDA",
      customerName,
      customerPhone,
      customerEmail,
      vehicleInfo,
      itemsSummary,
      itemsJson,
      totalEstimated = 0,
      notes,
    } = body;

    const finalCustomerName = (customerName || "").toString().trim() || "Cliente Web";
    const finalItemsSummary = (itemsSummary || "").toString().trim() || "Solicitud de servicios / repuestos";
    const requestNumber = `SOL-${Date.now().toString().slice(-6)}`;

    const nuevaSolicitud = await (prisma as any).orderRequest.create({
      data: {
        requestNumber,
        type: type.toUpperCase(),
        customerName: finalCustomerName,
        customerPhone: customerPhone ? customerPhone.toString().trim() : null,
        customerEmail: customerEmail ? customerEmail.toString().trim() : null,
        vehicleInfo: vehicleInfo ? vehicleInfo.toString().trim() : null,
        itemsSummary: finalItemsSummary,
        itemsJson: typeof itemsJson === "string" ? itemsJson : itemsJson ? JSON.stringify(itemsJson) : null,
        totalEstimated: parseFloat(totalEstimated?.toString() || "0") || 0,
        notes: notes ? notes.toString().trim() : null,
        status: "PENDIENTE",
      },
    });

    return NextResponse.json({ success: true, solicitud: nuevaSolicitud }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear solicitud en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar solicitud en Neon" },
      { status: 500 }
    );
  }
}

// PUT: Cambiar estado (ej: DESPACHAR, CANCELAR)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "ID y estado requeridos" }, { status: 400 });
    }

    const actualizada = await (prisma as any).orderRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, solicitud: actualizada });
  } catch (error: any) {
    console.error("Error al actualizar solicitud en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar estado en Neon" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar solicitud
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID de solicitud requerido" }, { status: 400 });
    }

    await (prisma as any).orderRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Solicitud eliminada." });
  } catch (error: any) {
    console.error("Error al eliminar solicitud de Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar solicitud en Neon" },
      { status: 500 }
    );
  }
}
