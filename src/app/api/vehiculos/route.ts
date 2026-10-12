import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Función auxiliar para obtener o crear cliente por defecto
async function getDefaultCustomer() {
  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        identification: "CLI-001",
        name: "Cliente General",
        phone: "555-0199",
        email: "cliente@autog.com",
        type: "Personal",
      },
    });
  }
  return customer;
}

// GET: Obtener todos los vehículos de Neon (con seed automático si está vacío)
export async function GET() {
  try {
    let vehicles = await prisma.vehicle.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Si la base de datos no tiene vehículos aún, sembramos los iniciales
    if (vehicles.length === 0) {
      const defaultCustomer = await getDefaultCustomer();
      
      const seedData = [
        {
          plate: "ABC-123",
          brand: "Toyota",
          model: "Hilux",
          year: 2020,
          mileage: 45200,
          color: "Blanco",
          fuelType: "Diésel",
          customerId: defaultCustomer.id,
        },
        {
          plate: "XYZ-987",
          brand: "Honda",
          model: "Civic",
          year: 2018,
          mileage: 68100,
          color: "Gris",
          fuelType: "Gasolina",
          customerId: defaultCustomer.id,
        },
        {
          plate: "QWE-554",
          brand: "Ford",
          model: "Escape",
          year: 2021,
          mileage: 49800,
          color: "Azul",
          fuelType: "Híbrido",
          customerId: defaultCustomer.id,
        },
      ];

      for (const item of seedData) {
        await prisma.vehicle.upsert({
          where: { plate: item.plate },
          update: {},
          create: item,
        });
      }

      vehicles = await prisma.vehicle.findMany({
        include: {
          customer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    return NextResponse.json({
      success: true,
      vehicles,
      count: vehicles.length,
    });
  } catch (error: any) {
    console.error("Error al obtener vehículos de Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al conectar con Neon" },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo vehículo en Neon
export async function POST(request: Request) {
  try {
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
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      const defaultCustomer = await getDefaultCustomer();
      finalCustomerId = defaultCustomer.id;
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
      message: "Vehículo registrado en Neon con éxito.",
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear vehículo en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar vehículo" },
      { status: 500 }
    );
  }
}

// PUT: Actualizar vehículo existente en Neon
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, plate, brand, model, year, mileage, color, vin, fuelType } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID del vehículo es obligatorio para actualizar." },
        { status: 400 }
      );
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
      message: "Vehículo actualizado en Neon correctamente.",
    });
  } catch (error: any) {
    console.error("Error al actualizar vehículo en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar vehículo" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar vehículo de Neon
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID del vehículo es requerido para eliminar." },
        { status: 400 }
      );
    }

    const deletedVehicle = await prisma.vehicle.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      vehicle: deletedVehicle,
      message: `Vehículo con placa ${deletedVehicle.plate} eliminado exitosamente de Neon.`,
    });
  } catch (error: any) {
    console.error("Error al eliminar vehículo en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar vehículo" },
      { status: 500 }
    );
  }
}
