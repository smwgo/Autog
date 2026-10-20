import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function registrarAuditoria(action: string, details: string, level: string = "INFO") {
  try {
    const now = new Date();
    const dateLabel = now.toLocaleString("es-EC", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    await prisma.auditLog.create({
      data: {
        dateLabel,
        userName: "Gerencia",
        ipAddress: "192.168.1.10",
        module: "USUARIOS",
        action,
        details,
        level,
      },
    });
  } catch {
    // Ignorar si falla el log
  }
}

export async function GET() {
  try {
    const users = await withRetry(async () => {
      return await prisma.appUserAccess.findMany({
        orderBy: { createdAt: "desc" },
      });
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al obtener usuarios en Neon PostgreSQL" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cleanName = String(body.name || "").trim();
    const cleanEmail = String(body.email || "").trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return NextResponse.json(
        { error: "El nombre y correo electrónico del usuario son obligatorios." },
        { status: 400 }
      );
    }

    const created = await withRetry(async () => {
      const dup = await prisma.appUserAccess.findUnique({
        where: { email: cleanEmail },
      });
      if (dup) {
        throw new Error("Ya existe un usuario registrado con ese correo electrónico.");
      }

      const identification = String(body.identification || "").trim() || null;
      const phone = String(body.phone || "").trim() || null;
      const username =
        String(body.username || "").trim() ||
        cleanEmail.split("@")[0] ||
        `user${Math.floor(100 + Math.random() * 900)}`;
      const pinCode = String(body.pinCode || "1234").trim() || "1234";
      const role = String(body.role || "Operador").trim();
      const branch = String(body.branch || "Sede Principal").trim();
      const accessOficina = Boolean(body.accessOficina);
      const accessPos = Boolean(body.accessPos);
      const accessTaller = Boolean(body.accessTaller);
      const status = String(body.status || "Activo").trim();

      const user = await prisma.appUserAccess.create({
        data: {
          identification,
          name: cleanName,
          email: cleanEmail,
          phone,
          username,
          pinCode,
          role,
          branch,
          accessOficina,
          accessPos,
          accessTaller,
          status,
          lastAccess: "Recién creado",
        },
      });

      const modulosActivos = [
        accessOficina ? "Oficina" : null,
        accessPos ? "POS" : null,
        accessTaller ? "Taller/Garaje" : null,
      ]
        .filter(Boolean)
        .join(", ");

      await registrarAuditoria(
        "CREAR_USUARIO",
        `Usuario ${cleanName} (${cleanEmail}) creado con acceso a: ${modulosActivos || "Ninguno"}`
      );

      return user;
    });

    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al crear usuario en Neon PostgreSQL" },
      { status: 400 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de usuario requerido." }, { status: 400 });
    }

    const updated = await withRetry(async () => {
      const curr = await prisma.appUserAccess.findUnique({ where: { id } });
      if (!curr) {
        throw new Error("Usuario no encontrado.");
      }

      const nextIdentification =
        body.identification !== undefined ? (String(body.identification).trim() || null) : curr.identification;
      const nextName = body.name !== undefined ? String(body.name).trim() : curr.name;
      const nextEmail =
        body.email !== undefined ? String(body.email).trim().toLowerCase() : curr.email;
      const nextPhone =
        body.phone !== undefined ? (String(body.phone).trim() || null) : curr.phone;
      const nextUsername =
        body.username !== undefined ? String(body.username).trim() : curr.username;
      const nextPin = body.pinCode !== undefined ? String(body.pinCode).trim() : curr.pinCode;
      const nextRole = body.role !== undefined ? String(body.role).trim() : curr.role;
      const nextBranch = body.branch !== undefined ? String(body.branch).trim() : curr.branch;
      const nextOficina =
        body.accessOficina !== undefined ? Boolean(body.accessOficina) : Boolean(curr.accessOficina);
      const nextPos =
        body.accessPos !== undefined ? Boolean(body.accessPos) : Boolean(curr.accessPos);
      const nextTaller =
        body.accessTaller !== undefined ? Boolean(body.accessTaller) : Boolean(curr.accessTaller);
      const nextStatus = body.status !== undefined ? String(body.status).trim() : curr.status;

      const user = await prisma.appUserAccess.update({
        where: { id },
        data: {
          identification: nextIdentification,
          name: nextName,
          email: nextEmail,
          phone: nextPhone,
          username: nextUsername,
          pinCode: nextPin,
          role: nextRole,
          branch: nextBranch,
          accessOficina: nextOficina,
          accessPos: nextPos,
          accessTaller: nextTaller,
          status: nextStatus,
        },
      });

      const modulosActivos = [
        nextOficina ? "Oficina" : null,
        nextPos ? "POS" : null,
        nextTaller ? "Taller/Garaje" : null,
      ]
        .filter(Boolean)
        .join(", ");

      await registrarAuditoria(
        "ACTUALIZAR_ACCESO_USUARIO",
        `Permisos actualizados para ${nextName}: [${modulosActivos || "Sin acceso"}] (${nextStatus})`
      );

      return user;
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al actualizar usuario en Neon PostgreSQL" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    await withRetry(async () => {
      const existing = await prisma.appUserAccess.findUnique({ where: { id } });
      await prisma.appUserAccess.delete({ where: { id } });

      if (existing) {
        await registrarAuditoria(
          "ELIMINAR_USUARIO",
          `Usuario eliminado: ${existing.name} (${existing.email})`,
          "ADVERTENCIA"
        );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al eliminar usuario en Neon PostgreSQL" },
      { status: 500 }
    );
  }
}
