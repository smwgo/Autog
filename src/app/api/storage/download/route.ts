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
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Clave de archivo no proporcionada." },
        { status: 400 }
      );
    }

    // Sanitización contra path traversal
    const safeKey = key.replace(/\.\./g, "").trim();

    if (safeKey.startsWith("data:")) {
      return NextResponse.redirect(safeKey);
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
            return NextResponse.redirect(new URL(meta.dataUrl), 307);
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
    return NextResponse.redirect(new URL(signedUrl), 307);
  } catch (error: any) {
    console.error("Error al generar enlace seguro de Cloudflare R2:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al acceder a la evidencia multimedia." },
      { status: 500 }
    );
  }
}
