import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Consultar clientes y estadísticas en Neon
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase() || "";
    const filtro = searchParams.get("filtro") || "todos";

    // Traer todos los clientes con sus vehículos
    const customers = await prisma.customer.findMany({
      include: {
        vehicles: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calcular estadísticas globales
    const totalClientes = customers.length;
    const totalVehiculos = customers.reduce((acc, c) => acc + c.vehicles.length, 0);
    const totalVip = customers.filter((c) => c.vip).length;
    // Clientes creados en los últimos 30 días
    const haceUnMes = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const totalNuevos = customers.filter((c) => new Date(c.createdAt) >= haceUnMes).length;

    // Filtrar clientes en memoria para búsqueda flexible
    const filtrados = customers.filter((c) => {
      const matchSearch =
        !busqueda ||
        c.name.toLowerCase().includes(busqueda) ||
        c.identification.toLowerCase().includes(busqueda) ||
        c.vehicles.some(
          (v) =>
            v.plate.toLowerCase().includes(busqueda) ||
            v.brand.toLowerCase().includes(busqueda) ||
            v.model.toLowerCase().includes(busqueda)
        );

      if (!matchSearch) return false;

      if (filtro === "persona" || filtro === "personal") return c.type === "Personal" || c.type === "Persona";
      if (filtro === "empresa") return c.type === "Empresa";

      return true;
    });

    return NextResponse.json({
      success: true,
      clientes: filtrados,
      stats: {
        totalClientes,
        totalVehiculos,
        totalVip,
        totalNuevos,
      },
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

    return NextResponse.json({
      success: true,
      cliente: clienteCreado,
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

// PUT: Actualizar cliente
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, type, phone, email, address, vip, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID requerido para actualizar" }, { status: 400 });
    }

    const clienteActualizado = await prisma.customer.update({
      where: { id },
      data: {
        name,
        type,
        phone,
        email,
        address,
        vip,
        notes,
      },
      include: {
        vehicles: true,
      },
    });

    return NextResponse.json({ success: true, cliente: clienteActualizado });
  } catch (error: any) {
    console.error("Error al actualizar cliente en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar cliente" },
      { status: 500 }
    );
  }
}
