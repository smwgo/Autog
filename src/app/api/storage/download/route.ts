import { NextResponse } from "next/server";
import { getSignedDownloadUrl, isR2Configured } from "@/lib/r2";
import { prisma as prismaClient } from "@/lib/prisma";

const prisma = prismaClient as any;

export const dynamic = "force-dynamic";

/**
 * Mecanismo seguro de lectura para buckets Cloudflare R2 privados.
 * Seguridad:
 * - Credenciales únicamente en el servidor.
 * - Validación contra path traversal (..).
 * - Genera URLs firmadas de corta duración por solicitud sin almacenar tokens temporales en base de datos.
 * - Soporta fallback inline local si R2 no está activo.
 */
function buildDataUriResponse(dataUri: string, isInline: boolean, safeKey: string) {
  const match = dataUri.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) {
    return NextResponse.json(
      { success: false, error: "Formato data URI inválido." },
      { status: 400 }
    );
  }
  const mimeType = match[1] || "application/octet-stream";
  const buffer = Buffer.from(match[2], "base64");
  const baseName = safeKey.split("/").pop() || "archivo";
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${baseName.replace(/"/g, "")}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const inline = searchParams.get("inline") === "1";

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Clave de archivo no proporcionada." },
        { status: 400 }
      );
    }

    // Sanitización contra path traversal
    const safeKey = key.replace(/\.\./g, "").trim();

    if (
      inline &&
      !safeKey.startsWith("taller_notas_voz/") &&
      !safeKey.startsWith("taller_audio/") &&
      !safeKey.startsWith("taller-evidencias/") &&
      !safeKey.startsWith("taller_evidencia/") &&
      !safeKey.startsWith("data:audio/")
    ) {
      return NextResponse.json(
        { success: false, error: "Solo se permite obtener audio de notas de voz." },
        { status: 400 }
      );
    }

    if (safeKey.startsWith("data:")) {
      return buildDataUriResponse(safeKey, inline, "evidencia");
    }

    if (!isR2Configured()) {
      // Intentar obtener desde fallback en base de datos si existe
      try {
        const rows = (await prisma.workshopEvidence.findMany({
          where: { r2Key: safeKey },
          take: 1,
        }).catch(() => [])) as any[];
        if (rows && rows.length > 0) {
          const rawMeta = rows[0].metadataJson;
          const meta = rawMeta ? (typeof rawMeta === "string" ? JSON.parse(rawMeta) : rawMeta) : {};
          if (meta.inline && meta.dataUrl) {
            return buildDataUriResponse(String(meta.dataUrl), inline, safeKey);
          }
        }
      } catch {}

      return NextResponse.json(
        {
          success: false,
          error: "Cloudflare R2 no está configurado en las variables de entorno de producción.",
        },
        { status: 503 }
      );
    }

    // Generar URL firmada temporal con expiración de 1 hora
    const signedUrl = await getSignedDownloadUrl(safeKey, 3600);
    if (inline) {
      const fileResponse = await fetch(signedUrl);
      if (!fileResponse.ok || !fileResponse.body) {
        console.error("Error al obtener audio de R2 para transcripción:", fileResponse.status);
        return NextResponse.json(
          { success: false, error: "No se pudo obtener el audio para transcribirlo." },
          { status: 502 }
        );
      }

      return new NextResponse(fileResponse.body, {
        headers: {
          "Content-Type": fileResponse.headers.get("content-type") || "application/octet-stream",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return NextResponse.redirect(new URL(signedUrl), 307);
  } catch (error: any) {
    console.error("Error al generar enlace seguro de Cloudflare R2:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al acceder a la evidencia multimedia." },
      { status: 500 }
    );
  }
}
