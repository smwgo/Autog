import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { ensureSchemaOnce } from "@/lib/runtime-ddl";

async function ensureProveedoresTables() {
  await ensureSchemaOnce("OficinaProveedores", async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Supplier" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "ruc" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "contact" TEXT NOT NULL,
        "email" TEXT,
        "phone" TEXT,
        "categories" TEXT NOT NULL DEFAULT '[]',
        "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'Activo',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderNumber" TEXT NOT NULL UNIQUE,
        "supplierName" TEXT NOT NULL,
        "supplierRuc" TEXT,
        "expectedDate" TEXT NOT NULL,
        "itemsJson" TEXT NOT NULL DEFAULT '[]',
        "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'Solicitado',
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});
  });
}

export async function GET() {
  try {
    const data = await withRetry(async () => {
      await ensureProveedoresTables();

      const rawSuppliers = await prisma.supplier.findMany({
        orderBy: { createdAt: "desc" },
      });
      const rawOrders = await prisma.purchaseOrder.findMany({
        orderBy: { createdAt: "desc" },
      });

      const proveedores = rawSuppliers.map((s) => ({
        ...s,
        balance: Number(s.balance || 0),
      }));

      const ordenes = rawOrders.map((o) => ({
        ...o,
        total: Number(o.total || 0),
      }));

      return { proveedores, ordenes };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener proveedores" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { docType } = body; // "proveedor" | "orden"

    const created = await withRetry(async () => {
      await ensureProveedoresTables();

      if (docType === "orden") {
        const orderNumber = body.orderNumber || `OC-${Math.floor(1000 + Math.random() * 9000)}`;
        const order = await prisma.purchaseOrder.create({
          data: {
            orderNumber,
            supplierName: body.supplierName || "Proveedor General",
            supplierRuc: body.supplierRuc || null,
            expectedDate: body.expectedDate || "Mañana",
            total: Number(body.total || 0),
            status: body.status || "Solicitado",
            notes: body.notes || "",
            itemsJson: JSON.stringify(body.items || []),
          },
        });
        return {
          ...order,
          total: Number(order.total || 0),
        };
      } else {
        const categories = Array.isArray(body.categories)
          ? JSON.stringify(body.categories)
          : JSON.stringify(
              (body.categories || "General")
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            );

        const supplier = await prisma.supplier.create({
          data: {
            ruc: body.ruc || `099${Math.floor(1000000 + Math.random() * 9000000)}001`,
            name: body.name || "Nuevo Proveedor",
            contact: body.contact || "Contacto Comercial",
            email: body.email || null,
            phone: body.phone || null,
            categories,
            balance: Number(body.balance || 0),
            status: body.status || "Activo",
          },
        });
        return {
          ...supplier,
          balance: Number(supplier.balance || 0),
        };
      }
    });

    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al guardar registro" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, docType } = body;
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const updated = await withRetry(async () => {
      await ensureProveedoresTables();

      if (docType === "orden") {
        const order = await prisma.purchaseOrder.update({
          where: { id },
          data: {
            ...(body.supplierName ? { supplierName: body.supplierName } : {}),
            ...(body.expectedDate ? { expectedDate: body.expectedDate } : {}),
            ...(body.total !== undefined ? { total: Number(body.total) } : {}),
            ...(body.status ? { status: body.status } : {}),
            ...(body.notes !== undefined ? { notes: body.notes } : {}),
          },
        });
        return {
          ...order,
          total: Number(order.total || 0),
        };
      } else {
        const categories =
          body.categories !== undefined
            ? Array.isArray(body.categories)
              ? JSON.stringify(body.categories)
              : JSON.stringify(
                  String(body.categories)
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                )
            : undefined;

        const supplier = await prisma.supplier.update({
          where: { id },
          data: {
            ...(body.name ? { name: body.name } : {}),
            ...(body.ruc ? { ruc: body.ruc } : {}),
            ...(body.contact ? { contact: body.contact } : {}),
            ...(body.email !== undefined ? { email: body.email } : {}),
            ...(body.phone !== undefined ? { phone: body.phone } : {}),
            ...(body.balance !== undefined ? { balance: Number(body.balance) } : {}),
            ...(categories !== undefined ? { categories } : {}),
            ...(body.status ? { status: body.status } : {}),
          },
        });
        return {
          ...supplier,
          balance: Number(supplier.balance || 0),
        };
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar registro" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const docType = searchParams.get("docType") || "proveedor";
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      if (docType === "orden") {
        await prisma.purchaseOrder.delete({ where: { id } });
      } else {
        await prisma.supplier.delete({ where: { id } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar registro" }, { status: 500 });
  }
}
