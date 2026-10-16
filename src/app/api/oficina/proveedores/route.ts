import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

async function ensureProveedoresTables() {
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
  `);

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
  `);
}

export async function GET() {
  try {
    const data = await withRetry(async () => {
      await ensureProveedoresTables();

      const supCount: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "Supplier"`);
      if (!supCount[0] || supCount[0].cnt === 0) {
        const seedSuppliers = [
          { id: "sup_1", name: "Importadora AutoParts Cía. Ltda.", ruc: "0991234567001", contact: "Mario Valdés", email: "ventas@autoparts.com", phone: "042345678", categories: JSON.stringify(["Lubricantes", "Filtros"]), balance: 1250.00 },
          { id: "sup_2", name: "Frenos del Pacífico S.A.", ruc: "1792345678001", contact: "Lucía Paredes", email: "pedidos@frenospac.com", phone: "022987654", categories: JSON.stringify(["Frenos"]), balance: 0.00 },
          { id: "sup_3", name: "Distribuidora Eléctrica Motors", ruc: "0998765432001", contact: "Carlos Ruiz", email: "carlos@emotors.com", phone: "0991122334", categories: JSON.stringify(["Eléctrico", "Baterías"]), balance: 3000.00 },
          { id: "sup_4", name: "Herramientas y Equipos Industriales", ruc: "1798887776001", contact: "Ana Torres", email: "info@herramientasec.com", phone: "042111222", categories: JSON.stringify(["Equipos Taller"]), balance: 0.00 },
        ];
        for (const s of seedSuppliers) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "Supplier" ("id", "ruc", "name", "contact", "email", "phone", "categories", "balance", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
             ON CONFLICT ("ruc") DO NOTHING`,
            s.id, s.ruc, s.name, s.contact, s.email, s.phone, s.categories, s.balance
          );
        }
      }

      const poCount: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "PurchaseOrder"`);
      if (!poCount[0] || poCount[0].cnt === 0) {
        const seedOrders = [
          { id: "po_1", orderNumber: "OC-00105", supplierName: "Importadora AutoParts Cía. Ltda.", expectedDate: "Hoy", total: 450.00, status: "En Tránsito", notes: "Cajas de aceite 10W-40" },
          { id: "po_2", orderNumber: "OC-00104", supplierName: "Distribuidora Eléctrica Motors", expectedDate: "Mañana", total: 1200.00, status: "Solicitado", notes: "Baterías 12V 60Ah" },
          { id: "po_3", orderNumber: "OC-00103", supplierName: "Frenos del Pacífico S.A.", expectedDate: "24 Oct 2026", total: 280.00, status: "Recibido", notes: "Pastillas cerámicas" },
          { id: "po_4", orderNumber: "OC-00102", supplierName: "Importadora AutoParts Cía. Ltda.", expectedDate: "22 Oct 2026", total: 800.00, status: "Borrador", notes: "Reposición mensual filtros" },
        ];
        for (const po of seedOrders) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "PurchaseOrder" ("id", "orderNumber", "supplierName", "expectedDate", "total", "status", "notes", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
             ON CONFLICT ("orderNumber") DO NOTHING`,
            po.id, po.orderNumber, po.supplierName, po.expectedDate, po.total, po.status, po.notes
          );
        }
      }

      const proveedores: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Supplier" ORDER BY "createdAt" DESC`);
      const ordenes: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "PurchaseOrder" ORDER BY "createdAt" DESC`);

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
        const id = `po_${Date.now()}`;
        const orderNumber = body.orderNumber || `OC-00${Math.floor(106 + Math.random() * 890)}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO "PurchaseOrder" ("id", "orderNumber", "supplierName", "expectedDate", "total", "status", "notes", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          id,
          orderNumber,
          body.supplierName || "Proveedor General",
          body.expectedDate || "Mañana",
          Number(body.total || 0),
          body.status || "Solicitado",
          body.notes || ""
        );
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "PurchaseOrder" WHERE "id" = $1`, id);
        return rows[0];
      } else {
        const id = `sup_${Date.now()}`;
        const categories = Array.isArray(body.categories)
          ? JSON.stringify(body.categories)
          : JSON.stringify((body.categories || "General").split(",").map((s: string) => s.trim()).filter(Boolean));
        await prisma.$executeRawUnsafe(
          `INSERT INTO "Supplier" ("id", "ruc", "name", "contact", "email", "phone", "categories", "balance", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
          id,
          body.ruc || `099${Math.floor(1000000 + Math.random() * 9000000)}001`,
          body.name || "Nuevo Proveedor",
          body.contact || "Contacto Comercial",
          body.email || "contacto@proveedor.com",
          body.phone || "0990000000",
          categories,
          Number(body.balance || 0)
        );
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Supplier" WHERE "id" = $1`, id);
        return rows[0];
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

    const updated = await withRetry(async () => {
      await ensureProveedoresTables();

      if (docType === "orden") {
        await prisma.$executeRawUnsafe(
          `UPDATE "PurchaseOrder"
           SET "supplierName" = COALESCE($2, "supplierName"),
               "expectedDate" = COALESCE($3, "expectedDate"),
               "total" = COALESCE($4, "total"),
               "status" = COALESCE($5, "status"),
               "notes" = COALESCE($6, "notes"),
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $1`,
          id,
          body.supplierName ?? null,
          body.expectedDate ?? null,
          body.total !== undefined ? Number(body.total) : null,
          body.status ?? null,
          body.notes ?? null
        );
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "PurchaseOrder" WHERE "id" = $1`, id);
        return rows[0];
      } else {
        const categories = body.categories !== undefined
          ? (Array.isArray(body.categories)
              ? JSON.stringify(body.categories)
              : JSON.stringify(String(body.categories).split(",").map((s: string) => s.trim()).filter(Boolean)))
          : null;

        await prisma.$executeRawUnsafe(
          `UPDATE "Supplier"
           SET "name" = COALESCE($2, "name"),
               "ruc" = COALESCE($3, "ruc"),
               "contact" = COALESCE($4, "contact"),
               "email" = COALESCE($5, "email"),
               "balance" = COALESCE($6, "balance"),
               "categories" = COALESCE($7, "categories"),
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $1`,
          id,
          body.name ?? null,
          body.ruc ?? null,
          body.contact ?? null,
          body.email ?? null,
          body.balance !== undefined ? Number(body.balance) : null,
          categories
        );
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Supplier" WHERE "id" = $1`, id);
        return rows[0];
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
        await prisma.$executeRawUnsafe(`DELETE FROM "PurchaseOrder" WHERE "id" = $1`, id);
      } else {
        await prisma.$executeRawUnsafe(`DELETE FROM "Supplier" WHERE "id" = $1`, id);
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar registro" }, { status: 500 });
  }
}
