import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Consultar cotizaciones registradas en Neon
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase() || "";
    const sedeParam = (searchParams.get("sede") || "").toUpperCase();
    const userBranchParam = (searchParams.get("userBranch") || "").toUpperCase();
    const isSucursal = userBranchParam === "SUCURSAL" || sedeParam === "SUCURSAL";
    const isAmbos = !isSucursal && (sedeParam === "AMBOS" || sedeParam === "AMBAS");

    const [cotizaciones, branchRows]: [any[], any[]] = await Promise.all([
      withRetry(() =>
        (prisma as any).orderRequest.findMany({
          where: { type: "COTIZACION" },
          orderBy: { createdAt: "desc" },
        })
      ) as Promise<any[]>,
      (prisma.$queryRawUnsafe(
        `SELECT "id", COALESCE("branch", 'PRINCIPAL') AS "branch" FROM "OrderRequest" WHERE "type" = 'COTIZACION'`
      ) as Promise<any[]>).catch(() => []),
    ]);
    const branchMap = new Map<string, string>();
    for (const r of branchRows) branchMap.set(r.id, (r.branch || "PRINCIPAL").toUpperCase());

    const filtradas = cotizaciones
      .map((c: any) => {
        const b = branchMap.get(c.id) || "PRINCIPAL";
        return { ...c, branch: b === "SUCURSAL" ? "Sucursal" : "Principal", _branchUpper: b };
      })
      .filter((c: any) => {
        if (isSucursal) return c._branchUpper === "SUCURSAL";
        if (isAmbos) return true;
        return c._branchUpper !== "SUCURSAL";
      })
      .filter((c: any) => {
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

    const cotizacion = await withRetry(() =>
      (prisma as any).orderRequest.create({
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
      })
    );

    const cotBranch = String(body.branch || body.sede || "").toUpperCase().includes("SUCURSAL")
      ? "SUCURSAL"
      : "PRINCIPAL";
    await prisma
      .$executeRawUnsafe(`UPDATE "OrderRequest" SET "branch" = $1 WHERE "id" = $2`, cotBranch, (cotizacion as any).id)
      .catch(() => {});

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

// PUT: Actualizar cotización existente en Neon (cliente, artículos, total o estado)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, customerName, customerPhone, customerEmail, items, total, status, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de cotización requerido para actualizar." },
        { status: 400 }
      );
    }

    const dataToUpdate: any = {};
    if (customerName !== undefined) dataToUpdate.customerName = customerName;
    if (customerPhone !== undefined) dataToUpdate.customerPhone = customerPhone || null;
    if (customerEmail !== undefined) dataToUpdate.customerEmail = customerEmail || null;
    if (status !== undefined) dataToUpdate.status = status;
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (total !== undefined) dataToUpdate.totalEstimated = Number(total) || 0;
    if (Array.isArray(items) && items.length > 0) {
      dataToUpdate.itemsJson = JSON.stringify(items);
      dataToUpdate.itemsSummary = items
        .map((i: any) => `${i.qty || 1}x ${i.name || i.product?.name}`)
        .join(", ");
    }

    const updated = await withRetry(() =>
      (prisma as any).orderRequest.update({
        where: { id },
        data: dataToUpdate,
      })
    );

    return NextResponse.json({
      success: true,
      cotizacion: updated,
      message: "Cotización actualizada en Neon DB.",
    });
  } catch (error: any) {
    console.error("Error al actualizar cotización:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar cotización" },
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

    await withRetry(() =>
      (prisma as any).orderRequest.delete({
        where: { id },
      })
    );

    return NextResponse.json({ success: true, message: "Cotización eliminada." });
  } catch (error: any) {
    console.error("Error al eliminar cotización:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar cotización" },
      { status: 500 }
    );
  }
}
