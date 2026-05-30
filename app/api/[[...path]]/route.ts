import { vercelApiEnvHint } from "@/app/lib/deployEnvHint";
import { getServerApiBackendOrigin } from "@/app/lib/apiBackend";
import {
  applySessionCookieFromUpstream,
  applySessionFromAuthJsonBody,
  stripSessionTokenFromAuthJson,
} from "@/app/lib/proxyAuthCookie";
import { readUpstreamBodyText, sanitizeProxiedResponseHeaders } from "@/app/lib/proxyBuffer";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
/** Vercel Hobby max is 10s; keep proxy calls short (API responds before slow SMTP). */
export const maxDuration = 10;

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PROXY_TIMEOUT_MS = 9_500;
const PROXY_ATTEMPTS = 3;

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
  if (subpath.startsWith("auth/") || subpath === "health") {
    headers.set("cache-control", "no-store");
  }

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

  for (let attempt = 0; attempt < PROXY_ATTEMPTS; attempt += 1) {
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

    if (attempt < PROXY_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  if (!upstream) {
    console.error("[api proxy]", target, lastError);
    return NextResponse.json(
      {
        message:
          `Cannot reach the API server. Confirm Render is running.${vercelApiEnvHint()} If the API was sleeping, try again in a few seconds.`,
        proxyTarget: backend,
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("set-cookie");

  const upstreamCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];
  const cookieLines =
    upstreamCookies.length > 0
      ? upstreamCookies
      : upstream.headers.get("set-cookie")
        ? [upstream.headers.get("set-cookie") as string]
        : [];

  for (const raw of cookieLines) {
    const rewritten = rewriteSetCookieForSiteHost(raw);
    if (rewritten) responseHeaders.append("set-cookie", rewritten);
  }

  let bodyText = await readUpstreamBodyText(upstream);

  if (
    upstream.ok &&
    request.method === "POST" &&
    (subpath === "auth/login" || subpath === "auth/verify-otp" || subpath === "auth/verify")
  ) {
    const cookieApplied = await applySessionCookieFromUpstream(upstream);
    if (!cookieApplied) {
      await applySessionFromAuthJsonBody(bodyText);
    }
    bodyText = stripSessionTokenFromAuthJson(bodyText);
    responseHeaders.delete("set-cookie");
  }

  const bodyBytes = new TextEncoder().encode(bodyText);
  sanitizeProxiedResponseHeaders(responseHeaders, bodyBytes.byteLength);
  const contentType = responseHeaders.get("content-type") || "";
  if (
    !contentType.includes("application/json") &&
    (subpath.startsWith("auth/") || subpath === "health" || bodyText.trim().startsWith("{"))
  ) {
    responseHeaders.set("content-type", "application/json; charset=utf-8");
  }

  return new NextResponse(bodyText, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

/** Drop upstream Domain= so the session cookie applies to the Next.js site (fixes mobile/Vercel proxy login). */
function rewriteSetCookieForSiteHost(raw: string): string | null {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;

  const parts = trimmed.split(";").map((part) => part.trim());
  const nameValue = parts[0];
  if (!nameValue || !nameValue.includes("=")) return null;

  const attrs: string[] = [nameValue];
  let hasPath = false;
  let hasSameSite = false;
  let hasSecure = false;

  for (const part of parts.slice(1)) {
    if (/^domain=/i.test(part)) continue;
    if (/^path=/i.test(part)) {
      hasPath = true;
      attrs.push("Path=/");
      continue;
    }
    if (/^samesite=/i.test(part)) {
      hasSameSite = true;
      attrs.push("SameSite=Lax");
      continue;
    }
    if (/^secure$/i.test(part)) {
      hasSecure = true;
      attrs.push("Secure");
      continue;
    }
    if (/^httponly$/i.test(part)) {
      attrs.push("HttpOnly");
      continue;
    }
    if (/^max-age=/i.test(part) || /^expires=/i.test(part)) {
      attrs.push(part);
    }
  }

  if (!hasPath) attrs.push("Path=/");
  if (!hasSameSite) attrs.push("SameSite=Lax");
  if (!hasSecure && process.env.NODE_ENV === "production") attrs.push("Secure");

  return attrs.join("; ");
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
