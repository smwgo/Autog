import { NextResponse } from "next/server";
import { prisma as prismaClient } from "@/lib/prisma";
import { deleteFromR2, isR2Configured, getSignedDownloadUrl } from "@/lib/r2";

const prisma = prismaClient as any;

export const dynamic = "force-dynamic";

/**
 * API para Gestión de Evidencias Multimedia del Ingreso de Vehículos.
 * Permite listar, verificar, vincular y eliminar evidencias de forma coordinada
 * entre Neon DB y Cloudflare R2 manteniendo consistencia, trazabilidad y seguridad.
 */

// GET: Consultar evidencias asociadas a una orden de trabajo, vehículo o placa
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const orderNumber = searchParams.get("orderNumber");
    const vehicleId = searchParams.get("vehicleId");
    const plate = searchParams.get("plate");
    const evidenceId = searchParams.get("id");
    const branch = searchParams.get("branch");

    let query = `SELECT * FROM "WorkshopEvidence" WHERE 1=1`;
    const params: any[] = [];
    let pIdx = 1;

    if (evidenceId) {
      query += ` AND "id" = $${pIdx++}`;
      params.push(evidenceId);
    }
    if (orderId) {
      query += ` AND ("orderId" = $${pIdx} OR "orderNumber" = $${pIdx})`;
      params.push(orderId);
      pIdx++;
    }
    if (orderNumber) {
      query += ` AND "orderNumber" = $${pIdx++}`;
      params.push(orderNumber);
    }
    if (vehicleId) {
      query += ` AND "vehicleId" = $${pIdx++}`;
      params.push(vehicleId);
    }
    if (plate) {
      query += ` AND "plate" ILIKE $${pIdx++}`;
      params.push(plate.trim());
    }
    if (branch && branch !== "AMBOS") {
      query += ` AND ("branch" = $${pIdx++} OR "branch" IS NULL)`;
      params.push(branch.toUpperCase());
    }

    query += ` ORDER BY "createdAt" ASC`;

    const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);

    // Mapear evidencias con URLs autorizadas y metadatos formateados
    const evidences = rows.map((r: any) => ({
      id: r.id,
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      vehicleId: r.vehicleId,
      plate: r.plate,
      type: r.type,
      r2Key: r.r2Key,
      mimeType: r.mimeType,
      fileSizeBytes: Number(r.fileSizeBytes || 0),
      durationSeconds: r.durationSeconds ? Number(r.durationSeconds) : null,
      transcriptionText: r.transcriptionText,
      uploadStatus: r.uploadStatus,
      transcriptionStatus: r.transcriptionStatus,
      uploadedBy: r.uploadedBy,
      clientTempId: r.clientTempId,
      branch: r.branch || "PRINCIPAL",
      metadata: r.metadataJson ? JSON.parse(r.metadataJson) : {},
      url: `/api/storage/download?key=${encodeURIComponent(r.r2Key)}`,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
    }));

    return NextResponse.json({
      success: true,
      evidences,
      total: evidences.length,
    });
  } catch (error: any) {
    console.error("Error al consultar evidencias de Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener evidencias." },
      { status: 500 }
    );
  }
}

