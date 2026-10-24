import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// Allowed MIME types whitelist
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/mp3",
  "video/webm",
  "video/mp4",
  "video/quicktime",
  "video/3gpp",
  "video/ogg",
  "video/x-m4v",
  "application/pdf",
  "text/xml",
  "application/xml",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB para soportar videos de inspección y evidencias

// Extension map by MIME type
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/mp3": "mp3",
  "video/webm": "webm",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/3gpp": "3gp",
  "video/ogg": "ogv",
  "video/x-m4v": "m4v",
  "application/pdf": "pdf",
  "text/xml": "xml",
  "application/xml": "xml",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Cloudflare R2 no está configurado. Por favor define R2_ACCOUNT_ID, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en las variables de entorno."
    );
  }

  const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function sanitizeFileName(originalName: string, mimeType: string): string {
  // Prevent any path traversal characters like ../ or \
  const cleanMime = mimeType.split(";")[0].trim();
  const ext = MIME_TO_EXT[cleanMime] || "bin";
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

  const cleanMime = mimeType.split(";")[0].trim();
  if (!ALLOWED_MIME_TYPES.includes(cleanMime as AllowedMimeType)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido: ${mimeType}. Tipos permitidos: fotos e imágenes (JPG, PNG, WEBP), videos (MP4, WEBM, MOV), audio (Notas de voz) y documentos (PDF, XML).`,
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

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}

/**
 * Generate a Presigned PUT URL to upload a file directly from the browser to Cloudflare R2
 */
export async function getSignedUploadUrl({
  mimeType,
  folder = "taller",
  originalName = "photo.jpg",
  expiresInSeconds = 600,
}: {
  mimeType: string;
  folder?: string;
  originalName?: string;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    throw new Error(`Tipo de archivo no permitido: ${mimeType}`);
  }

  const safeFileName = sanitizeFileName(originalName, mimeType);
  const cleanFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
  const key = `${cleanFolder}/${safeFileName}`;

  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME || "autotech-storage";

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;
  const publicUrl = publicDomain ? `https://${publicDomain}/${key}` : uploadUrl.split("?")[0];

  return { uploadUrl, key, publicUrl };
}

/**
 * Check if an object exists in Cloudflare R2 and retrieve its size and MIME type
 */
export async function checkObjectExistsInR2(key: string): Promise<{
  exists: boolean;
  size?: number;
  mimeType?: string;
  eTag?: string;
}> {
  if (!isR2Configured()) {
    return { exists: false };
  }
  try {
    const client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME || "autotech-storage";
    const safeKey = key.replace(/\.\./g, "");
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: safeKey,
      })
    );
    return {
      exists: true,
      size: head.ContentLength,
      mimeType: head.ContentType,
      eTag: head.ETag,
    };
  } catch (err: any) {
    if (
      err?.$metadata?.httpStatusCode === 404 ||
      err?.name === "NotFound" ||
      err?.code === "NotFound"
    ) {
      return { exists: false };
    }
    console.warn("Error al verificar existencia de objeto en R2:", err);
    throw err;
  }
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
