import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { getVerifiedSessionFromRequest } from "@/lib/signed-tokens";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await withRetry(async () => {
      return await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
      });
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener auditoría" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-client-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      body.ipAddress ||
      "127.0.0.1";

    const created = await withRetry(async () => {
      const nowStr = `Hoy, ${new Date().toLocaleTimeString("es-EC")}`;
      return await prisma.auditLog.create({
        data: {
          dateLabel: body.dateLabel || nowStr,
          userName: body.userName || "Administrador (Gerencia)",
          ipAddress: clientIp,
          module: body.module || "Sistema",
          action: body.action || "Registro Manual de Auditoría",
          details: body.details || "Verificación de control interno",
          level: body.level || "INFO",
        },
      });
    });
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al registrar evento" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = getVerifiedSessionFromRequest(req);
  if (!session || (String(session.role || "").toUpperCase() !== "ROOT" && !session.isSuperAdmin)) {
    return NextResponse.json(
      { error: "Solo el superadministrador ROOT puede eliminar registros de auditoría." },
      { status: 403 }
    );
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      await prisma.auditLog.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar log" }, { status: 500 });
  }
}
