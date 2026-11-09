import { NextResponse } from "next/server";
import {
  uploadToR2,
  validateFileMetadata,
  getSignedUploadUrl,
  isR2Configured,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/r2";
import { prisma as prismaClient } from "@/lib/prisma";

const prisma = prismaClient as any;

export const dynamic = "force-dynamic";

/**
 * Normaliza el tipo de evidencia a 'image' | 'video' | 'audio'
 */
function normalizeEvidenceType(mimeType: string, tipoParam?: string | null): string {
  const p = (tipoParam || "").toLowerCase();
  if (p.includes("video")) return "video";
  if (p.includes("audio") || p.includes("voz")) return "audio";
  if (p.includes("foto") || p.includes("image") || p.includes("imagen")) return "image";

  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "image";
}

// GET: Generar Presigned URL de subida directa a Cloudflare R2 con trazabilidad de intención
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mimeType = (searchParams.get("mimeType") || "image/jpeg").toLowerCase().split(";")[0].trim();
    const folder = (searchParams.get("folder") || "taller_recepcion").replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = searchParams.get("fileName") || "evidencia.jpg";
    const fileSize = Number(searchParams.get("fileSize") || "1024");
    const clientTempId = searchParams.get("clientTempId") || searchParams.get("tempId") || null;
    const orderId = searchParams.get("orderId") || null;
    const orderNumber = searchParams.get("orderNumber") || null;
    const vehicleId = searchParams.get("vehicleId") || null;
    const plate = (searchParams.get("plate") || "").trim().toUpperCase() || null;
    const tipo = normalizeEvidenceType(mimeType, searchParams.get("tipo"));
    const uploadedBy = searchParams.get("uploadedBy") || searchParams.get("usuario") || "Taller Mecánico";
    const branch = (searchParams.get("branch") || "PRINCIPAL").toUpperCase();

    // 1. Validar metadatos en el servidor (no confiar solo en el cliente)
    const validation = validateFileMetadata(fileSize, mimeType);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // 2. Control de Idempotencia y Reintentos Seguros:
    // Si ya existe una evidencia con el mismo clientTempId
    if (clientTempId) {
      try {
        const existingRows = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopEvidence" WHERE "clientTempId" = $1 LIMIT 1`,
          clientTempId
        );
        const existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;

        if (existing) {
          // Si ya está completada, retornar la evidencia existente sin duplicar en R2 ni Neon
          if (existing.uploadStatus === "COMPLETED") {
            const downloadUrl = `/api/storage/download?key=${encodeURIComponent(existing.r2Key)}`;
            return NextResponse.json({
              success: true,
              alreadyUploaded: true,
              evidenceId: existing.id,
              key: existing.r2Key,
              publicUrl: downloadUrl,
              uploadUrl: null,
              r2Configured: isR2Configured(),
            });
          }
        }
      } catch (checkErr) {
        console.warn("Aviso al verificar duplicado por clientTempId:", checkErr);
      }
    }

    if (!isR2Configured()) {
      const fallbackKey = `${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      return NextResponse.json({
        success: true,
        r2Configured: false,
        uploadUrl: null,
        key: fallbackKey,
        publicUrl: null,
        evidenceId: "temp_" + Date.now(),
      });
    }

    // 3. Generar Presigned URL segura de Cloudflare R2
    const signed = await getSignedUploadUrl({
      mimeType,
      folder,
      originalName: fileName,
      expiresInSeconds: 600, // 10 minutos para subir
    });

    const evidenceId = "evi_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    // 4. Registrar intención en estado PENDING en Neon DB
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopEvidence" (
          "id", "orderId", "orderNumber", "vehicleId", "plate",
          "type", "r2Key", "mimeType", "fileSizeBytes",
          "uploadStatus", "transcriptionStatus", "uploadedBy",
          "clientTempId", "branch", "metadataJson",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          'PENDING', 'NOT_APPLICABLE', $10,
          $11, $12, $13,
          NOW(), NOW()
        )
        ON CONFLICT ("id") DO UPDATE SET
          "r2Key" = EXCLUDED."r2Key",
          "uploadStatus" = 'PENDING',
          "updatedAt" = NOW()`,
        evidenceId,
        orderId,
        orderNumber,
        vehicleId,
        plate,
        tipo,
        signed.key,
        mimeType,
        Math.min(fileSize, MAX_FILE_SIZE_BYTES),
        uploadedBy,
        clientTempId,
        branch,
        JSON.stringify({ originalName: fileName })
      );
    } catch (dbErr) {
      console.warn("Aviso al registrar intención PENDING en base de datos:", dbErr);
    }

    return NextResponse.json({
      success: true,
      r2Configured: true,
      evidenceId,
      uploadUrl: signed.uploadUrl,
      key: signed.key,
      publicUrl: signed.publicUrl,
    });
  } catch (error: any) {
    console.error("Error al preparar subida de evidencia a R2:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al generar URL firmada de subida." },
      { status: 500 }
    );
  }
}

