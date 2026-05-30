/**
 * Render API origin for the Vercel `/api/*` proxy (server-side only).
 * On Vercel you do NOT need API_PROXY_URL if NEXT_PUBLIC_API_BASE_URL is set.
 */

export function getServerApiBackendOrigin(): string {
  const raw =
    process.env.API_PROXY_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:5000";
  return raw.trim().replace(/\/$/, "");
}
