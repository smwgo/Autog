import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function calcularEstado(stock: number, minStock: number = 5): string {
  if (stock <= 0) return "Agotado";
  if (stock <= minStock) return "Bajo Stock";
  return "En Stock";
}

// GET: Consultar ventas registradas en Neon
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase() || "";

    const where: any = {};
    if (busqueda) {
      where.OR = [
        { saleNumber: { contains: busqueda, mode: "insensitive" } },
        { customerName: { contains: busqueda, mode: "insensitive" } },
        { paymentMethod: { contains: busqueda, mode: "insensitive" } },
      ];
    }

    const [sales, totalVentas] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: true,
          customer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      }),
      prisma.sale.count(),
    ]);

    return NextResponse.json({
      success: true,
      ventas: sales,
      totalVentas,
    });
  } catch (error: any) {
    console.error("Error al obtener ventas de Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar ventas en Neon" },
      { status: 500 }
    );
  }
}

// POST: Registrar nueva venta en Neon y descontar inventario
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId = null,
      customerName = "Consumidor Final",
      items = [],
      paymentMethod = "Efectivo",
      discount = 0,
      taxPercent = 0.16,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "El carrito no contiene productos para cobrar." },
        { status: 400 }
      );
    }

    // Calcular montos
    let subtotalCalc = 0;
    const saleItemsData = items.map((item: any) => {
      const price = parseFloat(item.price?.toString() || item.product?.price?.toString() || "0") || 0;
      const quantity = parseInt((item.qty || item.quantity || 1).toString(), 10) || 1;
      const itemTotal = price * quantity;
      subtotalCalc += itemTotal;

      return {
        productId: item.productId || item.product?.id || null,
        code: item.code || item.product?.code || "S/C",
        name: item.name || item.product?.name || "Producto General",
        price,
        quantity,
        total: itemTotal,
      };
    });

    const numDiscount = parseFloat(discount.toString()) || 0;
    const taxCalc = (subtotalCalc - numDiscount) * (parseFloat(taxPercent.toString()) || 0);
    const totalCalc = subtotalCalc - numDiscount + taxCalc;

    const saleNumber = `VEN-${Date.now().toString().slice(-6)}`;

    // 1. Crear la venta con sus items en Neon
    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        customerId: customerId || null,
        customerName: customerName || "Consumidor Final",
        subtotal: subtotalCalc,
        tax: taxCalc,
        discount: numDiscount,
        total: totalCalc,
        paymentMethod,
        status: "Completada",
        items: {
          create: saleItemsData.map((item) => ({
            productId: item.productId,
            code: item.code,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.total,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // 2. Descontar stock de los productos vendidos en Neon
    for (const item of saleItemsData) {
      if (item.productId) {
        try {
          const currentProduct = await prisma.product.findUnique({
            where: { id: item.productId },
          });

          if (currentProduct) {
            const newStock = Math.max(0, currentProduct.stock - item.quantity);
            const newStatus = calcularEstado(newStock, currentProduct.minStock);

            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: newStock,
                status: newStatus,
              },
            });
          }
        } catch (pErr) {
          console.warn(`No se pudo actualizar stock del producto ${item.productId}:`, pErr);
        }
      }
    }

    // 3. Sincronizar automáticamente con la sesión de caja abierta en Neon
    try {
      const activeSession = await prisma.cashRegister.findFirst({
        where: { status: "ABIERTA" },
        orderBy: { openedAt: "desc" },
      });

      if (activeSession) {
        const updateData: any = {};
        if (paymentMethod === "Efectivo") {
          updateData.totalSalesCash = { increment: totalCalc };
          updateData.expectedCash = { increment: totalCalc };
        } else if (paymentMethod === "Tarjeta") {
          updateData.totalSalesCard = { increment: totalCalc };
        } else if (paymentMethod === "Transferencia") {
          updateData.totalSalesTransfer = { increment: totalCalc };
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.cashRegister.update({
            where: { id: activeSession.id },
            data: updateData,
          });
        }
      }
    } catch (cajaErr) {
      console.warn("No se pudo actualizar caja activa al cobrar:", cajaErr);
    }

    return NextResponse.json({ success: true, venta: sale }, { status: 201 });
  } catch (error: any) {
    console.error("Error al registrar venta en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar venta en Neon", stack: error.stack },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar venta (ej: anular venta y restituir stock en Neon)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "ID y nuevo estado son obligatorios." },
        { status: 400 }
      );
    }

    const saleActual = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!saleActual) {
      return NextResponse.json(
        { success: false, error: "Venta no encontrada." },
        { status: 404 }
      );
    }

    // Si se anula la venta y antes estaba completada, devolver el stock a inventario
    if (status === "Anulada" && saleActual.status !== "Anulada") {
      for (const item of saleActual.items) {
        if (item.productId) {
          try {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: item.quantity },
              },
            });
          } catch (e) {
            console.warn(`Error al reponer stock del producto ${item.productId}:`, e);
          }
        }
      }

      // Si la venta anulada fue en efectivo, ajustar saldo esperado en la caja abierta
      if (saleActual.paymentMethod === "Efectivo") {
        try {
          const activeSession = await prisma.cashRegister.findFirst({
            where: { status: "ABIERTA" },
            orderBy: { openedAt: "desc" },
          });
          if (activeSession) {
            await prisma.cashRegister.update({
              where: { id: activeSession.id },
              data: {
                totalSalesCash: { decrement: Number(saleActual.total) },
                expectedCash: { decrement: Number(saleActual.total) },
              },
            });
          }
        } catch (cErr) {
          console.warn("Error al ajustar caja por venta anulada:", cErr);
        }
      }
    }

    const saleUpdated = await prisma.sale.update({
      where: { id },
      data: { status },
      include: { items: true, customer: true },
    });

    return NextResponse.json({ success: true, venta: saleUpdated });
  } catch (error: any) {
    console.error("Error al actualizar venta en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar venta" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar venta de la base de datos
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de venta requerido." },
        { status: 400 }
      );
    }

    // Eliminar primero sus items asociados
    await prisma.saleItem.deleteMany({
      where: { saleId: id },
    });

    await prisma.sale.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Venta eliminada." });
  } catch (error: any) {
    console.error("Error al eliminar venta en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar venta" },
      { status: 500 }
    );
  }
}
