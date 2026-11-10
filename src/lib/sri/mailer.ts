/**
 * Envío de Comprobantes Electrónicos (RIDE PDF + XML) por Correo Electrónico
 * Utiliza Nodemailer con la configuración SMTP guardada en la base de datos (CompanyConfig).
 */

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export interface EnviarFacturaEmailParams {
  to: string;
  clienteNombre: string;
  numeroFactura: string;
  claveAcceso: string;
  fechaEmision: string;
  total: number;
  pdfBuffer: Buffer;
  xmlContent: string;
  empresaNombre?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export async function obtenerConfiguracionSmtp(): Promise<SmtpConfig | null> {
  try {
    const config = await prisma.companyConfig.findFirst({
      where: { id: "default" },
    });

    // Revisar si hay configuración en la base de datos o en variables de entorno
    const host = process.env.SMTP_HOST || (config as any)?.smtpHost;
    const user = process.env.SMTP_USER || (config as any)?.smtpUser || config?.correo;
    const pass = process.env.SMTP_PASS || (config as any)?.smtpPass;
    const port = Number(process.env.SMTP_PORT || (config as any)?.smtpPort || 587);
    const from = process.env.SMTP_FROM || (config as any)?.smtpFrom || `"${config?.nombreComercial || config?.razonSocial || 'Facturación'}" <${user}>`;

    if (!host || !user || !pass) {
      return null;
    }

    return {
      host,
      port,
      secure: port === 465,
      user,
      pass,
      from,
    };
  } catch (err) {
    console.error("Error al obtener configuración SMTP:", err);
    return null;
  }
}

export async function enviarFacturaPorCorreo(params: EnviarFacturaEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    if (!params.to || !params.to.includes("@")) {
      return { success: false, error: "El cliente no tiene un correo electrónico válido registrado." };
    }

    const smtp = await obtenerConfiguracionSmtp();
    if (!smtp) {
      return {
        success: false,
        error: "No hay un servidor SMTP configurado para enviar correos. Configura los parámetros SMTP en Gerencia > Configuración.",
      };
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    const nombreEmpresa = params.empresaNombre || "Nuestro Taller";
    const totalFormateado = Number(params.total).toFixed(2);

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 20px;">${nombreEmpresa}</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Comprobante Electrónico Autorizado SRI</p>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.5;">
          Estimado(a) <strong>${params.clienteNombre}</strong>,
        </p>

        <p style="color: #334155; font-size: 14px; line-height: 1.5;">
          Le informamos que ha sido generada su <strong>Factura Electrónica No. ${params.numeroFactura}</strong> por un valor total de <strong>$${totalFormateado}</strong>.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 20px 0;">
          <table style="width: 100%; font-size: 13px; color: #334155;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold; width: 140px;">Número de Factura:</td>
              <td style="padding: 4px 0;">${params.numeroFactura}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">Fecha de Emisión:</td>
              <td style="padding: 4px 0;">${params.fechaEmision}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">Monto Total:</td>
              <td style="padding: 4px 0; font-weight: bold; color: #16a34a;">$${totalFormateado} USD</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">Clave de Acceso:</td>
              <td style="padding: 4px 0; font-family: monospace; font-size: 11px; word-break: break-all;">${params.claveAcceso}</td>
            </tr>
          </table>
        </div>

        <p style="color: #64748b; font-size: 12px; line-height: 1.4;">
          Adjunto a este correo encontrará el documento tributario en formato <strong>PDF (RIDE)</strong> y el archivo digital oficial <strong>XML firmado</strong> conforme a las disposiciones del Servicio de Rentas Internas del Ecuador.
        </p>

        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 11px;">
          Gracias por su preferencia.<br/>
          Este es un mensaje automático, por favor no responda a este remitente.
        </div>
      </div>
    `;

    const cleanInvoiceNum = params.numeroFactura.replace(/\s+/g, "_");

    await transporter.sendMail({
      from: smtp.from,
      to: params.to,
      subject: `Factura Electrónica ${params.numeroFactura} - ${nombreEmpresa}`,
      html: htmlBody,
      attachments: [
        {
          filename: `Factura_${cleanInvoiceNum}.pdf`,
          content: params.pdfBuffer,
          contentType: "application/pdf",
        },
        {
          filename: `Factura_${cleanInvoiceNum}.xml`,
          content: Buffer.from(params.xmlContent, "utf8"),
          contentType: "application/xml",
        },
      ],
    });

    return { success: true };
  } catch (err: any) {
    console.error("Error al enviar correo de factura:", err);
    return { success: false, error: err.message || "Error al enviar correo electrónico" };
  }
}

