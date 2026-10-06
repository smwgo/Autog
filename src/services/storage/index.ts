import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Capa de abstracción para almacenamiento de archivos grandes (PDF, XML, Imágenes)
 * Conectado a Cloudflare R2 mediante S3 API.
 * 
 * NUNCA guardar archivos grandes en PostgreSQL (Neon).
 */

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!, // e.g., https://<account_id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export class StorageService {
  
  static async uploadFile(bucket: string, key: string, body: Buffer | Uint8Array | Blob | string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await s3Client.send(command);
    
    // Return custom domain URL if configured, or public URL
    return `${process.env.NEXT_PUBLIC_STORAGE_URL}/${key}`;
  }

  static async getSignedDownloadUrl(bucket: string, key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn });
  }
}
