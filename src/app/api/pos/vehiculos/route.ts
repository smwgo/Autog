import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { emitRealtimeEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase() || "";

    // 1. Obtener vehículos registrados desde Cliente / DB
    const dbVehicles = await withRetry(() =>
      prisma.vehicle.findMany({
        include: {
          customer: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      })
    );

    // 2. Obtener órdenes de taller para cruzar placas e historial de visitas
    let tallerOrders: any[] = [];
    try {
      tallerOrders = await prisma.$queryRawUnsafe(`
        SELECT "plate", "vehicle", "client", "clientPhone", MAX("createdAt") as "lastVisit", COUNT(*)::int as "visits"
        FROM "WorkshopOrder"
        WHERE "plate" IS NOT NULL AND TRIM("plate") != ''
        GROUP BY "plate", "vehicle", "client", "clientPhone"
      `);
    } catch {
      tallerOrders = [];
    }

    const tallerMap = new Map<string, any>();
    for (const t of tallerOrders) {
      if (t.plate) {
        const alnum = t.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (alnum && !tallerMap.has(alnum)) {
          tallerMap.set(alnum, t);
        }
      }
    }

    // 3. Unificar vehículos de Cliente y Taller (sin duplicar por placa normalizada)
    const listaVehiculos: any[] = [];
    const platesVistas = new Set<string>();

    for (const v of dbVehicles) {
      const cleanPlate = v.plate.trim().toUpperCase();
      const alnumPlate = cleanPlate.replace(/[^A-Z0-9]/g, "") || cleanPlate;
      if (platesVistas.has(alnumPlate)) continue;
      platesVistas.add(alnumPlate);

      const tInfo = tallerMap.get(alnumPlate);
      listaVehiculos.push({
        id: v.id,
        plate: cleanPlate,
        brand: v.brand || "General",
        model: v.model || "Vehículo",
        year: v.year || null,
        color: v.color || null,
        mileage: v.mileage || null,
        vin: v.vin || null,
        fuelType: v.fuelType || "Gasolina",
        imageUrl: (v as any).imageUrl || null,
        photosJson: (v as any).photosJson || null,
        customerId: v.customerId,
        customerName: v.customer?.name || tInfo?.client || "Consumidor Final",
        customerPhone: v.customer?.phone || tInfo?.clientPhone || null,
        customerIdentification: v.customer?.identification || null,
        origin: tInfo ? "Ambos" : "Cliente",
        tallerVisits: tInfo?.visits || 0,
        lastVisit: tInfo?.lastVisit || v.updatedAt,
        createdAt: v.createdAt,
      });
    }

    // 4. Solo se muestran vehículos reales registrados en la tabla Vehicle (no resucitar órdenes huérfanas/eliminadas)

    // 5. Filtrar por búsqueda si aplica
    const filtrados = listaVehiculos.filter((item) => {
      if (!busqueda) return true;
      return (
        item.plate.toLowerCase().includes(busqueda) ||
        item.brand.toLowerCase().includes(busqueda) ||
        item.model.toLowerCase().includes(busqueda) ||
        item.customerName.toLowerCase().includes(busqueda) ||
        (item.customerPhone && item.customerPhone.toLowerCase().includes(busqueda))
      );
    });

    return NextResponse.json({
      success: true,
      vehicles: filtrados,
      total: filtrados.length,
    });
  } catch (error: any) {
    console.error("Error al obtener vehículos POS:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar vehículos." },
      { status: 500 }
    );
  }
}

