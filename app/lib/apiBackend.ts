/** Server-side API origin (Render, local, etc.). Used by the Next.js proxy route. */

export function getServerApiBackendOrigin(): string {
  const raw =
    process.env.API_PROXY_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:5000";
  return raw.trim().replace(/\/$/, "");
}
