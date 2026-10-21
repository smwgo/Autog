import "server-only";
import { uploadToR2, getSignedDownloadUrl, deleteFromR2, checkObjectExistsInR2 } from "@/lib/r2";

/**
 * Capa de abstracción para almacenamiento de archivos (PDF, XML, Imágenes)
 * Conectado a Cloudflare R2 mediante S3 API.
 * 
 * NUNCA guardar archivos grandes o binarios en PostgreSQL (Neon).
 */
export class StorageService {
  /**
   * Sube un archivo a Cloudflare R2 validando tipo y renombrando de forma segura
   */
  static async uploadFile(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<string> {
    const result = await uploadToR2({
      buffer: body,
      mimeType: contentType,
      folder: key.includes("/") ? key.split("/")[0] : "general",
      originalName: key.split("/").pop() || "file",
    });

    return result.publicUrl || result.key;
  }

  /**
   * Genera una URL firmada de descarga temporal para documentos sensibles (facturas, contratos, etc.)
   */
  static async getSignedDownloadUrl(
    bucket: string,
    key: string,
    expiresIn: number = 300
  ): Promise<string> {
    return await getSignedDownloadUrl(key, expiresIn);
  }

  /**
   * Verifica la existencia física y metadatos de un objeto en Cloudflare R2
   */
  static async checkObjectExists(
    bucket: string,
    key: string
  ): Promise<{ exists: boolean; size?: number; mimeType?: string }> {
    return await checkObjectExistsInR2(key);
  }

  /**
   * Elimina un archivo de Cloudflare R2
   */
  static async deleteFile(bucket: string, key: string): Promise<void> {
    return await deleteFromR2(key);
  }
}