// POST: Registrar nuevo vehículo desde POS
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      plate,
      brand,
      model,
      year,
      color,
      mileage,
      vin,
      fuelType = "Gasolina",
      customerName,
      customerPhone,
      customerId,
      imageUrl,
      fotoVehiculo,
    } = body;
    const photoUrl = imageUrl || fotoVehiculo || null;

    if (!plate || !brand || !model) {
      return NextResponse.json(
        { success: false, error: "Placa, Marca y Modelo son obligatorios." },
        { status: 400 }
      );
    }

    const cleanPlate = plate.trim().toUpperCase();

    // Comprobar existencia
    const existente = await prisma.vehicle.findUnique({
      where: { plate: cleanPlate },
    });

    if (existente) {
      return NextResponse.json(
        { success: false, error: `Ya existe un vehículo registrado con la placa ${cleanPlate}.` },
        { status: 409 }
      );
    }

    // Resolver cliente
    let finalCustomerId = customerId;
    if (!finalCustomerId && customerName?.trim()) {
      let c = await prisma.customer.findFirst({
        where: { name: { contains: customerName.trim(), mode: "insensitive" } },
      });
      if (!c) {
        c = await prisma.customer.create({
          data: {
            identification: `CLI-${Date.now().toString().slice(-4)}`,
            name: customerName.trim(),
            phone: customerPhone?.trim() || "N/A",
            type: "POS",
          },
        });
      }
      finalCustomerId = c.id;
    }

    if (!finalCustomerId) {
      const defaultCust = await prisma.customer.findFirst();
      if (defaultCust) {
        finalCustomerId = defaultCust.id;
      } else {
        const nuevoCust = await prisma.customer.create({
          data: {
            identification: "CLI-001",
            name: "Cliente Mostrador",
            phone: "N/A",
            type: "Personal",
          },
        });
        finalCustomerId = nuevoCust.id;
      }
    }

    const nuevoVehiculo = await prisma.vehicle.create({
      data: {
        plate: cleanPlate,
        brand: brand.trim(),
        model: model.trim(),
        year: year ? parseInt(year, 10) : null,
        color: color ? color.trim() : null,
        mileage: mileage ? parseInt(mileage, 10) : 0,
        vin: vin ? vin.trim().toUpperCase() : null,
        fuelType: fuelType || "Gasolina",
        customerId: finalCustomerId,
        imageUrl: photoUrl || null,
      },
      include: {
        customer: true,
      },
    });

    if (photoUrl) {
      try {
        await prisma.$executeRawUnsafe(
          'UPDATE "Vehicle" SET "imageUrl" = $1 WHERE "id" = $2',
          photoUrl,
          nuevoVehiculo.id
        );
      } catch (errDb) {
        console.warn("Aviso al actualizar imageUrl en Vehicle:", errDb);
      }
    }

    emitRealtimeEvent({ channel: "vehiculos", action: "created", entityId: nuevoVehiculo.id });
    emitRealtimeEvent({ channel: "clientes", action: "updated", entityId: nuevoVehiculo.customerId });

    return NextResponse.json(
      {
        success: true,
        vehicle: nuevoVehiculo,
        message: `Vehículo con placa ${cleanPlate} registrado con éxito.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al registrar vehículo en POS:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear vehículo." },
      { status: 500 }
    );
  }
}

// PUT: Actualizar vehículo
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, plate, brand, model, year, color, mileage, vin, fuelType, customerName, customerPhone, imageUrl, fotoVehiculo } = body;
    const photoUrl = imageUrl !== undefined ? imageUrl : fotoVehiculo;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de vehículo requerido." },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (plate) updateData.plate = plate.trim().toUpperCase();
    if (brand) updateData.brand = brand.trim();
    if (model) updateData.model = model.trim();
    if (year !== undefined) updateData.year = year ? parseInt(year, 10) : null;
    if (color !== undefined) updateData.color = color ? color.trim() : null;
    if (mileage !== undefined) updateData.mileage = mileage ? parseInt(mileage, 10) : 0;
    if (vin !== undefined) updateData.vin = vin ? vin.trim().toUpperCase() : null;
    if (fuelType !== undefined) updateData.fuelType = fuelType;
    if (photoUrl !== undefined) updateData.imageUrl = photoUrl || null;

    // Si viene ID de taller virtual, crearlo en la DB
    if (id.startsWith("taller-")) {
      const cleanPlate = (plate || id.replace("taller-", "")).trim().toUpperCase();
      let c = await prisma.customer.findFirst({
        where: { name: { contains: (customerName || "Cliente Taller").trim(), mode: "insensitive" } },
      });
      if (!c) {
        c = await prisma.customer.create({
          data: {
            identification: `CLI-${Date.now().toString().slice(-4)}`,
            name: (customerName || "Cliente Taller").trim(),
            phone: customerPhone?.trim() || "N/A",
            type: "Taller",
          },
        });
      }

      const creado = await prisma.vehicle.upsert({
        where: { plate: cleanPlate },
        update: updateData,
        create: {
          plate: cleanPlate,
          brand: brand?.trim() || "General",
          model: model?.trim() || "Vehículo",
          year: year ? parseInt(year, 10) : null,
          color: color?.trim() || null,
          mileage: mileage ? parseInt(mileage, 10) : 0,
          vin: vin?.trim()?.toUpperCase() || null,
          fuelType: fuelType || "Gasolina",
          customerId: c.id,
        },
        include: { customer: true },
      });

      emitRealtimeEvent({ channel: "vehiculos", action: "updated", entityId: creado.id });
      emitRealtimeEvent({ channel: "clientes", action: "updated", entityId: creado.customerId });

      return NextResponse.json({
        success: true,
        vehicle: creado,
        message: "Vehículo sincronizado y actualizado.",
      });
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: { customer: true },
    });

    if (photoUrl !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          'UPDATE "Vehicle" SET "imageUrl" = $1 WHERE "id" = $2',
          photoUrl || null,
          updated.id
        );
      } catch (errDb) {
        console.warn("Aviso al actualizar raw imageUrl en Vehicle:", errDb);
      }
    }

    emitRealtimeEvent({ channel: "vehiculos", action: "updated", entityId: updated.id });
    emitRealtimeEvent({ channel: "clientes", action: "updated", entityId: updated.customerId });

    return NextResponse.json({
      success: true,
      vehicle: updated,
      message: "Vehículo actualizado con éxito.",
    });
  } catch (error: any) {
    console.error("Error al actualizar vehículo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar vehículo." },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar vehículo
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const plateParam = searchParams.get("plate");

    if (!id && !plateParam) {
      return NextResponse.json(
        { success: false, error: "ID o placa de vehículo requerido." },
        { status: 400 }
      );
    }

    let plate = (plateParam || "").trim().toUpperCase();

    // Si viene ID virtual tipo taller-XXXXXX
    if (id?.startsWith("taller-")) {
      const extracted = id.replace("taller-", "").trim().toUpperCase();
      if (!plate) plate = extracted;
    } else if (id && !plate) {
      try {
        const v = await prisma.vehicle.findUnique({
          where: { id },
          select: { plate: true },
        });
        if (v?.plate) {
          plate = v.plate.trim().toUpperCase();
        }
      } catch (err) {
        console.warn("No se pudo obtener placa por ID:", err);
      }
    }

    // Desvincular claves foráneas en Neon para no violar restricciones referenciales
    if (id && !id.startsWith("taller-")) {
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
    }

    if (plate) {
      await prisma
        .$executeRawUnsafe(
          `UPDATE "WorkshopOrder" SET "vehicleId" = NULL WHERE UPPER("plate") = $1`,
          plate
        )
        .catch(() => {});
    }

    // 1. Eliminar de prisma.vehicle por ID
    if (id && !id.startsWith("taller-")) {
      await prisma.vehicle
        .deleteMany({
          where: { id },
        })
        .catch((e) => console.warn("Error delete vehicle by id:", e));

      await prisma
        .$executeRawUnsafe(`DELETE FROM "Vehicle" WHERE "id" = $1`, id)
        .catch(() => {});
    }

    // 2. Si tenemos la placa, eliminar de todas las tablas en Neon y en el espejo
    if (plate) {
      await prisma.vehicle
        .deleteMany({
          where: { plate: { equals: plate, mode: "insensitive" } },
        })
        .catch((e) => console.warn("Error delete vehicle by plate:", e));

      await prisma
        .$executeRawUnsafe(
          `DELETE FROM "Vehicle" WHERE UPPER("plate") = $1`,
          plate
        )
        .catch(() => {});

      await prisma.workshopOrder
        .deleteMany({
          where: { plate: { equals: plate, mode: "insensitive" } },
        })
        .catch((e) => console.warn("Error delete workshopOrder by plate:", e));

      await prisma
        .$executeRawUnsafe(
          `DELETE FROM "WorkshopOrder" WHERE UPPER("plate") = $1`,
          plate
        )
        .catch(() => {});

      await prisma.workshopInspection
        .deleteMany({
          where: { plate: { equals: plate, mode: "insensitive" } },
        })
        .catch(() => {});

      await prisma.workshopTask
        .deleteMany({
          where: { plate: { equals: plate, mode: "insensitive" } },
        })
        .catch(() => {});

      await prisma.workshopHistory
        .deleteMany({
          where: { plate: { equals: plate, mode: "insensitive" } },
        })
        .catch(() => {});

      await prisma.clientAppointment
        .deleteMany({
          where: { plate: { equals: plate, mode: "insensitive" } },
        })
        .catch(() => {});

      await prisma.clientQuote
        .deleteMany({
          where: { plate: { equals: plate, mode: "insensitive" } },
        })
        .catch(() => {});
    }

    emitRealtimeEvent({ channel: "vehiculos", action: "deleted", entityId: id ?? undefined });
    emitRealtimeEvent({ channel: "clientes", action: "updated" });
    emitRealtimeEvent({ channel: "taller", action: "deleted" });
    emitRealtimeEvent({ channel: "presupuestos", action: "deleted" });

    return NextResponse.json({
      success: true,
      message: `Vehículo ${plate || id} eliminado con éxito de base de datos.`,
    });
  } catch (error: any) {
    console.error("Error al eliminar vehículo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar vehículo." },
      { status: 500 }
    );
  }
}

