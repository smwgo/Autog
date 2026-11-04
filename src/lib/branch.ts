export type SedeType = "PRINCIPAL" | "SUCURSAL";
export type FiltroSedeType = "PRINCIPAL" | "SUCURSAL" | "AMBOS";

export const SEDE_STORAGE_KEY = "autog_active_branch";
export const USER_ROLE_BRANCH_KEY = "autog_user_branch";

export function normalizeSede(raw?: string | null): SedeType {
  const val = String(raw || "").trim().toUpperCase();
  if (val.includes("SUCURSAL") || val.includes("NORTE") || val === "SUC") {
    return "SUCURSAL";
  }
  return "PRINCIPAL";
}

export function getClientUserBranch(): SedeType {
  if (typeof window === "undefined") return "PRINCIPAL";
  const raw = window.localStorage.getItem(USER_ROLE_BRANCH_KEY);
  if (raw) return normalizeSede(raw);

  // Fallback: extraer branch del usuario logeado en localStorage si aún no se guardó la clave
  try {
    const rawUser = window.localStorage.getItem("currentUser");
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u?.branch) {
        const normed = normalizeSede(u.branch);
        window.localStorage.setItem(USER_ROLE_BRANCH_KEY, normed);
        return normed;
      }
    }
  } catch {}

  return "PRINCIPAL";
}

export function setClientUserBranch(branch: SedeType) {
  if (typeof window === "undefined") return;
  const normed = normalizeSede(branch);
  window.localStorage.setItem(USER_ROLE_BRANCH_KEY, normed);
  if (normed === "SUCURSAL") {
    window.localStorage.setItem(SEDE_STORAGE_KEY, "SUCURSAL");
  } else {
    const current = (window.localStorage.getItem(SEDE_STORAGE_KEY) || "").toUpperCase();
    if (!current || current === "SUCURSAL") {
      window.localStorage.setItem(SEDE_STORAGE_KEY, "PRINCIPAL");
    }
  }
  window.dispatchEvent(new CustomEvent("autog-branch-change", { detail: { branch: normed } }));
}

export function getClientActiveBranch(pathname?: string): FiltroSedeType {
  if (typeof window === "undefined") return "PRINCIPAL";
  const userBranch = getClientUserBranch();

  // Si el operador pertenece a Sucursal, solo puede operar y ver SUCURSAL
  if (userBranch === "SUCURSAL") {
    return "SUCURSAL";
  }

  // Si el usuario es de Principal o Admin, puede alternar entre PRINCIPAL, SUCURSAL o AMBOS
  const stored = (window.localStorage.getItem(SEDE_STORAGE_KEY) || "").toUpperCase();
  if (stored === "AMBOS" || stored === "AMBAS") {
    return "AMBOS";
  }
  if (stored === "SUCURSAL") {
    return "SUCURSAL";
  }
  return "PRINCIPAL";
}

export function setClientActiveBranch(sede: FiltroSedeType) {
  if (typeof window === "undefined") return;
  const userBranch = getClientUserBranch();
  if (userBranch === "SUCURSAL" && sede !== "SUCURSAL") {
    window.localStorage.setItem(SEDE_STORAGE_KEY, "SUCURSAL");
  } else {
    window.localStorage.setItem(SEDE_STORAGE_KEY, sede);
  }
  window.dispatchEvent(new CustomEvent("autog-branch-change", { detail: { sede } }));
}
