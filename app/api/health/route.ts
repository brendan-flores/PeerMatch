import { vercelApiEnvHint } from "@/app/lib/api";
import { getServerApiBackendOrigin } from "@/app/lib/api/apiBackend";
import { readUpstreamBodyText, sanitizeProxiedResponseHeaders } from "@/app/lib/auth/proxyBuffer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Proxies Render /api/health — use in the browser to verify Vercel → Render wiring. */
export async function GET() {
  const backend = getServerApiBackendOrigin();
  const target = `${backend}/api/health`;

  try {
    const upstream = await fetch(target, {
      cache: "no-store",
      signal: AbortSignal.timeout(9_500),
    });
    const body = await readUpstreamBodyText(upstream);
    const headers = new Headers(upstream.headers);
    sanitizeProxiedResponseHeaders(headers, new TextEncoder().encode(body).byteLength);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", "no-store");

    return new Response(body || "{}", {
      status: upstream.status,
      headers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "upstream fetch failed";
    return Response.json(
      {
        ok: false,
        message: `Cannot reach the API at ${backend}.${vercelApiEnvHint()}`,
        detail: message,
        proxyTarget: backend,
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
