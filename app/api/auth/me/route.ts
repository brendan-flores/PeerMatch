import { getServerApiBackendOrigin } from "@/app/lib/apiBackend";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

/** Proxies GET /api/auth/me with buffered body and forwarded Cookie header. */
export async function GET(request: NextRequest) {
  const backend = getServerApiBackendOrigin();
  const cookieHeader = request.headers.get("cookie");
  const target = `${backend}/api/auth/me`;

  try {
    const upstream = await fetch(target, {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
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
      { message: `Cannot reach the API. ${message}` },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
