import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// Allowed MIME types whitelist
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/xml",
  "application/xml",
] as const;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Extension map by MIME type
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "text/xml": "xml",
  "application/xml": "xml",
};

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Cloudflare R2 no está configurado. Por favor define R2_ACCOUNT_ID, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en las variables de entorno de Vercel."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function sanitizeFileName(originalName: string, mimeType: string): string {
  // Prevent any path traversal characters like ../ or \
  const ext = MIME_TO_EXT[mimeType] || "bin";
  const uniqueId = crypto.randomUUID();
  return `${uniqueId}.${ext}`;
}

export function validateFileMetadata(size: number, mimeType: string): { valid: boolean; error?: string } {
  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo permitido de ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido: ${mimeType}. Tipos permitidos: imágenes (JPG, PNG, WEBP), PDF y XML.`,
    };
  }

  return { valid: true };
}

/**
 * Upload a file directly to Cloudflare R2
 */
export async function uploadToR2({
  buffer,
  mimeType,
  folder = "uploads",
  originalName = "file",
}: {
  buffer: Buffer;
  mimeType: string;
  folder?: string;
  originalName?: string;
}): Promise<{ key: string; publicUrl?: string }> {
  const validation = validateFileMetadata(buffer.length, mimeType);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const safeFileName = sanitizeFileName(originalName, mimeType);
  // Sanitize folder name to prevent directory traversal
  const cleanFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
  const key = `${cleanFolder}/${safeFileName}`;

  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME || "autotech-storage";

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const publicDomain = process.env.R2_PUBLIC_DOMAIN;
  const publicUrl = publicDomain ? `https://${publicDomain}/${key}` : undefined;

  return { key, publicUrl };
}

/**
 * Generate a short-lived temporary Signed URL for private documents (invoices, contracts, reports)
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 300
): Promise<string> {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME || "autotech-storage";

  // Prevent path traversal in key
  const safeKey = key.replace(/\.\./g, "");

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: safeKey,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Delete an object from Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME || "autotech-storage";
  const safeKey = key.replace(/\.\./g, "");

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: safeKey,
    })
  );
}
