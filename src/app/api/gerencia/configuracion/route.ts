import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_CONFIG = {
  razonSocial: "AutoG Servicios Automotrices S.A.",
  nombreComercial: "AutoG",
  ruc: "0992345678001",
  telefono: "0991234567",
  direccion: "Av. de las Américas y Plaza Dañín, Guayaquil, Ecuador",
  iva: 15,
  moneda: "Dólares (USD)",
  firmaDiasRestantes: 365,
  firmaElectronica: {
    archivoNombre: "firma_autog.p12",
    archivoTamano: "4.8 KB",
    fechaCarga: "2026-11-03",
    fechaExpiracion: "2027-11-03",
    entidadEmisora: "Security Data S.A.",
    ambienteSri: "2",
    tipoEmision: "1",
    claveFirma: "••••••••",
    estado: "Activa",
  },
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
          const parsed = JSON.parse(settings.configJson);
          if (parsed.telefono === "04-234-5678" || parsed.telefono?.startsWith("04-")) {
            parsed.telefono = "0991234567";
          }
          config = { ...DEFAULT_CONFIG, ...parsed };
        } catch {}
      } else {
        await prisma.systemSetting.upsert({
          where: { id: "default" },
          update: {},
          create: { id: "default", configJson: JSON.stringify(DEFAULT_CONFIG) },
        });
      }

      let branches = await prisma.branch.findMany({
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
      });

      if (branches.length === 0) {
        const defaultBranch = await prisma.branch.create({
          data: {
            id: "branch_sucursal_1",
            name: "Sucursal Samborondón",
            address: "Av. Samborondón Km 1.5, Samborondón, Ecuador",
            phone: "0991234567",
            isMain: false,
            status: "Activa",
          },
        });
        branches = [defaultBranch];
      }

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
        let first = await prisma.branch.findFirst();
        if (!first) {
          first = await prisma.branch.create({
            data: {
              id: "branch_sucursal_1",
              name: body.name || "Sucursal Samborondón",
              address: body.address || "Av. Samborondón Km 1.5, Samborondón, Ecuador",
              phone: body.phone || "0991234567",
              isMain: false,
              status: "Activa",
            },
          });
          return { branch: first };
        }
        const branch = await prisma.branch.update({
          where: { id: body.id || first.id },
          data: {
            name: body.name !== undefined ? body.name : undefined,
            address: body.address !== undefined ? body.address : undefined,
            phone: body.phone !== undefined ? body.phone : undefined,
            isMain: false,
            status: "Activa",
          },
        });
        return { branch };
      }

      if (body.sucursal) {
        let first = await prisma.branch.findFirst();
        if (first) {
          await prisma.branch.update({
            where: { id: first.id },
            data: {
              name: body.sucursal.name || first.name,
              address: body.sucursal.address || first.address,
              phone: body.sucursal.phone || first.phone,
              isMain: false,
              status: "Activa",
            },
          });
        }
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
