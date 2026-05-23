import { getServerApiBackendOrigin } from "@/app/lib/apiBackend";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function proxyToBackend(request: NextRequest, segments: string[] | undefined) {
  const backend = getServerApiBackendOrigin();
  const subpath = (segments ?? []).join("/");
  const target = `${backend}/api/${subpath}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  let body: string | undefined;
  if (METHODS_WITH_BODY.has(request.method)) {
    body = await request.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "upstream fetch failed";
    console.error("[api proxy]", target, detail);
    return NextResponse.json(
      {
        message:
          "Cannot reach the API server. Set API_PROXY_URL (or NEXT_PUBLIC_API_BASE_URL) on Vercel to your Render URL, then redeploy.",
        proxyTarget: backend,
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToBackend(request, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
