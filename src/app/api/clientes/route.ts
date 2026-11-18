import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitRealtimeEvent } from "@/lib/realtime";

let customerBranchSchemaEnsured = false;

async function ensureCustomerBranchSchema() {
  if (customerBranchSchemaEnsured) return;
  try {
    await prisma
      .$executeRawUnsafe(
        `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "branch" TEXT NOT NULL DEFAULT 'PRINCIPAL'`
      )
      .catch(() => {});
    await prisma
      .$executeRawUnsafe(
        `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "assignedToSucursal" BOOLEAN NOT NULL DEFAULT false`
      )
      .catch(() => {});
    await prisma
      .$executeRawUnsafe(
        `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "avatar" TEXT`
      )
      .catch(() => {});
    await prisma
      .$executeRawUnsafe(
        `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
      )
      .catch(() => {});
    await prisma
      .$executeRawUnsafe(
        `ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
      )
      .catch(() => {});
    customerBranchSchemaEnsured = true;
  } catch {}
}

// GET: Consultar clientes y estadísticas en Neon
export async function GET(request: Request) {
  try {
    await ensureCustomerBranchSchema();
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase() || "";
    const filtro = searchParams.get("filtro") || "todos";
    const sedeParam = (searchParams.get("sede") || "").toUpperCase();
    const userBranchParam = (searchParams.get("userBranch") || "PRINCIPAL").toUpperCase();

    const where: any = {};

    if (filtro === "persona" || filtro === "personal") {
      where.type = { in: ["Personal", "Persona"] };
    } else if (filtro === "empresa") {
      where.type = "Empresa";
    }

    if (busqueda) {
      where.OR = [
        { name: { contains: busqueda, mode: "insensitive" } },
        { identification: { contains: busqueda, mode: "insensitive" } },
        {
          vehicles: {
            some: {
              OR: [
                { plate: { contains: busqueda, mode: "insensitive" } },
                { brand: { contains: busqueda, mode: "insensitive" } },
                { model: { contains: busqueda, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    // Traer clientes filtrados en PostgreSQL con límite controlado
    const rawCustomers = await prisma.customer.findMany({
      where,
      include: {
        vehicles: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1000,
    });

    // Consultar branch y assignedToSucursal directo de Neon para máxima compatibilidad
    // Consultar branch, assignedToSucursal, avatar e imageUrl directo de Neon
    const branchRows = (await prisma
      .$queryRawUnsafe(`SELECT "id", "branch", "assignedToSucursal", "avatar", "imageUrl" FROM "Customer"`)
      .catch(() => [])) as any[];
    const branchMap = new Map<string, { branch: string; assignedToSucursal: boolean; avatar: string | null; imageUrl: string | null }>();
    branchRows.forEach((r) => {
      branchMap.set(r.id, {
        branch: r.branch || "PRINCIPAL",
        assignedToSucursal: Boolean(r.assignedToSucursal),
        avatar: r.avatar || r.imageUrl || null,
        imageUrl: r.imageUrl || r.avatar || null,
      });
    });

    const vehicleExtraRows = (await prisma
      .$queryRawUnsafe(`SELECT "id", "imageUrl", "photosJson" FROM "Vehicle"`)
      .catch(() => [])) as any[];
    const vehicleExtraMap = new Map<string, { imageUrl: string | null; photosJson: string }>();
    vehicleExtraRows.forEach((r) => {
      let parsedPhoto = r.imageUrl || null;
      if (!parsedPhoto && r.photosJson) {
        try {
          const arr = JSON.parse(r.photosJson);
          if (Array.isArray(arr) && arr.length > 0) parsedPhoto = arr[0];
        } catch {}
      }
      vehicleExtraMap.set(r.id, {
        imageUrl: parsedPhoto,
        photosJson: r.photosJson || "[]",
      });
    });

    const customers = rawCustomers
      .map((c) => {
        const bInfo = branchMap.get(c.id) || { branch: "PRINCIPAL", assignedToSucursal: false, avatar: null, imageUrl: null };
        const vehiclesConFotos = (c.vehicles || []).map((v) => {
          const vExtra = vehicleExtraMap.get(v.id);
          return {
            ...v,
            imageUrl: vExtra?.imageUrl || null,
            photosJson: vExtra?.photosJson || "[]",
          };
        });
        return {
          ...c,
          branch: bInfo.branch,
          assignedToSucursal: bInfo.assignedToSucursal,
          avatar: bInfo.avatar,
          imageUrl: bInfo.imageUrl,
          vehicles: vehiclesConFotos,
        };
      })
      .filter((c) => {
        // Regla estricta: si el operador es de SUCURSAL, solo puede ver clientes de SUCURSAL o asignados a SUCURSAL
        if (userBranchParam === "SUCURSAL") {
          return c.branch === "SUCURSAL" || c.assignedToSucursal === true;
        }
        // Si el operador es de PRINCIPAL y filtró específicamente por SUCURSAL en BranchTabs
        if (sedeParam === "SUCURSAL") {
          return c.branch === "SUCURSAL" || c.assignedToSucursal === true;
        }
        // Por defecto en Principal / Ambas sedes, los clientes de la empresa son globales y visibles
        return true;
      });

    // Deduplicar clientes únicamente por cédula/RUC real (nunca mezclar vehículos por nombre/teléfono/email)
    const clientesUnicosMap = new Map<string, any>();
    for (const c of customers) {
      const identClean = String(c.identification || "").trim().toUpperCase();
      const esIdentReal = identClean && !identClean.startsWith("CLI-");

      const dedupKey = esIdentReal ? `id:${identClean}` : `cid:${c.id}`;

      const prev = clientesUnicosMap.get(dedupKey);
      if (!prev) {
        const vehMap = new Map<string, any>();
        for (const v of c.vehicles || []) {
          const pKey = String(v.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "") || v.id;
          if (!vehMap.has(pKey)) vehMap.set(pKey, v);
        }
        clientesUnicosMap.set(dedupKey, {
          ...c,
          vehicles: Array.from(vehMap.values()),
        });
      } else {
        const vehMap = new Map<string, any>();
        for (const v of prev.vehicles || []) {
          const pKey = String(v.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "") || v.id;
          if (!vehMap.has(pKey)) vehMap.set(pKey, v);
        }
        for (const v of c.vehicles || []) {
          const pKey = String(v.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "") || v.id;
          if (!vehMap.has(pKey)) vehMap.set(pKey, v);
        }
        prev.vehicles = Array.from(vehMap.values());
        if (!prev.email && c.email) prev.email = c.email;
        if (!prev.address && c.address) prev.address = c.address;
        if ((!prev.phone || prev.phone === "S/N") && c.phone) prev.phone = c.phone;
        if (!prev.avatar && c.avatar) prev.avatar = c.avatar;
        if (!prev.imageUrl && c.imageUrl) prev.imageUrl = c.imageUrl;
      }
    }
    const customersDeduplicated = Array.from(clientesUnicosMap.values());

    // Calcular visitas al taller por placa para cada vehículo
    const allPlates = customersDeduplicated.flatMap((c) => c.vehicles.map((v: any) => v.plate.trim())).filter(Boolean);
    const platesSet = Array.from(new Set(allPlates.flatMap((p) => [p, p.toUpperCase()])));
    const visitsMap: Record<string, number> = {};

    if (platesSet.length > 0) {
      try {
        const [orderCounts, historyCounts] = await Promise.all([
          prisma.workshopOrder.groupBy({
            by: ["plate"],
            where: {
              plate: { in: platesSet },
            },
            _count: { id: true },
          }),
          prisma.workshopHistory.groupBy({
            by: ["plate"],
            where: {
              plate: { in: platesSet },
            },
            _count: { id: true },
          }),
        ]);

        for (const item of orderCounts) {
          const p = (item.plate || "").trim().toUpperCase();
          visitsMap[p] = (visitsMap[p] || 0) + item._count.id;
        }
        for (const item of historyCounts) {
          const p = (item.plate || "").trim().toUpperCase();
          visitsMap[p] = (visitsMap[p] || 0) + item._count.id;
        }
      } catch (visitErr) {
        console.warn("No se pudieron calcular las visitas de vehículos:", visitErr);
      }
    }

    const customersWithVisits = customersDeduplicated.map((c) => ({
      ...c,
      vehicles: c.vehicles.map((v: any) => {
        const cleanPlate = (v.plate || "").trim().toUpperCase();
        return {
          ...v,
          tallerVisits: visitsMap[cleanPlate] || 0,
        };
      }),
    }));

    let stats = null;
    const esPos = searchParams.get("pos") === "true" || searchParams.get("rapido") === "true";

    if (!esPos) {
      // Estadísticas con índices de PostgreSQL para la página de gestión de clientes
      const haceUnMes = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [totalClientes, totalVehiculos, totalVip, totalNuevos] = await Promise.all([
        prisma.customer.count(),
        prisma.vehicle.count(),
        prisma.customer.count({ where: { vip: true } }),
        prisma.customer.count({ where: { createdAt: { gte: haceUnMes } } }),
      ]);
      stats = { totalClientes, totalVehiculos, totalVip, totalNuevos };
    }

    return NextResponse.json({
      success: true,
      clientes: customersWithVisits,
      stats,
    });
  } catch (error: any) {
    console.error("Error al obtener clientes de base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al conectar con la base de datos" },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo cliente y vehículo en Neon
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      identificacion,
      nombre,
      tipoCliente = "Personal",
      telefono,
      email,
      direccion,
      avatar,
      imageUrl,
      fotoCliente,
      esVip = false,
      notas,
      placa,
      marca,
      modelo,
      anio,
      color,
      kilometraje,
      vin,
      combustible,
      fotoVehiculo,
      vehicleImageUrl,
    } = body;

    const rawIdent = (identificacion || "").toString().trim();
    let finalIdent = rawIdent || `CLI-${Date.now().toString().slice(-6)}`;
    const finalNombre = (nombre || "").toString().trim() || "Cliente General";
    const finalTelefono = (telefono || "").toString().trim();

    // Verificar si ya existe cliente con esta identificación
    const existe = await prisma.customer.findUnique({
      where: { identification: finalIdent },
    });

    if (existe) {
      if (rawIdent) {
        return NextResponse.json(
          { success: false, error: `Ya existe un cliente con la identificación ${rawIdent}.` },
          { status: 409 }
        );
      } else {
        finalIdent = `CLI-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      }
    }

    // Si incluyó datos de vehículo
    const tieneVehiculo = placa && placa.trim().length > 0;
    const branchOrigen =
      String(body.branch || "PRINCIPAL").toUpperCase() === "SUCURSAL"
        ? "SUCURSAL"
        : "PRINCIPAL";
    const asignadoSucursal =
      branchOrigen === "SUCURSAL" || Boolean(body.assignedToSucursal);

    await ensureCustomerBranchSchema();

    const finalCustomerPhoto = (fotoCliente || avatar || imageUrl || "").toString().trim() || null;
    const finalVehiclePhoto = (fotoVehiculo || vehicleImageUrl || "").toString().trim() || null;

    const clienteCreado = await prisma.customer.create({
      data: {
        identification: finalIdent,
        name: finalNombre,
        type: tipoCliente,
        phone: finalTelefono,
        email: email?.trim() || null,
        address: direccion?.trim() || null,
        vip: Boolean(esVip),
        notes: notas?.trim() || null,
        vehicles: tieneVehiculo
          ? {
              create: [
                {
                  plate: placa.trim().toUpperCase(),
                  brand: marca?.trim() || "Genérico",
                  model: modelo?.trim() || "General",
                  year: anio ? parseInt(anio, 10) : null,
                  color: color?.trim() || null,
                  mileage: kilometraje ? parseInt(kilometraje, 10) : null,
                  vin: vin?.trim() || null,
                  fuelType: combustible || "Gasolina",
                  photosJson: finalVehiclePhoto ? JSON.stringify([finalVehiclePhoto]) : "[]",
                },
              ],
            }
          : undefined,
      },
      include: {
        vehicles: true,
      },
    });

    if (finalCustomerPhoto) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Customer" SET "avatar" = $2, "imageUrl" = $2 WHERE "id" = $1`,
        clienteCreado.id,
        finalCustomerPhoto
      ).catch(() => {});
    }

    if (tieneVehiculo && finalVehiclePhoto && clienteCreado.vehicles?.[0]?.id) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Vehicle" SET "imageUrl" = $2, "photosJson" = $3 WHERE "id" = $1`,
        clienteCreado.vehicles[0].id,
        finalVehiclePhoto,
        JSON.stringify([finalVehiclePhoto])
      ).catch(() => {});
    }

    await prisma
      .$executeRawUnsafe(
        `UPDATE "Customer" SET "branch" = $2, "assignedToSucursal" = $3 WHERE "id" = $1`,
        clienteCreado.id,
        branchOrigen,
        asignadoSucursal
      )
      .catch(() => {});

    emitRealtimeEvent({ channel: "clientes", action: "created", entityId: clienteCreado.id });
    if (tieneVehiculo && clienteCreado.vehicles?.[0]?.id) {
      emitRealtimeEvent({ channel: "vehiculos", action: "created", entityId: clienteCreado.vehicles[0].id });
    }

    return NextResponse.json({
      success: true,
      cliente: {
        ...clienteCreado,
        avatar: finalCustomerPhoto,
        imageUrl: finalCustomerPhoto,
        branch: branchOrigen,
        assignedToSucursal: asignadoSucursal,
        vehicles: (clienteCreado.vehicles || []).map((v) => ({
          ...v,
          imageUrl: finalVehiclePhoto,
          photosJson: finalVehiclePhoto ? JSON.stringify([finalVehiclePhoto]) : "[]",
        })),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error al registrar cliente en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar cliente." },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar cliente en Neon
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID de cliente requerido" }, { status: 400 });
    }

    const clienteExistente = await prisma.customer.findFirst({
      where: {
        OR: [
          { id },
          { identification: id },
        ],
      },
    });

    if (!clienteExistente) {
      return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });
    }

    // Desvincular ventas si existieran
    await prisma.sale.updateMany({
      where: { customerId: clienteExistente.id },
      data: { customerId: null },
    });

    // Eliminar vehículos asociados
    await prisma.vehicle.deleteMany({
      where: { customerId: clienteExistente.id },
    });

    // Eliminar el cliente definitivamente
    await prisma.customer.delete({
      where: { id: clienteExistente.id },
    });

    emitRealtimeEvent({ channel: "clientes", action: "deleted", entityId: clienteExistente.id });
    emitRealtimeEvent({ channel: "vehiculos", action: "deleted" });

    return NextResponse.json({ 
      success: true, 
      message: `Cliente ${clienteExistente.name} eliminado correctamente.` 
    });
  } catch (error: any) {
    console.error("Error al eliminar cliente de base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar cliente" },
      { status: 500 }
    );
  }
}

// PUT: Actualizar cliente o transferir/asignar a Sucursal
export async function PUT(request: Request) {
  try {
    await ensureCustomerBranchSchema();
    const body = await request.json();
    const {
      id,
      action,
      assignedToSucursal,
      branch,
      name,
      type,
      phone,
      email,
      address,
      vip,
      notes,
      identification,
      avatar,
      imageUrl,
      fotoCliente,
      placa,
      marca,
      modelo,
      anio,
      kilometraje,
      combustible,
      color,
      fotoVehiculo,
      vehicleImageUrl,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID requerido para actualizar" }, { status: 400 });
    }

    if (action === "TRANSFERIR_SUCURSAL") {
      const targetAssigned = Boolean(assignedToSucursal);
      const targetBranch = branch ? String(branch).toUpperCase() : undefined;
      if (targetBranch) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Customer" SET "assignedToSucursal" = $2, "branch" = $3, "updatedAt" = NOW() WHERE "id" = $1`,
          id,
          targetAssigned,
          targetBranch
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE "Customer" SET "assignedToSucursal" = $2, "updatedAt" = NOW() WHERE "id" = $1`,
          id,
          targetAssigned
        );
      }
      emitRealtimeEvent({ channel: "clientes", action: "updated", entityId: id });
      return NextResponse.json({
        success: true,
        id,
        assignedToSucursal: targetAssigned,
        branch: targetBranch,
      });
    }

    const updateData: any = {
      name,
      type,
      phone,
      email: email || null,
      address: address || null,
      vip: typeof vip === "boolean" ? vip : false,
      notes: notes || null,
    };

    if (identification) {
      updateData.identification = identification.trim();
    }

    const clienteActualizado = await prisma.customer.update({
      where: { id },
      data: updateData,
      include: {
        vehicles: true,
      },
    });

    // Actualizar foto de cliente si se envió
    const finalCustomerPhoto = fotoCliente !== undefined ? fotoCliente : (avatar !== undefined ? avatar : imageUrl);
    if (finalCustomerPhoto !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Customer" SET "avatar" = $2, "imageUrl" = $2 WHERE "id" = $1`,
        id,
        finalCustomerPhoto ? String(finalCustomerPhoto).trim() : null
      ).catch(() => {});
    }

    // Actualizar o crear vehículo si se envió placa
    const finalVehiclePhoto = fotoVehiculo !== undefined ? fotoVehiculo : vehicleImageUrl;

    if (placa && placa.trim().length > 0) {
      const placaLimpia = placa.trim().toUpperCase();
      const existingVehicle = clienteActualizado.vehicles[0];

      if (existingVehicle) {
        await prisma.vehicle.update({
          where: { id: existingVehicle.id },
          data: {
            plate: placaLimpia,
            brand: marca?.trim() || "Genérico",
            model: modelo?.trim() || "General",
            year: anio ? parseInt(String(anio), 10) : undefined,
            mileage: kilometraje ? parseInt(String(kilometraje).replace(/\D/g, ""), 10) : undefined,
            fuelType: combustible || "Gasolina",
            color: color ? String(color).trim() : undefined,
            photosJson: finalVehiclePhoto !== undefined ? (finalVehiclePhoto ? JSON.stringify([String(finalVehiclePhoto).trim()]) : "[]") : undefined,
          },
        });
        if (finalVehiclePhoto !== undefined) {
          await prisma.$executeRawUnsafe(
            `UPDATE "Vehicle" SET "imageUrl" = $2 WHERE "id" = $1`,
            existingVehicle.id,
            finalVehiclePhoto ? String(finalVehiclePhoto).trim() : null
          ).catch(() => {});
        }
      } else {
        const nuevoV = await prisma.vehicle.create({
          data: {
            customerId: id,
            plate: placaLimpia,
            brand: marca?.trim() || "Genérico",
            model: modelo?.trim() || "General",
            year: anio ? parseInt(String(anio), 10) : undefined,
            mileage: kilometraje ? parseInt(String(kilometraje).replace(/\D/g, ""), 10) : undefined,
            fuelType: combustible || "Gasolina",
            color: color ? String(color).trim() : undefined,
            photosJson: finalVehiclePhoto ? JSON.stringify([String(finalVehiclePhoto).trim()]) : "[]",
          },
        });
        if (finalVehiclePhoto) {
          await prisma.$executeRawUnsafe(
            `UPDATE "Vehicle" SET "imageUrl" = $2 WHERE "id" = $1`,
            nuevoV.id,
            String(finalVehiclePhoto).trim()
          ).catch(() => {});
        }
      }
    } else if (finalVehiclePhoto !== undefined && clienteActualizado.vehicles[0]) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Vehicle" SET "imageUrl" = $2, "photosJson" = $3 WHERE "id" = $1`,
        clienteActualizado.vehicles[0].id,
        finalVehiclePhoto ? String(finalVehiclePhoto).trim() : null,
        finalVehiclePhoto ? JSON.stringify([String(finalVehiclePhoto).trim()]) : "[]"
      ).catch(() => {});
    }

    const clienteFinal = await prisma.customer.findUnique({
      where: { id },
      include: { vehicles: true },
    });

    emitRealtimeEvent({ channel: "clientes", action: "updated", entityId: id });
    if (placa && placa.trim().length > 0) {
      emitRealtimeEvent({ channel: "vehiculos", action: "updated" });
    }

    return NextResponse.json({
      success: true,
      cliente: {
        ...clienteFinal,
        avatar: finalCustomerPhoto !== undefined ? finalCustomerPhoto : (clienteFinal as any)?.avatar,
        imageUrl: finalCustomerPhoto !== undefined ? finalCustomerPhoto : (clienteFinal as any)?.imageUrl,
      },
    });
  } catch (error: any) {
    console.error("Error al actualizar cliente en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar cliente" },
      { status: 500 }
    );
  }
}
