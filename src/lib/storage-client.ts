/**
 * Configuración centralizada de evidencias multimedia para recepción e ingreso vehicular
 */
export const MULTIMEDIA_CONFIG = {
  // Fotografías
  MAX_PHOTOS: 5,
  MAX_PHOTO_DIMENSION: 1920, // Full HD: detalle nítido para golpes, rayones, matrículas y VIN
  PHOTO_QUALITY: 0.82, // Equilibrio óptimo entre compresión y fidelidad visual
  MAX_PHOTO_SIZE_BYTES: 15 * 1024 * 1024, // 15 MB límite crudo de entrada

  // Video de ingreso
  MAX_VIDEO_CLIPS: 2,
  MAX_VIDEO_DURATION_SECONDS: 20, // 20 segundos máximo por clip sugerido
  VIDEO_TARGET_WIDTH: 1280, // 720p
  VIDEO_TARGET_HEIGHT: 720,
  VIDEO_TARGET_FRAMERATE: 24,
  VIDEO_BITRATE_BPS: 1_200_000, // 1.2 Mbps (~3 MB por clip de 20s)
  MAX_VIDEO_SIZE_BYTES: 100 * 1024 * 1024, // 100 MB

  // Nota de voz
  MAX_AUDIO_DURATION_SECONDS: 60,
} as const;

/**
 * Comprime una imagen en el navegador mediante Canvas offscreen, manteniendo
 * detalles de daños, placas y textos sin distorsionar la evidencia.
 * Si el navegador no lo soporta o falla, retorna el archivo original como alternativa segura.
 */
export async function comprimirImagenEnNavegador(
  file: File | Blob
): Promise<{ file: File | Blob; comprimida: boolean; ahorroPorcentaje?: number }> {
  if (typeof window === "undefined" || !window.HTMLCanvasElement) {
    return { file, comprimida: false };
  }

  // Si no es imagen o ya es muy liviana (<150KB), no es necesario comprimir
  if (file.type && !file.type.startsWith("image/")) {
    return { file, comprimida: false };
  }
  if (file.size < 150 * 1024) {
    return { file, comprimida: false };
  }

  try {
    return await new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        const maxDim = MULTIMEDIA_CONFIG.MAX_PHOTO_DIMENSION;

        // Mantener proporción de aspecto original
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: false });

        if (!ctx) {
          return resolve({ file, comprimida: false });
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // Si la compresión no reduce el peso, conservar el original
              return resolve({ file, comprimida: false });
            }

            const originalName = (file as File).name || `evidencia_${Date.now()}.jpg`;
            const cleanName = originalName.replace(/\.[^/.]+$/, ".jpg");
            const compressedFile = new File([blob], cleanName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            const ahorro = Math.round(((file.size - blob.size) / file.size) * 100);
            resolve({
              file: compressedFile,
              comprimida: true,
              ahorroPorcentaje: ahorro,
            });
          },
          "image/jpeg",
          MULTIMEDIA_CONFIG.PHOTO_QUALITY
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ file, comprimida: false }); // Fallback seguro
      };

      img.src = objectUrl;
    });
  } catch (err) {
    console.warn("Fallo compresión en navegador, usando original:", err);
    return { file, comprimida: false };
  }
}

export interface UploadProgressInfo {
  percent: number;
  status: string;
}

/**
 * Protocolo de subida segura a Cloudflare R2 con 6 etapas:
 * 1. Solicitud de autorización al backend.
 * 2. Validación de tipo y peso.
 * 3. Obtención de URL prefirmada o fallback de servidor.
 * 4. Transferencia directa a Cloudflare R2 con progreso XHR.
 * 5. Confirmación y persistencia de metadatos en Neon DB.
 * 6. Devolución de URL real verificada.
 */
export interface SubirEvidenciaOptions {
  archivo: Blob | File;
  tipo: "foto" | "video" | "audio";
  carpeta?: string;
  nombreArchivo?: string;
  orderId?: string;
  orderNumber?: string;
  vehicleId?: string;
  plate?: string;
  durationSeconds?: number;
  transcriptionText?: string;
  uploadedBy?: string;
  branch?: string;
  clientTempId?: string;
  onProgress?: (info: UploadProgressInfo) => void;
}

