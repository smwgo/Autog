import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await withRetry(async () => {
      // 1. Consultar configuración de empresa real desde Neon
      let company = await (prisma as any).companyConfig.findUnique({
        where: { id: "default" },
      });

      if (!company) {
        company = await (prisma as any).companyConfig.create({
          data: {
            id: "default",
            razonSocial: "",
            nombreComercial: "",
            ruc: "",
            telefono: "",
            direccion: "",
            iva: 15,
            moneda: "Dólares (USD)",
            ambienteSri: "2",
            tipoEmision: "1",
            entidadEmisora: "",
            firmaArchivoNombre: null,
            firmaArchivoTamano: null,
            firmaFechaCarga: null,
            firmaFechaExpiracion: null,
            firmaClave: null,
            firmaEstado: "Pendiente",
            alertasStockBajo: true,
            recordatoriosClientes: true,
            resumenDiarioCaja: true,
          },
        });
      }

      const formattedConfig = {
        razonSocial: company.razonSocial || "",
        nombreComercial: company.nombreComercial || "",
        ruc: company.ruc || "",
        telefono: company.telefono || "",
        correo: company.correo || "",
        direccion: company.direccion || "",
        logoUrl: company.logoUrl || "",
        iva: company.iva ?? 15,
        moneda: company.moneda || "Dólares (USD)",
        obligadoContabilidad: Boolean(company.obligadoContabilidad ?? false),
        regimenTributario: company.regimenTributario || "General",
        estabSecuencial: company.estabSecuencial || "001",
        ptoEmiSecuencial: company.ptoEmiSecuencial || "001",
        secuencialFactura: company.secuencialFactura ?? 1,
        smtpHost: company.smtpHost || "",
        smtpPort: company.smtpPort ?? 587,
        smtpUser: company.smtpUser || "",
        smtpPass: company.smtpPass || "",
        smtpFrom: company.smtpFrom || "",
        alertasStockBajo: company.alertasStockBajo ?? true,
        umbralStockBajo: company.umbralStockBajo ?? 5,
        alertaDestinoWhatsapp: company.alertaDestinoWhatsapp || "",
        alertaDestinoCorreo: company.alertaDestinoCorreo || "",
        recordatoriosClientes: company.recordatoriosClientes ?? true,
        resumenDiarioCaja: company.resumenDiarioCaja ?? true,
        firmaElectronica: {
          archivoNombre: company.firmaArchivoNombre || "",
          archivoTamano: company.firmaArchivoTamano || "",
          tieneArchivo: Boolean(company.firmaArchivoBase64),
          fechaCarga: company.firmaFechaCarga || "",
          fechaExpiracion: company.firmaFechaExpiracion || "",
          entidadEmisora: company.entidadEmisora || "",
          ambienteSri: company.ambienteSri || "2",
          tipoEmision: company.tipoEmision || "1",
          claveFirma: company.firmaClave || "",
          estado: company.firmaEstado || "Pendiente",
        },
      };

      // 2. Consultar sucursales reales desde Neon
      let branches = await prisma.branch.findMany({
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
      });

      if (branches.length === 0) {
        const defaultBranch = await prisma.branch.create({
          data: {
            name: "",
            address: "",
            phone: "",
            isMain: true,
            status: "Activa",
          },
        });
        branches = [defaultBranch];
      }

      return { config: formattedConfig, branches };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/gerencia/configuracion error:", error);
    return NextResponse.json({ error: error.message || "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { type, config: cfg, sucursal } = body;

    const result = await withRetry(async () => {
      // 1. Guardar sucursal en Neon
      if (type === "branch" || sucursal) {
        const branchData = type === "branch" ? body : sucursal;
        if (branchData) {
          if (branchData.id) {
            await prisma.branch.upsert({
              where: { id: branchData.id },
              update: {
                name: branchData.name !== undefined ? branchData.name : undefined,
                address: branchData.address !== undefined ? branchData.address : undefined,
                phone: branchData.phone !== undefined ? branchData.phone : undefined,
                status: branchData.status || "Activa",
              },
              create: {
                id: branchData.id,
                name: branchData.name || "",
                address: branchData.address || "",
                phone: branchData.phone || "",
                isMain: true,
                status: "Activa",
              },
            });
          } else {
            const first = await prisma.branch.findFirst();
            if (first) {
              await prisma.branch.update({
                where: { id: first.id },
                data: {
                  name: branchData.name !== undefined ? branchData.name : first.name,
                  address: branchData.address !== undefined ? branchData.address : first.address,
                  phone: branchData.phone !== undefined ? branchData.phone : first.phone,
                  status: branchData.status || first.status,
                },
              });
            } else {
              await prisma.branch.create({
                data: {
                  name: branchData.name || "",
                  address: branchData.address || "",
                  phone: branchData.phone || "",
                  isMain: true,
                  status: "Activa",
                },
              });
            }
          }
        }
      }

      // 2. Guardar datos de empresa, SRI y alertas en Neon
      if (type === "config" || cfg) {
        const c = cfg || body;
        const firma = c.firmaElectronica || {};

        const updatedCompany = await (prisma as any).companyConfig.upsert({
          where: { id: "default" },
          update: {
            razonSocial: c.razonSocial !== undefined ? c.razonSocial : undefined,
            nombreComercial: c.nombreComercial !== undefined ? c.nombreComercial : undefined,
            ruc: c.ruc !== undefined ? c.ruc : undefined,
            telefono: c.telefono !== undefined ? c.telefono : undefined,
            correo: c.correo !== undefined ? c.correo : undefined,
            direccion: c.direccion !== undefined ? c.direccion : undefined,
            logoUrl: c.logoUrl !== undefined ? c.logoUrl : undefined,
            iva: c.iva !== undefined ? Number(c.iva) : undefined,
            moneda: c.moneda !== undefined ? c.moneda : undefined,
            obligadoContabilidad: c.obligadoContabilidad !== undefined ? Boolean(c.obligadoContabilidad) : undefined,
            regimenTributario: c.regimenTributario !== undefined ? c.regimenTributario : undefined,
            estabSecuencial: c.estabSecuencial !== undefined ? c.estabSecuencial : undefined,
            ptoEmiSecuencial: c.ptoEmiSecuencial !== undefined ? c.ptoEmiSecuencial : undefined,
            secuencialFactura: c.secuencialFactura !== undefined ? Number(c.secuencialFactura) : undefined,
            alertasStockBajo: c.alertasStockBajo !== undefined ? Boolean(c.alertasStockBajo) : undefined,
            umbralStockBajo: c.umbralStockBajo !== undefined ? Number(c.umbralStockBajo) : undefined,
            alertaDestinoWhatsapp: c.alertaDestinoWhatsapp !== undefined ? c.alertaDestinoWhatsapp : undefined,
            alertaDestinoCorreo: c.alertaDestinoCorreo !== undefined ? c.alertaDestinoCorreo : undefined,
            recordatoriosClientes: c.recordatoriosClientes !== undefined ? Boolean(c.recordatoriosClientes) : undefined,
            resumenDiarioCaja: c.resumenDiarioCaja !== undefined ? Boolean(c.resumenDiarioCaja) : undefined,
            // Firma
            ambienteSri: firma.ambienteSri !== undefined ? firma.ambienteSri : undefined,
            tipoEmision: firma.tipoEmision !== undefined ? firma.tipoEmision : undefined,
            entidadEmisora: firma.entidadEmisora !== undefined ? firma.entidadEmisora : undefined,
            firmaArchivoNombre: firma.archivoNombre !== undefined ? firma.archivoNombre : undefined,
            firmaArchivoTamano: firma.archivoTamano !== undefined ? firma.archivoTamano : undefined,
            firmaArchivoBase64: firma.archivoBase64 !== undefined ? firma.archivoBase64 : undefined,
            firmaFechaCarga: firma.fechaCarga !== undefined ? firma.fechaCarga : undefined,
            firmaFechaExpiracion: firma.fechaExpiracion !== undefined ? firma.fechaExpiracion : undefined,
            firmaClave: firma.claveFirma !== undefined ? firma.claveFirma : undefined,
            firmaEstado: firma.estado !== undefined ? firma.estado : undefined,
            smtpHost: c.smtpHost !== undefined ? c.smtpHost : undefined,
            smtpPort: c.smtpPort !== undefined ? Number(c.smtpPort) : undefined,
            smtpUser: c.smtpUser !== undefined ? c.smtpUser : undefined,
            smtpPass: c.smtpPass !== undefined ? c.smtpPass : undefined,
            smtpFrom: c.smtpFrom !== undefined ? c.smtpFrom : undefined,
          },
          create: {
            id: "default",
            razonSocial: c.razonSocial || "",
            nombreComercial: c.nombreComercial || "",
            ruc: c.ruc || "",
            telefono: c.telefono || "",
            correo: c.correo || "",
            direccion: c.direccion || "",
            logoUrl: c.logoUrl || null,
            iva: c.iva ? Number(c.iva) : 15,
            moneda: c.moneda || "Dólares (USD)",
            obligadoContabilidad: Boolean(c.obligadoContabilidad),
            regimenTributario: c.regimenTributario || "General",
            estabSecuencial: c.estabSecuencial || "001",
            ptoEmiSecuencial: c.ptoEmiSecuencial || "001",
            secuencialFactura: c.secuencialFactura ? Number(c.secuencialFactura) : 1,
            ambienteSri: firma.ambienteSri || "2",
            tipoEmision: firma.tipoEmision || "1",
            entidadEmisora: firma.entidadEmisora || "",
            firmaArchivoNombre: firma.archivoNombre || null,
            firmaArchivoTamano: firma.archivoTamano || null,
            firmaArchivoBase64: firma.archivoBase64 || null,
            firmaFechaCarga: firma.fechaCarga || null,
            firmaFechaExpiracion: firma.fechaExpiracion || null,
            firmaClave: firma.claveFirma || null,
            firmaEstado: firma.estado || "Pendiente",
            smtpHost: c.smtpHost || null,
            smtpPort: c.smtpPort ? Number(c.smtpPort) : 587,
            smtpUser: c.smtpUser || null,
            smtpPass: c.smtpPass || null,
            smtpFrom: c.smtpFrom || null,
            alertasStockBajo: c.alertasStockBajo ?? true,
            umbralStockBajo: c.umbralStockBajo ? Number(c.umbralStockBajo) : 5,
            alertaDestinoWhatsapp: c.alertaDestinoWhatsapp || "",
            alertaDestinoCorreo: c.alertaDestinoCorreo || "",
            recordatoriosClientes: c.recordatoriosClientes ?? true,
            resumenDiarioCaja: c.resumenDiarioCaja ?? true,
          },
        });

        // Sincronizar también SystemSetting para cualquier consumo externo legacy
        try {
          await prisma.systemSetting.upsert({
            where: { id: "default" },
            update: { configJson: JSON.stringify(c) },
            create: { id: "default", configJson: JSON.stringify(c) },
          });
        } catch {}

        return { success: true, company: updatedCompany };
      }

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("PUT /api/gerencia/configuracion error:", error);
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
          address: body.address || "",
          phone: body.phone || "",
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
