import { vercelApiEnvHint } from "@/app/lib/deployEnvHint";
import { getServerApiBackendOrigin } from "@/app/lib/apiBackend";

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
    const body = await upstream.text();

    return new Response(body || "{}", {
      status: upstream.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
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
