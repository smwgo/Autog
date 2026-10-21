import { NextResponse } from "next/server";
import { prisma as prismaClient } from "@/lib/prisma";
import { checkObjectExistsInR2, isR2Configured } from "@/lib/r2";

const prisma = prismaClient as any;

export const dynamic = "force-dynamic";

/**
 * Confirmación de subida de evidencia y persistencia consistente en Neon DB y Cloudflare R2.
 * 
 * Reglas de consistencia:
 * 1. NUNCA marcar archivos como 'COMPLETED' si Cloudflare R2 no confirma su existencia física.
 * 2. Si R2 rechazó o no completó la subida, registrar el estado 'FAILED' y notificar al cliente.
 * 3. Conservar la clave de R2 ('r2Key') y generar URLs de descarga autorizadas sin guardar URLs temporales firmadas.
 * 4. Vincular con WorkshopOrder y Vehicle cuando corresponda.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      evidenceId,
      key,
      url,
      mimeType = "image/jpeg",
      fileSize = 0,
      orderId,
      orderNumber,
      vehicleId,
      plate,
      tipo = "image",
      durationSeconds = null,
      transcriptionText = null,
      clientTempId = null,
      uploadedBy = "Taller Mecánico",
      branch = "PRINCIPAL",
      status: clientReportedStatus,
    } = body;

    const safeKey = typeof key === "string" ? key.replace(/\.\./g, "").trim() : "";

    if (!safeKey && !url) {
      return NextResponse.json(
        { success: false, error: "Datos de evidencia incompletos: se requiere la clave o URL de almacenamiento." },
        { status: 400 }
      );
    }

    // Si el cliente notificó fallo directo en la subida a R2
    if (clientReportedStatus === "FAILED") {
      if (safeKey) {
        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopEvidence" SET "uploadStatus" = 'FAILED', "updatedAt" = NOW() WHERE "r2Key" = $1 OR "id" = $2`,
          safeKey,
          evidenceId || ""
        ).catch(() => {});
      }
      return NextResponse.json(
        { success: false, error: "Subida marcada como fallida por el cliente.", rejected: true },
        { status: 400 }
      );
    }

    let verifiedSize = Number(fileSize) || 0;
    let verifiedMime = mimeType;

    // 1. Verificación de Consistencia Estricta con Cloudflare R2
    if (isR2Configured() && safeKey && !safeKey.startsWith("data:")) {
      try {
        const r2Check = await checkObjectExistsInR2(safeKey);

        if (!r2Check.exists) {
          // El archivo no existe en el bucket de R2. Posible subida rechazada o interrumpida.
          if (evidenceId || safeKey) {
            await prisma.$executeRawUnsafe(
              `UPDATE "WorkshopEvidence" 
               SET "uploadStatus" = 'FAILED', "updatedAt" = NOW() 
               WHERE "r2Key" = $1 OR "id" = $2`,
              safeKey,
              evidenceId || ""
            ).catch(() => {});
          }

          return NextResponse.json(
            {
              success: false,
              error: "El archivo no se encuentra en Cloudflare R2. La subida fue rechazada o interrumpida.",
              rejected: true,
            },
            { status: 422 }
          );
        }

        if (r2Check.size) verifiedSize = r2Check.size;
        if (r2Check.mimeType) verifiedMime = r2Check.mimeType;
      } catch (checkErr: any) {
        console.error("Error al verificar integridad en Cloudflare R2:", checkErr);
        // Si no se puede verificar con R2 por fallo de red, registrar y evitar marcar como guardado
        return NextResponse.json(
          {
            success: false,
            error: "No se pudo verificar el archivo en Cloudflare R2: " + (checkErr.message || "Error de conexión."),
          },
          { status: 502 }
        );
      }
    }

    // 2. Resolver o generar identificador de evidencia
    const finalEvidenceId =
      evidenceId && String(evidenceId).startsWith("evi_")
        ? String(evidenceId)
        : "evi_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    const safePlate = plate ? String(plate).trim().toUpperCase() : null;
    const finalDuration = durationSeconds ? parseInt(String(durationSeconds), 10) : null;
    const finalTranscription = transcriptionText ? String(transcriptionText).trim() : null;
    const transcriptionStatus = finalTranscription ? "COMPLETED" : "NOT_APPLICABLE";

    // 3. Persistir / Actualizar metadatos en Neon DB
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
      )
      ON CONFLICT ("id") DO UPDATE SET
        "orderId" = COALESCE(EXCLUDED."orderId", "WorkshopEvidence"."orderId"),
        "orderNumber" = COALESCE(EXCLUDED."orderNumber", "WorkshopEvidence"."orderNumber"),
        "vehicleId" = COALESCE(EXCLUDED."vehicleId", "WorkshopEvidence"."vehicleId"),
        "plate" = COALESCE(EXCLUDED."plate", "WorkshopEvidence"."plate"),
        "r2Key" = EXCLUDED."r2Key",
        "mimeType" = EXCLUDED."mimeType",
        "fileSizeBytes" = EXCLUDED."fileSizeBytes",
        "durationSeconds" = COALESCE(EXCLUDED."durationSeconds", "WorkshopEvidence"."durationSeconds"),
        "transcriptionText" = COALESCE(EXCLUDED."transcriptionText", "WorkshopEvidence"."transcriptionText"),
        "uploadStatus" = 'COMPLETED',
        "transcriptionStatus" = EXCLUDED."transcriptionStatus",
        "uploadedBy" = COALESCE(EXCLUDED."uploadedBy", "WorkshopEvidence"."uploadedBy"),
        "branch" = COALESCE(EXCLUDED."branch", "WorkshopEvidence"."branch"),
        "updatedAt" = NOW()`,
      finalEvidenceId,
      orderId || null,
      orderNumber || null,
      vehicleId || null,
      safePlate,
      tipo,
      safeKey,
      verifiedMime,
      verifiedSize,
      finalDuration,
      finalTranscription,
      transcriptionStatus,
      uploadedBy,
      clientTempId || null,
      branch || "PRINCIPAL",
      JSON.stringify({ confirmedAt: new Date().toISOString() })
    );

    // 4. Mecanismo seguro de lectura: No almacenar URLs temporales firmadas como si fueran enlaces permanentes
    const permanentDownloadUrl = `/api/storage/download?key=${encodeURIComponent(safeKey)}`;

    // 5. Sincronización retrocompatible con WorkshopOrder si existe orderId
    if (orderId && typeof orderId === "string") {
      try {
        const orderRows = await prisma.$queryRawUnsafe(
          `SELECT "id", "orderNumber", "vehicleId", "plate", "receptionPhotosJson", "voiceNotesJson" 
           FROM "WorkshopOrder" 
           WHERE "id" = $1 OR "orderNumber" = $1 
           LIMIT 1`,
          orderId
        );

        if (Array.isArray(orderRows) && orderRows.length > 0) {
          const ord = orderRows[0];
          let fotos: string[] = [];
          try {
            fotos = ord.receptionPhotosJson ? JSON.parse(ord.receptionPhotosJson) : [];
          } catch {
            fotos = [];
          }

          if (!fotos.includes(permanentDownloadUrl)) {
            fotos.push(permanentDownloadUrl);
            await prisma.$executeRawUnsafe(
              `UPDATE "WorkshopOrder" 
               SET "receptionPhotosJson" = $1, "updatedAt" = NOW() 
               WHERE "id" = $2`,
              JSON.stringify(fotos),
              ord.id
            );
          }

          if (tipo === "audio") {
            let existingVoiceNotes: any[] = [];
            try {
              existingVoiceNotes = ord.voiceNotesJson ? JSON.parse(ord.voiceNotesJson) : [];
            } catch {
              existingVoiceNotes = [];
            }
            const newVoiceNote = {
              id: finalEvidenceId,
              orderId: ord.id,
              vehicleId: ord.vehicleId,
              plate: ord.plate,
              audioUrl: permanentDownloadUrl,
              storageKey: safeKey,
              durationSeconds: finalDuration,
              mimeType: verifiedMime,
              fileSize: verifiedSize,
              text: finalTranscription || "",
              transcriptionStatus,
              provider: "browser-speech-api",
              author: uploadedBy,
              createdAt: new Date().toISOString(),
            };
            const alreadyExists = existingVoiceNotes.some((vn: any) => vn.audioUrl === permanentDownloadUrl || vn.id === finalEvidenceId);
            if (!alreadyExists) {
              existingVoiceNotes.push(newVoiceNote);
              await prisma.$executeRawUnsafe(
                `UPDATE "WorkshopOrder" 
                 SET "voiceNotesJson" = $1, "updatedAt" = NOW() 
                 WHERE "id" = $2`,
                JSON.stringify(existingVoiceNotes),
                ord.id
              ).catch(() => {});
            }
          }

          // Completar vehicleId y plate en WorkshopEvidence si faltaban
          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopEvidence" 
             SET "orderId" = $1, "orderNumber" = $2, "vehicleId" = COALESCE("vehicleId", $3), "plate" = COALESCE("plate", $4) 
             WHERE "id" = $5`,
            ord.id,
            ord.orderNumber,
            ord.vehicleId,
            ord.plate,
            finalEvidenceId
          );
        }
      } catch (syncErr) {
        console.warn("Aviso al sincronizar evidencia con orden:", syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      confirmed: true,
      evidence: {
        id: finalEvidenceId,
        orderId: orderId || null,
        orderNumber: orderNumber || null,
        vehicleId: vehicleId || null,
        plate: safePlate,
        type: tipo,
        r2Key: safeKey,
        mimeType: verifiedMime,
        fileSizeBytes: verifiedSize,
        durationSeconds: finalDuration,
        transcriptionText: finalTranscription,
        uploadStatus: "COMPLETED",
        transcriptionStatus,
        uploadedBy,
        url: permanentDownloadUrl,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error al confirmar evidencia en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar metadatos de evidencia." },
      { status: 500 }
    );
  }
}
