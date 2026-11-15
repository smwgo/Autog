import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await withRetry(async () => {
      return await prisma.product.findMany({
        orderBy: { createdAt: "desc" },
      });
    });

    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener inventario global" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    const result = await withRetry(async () => {
      if (action === "transfer") {
        const { productId, fromBranch, quantity } = body;
        const qty = Math.max(1, Number(quantity || 1));
        if (!productId) throw new Error("ID de producto requerido para transferencia");

        return await prisma.$transaction(async (tx) => {
          const isFromPrincipal =
            String(fromBranch || "").trim().toUpperCase() === "PRINCIPAL";
          const sourceField = isFromPrincipal ? "stock" : "stockNorte";

          const prod = await tx.product.findUnique({ where: { id: productId } });
          if (!prod) throw new Error("Producto no encontrado");

          const currentSource = Number((prod as any)[sourceField] || 0);
          if (currentSource < qty) {
            throw new Error(
              `Stock insuficiente en ${isFromPrincipal ? "Principal" : "Sucursal"} (disponible: ${currentSource}, solicitado: ${qty})`
            );
          }

          const updatedRes = await tx.product.updateMany({
            where: {
              id: productId,
              [sourceField]: { gte: qty },
            } as any,
            data: isFromPrincipal
              ? { stock: { decrement: qty }, stockNorte: { increment: qty } }
              : { stockNorte: { decrement: qty }, stock: { increment: qty } },
          });

          if (!updatedRes || updatedRes.count === 0) {
            throw new Error("Stock insuficiente o actualizado concurrentemente en sede origen.");
          }

          return await tx.product.findUnique({ where: { id: productId } });
        });
      }

      const code = body.code || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
      const stock = Number(body.stock ?? 10);
      const stockNorte = Number(body.stockNorte ?? 0);
      const minStock = Number(body.minStock ?? 5);
      const status = (stock <= minStock || stockNorte <= minStock) ? "Stock Bajo" : "En Stock";

      return await prisma.product.create({
        data: {
          code,
          name: body.name || "Nuevo Producto",
          category: body.category || "General",
          price: Number(body.price || 0),
          costPrice: Number(body.costPrice || (Number(body.price || 0) * 0.7)),
          stock,
          stockNorte,
          minStock,
          status,
        },
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error en inventario" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const updated = await withRetry(async () => {
      return await prisma.product.update({
        where: { id },
        data: {
          code: body.code !== undefined ? body.code : undefined,
          name: body.name !== undefined ? body.name : undefined,
          category: body.category !== undefined ? body.category : undefined,
          price: body.price !== undefined ? Number(body.price) : undefined,
          stock: body.stock !== undefined ? Number(body.stock) : undefined,
          stockNorte: body.stockNorte !== undefined ? Number(body.stockNorte) : undefined,
          minStock: body.minStock !== undefined ? Number(body.minStock) : undefined,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar producto" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`DELETE FROM "InventoryMovement" WHERE "productId" = $1`, id).catch(() => {});
        await tx.$executeRawUnsafe(`DELETE FROM "PhysicalCountItem" WHERE "productId" = $1`, id).catch(() => {});
        await tx.$executeRawUnsafe(`DELETE FROM "StockTransferItem" WHERE "productId" = $1`, id).catch(() => {});
        await tx.$executeRawUnsafe(`DELETE FROM "BranchStock" WHERE "productId" = $1`, id).catch(() => {});
        await tx.$executeRawUnsafe(`DELETE FROM "ProductLot" WHERE "productId" = $1`, id).catch(() => {});
        await tx.product.delete({ where: { id } }).catch((e) => {
          if (!e.message?.includes("Record to delete does not exist")) throw e;
        });
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar producto" }, { status: 500 });
  }
}
