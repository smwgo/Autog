export const PROTECTED_ADMIN_EMAILS = [
  "tiendaautoggerencia@gmail.com",
  "tiendaautogadmin@gmail.com",
] as const;

export function isProtectedAdminEmail(email: string | null | undefined): boolean {
  return PROTECTED_ADMIN_EMAILS.includes(
    (email || "").trim().toLowerCase() as (typeof PROTECTED_ADMIN_EMAILS)[number]
  );
}