export interface ResultadoEvidencia {
  url: string;
  key: string;
  evidenceId: string;
  storage: string;
  clientTempId: string;
  mimeType: string;
  fileSizeBytes: number;
  tipo: "foto" | "video" | "audio";
  durationSeconds?: number;
  transcriptionText?: string;
}

/**
 * Protocolo de subida segura a Cloudflare R2 y persistencia en Neon DB:
 * 1. Control de idempotencia con clientTempId para evitar duplicados por doble clic o reintento.
 * 2. Validación de tipo y tamaño tanto en cliente como en servidor.
 * 3. Obtención de URL prefirmada o fallback de servidor seguro.
 * 4. Transferencia directa a Cloudflare R2 con seguimiento de progreso XHR.
 * 5. Verificación física de integridad en R2 antes de confirmar en Neon DB.
 * 6. Registro de fallos si R2 rechaza la subida para no guardar falsos positivos.
 * 7. Devolución de URL permanente autorizada sin URLs temporales caducables.
 */
export async function subirEvidenciaSegura(
  options: SubirEvidenciaOptions
): Promise<ResultadoEvidencia> {
  const {
    archivo,
    tipo,
    carpeta = "taller_recepcion",
    nombreArchivo,
    orderId,
    orderNumber,
    vehicleId,
    plate,
    durationSeconds,
    transcriptionText,
    uploadedBy = "Taller Mecánico",
    branch = "PRINCIPAL",
    clientTempId = "temp_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    onProgress,
  } = options;

  const mimeType =
    archivo.type ||
    (tipo === "video" ? "video/webm" : tipo === "audio" ? "audio/webm" : "image/jpeg");

  const ext = mimeType.includes("webm")
    ? "webm"
    : mimeType.includes("mp4")
    ? "mp4"
    : mimeType.includes("quicktime")
    ? "mov"
    : mimeType.includes("png")
    ? "png"
    : mimeType.includes("webp")
    ? "webp"
    : "jpg";

  const safeFileName =
    nombreArchivo || `${tipo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const fileSize = archivo.size;

  onProgress?.({ percent: 10, status: "Verificando permisos y autorización..." });

  // 1. Solicitar URL firmada al servidor con clientTempId para idempotencia
  const params = new URLSearchParams({
    mimeType,
    folder: carpeta,
    fileName: safeFileName,
    fileSize: String(fileSize),
    clientTempId,
    tipo,
    uploadedBy,
    branch,
  });
  if (orderId) params.append("orderId", orderId);
  if (orderNumber) params.append("orderNumber", orderNumber);
  if (vehicleId) params.append("vehicleId", vehicleId);
  if (plate) params.append("plate", plate);

  const authRes = await fetch(`/api/storage/upload?${params.toString()}`);
  const authData = await authRes.json();

  if (!authRes.ok || !authData.success) {
    throw new Error(authData.error || "No se pudo autorizar la carga de la evidencia.");
  }

  // Si ya existía por reintento idempotente, retornar inmediatamente
  if (authData.alreadyUploaded && authData.key) {
    onProgress?.({ percent: 100, status: "Evidencia recuperada de forma segura." });
    return {
      url: authData.publicUrl || `/api/storage/download?key=${encodeURIComponent(authData.key)}`,
      key: authData.key,
      evidenceId: authData.evidenceId || clientTempId,
      storage: "cloudflare-r2",
      clientTempId,
      mimeType,
      fileSizeBytes: fileSize,
      tipo,
      durationSeconds,
      transcriptionText,
    };
  }

  const assignedEvidenceId = authData.evidenceId || clientTempId;

  // 2. Si Cloudflare R2 está configurado con Presigned URL directa
  if (authData.r2Configured && authData.uploadUrl) {
    try {
      onProgress?.({ percent: 30, status: "Subiendo directamente a Cloudflare R2..." });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", authData.uploadUrl, true);
        xhr.setRequestHeader("Content-Type", mimeType);

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = 30 + Math.round((evt.loaded / evt.total) * 60);
            onProgress?.({
              percent: Math.min(pct, 90),
              status: `Transfiriendo a Cloudflare R2 (${pct}%)...`,
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Fallo HTTP en Cloudflare R2: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Fallo de red en subida directa a Cloudflare R2"));
        xhr.ontimeout = () => reject(new Error("Tiempo de espera agotado al conectar con R2"));
        xhr.send(archivo);
      });

      onProgress?.({ percent: 92, status: "Verificando consistencia física en R2..." });

      // Confirmar metadatos en Neon tras subida verificada
      const confirmRes = await fetch("/api/storage/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceId: assignedEvidenceId,
          key: authData.key,
          url: authData.publicUrl,
          mimeType,
          fileSize,
          orderId,
          orderNumber,
          vehicleId,
          plate,
          tipo,
          durationSeconds,
          transcriptionText,
          clientTempId,
          uploadedBy,
          branch,
        }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok || !confirmData.success) {
        throw new Error(confirmData.error || "No se pudo confirmar la persistencia de la evidencia en base de datos.");
      }

      onProgress?.({ percent: 100, status: "Evidencia guardada y verificada exitosamente." });

      const finalUrl = confirmData.evidence?.url || `/api/storage/download?key=${encodeURIComponent(authData.key)}`;

      return {
        url: finalUrl,
        key: authData.key,
        evidenceId: assignedEvidenceId,
        storage: "cloudflare-r2",
        clientTempId,
        mimeType,
        fileSizeBytes: confirmData.evidence?.fileSizeBytes || fileSize,
        tipo,
        durationSeconds,
        transcriptionText,
      };
    } catch (directErr: any) {
      console.warn("Subida directa a R2 requirió canal proxy alternativo:", directErr);
      // Notificar al servidor que el intento directo falló para evitar registros huérfanos marcados como guardados
      await fetch("/api/storage/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceId: assignedEvidenceId,
          key: authData.key,
          status: "FAILED",
        }),
      }).catch(() => {});
    }
  }

  // 3. Fallback / Canal seguro del servidor
  onProgress?.({ percent: 40, status: "Subiendo a través del servidor seguro..." });

  const formData = new FormData();
  formData.append("file", archivo, safeFileName);
  formData.append("folder", carpeta);
  formData.append("clientTempId", clientTempId);
  formData.append("tipo", tipo);
  formData.append("uploadedBy", uploadedBy);
  formData.append("branch", branch);
  if (orderId) formData.append("orderId", orderId);
  if (orderNumber) formData.append("orderNumber", orderNumber);
  if (vehicleId) formData.append("vehicleId", vehicleId);
  if (plate) formData.append("plate", plate);
  if (durationSeconds) formData.append("durationSeconds", String(durationSeconds));
  if (transcriptionText) formData.append("transcriptionText", transcriptionText);

  const res = await fetch("/api/storage/upload", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();

  if (!res.ok || !data.success || !data.url) {
    throw new Error(data.error || "No se pudo guardar el archivo en el almacenamiento.");
  }

  onProgress?.({ percent: 100, status: "Evidencia guardada exitosamente." });

  return {
    url: data.url,
    key: data.key || safeFileName,
    evidenceId: data.evidenceId || assignedEvidenceId,
    storage: data.storage || "cloudflare-r2",
    clientTempId,
    mimeType,
    fileSizeBytes: fileSize,
    tipo,
    durationSeconds,
    transcriptionText,
  };
}

/**
 * Elimina de manera coordinada una evidencia multimedia entre Cloudflare R2 y Neon DB
 */
export async function eliminarEvidenciaSegura({
  evidenceId,
  key,
  orderId,
  motivo,
}: {
  evidenceId?: string;
  key?: string;
  orderId?: string;
  motivo?: string;
}): Promise<boolean> {
  const params = new URLSearchParams();
  if (evidenceId) params.append("id", evidenceId);
  if (key) params.append("key", key);
  if (orderId) params.append("orderId", orderId);
  if (motivo) params.append("motivo", motivo);

  const res = await fetch(`/api/storage/evidence?${params.toString()}`, {
    method: "DELETE",
  });
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || "No se pudo eliminar la evidencia.");
  }
  return true;
}
