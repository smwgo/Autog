export type PlataformaWhatsApp = "ios" | "android" | "pc";
export type ModoWhatsApp = "auto" | "movil" | "pc";

/**
 * Normaliza un número telefónico a formato internacional E.164 sin '+' (Ecuador por defecto).
 * Ej: "0963046114" -> "593963046114", "963046114" -> "593963046114".
 */
export function normalizarTelefonoWhatsApp(phone?: string | null): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 && digits.startsWith("0")) {
    return `593${digits.slice(1)}`;
  }
  if (digits.length === 9 && digits.startsWith("9")) {
    return `593${digits}`;
  }
  return digits;
}

/**
 * Detecta si el navegador actual corre en iOS (incluye iPadOS), Android o PC.
 */
export function detectarPlataformaWhatsApp(): PlataformaWhatsApp {
  if (typeof navigator === "undefined") return "pc";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "pc";
}

/**
 * Construye la URL de WhatsApp compatible con Android, iOS (app nativa) y PC (WhatsApp Web).
 */
export function construirUrlWhatsApp({
  phone,
  text,
  modo = "auto",
}: {
  phone?: string | null;
  text: string;
  modo?: ModoWhatsApp;
}): string {
  const plataforma = detectarPlataformaWhatsApp();
  const usarMovil =
    modo === "movil" || (modo === "auto" && (plataforma === "ios" || plataforma === "android"));
  const phoneNormalized = normalizarTelefonoWhatsApp(phone);
  const encodedText = encodeURIComponent(text);

  const base = usarMovil
    ? "https://api.whatsapp.com/send"
    : "https://web.whatsapp.com/send";

  return phoneNormalized
    ? `${base}?phone=${phoneNormalized}&text=${encodedText}`
    : `${base}?text=${encodedText}`;
}

/**
 * Abre WhatsApp evitando bloqueos de popups y fallos de about:blank en Safari/Chrome iOS.
 */
export function abrirWhatsAppCompatible({
  phone,
  text,
  modo = "auto",
  preOpenedWindow,
}: {
  phone?: string | null;
  text: string;
  modo?: ModoWhatsApp;
  preOpenedWindow?: Window | null;
}): string {
  const url = construirUrlWhatsApp({ phone, text, modo });
  if (typeof window === "undefined") return url;

  const plataforma = detectarPlataformaWhatsApp();
  if (plataforma === "ios") {
    if (preOpenedWindow && !preOpenedWindow.closed) {
      preOpenedWindow.close();
    }
    window.location.assign(url);
    return url;
  }

  if (preOpenedWindow && !preOpenedWindow.closed) {
    preOpenedWindow.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return url;
}