// DELETE: Eliminación coordinada y segura entre Cloudflare R2 y Neon DB
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const body = req.headers.get("content-type")?.includes("application/json")
      ? await req.json().catch(() => ({}))
      : {};

    const evidenceId = searchParams.get("id") || body.id || body.evidenceId;
    const r2Key = searchParams.get("key") || body.key || body.r2Key;
    const orderId = searchParams.get("orderId") || body.orderId;
    const motivo = body.motivo || searchParams.get("motivo") || "Eliminación solicitada por el usuario";

    if (!evidenceId && !r2Key) {
      return NextResponse.json(
        { success: false, error: "Identificador de evidencia o clave de archivo no proporcionado." },
        { status: 400 }
      );
    }

    // 1. Obtener y verificar existencia de la evidencia en Neon DB
    let targetRows: any[] = [];
    if (evidenceId) {
      targetRows = await prisma.$queryRawUnsafe(
        `SELECT * FROM "WorkshopEvidence" WHERE "id" = $1 LIMIT 1`,
        evidenceId
      );
    } else if (r2Key) {
      targetRows = await prisma.$queryRawUnsafe(
        `SELECT * FROM "WorkshopEvidence" WHERE "r2Key" = $1 LIMIT 1`,
        r2Key
      );
    }

    if (!Array.isArray(targetRows) || targetRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Evidencia no encontrada en la base de datos." },
        { status: 404 }
      );
    }

    const evidence = targetRows[0];
    const keyToDelete = evidence.r2Key;

    // 2. Comprobar autorización:
    // Si se especificó orderId, verificar que la evidencia realmente pertenezca a esa orden
    if (orderId && evidence.orderId && evidence.orderId !== orderId && evidence.orderNumber !== orderId) {
      return NextResponse.json(
        { success: false, error: "La evidencia no pertenece a la orden indicada. Operación no autorizada." },
        { status: 403 }
      );
    }

    // 3. Comprobar si otras evidencias comparten la misma clave en R2 para evitar borrado accidental
    const sharedRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM "WorkshopEvidence" WHERE "r2Key" = $1 AND "id" != $2`,
      keyToDelete,
      evidence.id
    );
    const isShared = (sharedRows[0]?.count || 0) > 0;

    // 4. Coordinación de eliminación en Cloudflare R2
    if (!isShared && isR2Configured() && !keyToDelete.startsWith("data:")) {
      try {
        await deleteFromR2(keyToDelete);
      } catch (r2Error: any) {
        console.error("Error al eliminar objeto de Cloudflare R2:", r2Error);

        // Si la eliminación en R2 falla, NUNCA borrar los metadatos en Neon
        // Se registra el fallo para auditoría y resolución sin pérdida de trazabilidad
        const meta = evidence.metadataJson ? JSON.parse(evidence.metadataJson) : {};
        meta.lastDeleteError = {
          message: r2Error.message || "Error al conectar con Cloudflare R2",
          timestamp: new Date().toISOString(),
          motivo,
        };

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopEvidence" 
           SET "uploadStatus" = 'DELETE_FAILED', 
               "metadataJson" = $1, 
               "updatedAt" = NOW() 
           WHERE "id" = $2`,
          JSON.stringify(meta),
          evidence.id
        );

        return NextResponse.json(
          {
            success: false,
            error: "Fallo parcial: No se pudo eliminar el archivo de Cloudflare R2. Se conservó el registro en base de datos para trazabilidad.",
            partialFailure: true,
          },
          { status: 502 }
        );
      }
    }

    // 5. Eliminar metadatos de Neon DB una vez verificado el borrado de R2
    await prisma.$executeRawUnsafe(
      `DELETE FROM "WorkshopEvidence" WHERE "id" = $1`,
      evidence.id
    );

    // 6. Limpiar referencias en WorkshopOrder.receptionPhotosJson si correspondía
    if (evidence.orderId) {
      try {
        const orderRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT "id", "receptionPhotosJson" FROM "WorkshopOrder" WHERE "id" = $1 LIMIT 1`,
          evidence.orderId
        );
        if (orderRows.length > 0) {
          const ord = orderRows[0];
          let fotos: string[] = [];
          try {
            fotos = ord.receptionPhotosJson ? JSON.parse(ord.receptionPhotosJson) : [];
          } catch {}

          const downloadUrl = `/api/storage/download?key=${encodeURIComponent(keyToDelete)}`;
          const filtered = fotos.filter((f) => !f.includes(keyToDelete) && f !== downloadUrl);

          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopOrder" SET "receptionPhotosJson" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
            JSON.stringify(filtered),
            ord.id
          );
        }
      } catch (cleanErr) {
        console.warn("Aviso al limpiar URL de WorkshopOrder tras eliminación:", cleanErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Evidencia y archivo multimedia eliminados correctamente.",
      deletedId: evidence.id,
      r2Key: keyToDelete,
    });
  } catch (error: any) {
    console.error("Error al procesar eliminación de evidencia:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error interno al eliminar evidencia." },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar transcripción, vincular a orden o actualizar metadatos
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      key,
      orderId,
      orderNumber,
      vehicleId,
      plate,
      transcriptionText,
      durationSeconds,
    } = body;

    if (!id && !key) {
      return NextResponse.json(
        { success: false, error: "Identificador de evidencia requerido para actualizar." },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (orderId !== undefined) {
      updates.push(`"orderId" = $${pIdx++}`);
      params.push(orderId);
    }
    if (orderNumber !== undefined) {
      updates.push(`"orderNumber" = $${pIdx++}`);
      params.push(orderNumber);
    }
    if (vehicleId !== undefined) {
      updates.push(`"vehicleId" = $${pIdx++}`);
      params.push(vehicleId);
    }
    if (plate !== undefined) {
      updates.push(`"plate" = $${pIdx++}`);
      params.push(plate ? String(plate).trim().toUpperCase() : null);
    }
    if (transcriptionText !== undefined) {
      updates.push(`"transcriptionText" = $${pIdx++}`);
      params.push(transcriptionText);
      updates.push(`"transcriptionStatus" = 'COMPLETED'`);
    }
    if (durationSeconds !== undefined) {
      updates.push(`"durationSeconds" = $${pIdx++}`);
      params.push(durationSeconds ? Number(durationSeconds) : null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: "Sin cambios solicitados." });
    }

    updates.push(`"updatedAt" = NOW()`);

    let whereClause = "";
    if (id) {
      whereClause = `"id" = $${pIdx++}`;
      params.push(id);
    } else {
      whereClause = `"r2Key" = $${pIdx++}`;
      params.push(key);
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "WorkshopEvidence" SET ${updates.join(", ")} WHERE ${whereClause}`,
      ...params
    );

    return NextResponse.json({
      success: true,
      message: "Evidencia actualizada exitosamente.",
    });
  } catch (error: any) {
    console.error("Error al actualizar evidencia:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar evidencia." },
      { status: 500 }
    );
  }
}
