import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedSessionFromRequest, isStaffSession } from "@/lib/signed-tokens";
import { resolveSessionCustomerScope } from "@/lib/client-scope";
import { emitRealtimeEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";
const NO_STORE_HEADERS = { "Cache-Control": "no-store, no-cache, must-revalidate" };

// GET: Obtener vehículos de Neon (acotados al cliente si no es personal)
export async function GET(request: Request) {
  try {
    const session = getVerifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }
    const staff = isStaffSession(session);

    let where: any = {};
    if (!staff) {
      const scoped = await resolveSessionCustomerScope(session);
      if (!scoped) {
        return NextResponse.json({ success: true, vehicles: [], count: 0 });
      }
      where = { customerId: scoped.id };
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        vehicles,
        count: vehicles.length,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    console.error("Error al obtener vehículos de base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al conectar con base de datos" },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo vehículo en Neon
export async function POST(request: Request) {
  try {
    const session = getVerifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }
    const staff = isStaffSession(session);
    const body = await request.json();
    const {
      plate,
      brand,
      model,
      year,
      mileage,
      color,
      vin,
      fuelType = "Gasolina",
      customerId,
    } = body;

    if (!plate || !brand || !model) {
      return NextResponse.json(
        { success: false, error: "Placa, marca y modelo son campos obligatorios." },
        { status: 400 }
      );
    }

    const cleanPlate = plate.trim().toUpperCase();

    // Verificar duplicado de placa
    const existing = await prisma.vehicle.findUnique({
      where: { plate: cleanPlate },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Ya existe un vehículo registrado con la placa ${cleanPlate}.` },
        { status: 409 }
      );
    }

    // Resolver cliente asociado
    let finalCustomerId = staff ? customerId : undefined;
    if (!staff) {
      const scoped = await resolveSessionCustomerScope(session);
      if (!scoped) {
        return NextResponse.json(
          { success: false, error: "No se encontró un perfil de cliente asociado a tu sesión." },
          { status: 403 }
        );
      }
      finalCustomerId = scoped.id;
    } else if (!finalCustomerId) {
      const firstCustomer = await prisma.customer.findFirst();
      if (!firstCustomer) {
        return NextResponse.json(
          { success: false, error: "Debe seleccionar o crear un cliente antes de registrar un vehículo." },
          { status: 400 }
        );
      }
      finalCustomerId = firstCustomer.id;
    }

    const newVehicle = await prisma.vehicle.create({
      data: {
        plate: cleanPlate,
        brand: brand.trim(),
        model: model.trim(),
        year: year ? parseInt(year, 10) : null,
        mileage: mileage ? parseInt(mileage, 10) : 0,
        color: color ? color.trim() : null,
        vin: vin ? vin.trim().toUpperCase() : null,
        fuelType: fuelType || "Gasolina",
        customerId: finalCustomerId,
      },
      include: {
        customer: true,
      },
    });

    return NextResponse.json({
      success: true,
      vehicle: newVehicle,
      message: "Vehículo registrado en base de datos con éxito.",
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear vehículo en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar vehículo" },
      { status: 500 }
    );
  }
}

// PUT: Actualizar vehículo existente en Neon
export async function PUT(request: Request) {
  try {
    const session = getVerifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }
    const staff = isStaffSession(session);
    const body = await request.json();
    const { id, plate, brand, model, year, mileage, color, vin, fuelType } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID del vehículo es obligatorio para actualizar." },
        { status: 400 }
      );
    }

    if (!staff) {
      const scoped = await resolveSessionCustomerScope(session);
      const existingVeh = await prisma.vehicle.findUnique({ where: { id }, select: { customerId: true } });
      if (!scoped || !existingVeh || existingVeh.customerId !== scoped.id) {
        return NextResponse.json(
          { success: false, error: "No autorizado para modificar este vehículo." },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};
    if (plate) updateData.plate = plate.trim().toUpperCase();
    if (brand) updateData.brand = brand.trim();
    if (model) updateData.model = model.trim();
    if (year !== undefined) updateData.year = year ? parseInt(year, 10) : null;
    if (mileage !== undefined) updateData.mileage = mileage ? parseInt(mileage, 10) : 0;
    if (color !== undefined) updateData.color = color ? color.trim() : null;
    if (vin !== undefined) updateData.vin = vin ? vin.trim().toUpperCase() : null;
    if (fuelType !== undefined) updateData.fuelType = fuelType;

    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
      },
    });

    return NextResponse.json({
      success: true,
      vehicle: updatedVehicle,
      message: "Vehículo actualizado en base de datos correctamente.",
    });
  } catch (error: any) {
    console.error("Error al actualizar vehículo en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar vehículo" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar vehículo de Neon
export async function DELETE(request: Request) {
  try {
    const session = getVerifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
    }
    const staff = isStaffSession(session);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID del vehículo es requerido para eliminar." },
        { status: 400 }
      );
    }

    if (!staff) {
      const scoped = await resolveSessionCustomerScope(session);
      const existingVeh = await prisma.vehicle.findUnique({ where: { id }, select: { customerId: true } });
      if (!scoped || !existingVeh || existingVeh.customerId !== scoped.id) {
        return NextResponse.json(
          { success: false, error: "No autorizado para eliminar este vehículo." },
          { status: 403 }
        );
      }
    }

    await prisma
      .$executeRawUnsafe(
        `UPDATE "WorkshopOrder" SET "vehicleId" = NULL WHERE "vehicleId" = $1`,
        id
      )
      .catch(() => {});

    await prisma
      .$executeRawUnsafe(
        `UPDATE "WorkshopEvidence" SET "vehicleId" = NULL WHERE "vehicleId" = $1`,
        id
      )
      .catch(() => {});

    const deletedVehicle = await prisma.vehicle.delete({
      where: { id },
    });

    emitRealtimeEvent({ channel: "vehiculos", action: "deleted", entityId: id });
    emitRealtimeEvent({ channel: "clientes", action: "updated" });

    return NextResponse.json({
      success: true,
      vehicle: deletedVehicle,
      message: `Vehículo con placa ${deletedVehicle.plate} eliminado exitosamente de base de datos.`,
    });
  } catch (error: any) {
    console.error("Error al eliminar vehículo en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar vehículo" },
      { status: 500 }
    );
  }
}
