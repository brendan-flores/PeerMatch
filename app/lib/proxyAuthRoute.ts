import { getServerApiBackendOrigin } from "@/app/lib/apiBackend";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  applySessionCookieFromUpstream,
  clearSessionCookieOnAppHost,
} from "@/app/lib/proxyAuthCookie";

const PROXY_TIMEOUT_MS = 9_500;

/** POST auth endpoints that may return Set-Cookie from Render. */
export async function proxyAuthPostWithSessionCookie(
  request: NextRequest,
  upstreamPath: string,
): Promise<NextResponse> {
  const backend = getServerApiBackendOrigin();
  const body = await request.text();

  const upstream = await fetch(`${backend}${upstreamPath}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
  });

  const bodyText = await upstream.text();

  if (upstream.ok) {
    await applySessionCookieFromUpstream(upstream);
  }

  return new NextResponse(bodyText || "{}", {
    status: upstream.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function proxyAuthLogout(request: NextRequest): Promise<NextResponse> {
  const backend = getServerApiBackendOrigin();
  const cookieHeader = request.headers.get("cookie");

  try {
    await fetch(`${backend}/api/auth/logout`, {
      method: "POST",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
  } catch {
    // Still clear the app-host cookie below.
  }

  await clearSessionCookieOnAppHost();
  return new NextResponse(null, { status: 204 });
}
