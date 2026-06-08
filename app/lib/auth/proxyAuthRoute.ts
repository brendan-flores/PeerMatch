import { getServerApiBackendOrigin } from "../api/apiBackend";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  applySessionCookieFromUpstream,
  applySessionFromAuthJsonBody,
  clearSessionCookieOnAppHost,
  stripSessionTokenFromAuthJson,
} from "./proxyAuthCookie";

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

  let cookieApplied = false;
  if (upstream.ok) {
    cookieApplied = await applySessionCookieFromUpstream(upstream);
  }

  const bodyText = await upstream.text();

  if (upstream.ok && !cookieApplied) {
    await applySessionFromAuthJsonBody(bodyText);
  }

  const outgoing = upstream.ok
    ? stripSessionTokenFromAuthJson(bodyText)
    : bodyText || "{}";

  return new NextResponse(outgoing, {
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
