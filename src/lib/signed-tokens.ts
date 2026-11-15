import crypto from "crypto";

export const SESSION_COOKIE_NAME = "auth_session";
export const SESSION_SIG_COOKIE_NAME = "autog_session_sig";

let ephemeralRuntimeSecret: string | null = null;

/**
 * Deriva la clave HMAC del servidor sin exponer secretos estáticos débiles en el código fuente.
 * Prioriza AUTH_SECRET / SESSION_SECRET / JWT_SECRET y, si no existen, deriva con SHA-256 desde DATABASE_URL.
 */
export function getSigningSecret(): string {
  const explicit =
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET;
  if (explicit && explicit.trim().length >= 16) {
    return explicit.trim();
  }

  const dbSeed = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (dbSeed && dbSeed.trim().length > 0) {
    return crypto
      .createHmac("sha256", "autog-server-hmac-key-v1")
      .update(dbSeed.trim())
      .digest("hex");
  }

  if (!ephemeralRuntimeSecret) {
    ephemeralRuntimeSecret = crypto.randomBytes(32).toString("hex");
  }
  return ephemeralRuntimeSecret;
}

export function signPayload(payload: string): string {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("base64url");
}

export function verifyPayloadSignature(
  payload: string,
  signature?: string | null
): boolean {
  if (!payload || !signature || typeof signature !== "string") return false;
  try {
    const expected = signPayload(payload);
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature.trim(), "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function signSupplierScope(scope: string): string {
  return signPayload(`supplier:${String(scope || "").trim()}`);
}

export function verifySupplierScope(
  scope: string,
  signature?: string | null
): boolean {
  if (!scope || !signature) return false;
  return verifyPayloadSignature(`supplier:${String(scope).trim()}`, signature);
}

export interface SignedSessionPayload {
  id?: string;
  username?: string;
  name?: string;
  role?: string;
  branch?: string;
  branchLabel?: string;
  email?: string;
  whatsapp?: string;
  isSuperAdmin?: boolean;
  accessOficina?: boolean;
  accessPos?: boolean;
  accessTaller?: boolean;
  permissions?: string[];
  iat?: number;
}

export function isStaffSession(session?: SignedSessionPayload | null): boolean {
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  const roleUpper = String(session.role || "").trim().toUpperCase();
  if (!roleUpper) return false;
  return !["CLIENTE", "CUSTOMER", "CLIENT"].includes(roleUpper);
}

export function isAdminSession(session?: SignedSessionPayload | null): boolean {
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  const roleUpper = String(session.role || "").trim().toUpperCase();
  return ["ROOT", "ADMIN", "ADMINISTRADOR", "GERENCIA", "GERENTE"].includes(roleUpper);
}

export function signSessionCookieValue(rawSessionJson: string): string {
  return signPayload(`session:${rawSessionJson}`);
}

export function verifySignedSessionCookie(
  rawSessionJson?: string | null,
  sig?: string | null
): SignedSessionPayload | null {
  if (!rawSessionJson || !sig) return null;
  let verifiedRaw: string | null = null;
  if (verifyPayloadSignature(`session:${rawSessionJson}`, sig)) {
    verifiedRaw = rawSessionJson;
  } else {
    try {
      const decoded = decodeURIComponent(rawSessionJson);
      if (decoded !== rawSessionJson && verifyPayloadSignature(`session:${decoded}`, sig)) {
        verifiedRaw = decoded;
      }
    } catch {}
  }
  if (!verifiedRaw) return null;
  try {
    const parsed = JSON.parse(verifiedRaw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as SignedSessionPayload;
  } catch {
    return null;
  }
}

export function parseCookieHeader(
  cookieHeader?: string | null
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

export function getVerifiedSessionFromRequest(
  request: Request
): SignedSessionPayload | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const raw = cookies[SESSION_COOKIE_NAME];
  const sig = cookies[SESSION_SIG_COOKIE_NAME];
  const fromCookie = verifySignedSessionCookie(raw, sig);
  if (fromCookie) return fromCookie;

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return verifySignedSessionToken(authHeader.slice(7).trim());
  }
  return null;
}

export function isStaffRole(role?: string | null): boolean {
  const normalized = String(role || "").trim().toUpperCase();
  return (
    normalized === "ADMIN" ||
    normalized === "GERENCIA" ||
    normalized === "TALLER" ||
    normalized === "MECANICO" ||
    normalized === "POS" ||
    normalized === "CAJA" ||
    normalized === "RECEPCION" ||
    normalized === "OFICINA" ||
    normalized === "STAFF" ||
    normalized === "OPERADOR"
  );
}

/**
 * Empaqueta una sesión JSON y su firma HMAC en un token Bearer compacto
 * como respaldo para contextos donde las cookies SameSite=Lax estén bloqueadas (ej. iframes).
 */
export function createSignedSessionToken(sessionJson: string): string {
  const encoded = Buffer.from(sessionJson, "utf8").toString("base64url");
  const sig = signSessionCookieValue(sessionJson);
  return `${encoded}.${sig}`;
}

export function verifySignedSessionToken(
  token?: string | null
): SignedSessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const dotIdx = token.indexOf(".");
  if (dotIdx <= 0) return null;
  const encoded = token.slice(0, dotIdx).trim();
  const sig = token.slice(dotIdx + 1).trim();
  if (!encoded || !sig) return null;
  try {
    const rawJson = Buffer.from(encoded, "base64url").toString("utf8");
    return verifySignedSessionCookie(rawJson, sig);
  } catch {
    return null;
  }
}
