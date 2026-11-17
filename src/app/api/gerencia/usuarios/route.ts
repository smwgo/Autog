import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, withRetry } from "@/lib/prisma";
import { isProtectedAdminEmail, PROTECTED_ADMIN_EMAILS } from "@/lib/admin-accounts";
import { getVerifiedSessionFromRequest, isAdminSession } from "@/lib/signed-tokens";

export const dynamic = "force-dynamic";

const MASKED_PIN = "••••";

function requireGerenciaAdmin(req: Request): NextResponse | null {
  const session = getVerifiedSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado. Inicia sesión." }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Requiere permisos de Gerencia." }, { status: 403 });
  }
  return null;
}

async function hashPinIfNeeded(rawPin: string): Promise<string> {
  const clean = rawPin.trim();
  if (clean.startsWith("$2a$") || clean.startsWith("$2b$") || clean.startsWith("$2y$")) {
    return clean;
  }
  return bcrypt.hash(clean, 10);
}

async function registrarAuditoria(action: string, details: string, level: string = "INFO", ipAddress: string = "127.0.0.1") {
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
        ipAddress,
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

export async function GET(req: Request) {
  const authError = requireGerenciaAdmin(req);
  if (authError) return authError;
  try {
    const users = await withRetry(async () => {
      const [appUsers, adminUsers] = await Promise.all([
        prisma.appUserAccess.findMany({
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.findMany({
          where: {
            email: { in: [...PROTECTED_ADMIN_EMAILS] },
            role: "ROOT",
          },
          select: { id: true, email: true, createdAt: true },
        }),
      ]);

      const regularUsers = appUsers
        .filter((user) => !isProtectedAdminEmail(user.email))
        .map((user) => ({
          ...user,
          pinCode: user.pinCode ? MASKED_PIN : "",
          pinConfigured: Boolean(user.pinCode),
        }));
      const protectedAdmins = adminUsers.map((user) => ({
        id: `protected-root:${user.id}`,
        identification: null,
        name: "Administrador",
        email: user.email,
        phone: null,
        username: null,
        pinCode: "",
        role: "Administrador",
        branch: "Principal",
        accessOficina: true,
        accessPos: true,
        accessTaller: true,
        status: "Activo",
        lastAccess: "Cuenta principal",
        createdAt: user.createdAt,
        isProtected: true,
      }));

      return [...regularUsers, ...protectedAdmins].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al obtener usuarios en base de datos" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authError = requireGerenciaAdmin(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const cleanName = String(body.name || "").trim();
    const rawEmail = String(body.email || "").trim().toLowerCase();
    const cleanEmail = rawEmail ? (rawEmail.includes("@") ? rawEmail : `${rawEmail}@gmail.com`) : "";

    if (!cleanName || !cleanEmail) {
      return NextResponse.json(
        { error: "El nombre y correo electrónico del usuario son obligatorios." },
        { status: 400 }
      );
    }

    if (isProtectedAdminEmail(cleanEmail)) {
      return NextResponse.json(
        { error: "Este correo está reservado para una cuenta principal protegida." },
        { status: 403 }
      );
    }

    // Límite estricto de máximo 14 usuarios en total (Sede Principal + Sucursal combinadas)
    const MAX_USUARIOS_TOTAL = 14;
    const totalActual = await withRetry(async () => {
      return await prisma.appUserAccess.count();
    });

    if (totalActual >= MAX_USUARIOS_TOTAL) {
      return NextResponse.json(
        {
          error: `Límite alcanzado: solo se permite un máximo de ${MAX_USUARIOS_TOTAL} usuarios entre ambas sedes (actual: ${totalActual}/${MAX_USUARIOS_TOTAL}). Elimina un usuario para poder registrar uno nuevo.`,
        },
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
      const rawPin = String(body.pinCode || "1234").trim() || "1234";
      const pinCode = /^[•*]+$/.test(rawPin) ? await hashPinIfNeeded("1234") : await hashPinIfNeeded(rawPin);
      const branch = String(body.branch || "Sede Principal").trim();
      let role = String(body.role || "Taller").trim();
      const isSucursal = branch.toLowerCase().includes("sucursal");

      if (isSucursal && role !== "POS" && role !== "Taller" && role !== "Cliente") {
        throw new Error("En Sucursal solo se permite acceso a POS, Taller y Cliente.");
      }

      const accessOficina = isSucursal ? false : Boolean(body.accessOficina);
      const accessPos = role === "POS" || (!isSucursal && Boolean(body.accessPos));
      const accessTaller = role === "Taller" || (!isSucursal && Boolean(body.accessTaller));
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

      const reqIp =
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-client-ip") ||
        req.headers.get("x-real-ip") ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "127.0.0.1";

      await registrarAuditoria(
        "CREAR_USUARIO",
        `Usuario ${cleanName} (${cleanEmail}) creado con acceso a: ${modulosActivos || "Ninguno"}`,
        "INFO",
        reqIp
      );

      return user;
    });

    return NextResponse.json({
      success: true,
      ...created,
      pinCode: created.pinCode ? MASKED_PIN : "",
      pinConfigured: Boolean(created.pinCode),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al crear usuario en base de datos" },
      { status: 400 }
    );
  }
}

export async function PUT(req: Request) {
  const authError = requireGerenciaAdmin(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de usuario requerido." }, { status: 400 });
    }
    if (String(id).startsWith("protected-root:")) {
      return NextResponse.json(
        { error: "Las cuentas principales protegidas no se pueden editar." },
        { status: 403 }
      );
    }

    const updated = await withRetry(async () => {
      const curr = await prisma.appUserAccess.findUnique({ where: { id } });
      if (!curr) {
        throw new Error("Usuario no encontrado.");
      }
      if (isProtectedAdminEmail(curr.email)) {
        throw new Error("Las cuentas principales protegidas no se pueden editar.");
      }

      const nextIdentification =
        body.identification !== undefined ? (String(body.identification).trim() || null) : curr.identification;
      const nextName = body.name !== undefined ? String(body.name).trim() : curr.name;
      const rawNextEmail = body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined;
      const nextEmail = rawNextEmail !== undefined ? (rawNextEmail.includes("@") ? rawNextEmail : `${rawNextEmail}@gmail.com`) : curr.email;
      if (isProtectedAdminEmail(nextEmail)) {
        throw new Error("Este correo está reservado para una cuenta principal protegida.");
      }
      const nextPhone =
        body.phone !== undefined ? (String(body.phone).trim() || null) : curr.phone;
      const nextUsername =
        body.username !== undefined ? String(body.username).trim() : curr.username;
      const incomingPin = body.pinCode !== undefined ? String(body.pinCode).trim() : "";
      const nextPin =
        incomingPin && !/^[•*]+$/.test(incomingPin)
          ? await hashPinIfNeeded(incomingPin)
          : curr.pinCode;
      const nextBranch = body.branch !== undefined ? String(body.branch).trim() : curr.branch;
      let nextRole = body.role !== undefined ? String(body.role).trim() : curr.role;
      const isNextSucursal = nextBranch.toLowerCase().includes("sucursal");

      if (isNextSucursal && nextRole !== "POS" && nextRole !== "Taller" && nextRole !== "Cliente") {
        throw new Error("En Sucursal solo se permite acceso a POS, Taller y Cliente.");
      }

      const nextOficina = isNextSucursal ? false : (body.accessOficina !== undefined ? Boolean(body.accessOficina) : Boolean(curr.accessOficina));
      const nextPos = nextRole === "POS" || (!isNextSucursal && (body.accessPos !== undefined ? Boolean(body.accessPos) : Boolean(curr.accessPos)));
      const nextTaller = nextRole === "Taller" || (!isNextSucursal && (body.accessTaller !== undefined ? Boolean(body.accessTaller) : Boolean(curr.accessTaller)));
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

      const reqIp =
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-client-ip") ||
        req.headers.get("x-real-ip") ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "127.0.0.1";

      await registrarAuditoria(
        "ACTUALIZAR_ACCESO_USUARIO",
        `Permisos actualizados para ${nextName}: [${modulosActivos || "Sin acceso"}] (${nextStatus})`,
        "INFO",
        reqIp
      );

      return user;
    });

    return NextResponse.json({
      success: true,
      ...updated,
      pinCode: updated.pinCode ? MASKED_PIN : "",
      pinConfigured: Boolean(updated.pinCode),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al actualizar usuario en base de datos" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  const authError = requireGerenciaAdmin(req);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }
    if (id.startsWith("protected-root:")) {
      return NextResponse.json(
        { error: "Las cuentas principales protegidas no se pueden eliminar." },
        { status: 403 }
      );
    }

    await withRetry(async () => {
      const existing = await prisma.appUserAccess.findUnique({ where: { id } });
      if (existing && isProtectedAdminEmail(existing.email)) {
        throw new Error("Las cuentas principales protegidas no se pueden eliminar.");
      }
      await prisma.appUserAccess.delete({ where: { id } });

      if (existing) {
        const reqIp =
          req.headers.get("cf-connecting-ip") ||
          req.headers.get("x-client-ip") ||
          req.headers.get("x-real-ip") ||
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "127.0.0.1";

        await registrarAuditoria(
          "ELIMINAR_USUARIO",
          `Usuario eliminado: ${existing.name} (${existing.email})`,
          "ADVERTENCIA",
          reqIp
        );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al eliminar usuario en base de datos" },
      { status: 500 }
    );
  }
}
