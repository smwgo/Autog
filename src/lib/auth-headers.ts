export function getAuthHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  if (typeof window !== "undefined") {
    try {
      const token = localStorage.getItem("autog_session_token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }
  return headers;
}
