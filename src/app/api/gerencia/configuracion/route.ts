import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

const DEFAULT_CONFIG = {
  razonSocial: "AutoG Servicios Automotrices S.A.",
  nombreComercial: "AutoG",
  ruc: "0992345678001",
  telefono: "04-234-5678",
  direccion: "Av. de las Américas y Plaza Dañín, Guayaquil, Ecuador",
  iva: 15,
  moneda: "Dólares (USD)",
  firmaDiasRestantes: 45,
  alertasStockBajo: true,
  recordatoriosClientes: true,
  resumenDiarioCaja: true,
};

async function ensureConfigTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SystemSetting" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "configJson" TEXT NOT NULL DEFAULT '{}',
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Branch" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "address" TEXT NOT NULL,
      "phone" TEXT,
      "isMain" BOOLEAN NOT NULL DEFAULT false,
      "status" TEXT NOT NULL DEFAULT 'Activa',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function GET() {
  try {
    const data = await withRetry(async () => {
      await ensureConfigTables();

      const settingsRows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "SystemSetting" WHERE "id" = 'default'`);
      let config = DEFAULT_CONFIG;
      if (!settingsRows[0]) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "SystemSetting" ("id", "configJson", "updatedAt") VALUES ('default', $1, CURRENT_TIMESTAMP)`,
          JSON.stringify(DEFAULT_CONFIG)
        );
      } else {
        try {
          config = { ...DEFAULT_CONFIG, ...JSON.parse(settingsRows[0].configJson) };
        } catch {}
      }

      const branchCount: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "Branch"`);
      if (!branchCount[0] || branchCount[0].cnt === 0) {
        const seeds = [
          { id: "br_1", name: "Sede Principal", address: "Av. de las Américas y Plaza Dañín", phone: "04-234-5678", isMain: true },
          { id: "br_2", name: "Sucursal Norte", address: "Vía a Samborondón Km 2.5", phone: "04-288-9900", isMain: false },
        ];
        for (const b of seeds) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "Branch" ("id", "name", "address", "phone", "isMain", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
             ON CONFLICT ("id") DO NOTHING`,
            b.id, b.name, b.address, b.phone, b.isMain
          );
        }
      }

      const branches: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Branch" ORDER BY "isMain" DESC, "createdAt" ASC`);
      return { config, branches };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { type } = body; // "config" | "branch"

    const result = await withRetry(async () => {
      await ensureConfigTables();

      if (type === "branch") {
        await prisma.$executeRawUnsafe(
          `UPDATE "Branch"
           SET "name" = COALESCE($2, "name"),
               "address" = COALESCE($3, "address"),
               "phone" = COALESCE($4, "phone"),
               "isMain" = COALESCE($5, "isMain"),
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $1`,
          body.id,
          body.name ?? null,
          body.address ?? null,
          body.phone ?? null,
          body.isMain !== undefined ? Boolean(body.isMain) : null
        );
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Branch" WHERE "id" = $1`, body.id);
        return { branch: rows[0] };
      }

      const config = { ...DEFAULT_CONFIG, ...(body.config || body) };
      await prisma.$executeRawUnsafe(
        `INSERT INTO "SystemSetting" ("id", "configJson", "updatedAt")
         VALUES ('default', $1, CURRENT_TIMESTAMP)
         ON CONFLICT ("id") DO UPDATE SET "configJson" = $1, "updatedAt" = CURRENT_TIMESTAMP`,
        JSON.stringify(config)
      );
      return { config };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al guardar configuración" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await withRetry(async () => {
      await ensureConfigTables();
      const id = `br_${Date.now()}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Branch" ("id", "name", "address", "phone", "isMain", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        id,
        body.name || "Nueva Sucursal",
        body.address || "Dirección de sucursal",
        body.phone || "04-000-0000",
        Boolean(body.isMain)
      );
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Branch" WHERE "id" = $1`, id);
      return rows[0];
    });
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear sucursal" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      await prisma.$executeRawUnsafe(`DELETE FROM "Branch" WHERE "id" = $1`, id);
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar sucursal" }, { status: 500 });
  }
}
