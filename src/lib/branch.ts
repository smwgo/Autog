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
  return normalizeSede(raw);
}

export function setClientUserBranch(branch: SedeType) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_ROLE_BRANCH_KEY, branch);
  if (branch === "SUCURSAL") {
    window.localStorage.setItem(SEDE_STORAGE_KEY, "SUCURSAL");
  }
  window.dispatchEvent(new CustomEvent("autog-branch-change", { detail: { branch } }));
}

export function getClientActiveBranch(pathname?: string): FiltroSedeType {
  if (typeof window === "undefined") return "PRINCIPAL";
  const userBranch = getClientUserBranch();
  const isGerenciaOrOficina =
    pathname?.startsWith("/gerencia") || pathname?.startsWith("/oficina");

  // Si el operador pertenece a Sucursal y está en POS o Taller, solo puede ver SUCURSAL
  if (!isGerenciaOrOficina && userBranch === "SUCURSAL") {
    return "SUCURSAL";
  }

  const stored = (window.localStorage.getItem(SEDE_STORAGE_KEY) || "").toUpperCase();
  if (isGerenciaOrOficina && stored === "AMBOS") {
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
