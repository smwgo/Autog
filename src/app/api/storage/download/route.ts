import { NextResponse } from "next/server";
import { getSignedDownloadUrl, isR2Configured } from "@/lib/r2";
import { prisma as prismaClient } from "@/lib/prisma";

const prisma = prismaClient as any;

export const dynamic = "force-dynamic";

function inferContentTypeFromKey(key: string, fallback = "application/octet-stream"): string {
  const lower = key.toLowerCase();
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".webm")) {
    return lower.includes("audio") || lower.includes("voz") || lower.includes("voice")
      ? "audio/webm"
      : "video/webm";
  }
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return fallback;
}

/**
 * Construye respuesta binaria con soporte completo de HTTP Range (206 Partial Content),
 * requerido por iOS Safari y Android Chrome para reproducir y adelantar/retroceder audio.
 */
function buildBufferResponseWithRange(
  buffer: Buffer,
  mimeType: string,
  isInline: boolean,
  safeKey: string,
  rangeHeader: string | null
) {
  const totalLength = buffer.length;
  const baseName = (safeKey.split("/").pop() || "archivo").replace(/"/g, "");
  const commonHeaders: Record<string, string> = {
    "Content-Type": mimeType,
    "Accept-Ranges": "bytes",
    "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${baseName}"`,
    "Cache-Control": "public, max-age=3600",
  };

  if (rangeHeader && rangeHeader.startsWith("bytes=")) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

    if (
      !Number.isNaN(start) &&
      !Number.isNaN(end) &&
      start >= 0 &&
      end < totalLength &&
      start <= end
    ) {
      const chunk = buffer.subarray(start, end + 1);
      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          ...commonHeaders,
          "Content-Range": `bytes ${start}-${end}/${totalLength}`,
          "Content-Length": String(chunk.length),
        },
      });
    }
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      ...commonHeaders,
      "Content-Length": String(totalLength),
    },
  });
}

function buildDataUriResponse(
  dataUri: string,
  isInline: boolean,
  safeKey: string,
  rangeHeader: string | null
) {
  const match = dataUri.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) {
    return NextResponse.json(
      { success: false, error: "Formato data URI inválido." },
      { status: 400 }
    );
  }
  const mimeType = match[1] || inferContentTypeFromKey(safeKey);
  const buffer = Buffer.from(match[2], "base64");
  return buildBufferResponseWithRange(buffer, mimeType, isInline, safeKey, rangeHeader);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const inline = searchParams.get("inline") === "1";
    const rangeHeader = req.headers.get("range");

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Clave de archivo no proporcionada." },
        { status: 400 }
      );
    }

    // Sanitización contra path traversal
    const safeKey = key.replace(/\.\./g, "").trim();

    if (safeKey.startsWith("data:")) {
      return buildDataUriResponse(safeKey, inline, "evidencia", rangeHeader);
    }

    const isAudioKey = /\.(wav|mp3|m4a|aac|ogg|webm)$/i.test(safeKey) ||
      safeKey.includes("audio") ||
      safeKey.includes("notas_voz");

    // Consultar fallback en base de datos si el archivo fue guardado inline o si R2 no está activo
    if (!isR2Configured() || inline || isAudioKey) {
      try {
        const rows = (await prisma.workshopEvidence
          .findMany({
            where: { r2Key: safeKey },
            take: 1,
          })
          .catch(() => [])) as any[];
        if (rows && rows.length > 0) {
          const rawMeta = rows[0].metadataJson;
          const meta = rawMeta ? (typeof rawMeta === "string" ? JSON.parse(rawMeta) : rawMeta) : {};
          if (meta.inline && meta.dataUrl) {
            return buildDataUriResponse(String(meta.dataUrl), true, safeKey, rangeHeader);
          }
        }
      } catch {}
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Cloudflare R2 no está configurado en las variables de entorno.",
        },
        { status: 503 }
      );
    }

    // Generar URL firmada temporal con expiración de 1 hora
    const signedUrl = await getSignedDownloadUrl(safeKey, 3600);

    // Para audio o solicitudes inline, hacer proxy con soporte de Range (206) para máxima compatibilidad en iOS/Android
    if (inline || isAudioKey) {
      const fetchHeaders: Record<string, string> = {};
      if (rangeHeader) {
        fetchHeaders["Range"] = rangeHeader;
      }

      const fileResponse = await fetch(signedUrl, { headers: fetchHeaders });
      if (!fileResponse.ok && fileResponse.status !== 206) {
        return NextResponse.json(
          { success: false, error: "No se pudo obtener el archivo multimedia desde R2." },
          { status: 502 }
        );
      }

      const rawType = fileResponse.headers.get("content-type") || "";
      const contentType =
        !rawType || rawType === "application/octet-stream"
          ? inferContentTypeFromKey(safeKey, "audio/wav")
          : rawType;

      const arrayBuf = await fileResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      // Si R2 ya respondió 206 Partial Content, reenviar con las cabeceras exactas
      if (fileResponse.status === 206) {
        const resHeaders: Record<string, string> = {
          "Content-Type": contentType,
          "Accept-Ranges": "bytes",
          "Content-Length": String(buffer.length),
          "Cache-Control": "public, max-age=3600",
        };
        const contentRange = fileResponse.headers.get("content-range");
        if (contentRange) resHeaders["Content-Range"] = contentRange;
        return new NextResponse(new Uint8Array(buffer), {
          status: 206,
          headers: resHeaders,
        });
      }

      return buildBufferResponseWithRange(buffer, contentType, true, safeKey, rangeHeader);
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
