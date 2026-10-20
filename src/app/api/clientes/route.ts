import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      take: 200,
    });

    // Consultar branch y assignedToSucursal directo de Neon para máxima compatibilidad
    const branchRows = (await prisma
      .$queryRawUnsafe(`SELECT "id", "branch", "assignedToSucursal" FROM "Customer"`)
      .catch(() => [])) as any[];
    const branchMap = new Map<string, { branch: string; assignedToSucursal: boolean }>();
    branchRows.forEach((r) => {
      branchMap.set(r.id, {
        branch: r.branch || "PRINCIPAL",
        assignedToSucursal: Boolean(r.assignedToSucursal),
      });
    });

    const customers = rawCustomers
      .map((c) => {
        const bInfo = branchMap.get(c.id) || { branch: "PRINCIPAL", assignedToSucursal: false };
        return {
          ...c,
          branch: bInfo.branch,
          assignedToSucursal: bInfo.assignedToSucursal,
        };
      })
      .filter((c) => {
        // Regla estricta: si el operador es de SUCURSAL, solo puede ver clientes de SUCURSAL o asignados a SUCURSAL
        if (userBranchParam === "SUCURSAL") {
          return c.branch === "SUCURSAL" || c.assignedToSucursal === true;
        }
        // Si el operador es de PRINCIPAL y filtró específicamente por SUCURSAL o PRINCIPAL
        if (sedeParam === "SUCURSAL") {
          return c.branch === "SUCURSAL" || c.assignedToSucursal === true;
        }
        if (sedeParam === "PRINCIPAL") {
          return c.branch === "PRINCIPAL";
        }
        return true;
      });

    // Calcular visitas al taller por placa para cada vehículo
    const allPlates = customers.flatMap((c) => c.vehicles.map((v) => v.plate.trim())).filter(Boolean);
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

    const customersWithVisits = customers.map((c) => ({
      ...c,
      vehicles: c.vehicles.map((v) => {
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
    console.error("Error al obtener clientes de Neon:", error);
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
                },
              ],
            }
          : undefined,
      },
      include: {
        vehicles: true,
      },
    });

    await prisma
      .$executeRawUnsafe(
        `UPDATE "Customer" SET "branch" = $2, "assignedToSucursal" = $3 WHERE "id" = $1`,
        clienteCreado.id,
        branchOrigen,
        asignadoSucursal
      )
      .catch(() => {});

    return NextResponse.json({
      success: true,
      cliente: {
        ...clienteCreado,
        branch: branchOrigen,
        assignedToSucursal: asignadoSucursal,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error al registrar cliente en Neon:", error);
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

    return NextResponse.json({ 
      success: true, 
      message: `Cliente ${clienteExistente.name} eliminado correctamente.` 
    });
  } catch (error: any) {
    console.error("Error al eliminar cliente de Neon:", error);
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
      placa,
      marca,
      modelo,
      anio,
      kilometraje,
      combustible,
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

    // Actualizar o crear vehículo si se envió placa
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
          },
        });
      } else {
        await prisma.vehicle.create({
          data: {
            customerId: id,
            plate: placaLimpia,
            brand: marca?.trim() || "Genérico",
            model: modelo?.trim() || "General",
            year: anio ? parseInt(String(anio), 10) : undefined,
            mileage: kilometraje ? parseInt(String(kilometraje).replace(/\D/g, ""), 10) : undefined,
            fuelType: combustible || "Gasolina",
          },
        });
      }
    }

    const clienteFinal = await prisma.customer.findUnique({
      where: { id },
      include: { vehicles: true },
    });

    return NextResponse.json({ success: true, cliente: clienteFinal });
  } catch (error: any) {
    console.error("Error al actualizar cliente en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar cliente" },
      { status: 500 }
    );
  }
}
