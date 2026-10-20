import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export async function GET() {
  try {
    const data = await withRetry(async () => {
      let config = DEFAULT_CONFIG;
      const settings = await prisma.systemSetting.findUnique({
        where: { id: "default" },
      });
      if (settings?.configJson) {
        try {
          config = { ...DEFAULT_CONFIG, ...JSON.parse(settings.configJson) };
        } catch {}
      } else {
        await prisma.systemSetting.upsert({
          where: { id: "default" },
          update: {},
          create: { id: "default", configJson: JSON.stringify(DEFAULT_CONFIG) },
        });
      }

      const branches = await prisma.branch.findMany({
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
      });

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
      if (type === "branch") {
        const branch = await prisma.branch.update({
          where: { id: body.id },
          data: {
            name: body.name !== undefined ? body.name : undefined,
            address: body.address !== undefined ? body.address : undefined,
            phone: body.phone !== undefined ? body.phone : undefined,
            isMain: body.isMain !== undefined ? Boolean(body.isMain) : undefined,
          },
        });
        return { branch };
      }

      const config = { ...DEFAULT_CONFIG, ...(body.config || body) };
      await prisma.systemSetting.upsert({
        where: { id: "default" },
        update: { configJson: JSON.stringify(config) },
        create: { id: "default", configJson: JSON.stringify(config) },
      });
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
      return await prisma.branch.create({
        data: {
          name: body.name || "Nueva Sucursal",
          address: body.address || "Dirección de sucursal",
          phone: body.phone || "04-000-0000",
          isMain: Boolean(body.isMain),
        },
      });
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
      await prisma.branch.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar sucursal" }, { status: 500 });
  }
}
