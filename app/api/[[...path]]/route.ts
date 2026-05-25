import { getServerApiBackendOrigin } from "@/app/lib/apiBackend";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
/** Allow slow Render cold starts + SMTP during registration (Vercel Pro; Hobby capped lower). */
export const maxDuration = 60;

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PROXY_TIMEOUT_MS = 55_000;

async function fetchUpstream(target: string, init: RequestInit): Promise<Response> {
  return fetch(target, {
    ...init,
    signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
  });
}

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

  const init: RequestInit = {
    method: request.method,
    headers,
    body,
    redirect: "manual",
  };

  let upstream: Response | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      upstream = await fetchUpstream(target, init);
      if (upstream.status !== 502 && upstream.status !== 503 && upstream.status !== 504) {
        break;
      }
      lastError = `upstream returned ${upstream.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "upstream fetch failed";
      upstream = null;
    }

    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  if (!upstream) {
    console.error("[api proxy]", target, lastError);
    return NextResponse.json(
      {
        message:
          "Cannot reach the API server. Confirm the API is running on Render, set API_PROXY_URL on Vercel to that URL, then redeploy. If the API was sleeping, try again in a few seconds.",
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
