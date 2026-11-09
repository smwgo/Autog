import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

let saleInvoiceDetailsSchemaEnsured = false;

async function ensureSaleInvoiceDetailsSchema() {
  if (saleInvoiceDetailsSchemaEnsured) return;
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Sale"
      ADD COLUMN IF NOT EXISTS "customerIdentification" TEXT,
      ADD COLUMN IF NOT EXISTS "customerPhone" TEXT,
      ADD COLUMN IF NOT EXISTS "customerEmail" TEXT,
      ADD COLUMN IF NOT EXISTS "customerAddress" TEXT,
      ADD COLUMN IF NOT EXISTS "sourceOrderNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "vehiclePlate" TEXT,
      ADD COLUMN IF NOT EXISTS "vehicleModel" TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "OrderRequest"
      ADD COLUMN IF NOT EXISTS "customerId" TEXT,
      ADD COLUMN IF NOT EXISTS "customerIdentification" TEXT,
      ADD COLUMN IF NOT EXISTS "customerAddress" TEXT,
      ADD COLUMN IF NOT EXISTS "vehiclePlate" TEXT,
      ADD COLUMN IF NOT EXISTS "vehicleModel" TEXT
  `);
  saleInvoiceDetailsSchemaEnsured = true;
}

function calcularEstado(stock: number, minStock: number = 5): string {
  if (stock <= 0) return "Agotado";
  if (stock <= minStock) return "Bajo Stock";
  return "En Stock";
}

// GET: Consultar ventas registradas en Neon
export async function GET(request: Request) {
  try {
    await ensureSaleInvoiceDetailsSchema();
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
      const workshopHistory = await prisma.workshopHistory.findFirst({
        where: { orderNumber: sale.saleNumber },
        select: { vehicle: true, plate: true },
      });
      const sourceOrderNumber = sale.sourceOrderNumber?.trim().replace(/^OT-/i, "") || "";
      let sourceRequest = sourceOrderNumber
        ? await (prisma as any).orderRequest.findFirst({
            where: { requestNumber: { in: [sourceOrderNumber, `OT-${sourceOrderNumber}`] } },
          })
        : null;
      if (!sourceRequest && !sale.customerId && sale.customerName) {
        const from = new Date(sale.createdAt);
        from.setDate(from.getDate() - 7);
        const matchingRequests = await (prisma as any).orderRequest.findMany({
          where: {
            type: "TALLER",
            customerName: sale.customerName,
            createdAt: { gte: from, lte: sale.createdAt },
            ...(sale.customerPhone ? { customerPhone: sale.customerPhone } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 2,
        });
        if (matchingRequests.length === 1) sourceRequest = matchingRequests[0];
      }
      const sourceOrderKey = sourceRequest?.requestNumber || sourceOrderNumber;
      const normalizedSourceOrderKey = sourceOrderKey.trim().replace(/^OT-/i, "");
      const sourceOrder = normalizedSourceOrderKey
        ? await prisma.workshopOrder.findFirst({
            where: { orderNumber: { in: [normalizedSourceOrderKey, `OT-${normalizedSourceOrderKey}`] } },
            select: {
              orderNumber: true,
              clientIdDoc: true,
              clientPhone: true,
              clientEmail: true,
              client: true,
              vehicle: true,
              plate: true,
              vehicleRef: { select: { year: true, color: true, mileage: true, vehicleType: true } },
              customer: { select: { identification: true, name: true, phone: true, email: true, address: true } },
            },
          })
        : null;
      return NextResponse.json({
        success: true,
        venta: {
          ...sale,
          sourceOrderNumber: sourceOrderKey || sale.sourceOrderNumber,
          customerName: sale.customerName || sourceOrder?.client || sourceRequest?.customerName,
          customerIdentification:
            (sale.customerIdentification === "9999999999999" && (sourceOrder || sourceRequest)
              ? null
              : sale.customerIdentification) ||
            sourceOrder?.clientIdDoc || sourceRequest?.customerIdentification || sourceOrder?.customer?.identification,
          customerPhone:
            sale.customerPhone || sourceOrder?.clientPhone || sourceRequest?.customerPhone || sourceOrder?.customer?.phone,
          customerEmail:
            sale.customerEmail || sourceOrder?.clientEmail || sourceRequest?.customerEmail || sourceOrder?.customer?.email,
          customerAddress: sale.customerAddress || sourceRequest?.customerAddress || sourceOrder?.customer?.address,
          serviceVehicle: sourceOrder
            ? {
                model: sale.vehicleModel || sourceOrder.vehicle || sourceRequest?.vehicleModel,
                plate: sale.vehiclePlate || sourceOrder.plate || sourceRequest?.vehiclePlate,
                year: sourceOrder.vehicleRef?.year,
                color: sourceOrder.vehicleRef?.color,
                mileage: sourceOrder.vehicleRef?.mileage,
                type: sourceOrder.vehicleRef?.vehicleType,
              }
            : sourceRequest
              ? { model: sale.vehicleModel || sourceRequest.vehicleModel || "", plate: sale.vehiclePlate || sourceRequest.vehiclePlate || "" }
              : workshopHistory
            ? {
                model: sale.vehicleModel || workshopHistory.vehicle,
                plate: sale.vehiclePlate || workshopHistory.plate,
              }
            : sale.vehicleModel || sale.vehiclePlate
              ? { model: sale.vehicleModel || "", plate: sale.vehiclePlate || "" }
              : null,
        },
      });
    }

    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase() || "";
    const sedeParam = (searchParams.get("sede") || "").toUpperCase();
    const userBranchParam = (searchParams.get("userBranch") || "").toUpperCase();

    const where: any = {};
    if (busqueda) {
      where.OR = [
        { saleNumber: { contains: busqueda, mode: "insensitive" } },
        { customerName: { contains: busqueda, mode: "insensitive" } },
        { paymentMethod: { contains: busqueda, mode: "insensitive" } },
      ];
    }

    const [sales, branchRows] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: true,
          customer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 200,
      }),
      prisma.$queryRawUnsafe(
        `SELECT "id", COALESCE("branch", 'PRINCIPAL') AS "branch" FROM "Sale"`
      ).catch(() => []) as Promise<any[]>,
    ]);

    const branchMap = new Map<string, string>();
    for (const r of branchRows) {
      branchMap.set(r.id, (r.branch || "PRINCIPAL").toUpperCase());
    }

    const filteredSales = sales
      .map((s: any) => {
        const sBranch = branchMap.get(s.id) || "PRINCIPAL";
        return {
          ...s,
          branch: sBranch === "SUCURSAL" ? "Sucursal" : "Principal",
          _branchUpper: sBranch,
        };
      })
      .filter((s: any) => {
        // En Sucursal: ÚNICAMENTE ver ventas de Sucursal
        if (userBranchParam === "SUCURSAL" || sedeParam === "SUCURSAL") {
          return s._branchUpper === "SUCURSAL";
        }
        // En Principal si selecciona "Ambas": ver todo junto
        if (sedeParam === "AMBOS" || sedeParam === "AMBAS") {
          return true;
        }
        // En Principal por defecto: solo ventas de Principal
        return s._branchUpper !== "SUCURSAL";
      });

    return NextResponse.json({
      success: true,
      ventas: filteredSales,
      totalVentas: filteredSales.length,
    });
  } catch (error: any) {
    console.error("Error al obtener ventas de base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar ventas en base de datos" },
      { status: 500 }
    );
  }
}

// POST: Registrar nueva venta en Neon y descontar inventario
export async function POST(request: Request) {
  try {
    await ensureSaleInvoiceDetailsSchema();
    const body = await request.json();
    const {
      customerId = null,
      customerIdentification = null,
      customerName = "Consumidor Final",
      customerPhone = null,
      customerEmail = null,
      customerAddress = null,
      serviceOrderNumber = null,
      items = [],
      paymentMethod = "Efectivo",
      discount = 0,
      taxPercent = 0.16,
      vehiclePlate = null,
      vehicleModel = null,
      branch = null,
      sede = null,
    } = body;

    const targetBranch = (branch || sede || "").toString().toUpperCase().includes("SUCURSAL")
      ? "SUCURSAL"
      : "PRINCIPAL";

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "El carrito no contiene productos para cobrar." },
        { status: 400 }
      );
    }

    // 1. Ejecutar verificación de precios, creación de venta, descuento de stock y actualización de caja en una sola transacción atómica
    const sale = await prisma.$transaction(async (tx) => {
      const sourceOrderNumber =
        typeof serviceOrderNumber === "string"
          ? serviceOrderNumber.trim().replace(/^OT-/i, "")
          : "";
      const sourceRequest = sourceOrderNumber
        ? await (tx as any).orderRequest.findFirst({
            where: { requestNumber: { in: [sourceOrderNumber, `OT-${sourceOrderNumber}`] } },
          })
        : null;
      const serviceOrder = sourceOrderNumber
        ? await tx.workshopOrder.findFirst({
            where: {
              orderNumber: {
                in: [sourceOrderNumber, `OT-${sourceOrderNumber}`],
              },
            },
            select: {
              orderNumber: true,
              customerId: true,
              clientIdDoc: true,
              client: true,
              clientPhone: true,
              clientEmail: true,
              vehicle: true,
              plate: true,
              vehicleRef: { select: { year: true, color: true, mileage: true, vehicleType: true } },
            },
          })
        : null;

      let linkedCustomer = null;
      const sourceCustomerId = serviceOrder?.customerId || sourceRequest?.customerId || null;
      const sourceCustomerIdentification =
        serviceOrder?.clientIdDoc || sourceRequest?.customerIdentification || null;
      if (sourceCustomerId) {
        linkedCustomer = await tx.customer.findUnique({
          where: { id: sourceCustomerId },
          select: { id: true, name: true, identification: true, phone: true, email: true, address: true },
        });
      }
      if (
        !linkedCustomer &&
        sourceCustomerIdentification &&
        sourceCustomerIdentification.trim()
      ) {
        linkedCustomer = await tx.customer.findUnique({
          where: { identification: sourceCustomerIdentification.trim() },
          select: { id: true, name: true, identification: true, phone: true, email: true, address: true },
        });
      }
      if (typeof customerId === "string" && customerId.trim()) {
        linkedCustomer ??= await tx.customer.findUnique({
          where: { id: customerId.trim() },
          select: { id: true, name: true, identification: true, phone: true, email: true, address: true },
        });
      }
      if (
        !linkedCustomer &&
        !serviceOrder &&
        !(typeof customerId === "string" && customerId.startsWith("web-")) &&
        typeof customerIdentification === "string" &&
        customerIdentification.trim()
      ) {
        linkedCustomer ??= await tx.customer.findUnique({
          where: { identification: customerIdentification.trim() },
          select: { id: true, name: true, identification: true, phone: true, email: true, address: true },
        });
      }
      const saleCustomerName =
        serviceOrder?.client || sourceRequest?.customerName || linkedCustomer?.name || customerName || "Consumidor Final";
      const saleVehiclePlate = serviceOrder?.plate || sourceRequest?.vehiclePlate || vehiclePlate;
      const saleVehicleModel = serviceOrder?.vehicle || sourceRequest?.vehicleModel || vehicleModel;

      let subtotalCalc = 0;
      const saleItemsData = [];

      for (const item of items) {
        let price = parseFloat(item.price?.toString() || "0") || 0;
        const quantity = Math.max(1, parseInt((item.qty || item.quantity || 1).toString(), 10) || 1);
        let name = item.name || "Producto General";
        let code = item.code || "S/C";
        let validProductId: string | null = null;
        let dbProduct = null;

        if (item.productId) {
          dbProduct = await tx.product.findUnique({
            where: { id: item.productId },
          });
        }
        if (!dbProduct && typeof item.code === "string" && item.code.trim()) {
          dbProduct = await tx.product.findUnique({
            where: { code: item.code.trim() },
          });
        }

        if (dbProduct) {
          validProductId = dbProduct.id;
          price = parseFloat(dbProduct.price.toString());
          name = dbProduct.name;
          code = dbProduct.code;

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

        const itemTotal = price * quantity;
        subtotalCalc += itemTotal;

        saleItemsData.push({
          productId: validProductId,
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

      // Numeración correlativa secuencial: VENTA-001, VENTA-002 en adelante
      const lastVenta = await tx.sale.findFirst({
        where: {
          OR: [
            { saleNumber: { startsWith: "VENTA-" } },
            { saleNumber: { startsWith: "VENTA " } },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: { saleNumber: true },
      });

      let nextSeq = 1;
      if (lastVenta && lastVenta.saleNumber) {
        const match = lastVenta.saleNumber.match(/\d+/);
        if (match) {
          nextSeq = parseInt(match[0], 10) + 1;
        }
      }
      const saleNumber = `VENTA-${String(nextSeq).padStart(3, "0")}`;

      const createdSale = await tx.sale.create({
        data: {
          saleNumber,
          customerId: linkedCustomer?.id ?? null,
          customerName: saleCustomerName,
          sourceOrderNumber: serviceOrder?.orderNumber || sourceRequest?.requestNumber || serviceOrderNumber,
          customerIdentification:
            sourceCustomerIdentification || linkedCustomer?.identification ||
            (!serviceOrder && !sourceRequest &&
              !(typeof customerId === "string" && customerId.startsWith("web-"))
              ? customerIdentification
              : null),
          customerPhone: serviceOrder?.clientPhone || sourceRequest?.customerPhone || linkedCustomer?.phone || customerPhone,
          customerEmail: serviceOrder?.clientEmail || sourceRequest?.customerEmail || linkedCustomer?.email || customerEmail,
          customerAddress: linkedCustomer?.address || sourceRequest?.customerAddress || customerAddress,
          vehiclePlate: saleVehiclePlate?.toString().trim().toUpperCase() || null,
          vehicleModel: saleVehicleModel || null,
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

      // Asignar sede a la venta de forma atómica
      try {
        await tx.$executeRawUnsafe(
          `UPDATE "Sale" SET "branch" = $1 WHERE "id" = $2`,
          targetBranch,
          createdSale.id
        );
      } catch (brErr) {
        console.warn("Aviso al asignar branch a Sale:", brErr);
      }

      // Marcar orden de trabajo de taller como Pagada para que pase al historial y no siga en pista
      const orderNumKey = (serviceOrder?.orderNumber || sourceRequest?.requestNumber || sourceOrderNumber || "").toString().trim().replace(/^OT-/i, "");
      if (orderNumKey) {
        try {
          await tx.$executeRawUnsafe(
            `UPDATE "WorkshopOrder"
             SET "status" = 'Pagado',
                 "quoteStatus" = 'Pagado',
                 "deliveryStatus" = 'Facturado',
                 "updatedAt" = NOW()
             WHERE "orderNumber" = $1 OR "orderNumber" = $2`,
            orderNumKey,
            `OT-${orderNumKey}`
          );
        } catch (ordErr) {
          console.warn("Aviso al actualizar WorkshopOrder como Pagado:", ordErr);
        }
      } else if (saleVehiclePlate) {
        try {
          await tx.$executeRawUnsafe(
            `UPDATE "WorkshopOrder"
             SET "status" = 'Pagado',
                 "quoteStatus" = 'Pagado',
                 "deliveryStatus" = 'Facturado',
                 "updatedAt" = NOW()
             WHERE UPPER("plate") = UPPER($1)
               AND "status" NOT IN ('Entregado', 'ENTREGADO', '05 Entregada', 'Entregada', 'Finalizado', 'FINALIZADO', 'Terminado', 'TERMINADO', 'Historial', 'HISTORIAL', 'Cancelado', 'CANCELADO', 'Pagado', 'PAGADO', 'Facturado', 'FACTURADO')`,
            saleVehiclePlate.toString().trim()
          );
        } catch (ordErr) {
          console.warn("Aviso al actualizar WorkshopOrder por placa como Pagado:", ordErr);
        }
      }

      if (saleVehiclePlate) {
        try {
          const histId = "hst_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          const serviceNames = items.map((it: any) => `${it.quantity || it.qty || 1}x ${it.name || "Ítem"}`);
          await tx.$executeRawUnsafe(
            `INSERT INTO "WorkshopHistory" ("id", "serviceCode", "date", "vehicle", "plate", "client", "servicesJson", "cost", "mechanic", "mileage", "notes", "orderNumber", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
            histId,
            `POS-${createdSale.saleNumber}`,
            new Date().toISOString().split("T")[0],
            saleVehicleModel || "Vehículo",
            saleVehiclePlate.toString().trim().toUpperCase(),
            saleCustomerName,
            JSON.stringify(serviceNames),
            totalCalc,
            "Caja Mostrador",
            "N/A",
            body.notes || "Venta de mostrador POS",
            createdSale.saleNumber
          );
        } catch (histErr) {
          console.warn("WorkshopHistory opcional no registrado:", histErr);
        }
      }

      // Sincronizar automáticamente con la sesión de caja abierta en Neon para ESTA sede
      const activeSession = await tx.cashRegister.findFirst({
        where: {
          status: "ABIERTA",
          branch: targetBranch,
        },
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
        } else if (paymentMethod === "Mixto" && body.paymentBreakdown) {
          const pb = body.paymentBreakdown;
          const cashVal = parseFloat(pb.cash) || 0;
          const cardVal = parseFloat(pb.card) || 0;
          const transVal = parseFloat(pb.transfer) || 0;
          if (cashVal > 0) {
            updateData.totalSalesCash = { increment: cashVal };
            updateData.expectedCash = { increment: cashVal };
          }
          if (cardVal > 0) {
            updateData.totalSalesCard = { increment: cardVal };
          }
          if (transVal > 0) {
            updateData.totalSalesTransfer = { increment: transVal };
          }
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
    console.error("Error al registrar venta en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar venta en base de datos", stack: error.stack },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar venta (ej: editar cliente/método, items, o anular venta y restituir stock en Neon)
export async function PATCH(request: Request) {
  try {
    await ensureSaleInvoiceDetailsSchema();
    const body = await request.json();
    const {
      id,
      saleNumber,
      status,
      customerName,
      customerId,
      customerIdentification,
      customerPhone,
      customerEmail,
      customerAddress,
      vehiclePlate,
      vehicleModel,
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
    if (customerIdentification !== undefined) updateData.customerIdentification = customerIdentification || null;
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone || null;
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail || null;
    if (customerAddress !== undefined) updateData.customerAddress = customerAddress || null;
    if (vehiclePlate !== undefined) updateData.vehiclePlate = vehiclePlate || null;
    if (vehicleModel !== undefined) updateData.vehicleModel = vehicleModel || null;
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
    console.error("Error al actualizar venta en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar venta" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar venta de la base de datos y limpiar referencias asociadas
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

    const saleActual = await prisma.sale.findUnique({
      where: { id },
    });

    // Ajustar sesión de caja abierta si la venta no estaba anulada
    if (saleActual && saleActual.status !== "Anulada") {
      const amount = Number(saleActual.total || 0);
      if (amount > 0) {
        try {
          const activeSession = await prisma.cashRegister.findFirst({
            where: {
              status: "ABIERTA",
              branch: (saleActual as any).branch || "PRINCIPAL",
            },
            orderBy: { openedAt: "desc" },
          });
          if (activeSession) {
            const updateData: any = {};
            if (saleActual.paymentMethod === "Efectivo") {
              updateData.totalSalesCash = Math.max(0, Number(activeSession.totalSalesCash || 0) - amount);
            } else if (saleActual.paymentMethod === "Tarjeta") {
              updateData.totalSalesCard = Math.max(0, Number(activeSession.totalSalesCard || 0) - amount);
            } else if (saleActual.paymentMethod === "Transferencia") {
              updateData.totalSalesTransfer = Math.max(0, Number(activeSession.totalSalesTransfer || 0) - amount);
            }
            if (Object.keys(updateData).length > 0) {
              await prisma.cashRegister.update({
                where: { id: activeSession.id },
                data: updateData,
              });
            }
          }
        } catch {}
      }
    }

    // Limpiar historial POS o solicitud despachada vinculada
    if (saleActual?.saleNumber) {
      await prisma.workshopHistory.deleteMany({
        where: { orderNumber: saleActual.saleNumber },
      }).catch(() => {});
    }
    if (saleActual?.sourceOrderNumber) {
      const rawNum = saleActual.sourceOrderNumber.trim().replace(/^OT-/i, "");
      await (prisma as any).orderRequest.deleteMany({
        where: { requestNumber: { in: [saleActual.sourceOrderNumber, rawNum, `OT-${rawNum}`] } },
      }).catch(() => {});
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
    console.error("Error al eliminar venta en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar venta" },
      { status: 500 }
    );
  }
}
