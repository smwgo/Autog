import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getVerifiedSessionFromRequest, isAdminSession } from "@/lib/signed-tokens";

export async function POST(req: Request) {
  const session = getVerifiedSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Requiere permisos de Gerencia." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { host, port, user, to, from } = body;
    let pass = String(body.pass || "");

    if (/^[•*]+$/.test(pass.trim())) {
      const savedConfig = await (prisma as any).companyConfig
        .findUnique({ where: { id: "default" }, select: { smtpPass: true } })
        .catch(() => null);
      pass = savedConfig?.smtpPass || "";
    }

    if (!host || !user || !pass) {
      return NextResponse.json(
        { error: "Debes ingresar Servidor SMTP, Usuario y Contraseña" },
        { status: 400 }
      );
    }

    if (!to || !to.includes("@")) {
      return NextResponse.json(
        { error: "Ingresa un correo de destino válido para recibir la prueba" },
        { status: 400 }
      );
    }

    const portNum = Number(port) || 587;
    const isSecure = portNum === 465;

    const transporter = nodemailer.createTransport({
      host,
      port: portNum,
      secure: isSecure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    // 1. Verificar conexión SMTP
    await transporter.verify();

    // 2. Enviar correo de prueba
    await transporter.sendMail({
      from: from || `"${user}" <${user}>`,
      to,
      subject: "Prueba de Configuración de Correo - Autog Facturación SRI",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #16a34a; margin-top: 0;">✓ Servidor SMTP Conectado</h2>
          <p style="color: #334155; font-size: 14px;">
            Este es un correo de prueba enviado exitosamente desde el sistema de <strong>Facturación Electrónica SRI</strong>.
          </p>
          <ul style="font-size: 13px; color: #475569; padding-left: 20px;">
            <li><strong>Servidor:</strong> ${host}</li>
            <li><strong>Puerto:</strong> ${portNum}</li>
            <li><strong>Remitente:</strong> ${user}</li>
            <li><strong>Destino:</strong> ${to}</li>
          </ul>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
            La configuración de correo está lista para enviar facturas electrónicas y documentos RIDE a los clientes.
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      mensaje: `Conexión SMTP exitosa. Correo de prueba enviado a ${to}.`,
    });
  } catch (err: any) {
    console.error("Error probando conexión SMTP:", err);
    return NextResponse.json(
      { error: `Error SMTP: ${err.message || "No se pudo conectar al servidor de correo"}` },
      { status: 500 }
    );
  }
}

