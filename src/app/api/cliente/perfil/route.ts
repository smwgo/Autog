import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 600): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    return await withRetry(async () => {
      const customers = await prisma.customer.findMany({
        include: { vehicles: true },
        orderBy: { createdAt: "asc" },
        take: 50,
      });

      let activeCustomer = id
        ? customers.find((c) => c.id === id || c.identification === id) || customers[0]
        : customers[0];

      if (!activeCustomer) {
        activeCustomer = await prisma.customer.create({
          data: {
            identification: "XAXX010101000",
            name: "Juan Pérez",
            type: "Personal",
            phone: "+593 99 123 4567",
            email: "juan.perez@autog.com",
            address: "Av. Principal 123, Sector Norte",
            vip: true,
            notes: JSON.stringify({
              notifyServiceReminders: true,
              notifyRepairStatus: true,
              notifyPromotions: false,
            }),
          },
          include: { vehicles: true },
        });
      }

      let preferences = {
        notifyServiceReminders: true,
        notifyRepairStatus: true,
        notifyPromotions: false,
      };
      if (activeCustomer.notes) {
        try {
          const parsed = JSON.parse(activeCustomer.notes);
          if (typeof parsed === "object" && parsed !== null) {
            preferences = { ...preferences, ...parsed };
          }
        } catch {}
      }

      return NextResponse.json({
        success: true,
        profile: {
          id: activeCustomer.id,
          name: activeCustomer.name,
          identification: activeCustomer.identification,
          type: activeCustomer.type,
          phone: activeCustomer.phone,
          email: activeCustomer.email || "",
          address: activeCustomer.address || "",
          vip: activeCustomer.vip,
          preferences,
          vehiclesCount: activeCustomer.vehicles?.length || 0,
        },
        customers: customers.map((c) => ({
          id: c.id,
          name: c.name,
          identification: c.identification,
          email: c.email || "",
          phone: c.phone,
        })),
      });
    });
  } catch (error: any) {
    console.error("Error al obtener perfil de cliente en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar perfil en Neon." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, identification, email, phone, address, type, preferences } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de cliente requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (identification !== undefined) updateData.identification = identification.trim();
      if (email !== undefined) updateData.email = email.trim() || null;
      if (phone !== undefined) updateData.phone = phone.trim();
      if (address !== undefined) updateData.address = address.trim() || null;
      if (type !== undefined) updateData.type = type;
      if (preferences !== undefined) {
        updateData.notes = JSON.stringify(preferences);
      }

      const updated = await prisma.customer.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        profile: updated,
        message: "Perfil actualizado exitosamente en Neon DB.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar perfil en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar perfil en Neon." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, identification, email, phone, address, type = "Personal" } = body;

    if (!name || !identification) {
      return NextResponse.json(
        { success: false, error: "Nombre y documento/RFC son obligatorios." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      const created = await prisma.customer.create({
        data: {
          name: name.trim(),
          identification: identification.trim().toUpperCase(),
          email: email ? email.trim() : null,
          phone: phone ? phone.trim() : "+593 99 000 0000",
          address: address ? address.trim() : null,
          type,
          notes: JSON.stringify({
            notifyServiceReminders: true,
            notifyRepairStatus: true,
            notifyPromotions: false,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        profile: created,
        message: "Nuevo perfil de cliente registrado en Neon DB.",
      });
    });
  } catch (error: any) {
    console.error("Error al crear perfil en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear perfil en Neon." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de perfil requerido." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await prisma.customer.delete({ where: { id } });
      return NextResponse.json({
        success: true,
        message: "Perfil eliminado de Neon DB.",
      });
    });
  } catch (error: any) {
    console.error("Error al eliminar perfil:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar perfil en Neon." },
      { status: 500 }
    );
  }
}
