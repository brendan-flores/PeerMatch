/** Public site URLs for cross-domain links (set in Vercel env per deployment). */

function trimOrigin(value: string | undefined): string {
  return String(value || "").trim().replace(/\/$/, "");
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getMainSiteUrl(): string {
  return trimOrigin(process.env.NEXT_PUBLIC_MAIN_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL);
}

export function getAdminSiteUrl(): string {
  return trimOrigin(process.env.NEXT_PUBLIC_ADMIN_SITE_URL);
}

/**
 * API base URL for browser fetch / Socket.IO.
 * - If NEXT_PUBLIC_API_BASE_URL is set → use it (direct call to Render, etc.).
 * - Else on deployed site → same origin (Vercel rewrites proxy /api to API_PROXY_URL).
 * - Else local dev → http://localhost:5000
 */
export function getApiBaseUrl(): string {
  const fromEnv = trimOrigin(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined") {
    if (!isLocalHostname(window.location.hostname)) {
      return window.location.origin;
    }
    return "http://localhost:5000";
  }

  return "http://localhost:5000";
}
