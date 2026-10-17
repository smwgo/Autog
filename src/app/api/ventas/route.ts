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
    const id = searchParams.get("id");
    if (id) {
      const sale = await prisma.sale.findUnique({
        where: { id },
        include: {
          items: true,
          customer: {
            include: {
              vehicles: true,
            },
          },
        },
      });
      if (!sale) {
        return NextResponse.json({ success: false, error: "Venta no encontrada." }, { status: 404 });
      }
      return NextResponse.json({ success: true, venta: sale });
    }

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

    // 1. Ejecutar verificación de precios, creación de venta, descuento de stock y actualización de caja en una sola transacción atómica
    const sale = await prisma.$transaction(async (tx) => {
      let subtotalCalc = 0;
      const saleItemsData = [];

      for (const item of items) {
        let price = parseFloat(item.price?.toString() || "0") || 0;
        const quantity = Math.max(1, parseInt((item.qty || item.quantity || 1).toString(), 10) || 1);
        let name = item.name || "Producto General";
        let code = item.code || "S/C";

        // Si tiene productId, verificar precio y existencia autorizada en Neon
        if (item.productId) {
          const dbProduct = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (dbProduct) {
            price = parseFloat(dbProduct.price.toString());
            name = dbProduct.name;
            code = dbProduct.code;

            // Descontar inventario dentro de la transacción
            const newStock = Math.max(0, dbProduct.stock - quantity);
            const newStatus = calcularEstado(newStock, dbProduct.minStock);
            await tx.product.update({
              where: { id: dbProduct.id },
              data: {
                stock: newStock,
                status: newStatus,
              },
            });
          }
        }

        const itemTotal = price * quantity;
        subtotalCalc += itemTotal;

        saleItemsData.push({
          productId: item.productId || null,
          code,
          name,
          price,
          quantity,
          total: itemTotal,
        });
      }

      const numDiscount = Math.max(0, parseFloat(discount.toString()) || 0);
      const taxCalc = Math.max(0, (subtotalCalc - numDiscount) * (parseFloat(taxPercent.toString()) || 0));
      const totalCalc = Math.max(0, subtotalCalc - numDiscount + taxCalc);
      const saleNumber = `VEN-${Date.now().toString().slice(-6)}`;

      const createdSale = await tx.sale.create({
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

      // Sincronizar automáticamente con la sesión de caja abierta en Neon
      const activeSession = await tx.cashRegister.findFirst({
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
          await tx.cashRegister.update({
            where: { id: activeSession.id },
            data: updateData,
          });
        }
      }

      return createdSale;
    });

    return NextResponse.json({ success: true, venta: sale }, { status: 201 });
  } catch (error: any) {
    console.error("Error al registrar venta en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar venta en Neon", stack: error.stack },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar venta (ej: editar cliente/método, items, o anular venta y restituir stock en Neon)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      saleNumber,
      status,
      customerName,
      customerId,
      customerPhone,
      customerEmail,
      customerAddress,
      paymentMethod,
      subtotal,
      tax,
      discount,
      total,
      items,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de venta es obligatorio." },
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

    // Si se reactiva una venta anulada a completada, descontar inventario
    if (status === "Completada" && saleActual.status === "Anulada") {
      const itemsToDeduct = Array.isArray(items) && items.length > 0 ? items : saleActual.items;
      for (const item of itemsToDeduct) {
        const prodId = item.productId;
        if (prodId) {
          try {
            const dbProduct = await prisma.product.findUnique({ where: { id: prodId } });
            if (dbProduct) {
              const qty = Math.max(1, parseInt((item.qty || item.quantity || 1).toString(), 10));
              const newStock = Math.max(0, dbProduct.stock - qty);
              await prisma.product.update({
                where: { id: prodId },
                data: {
                  stock: newStock,
                  status: calcularEstado(newStock, dbProduct.minStock),
                },
              });
            }
          } catch (e) {
            console.warn(`Error al descontar stock para producto ${prodId}:`, e);
          }
        }
      }
    }

    // Opcional: Actualizar datos de cliente si se proveyeron
    if (customerId) {
      try {
        const custData: any = {};
        if (customerPhone) custData.phone = customerPhone.trim();
        if (customerEmail) custData.email = customerEmail.trim();
        if (customerAddress) custData.address = customerAddress.trim();
        if (Object.keys(custData).length > 0) {
          await prisma.customer.update({
            where: { id: customerId },
            data: custData,
          });
        }
      } catch (cErr) {
        console.warn("No se pudo actualizar el cliente asociado:", cErr);
      }
    }

    const updateData: any = {};
    if (saleNumber) updateData.saleNumber = saleNumber.trim();
    if (status) updateData.status = status;
    if (customerName) updateData.customerName = customerName.trim();
    if (customerId !== undefined) updateData.customerId = customerId || null;
    if (paymentMethod) updateData.paymentMethod = paymentMethod.trim();
    if (subtotal !== undefined) updateData.subtotal = Number(subtotal);
    if (tax !== undefined) updateData.tax = Number(tax);
    if (discount !== undefined) updateData.discount = Number(discount);
    if (total !== undefined) updateData.total = Number(total);

    // Si vienen items, actualizar las líneas de detalle
    if (Array.isArray(items) && items.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.saleItem.deleteMany({
          where: { saleId: id },
        });

        await tx.saleItem.createMany({
          data: items.map((it: any) => {
            const p = parseFloat((it.price ?? it.unitPrice ?? 0).toString()) || 0;
            const q = Math.max(1, parseInt((it.quantity ?? it.qty ?? 1).toString(), 10) || 1);
            const tot = parseFloat((it.total ?? p * q).toString()) || p * q;
            return {
              saleId: id,
              productId: it.productId || null,
              code: it.code || "SRV",
              name: it.name || it.description || "Producto",
              price: p,
              quantity: q,
              total: tot,
            };
          }),
        });

        await tx.sale.update({
          where: { id },
          data: updateData,
        });
      });
    } else {
      await prisma.sale.update({
        where: { id },
        data: updateData,
      });
    }

    const saleUpdated = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        customer: {
          include: {
            vehicles: true,
          },
        },
      },
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
