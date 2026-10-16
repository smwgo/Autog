import "server-only";
import { SriDocumentPayload, SriResponse, SriConfig } from "./types";
import { prisma as prismaClient } from "@/lib/prisma";

// TODO: `SriDocument` model is not yet defined in prisma/schema.prisma.
// Untyped handle keeps the build green until the model is added.
const prisma = prismaClient as any;

// Default config. Should be loaded from DB/Env
const config: SriConfig = {
  environment: "TEST",
  autoRetry: true,
  maxRetries: 3,
  batchProcessing: true,
};

/**
 * Capa de integración desacoplada para SRI.
 * No simula una API del SRI, provee los métodos estructurales requeridos.
 */
export class SriService {
  
  /**
   * Receives a generated XML and queues it for processing
   */
  static async queueDocument(payload: SriDocumentPayload): Promise<void> {
    await prisma.sriDocument.create({
      data: {
        type: payload.type,
        accessKey: payload.accessKey,
        location: payload.location,
        userId: payload.userId,
        status: "PENDING",
      }
    });
    
    // In a real scenario, we might trigger a queue worker here (e.g., BullMQ)
  }

  /**
   * Process a single pending document
   */
  static async processDocument(accessKey: string): Promise<SriResponse> {
    const doc = await prisma.sriDocument.findUnique({ where: { accessKey } });
    if (!doc) throw new Error("Document not found");

    try {
      await prisma.sriDocument.update({
        where: { accessKey },
        data: { status: "PROCESSING", sentDate: new Date() }
      });

      // TODO: Actual implementation to connect to authorized SRI mechanism
      // 1. Sign XML
      // 2. Send to SRI (Recepcion)
      // 3. Check Auth (Autorizacion)

      return {
        success: true,
        status: "AUTHORIZED", // Placeholder
        authDate: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        status: "ERROR",
        errorMessage: error.message,
      };
    }
  }

  /**
   * Batch process all PENDING or ERROR documents (if retry enabled)
   */
  static async processBatch(): Promise<void> {
    if (!config.batchProcessing) return;

    const pendingDocs = await prisma.sriDocument.findMany({
      where: {
        status: { in: ["PENDING", "RETRY"] }
      },
      take: 50 // Limit batch size
    });

    for (const doc of pendingDocs) {
      await this.processDocument(doc.accessKey);
    }
  }

}
