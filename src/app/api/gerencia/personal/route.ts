import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { getVerifiedSessionFromRequest, isAdminSession } from "@/lib/signed-tokens";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const employees = await withRetry(async () => {
      return await prisma.employee.findMany({
        orderBy: { createdAt: "desc" },
      });
    });

    // Personal no gerencial (POS/Taller/Oficina) solo necesita el listado; ocultar salarios
    const session = getVerifiedSessionFromRequest(req);
    if (!isAdminSession(session)) {
      return NextResponse.json(employees.map(({ salary: _salary, ...rest }: any) => rest));
    }

    return NextResponse.json(employees);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener personal" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await withRetry(async () => {
      return await prisma.employee.create({
        data: {
          name: body.name || "Nuevo Empleado",
          email: body.email || `emp_${Date.now()}_${Math.floor(Math.random() * 1000)}@autog.local`,
          phone: body.phone || null,
          role: body.role || "Especialista",
          department: body.department || "Taller",
          location: body.location || "Principal",
          lastLogin: "Recién registrado",
          status: body.status || "Activo",
          salary: body.salary ? Number(body.salary) : null,
        },
      });
    });
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear empleado" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const updated = await withRetry(async () => {
      return await prisma.employee.update({
        where: { id },
        data: {
          name: body.name !== undefined ? body.name : undefined,
          email: body.email !== undefined ? body.email : undefined,
          phone: body.phone !== undefined ? body.phone : undefined,
          role: body.role !== undefined ? body.role : undefined,
          department: body.department !== undefined ? body.department : undefined,
          location: body.location !== undefined ? body.location : undefined,
          status: body.status !== undefined ? body.status : undefined,
          salary: body.salary !== undefined ? Number(body.salary) : undefined,
        },
      });
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar empleado" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      await prisma.employee.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar empleado" }, { status: 500 });
  }
}
