/** Shown in API errors when the Vercel → Render proxy is misconfigured. */
export function vercelApiEnvHint(): string {
  return " Set NEXT_PUBLIC_API_BASE_URL on Vercel to your Render API URL (e.g. https://peermatch-api.onrender.com), then redeploy.";
}
