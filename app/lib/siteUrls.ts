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
 * Base URL for browser fetch().
 * - Production: `""` → relative `/api/...` (proxied at runtime by app/api/[[...path]]).
 * - NEXT_PUBLIC_API_BASE_URL: direct calls to API (needs CORS).
 * - Local: http://localhost:5000
 */
export function getApiBaseUrl(): string {
  const direct = trimOrigin(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (direct) return direct;

  if (typeof window !== "undefined") {
    if (!isLocalHostname(window.location.hostname)) {
      return "";
    }
    return "http://localhost:5000";
  }

  return "http://localhost:5000";
}

/** Socket.IO URL (same-origin on Vercel when using API_PROXY_URL + rewrites). */
export function getSocketBaseUrl(): string {
  const direct = trimOrigin(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (direct) return direct;

  if (typeof window !== "undefined") {
    if (!isLocalHostname(window.location.hostname)) {
      return window.location.origin;
    }
    return "http://localhost:5000";
  }

  return "http://localhost:5000";
}
