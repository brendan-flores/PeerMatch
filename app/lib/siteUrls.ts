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
 * - Production browser: always `""` (same-origin `/api/...`) so HttpOnly cookies stay on the app
 *   host. Direct cross-origin calls to Render break login on mobile Safari/Chrome (ITP).
 * - Server / build: NEXT_PUBLIC_API_BASE_URL or localhost for proxy target.
 * - Local dev browser: http://localhost:5000 unless NEXT_PUBLIC_API_BASE_URL is set.
 */
export function getApiBaseUrl(): string {
  const direct = trimOrigin(process.env.NEXT_PUBLIC_API_BASE_URL);

  if (typeof window !== "undefined") {
    if (!isLocalHostname(window.location.hostname)) {
      return "";
    }
    return direct || "http://localhost:5000";
  }

  if (direct) return direct;
  return "http://localhost:5000";
}

/**
 * Socket.IO connects to the API host (cookies are on the app host; handshake uses cookie when
 * API and app share deployment with CORS, or when using local dev).
 */
export function getSocketBaseUrl(): string {
  const direct = trimOrigin(process.env.NEXT_PUBLIC_API_BASE_URL);

  if (typeof window !== "undefined") {
    if (!isLocalHostname(window.location.hostname)) {
      return direct || window.location.origin;
    }
    return direct || "http://localhost:5000";
  }

  if (direct) return direct;
  return "http://localhost:5000";
}
