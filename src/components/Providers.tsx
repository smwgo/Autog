"use client";

function installAuthFetchInterceptor() {
  if (typeof window === "undefined") return;
  const win = window as typeof window & { __autogFetchPatched?: boolean };
  if (win.__autogFetchPatched) return;
  win.__autogFetchPatched = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const rawUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      const parsed = new URL(rawUrl, window.location.origin);
      if (
        parsed.origin === window.location.origin &&
        parsed.pathname.startsWith("/api/")
      ) {
        const token = localStorage.getItem("autog_session_token");
        if (token) {
          const headers = new Headers(
            init?.headers ?? (input instanceof Request ? input.headers : undefined)
          );
          if (!headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
          }
          return originalFetch(input, { ...init, headers });
        }
      }
    } catch {
      // Continuar con fetch original si hay algún error leyendo URL/headers
    }
    return originalFetch(input, init);
  };
}

installAuthFetchInterceptor();

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
