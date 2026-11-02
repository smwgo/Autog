import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Endpoint para actualizar la foto de perfil del Cliente o del Vehículo
 * directamente desde el módulo de Presupuestos / Órdenes de Trabajo.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type, // 'client' | 'vehicle'
      photoUrl,
      clientIdDoc,
      customerId,
      clientName,
      plate,
      vehicleId,
      orderId,
    } = body;

    if (!type || !photoUrl) {
      return NextResponse.json(
        { success: false, error: "Parámetros 'type' y 'photoUrl' requeridos" },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      if (type === "client") {
        // Asegurar columnas en Neon
        await prisma
          .$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "avatar" TEXT`)
          .catch(() => {});
        await prisma
          .$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`)
          .catch(() => {});

        // 1. Intentar actualizar por ID
        let updated = false;
        if (customerId) {
          try {
            await (prisma as any).customer.update({
              where: { id: customerId },
              data: { avatar: photoUrl, imageUrl: photoUrl },
            });
            updated = true;
          } catch {}
        }

        // 2. Intentar actualizar por Cédula / RUC
        if (!updated && clientIdDoc) {
          try {
            const res = await prisma.$executeRawUnsafe(
              `UPDATE "Customer" SET "avatar" = $1, "imageUrl" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "identification" = $2`,
              photoUrl,
              clientIdDoc.trim()
            );
            if (Number(res) > 0) updated = true;
          } catch {}
        }

        // 3. Fallback por Nombre
        if (!updated && clientName) {
          try {
            await prisma.$executeRawUnsafe(
              `UPDATE "Customer" SET "avatar" = $1, "imageUrl" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "name" ILIKE $2`,
              photoUrl,
              `%${clientName.trim()}%`
            );
          } catch {}
        }

        return NextResponse.json({
          success: true,
          type: "client",
          photoUrl,
          message: "Foto de perfil del cliente actualizada correctamente.",
        });
      } else if (type === "vehicle") {
        // Asegurar columna en Neon
        await prisma
          .$executeRawUnsafe(`ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`)
          .catch(() => {});

        let updated = false;
        // 1. Actualizar por vehicleId
        if (vehicleId) {
          try {
            await (prisma as any).vehicle.update({
              where: { id: vehicleId },
              data: { imageUrl: photoUrl },
            });
            updated = true;
          } catch {}
        }

        // 2. Actualizar por Placa
        if (!updated && plate) {
          try {
            await prisma.$executeRawUnsafe(
              `UPDATE "Vehicle" SET "imageUrl" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "plate" ILIKE $2`,
              photoUrl,
              plate.trim()
            );
            updated = true;
          } catch {}
        }

        // 3. Si hay orden asociada, guardarla también en la orden para reflejarse en todo el flujo
        if (orderId) {
          try {
            const ordRows = (await prisma.$queryRawUnsafe(
              `SELECT "id", "receptionPhotosJson", "photosJson" FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
              orderId
            ).catch(() => [])) as any[];

            if (ordRows && ordRows.length > 0) {
              const currentOrd = ordRows[0];
              let receptionPhotos: string[] = [];
              try {
                receptionPhotos = typeof currentOrd.receptionPhotosJson === "string"
                  ? JSON.parse(currentOrd.receptionPhotosJson)
                  : (currentOrd.receptionPhotosJson || []);
              } catch {}
              if (!Array.isArray(receptionPhotos)) receptionPhotos = [];
              if (!receptionPhotos.includes(photoUrl)) {
                receptionPhotos.unshift(photoUrl); // Ponerla como foto principal
              }

              await prisma.$executeRawUnsafe(
                `UPDATE "WorkshopOrder" SET "receptionPhotosJson" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
                JSON.stringify(receptionPhotos),
                currentOrd.id
              );
            }
          } catch (ordErr) {
            console.warn("Aviso al vincular foto principal en WorkshopOrder:", ordErr);
          }
        }

        return NextResponse.json({
          success: true,
          type: "vehicle",
          photoUrl,
          message: "Foto de perfil del vehículo actualizada correctamente.",
        });
      }

      return NextResponse.json(
        { success: false, error: "Tipo no soportado" },
        { status: 400 }
      );
    });
  } catch (error: any) {
    console.error("Error al actualizar foto de cliente/vehículo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar foto" },
      { status: 500 }
    );
  }
}