// POST: Subir archivo a Cloudflare R2 mediante el servidor (Canal proxy seguro o fallback)
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = ((formData.get("folder") as string) || "taller_recepcion").replace(/[^a-zA-Z0-9_-]/g, "");
    const clientTempId = (formData.get("clientTempId") as string) || null;
    const orderId = (formData.get("orderId") as string) || null;
    const orderNumber = (formData.get("orderNumber") as string) || null;
    const vehicleId = (formData.get("vehicleId") as string) || null;
    const plate = ((formData.get("plate") as string) || "").trim().toUpperCase() || null;
    const tipoParam = (formData.get("tipo") as string) || null;
    const uploadedBy = (formData.get("uploadedBy") as string) || "Taller Mecánico";
    const branch = ((formData.get("branch") as string) || "PRINCIPAL").toUpperCase();
    const durationSeconds = formData.get("durationSeconds") ? Number(formData.get("durationSeconds")) : null;
    const transcriptionText = (formData.get("transcriptionText") as string) || null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó ningún archivo para subir." },
        { status: 400 }
      );
    }

    // 1. Validar metadatos en el servidor
    const validation = validateFileMetadata(file.size, file.type);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // 2. Control de duplicados por clientTempId
    if (clientTempId) {
      try {
        const existingRows = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopEvidence" WHERE "clientTempId" = $1 AND "uploadStatus" = 'COMPLETED' LIMIT 1`,
          clientTempId
        );
        if (Array.isArray(existingRows) && existingRows.length > 0) {
          const ex = existingRows[0];
          return NextResponse.json({
            success: true,
            alreadyUploaded: true,
            storage: "cloudflare-r2",
            evidenceId: ex.id,
            key: ex.r2Key,
            url: `/api/storage/download?key=${encodeURIComponent(ex.r2Key)}`,
          });
        }
      } catch (dedupErr) {
        console.warn("Aviso al verificar duplicado en POST:", dedupErr);
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tipo = normalizeEvidenceType(file.type, tipoParam);
    const evidenceId = "evi_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    if (isR2Configured()) {
      // Subir directamente a Cloudflare R2
      const result = await uploadToR2({
        buffer,
        mimeType: file.type,
        folder,
        originalName: file.name,
      });

      const permanentDownloadUrl = `/api/storage/download?key=${encodeURIComponent(result.key)}`;

      // Persistir registro verificado en Neon DB
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "WorkshopEvidence" (
            "id", "orderId", "orderNumber", "vehicleId", "plate",
            "type", "r2Key", "mimeType", "fileSizeBytes",
            "durationSeconds", "transcriptionText",
            "uploadStatus", "transcriptionStatus", "uploadedBy",
            "clientTempId", "branch", "metadataJson",
            "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11,
            'COMPLETED', $12, $13,
            $14, $15, $16,
            NOW(), NOW()
          )`,
          evidenceId,
          orderId,
          orderNumber,
          vehicleId,
          plate,
          tipo,
          result.key,
          file.type,
          file.size,
          durationSeconds,
          transcriptionText,
          transcriptionText ? "COMPLETED" : "NOT_APPLICABLE",
          uploadedBy,
          clientTempId,
          branch,
          JSON.stringify({ originalName: file.name })
        );
      } catch (dbErr) {
        console.error("Error al persistir evidencia en base de datos tras subida a R2:", dbErr);
      }

      return NextResponse.json({
        success: true,
        storage: "cloudflare-r2",
        evidenceId,
        key: result.key,
        url: permanentDownloadUrl,
        type: tipo,
      });
    }

    // Fallback local seguro cuando las credenciales R2 no están configuradas
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;
    const safeKey = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopEvidence" (
          "id", "orderId", "orderNumber", "vehicleId", "plate",
          "type", "r2Key", "mimeType", "fileSizeBytes",
          "durationSeconds", "transcriptionText",
          "uploadStatus", "transcriptionStatus", "uploadedBy",
          "clientTempId", "branch", "metadataJson",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11,
          'COMPLETED', $12, $13,
          $14, $15, $16,
          NOW(), NOW()
        )`,
        evidenceId,
        orderId,
        orderNumber,
        vehicleId,
        plate,
        tipo,
        safeKey,
        file.type,
        file.size,
        durationSeconds,
        transcriptionText,
        transcriptionText ? "COMPLETED" : "NOT_APPLICABLE",
        uploadedBy,
        clientTempId,
        branch,
        JSON.stringify({ originalName: file.name, inline: true })
      );
    } catch (dbErr) {
      console.warn("Aviso al guardar evidencia inline en base de datos:", dbErr);
    }

    return NextResponse.json({
      success: true,
      storage: "r2-compatible-inline",
      evidenceId,
      key: safeKey,
      url: dataUrl,
      type: tipo,
    });
  } catch (error: any) {
    console.error("Error al procesar subida de archivo a R2:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al procesar la subida del archivo.",
      },
      { status: 500 }
    );
  }
}
