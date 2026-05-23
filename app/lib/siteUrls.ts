/** Public site URLs for cross-domain links (set in Vercel env per deployment). */

function trimOrigin(value: string | undefined): string {
  return String(value || "").trim().replace(/\/$/, "");
}

export function getMainSiteUrl(): string {
  return trimOrigin(process.env.NEXT_PUBLIC_MAIN_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL);
}

export function getAdminSiteUrl(): string {
  return trimOrigin(process.env.NEXT_PUBLIC_ADMIN_SITE_URL);
}

export function getApiBaseUrl(): string {
  return trimOrigin(process.env.NEXT_PUBLIC_API_BASE_URL) || "http://localhost:5000";
}
