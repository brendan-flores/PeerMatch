import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function parseHosts(raw: string | undefined): string[] {
  return String(raw || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** Match request Host header (keeps port for localhost:3000 vs :3001). */
function hostMatches(allowedHosts: string[], requestHost: string): boolean {
  const host = requestHost.trim().toLowerCase();
  if (!host || allowedHosts.length === 0) return false;

  const hostWithoutPort = host.split(":")[0];
  return allowedHosts.some((allowed) => {
    if (allowed === host) return true;
    if (!allowed.includes(":") && allowed === hostWithoutPort) return true;
    return false;
  });
}

function trimOrigin(value: string | undefined): string {
  return String(value || "").trim().replace(/\/$/, "");
}

function hostFromOrigin(origin: string): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

function mergeHosts(envHosts: string[], origin: string): string[] {
  const fromOrigin = hostFromOrigin(origin);
  const merged = fromOrigin ? [...envHosts, fromOrigin] : envHosts;
  return [...new Set(merged)];
}

const MAIN_SITE_URL = trimOrigin(
  process.env.NEXT_PUBLIC_MAIN_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL,
);
const ADMIN_SITE_URL = trimOrigin(process.env.NEXT_PUBLIC_ADMIN_SITE_URL);

const MAIN_HOSTS = mergeHosts(
  parseHosts(
    process.env.MAIN_SITE_HOSTS || process.env.NEXT_PUBLIC_MAIN_SITE_HOST,
  ),
  MAIN_SITE_URL,
);
const ADMIN_HOSTS = mergeHosts(
  parseHosts(
    process.env.ADMIN_SITE_HOSTS || process.env.NEXT_PUBLIC_ADMIN_SITE_HOST,
  ),
  ADMIN_SITE_URL,
);

const MAIN_ONLY_PREFIXES = [
  "/login",
  "/home",
  "/client-home",
  "/freelancer-dashboard",
  "/register",
  "/forgot-password",
];

/** True when admin is on its own domain (e.g. peermatch-admin.vercel.app), not /admin on main host. */
function usesSeparateAdminSite(): boolean {
  return Boolean(ADMIN_SITE_URL && MAIN_SITE_URL && ADMIN_SITE_URL !== MAIN_SITE_URL);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const host = request.headers.get("host") || "";
  const onMainHost = hostMatches(MAIN_HOSTS, host);
  const onDedicatedAdminHost =
    hostMatches(ADMIN_HOSTS, host) && !onMainHost;

  // Production: hide /admin/* on non-admin hosts (404, no redirect to admin URL).
  if (usesSeparateAdminSite() && pathname.startsWith("/admin") && !onDedicatedAdminHost) {
    const notFoundUrl = request.nextUrl.clone();
    notFoundUrl.pathname = "/page-not-found";
    notFoundUrl.search = "";
    return NextResponse.rewrite(notFoundUrl, { status: 404 });
  }

  if (!onDedicatedAdminHost && !onMainHost) {
    return NextResponse.next();
  }

  // Separate admin domain (production): peermatch-admin.vercel.app
  if (onDedicatedAdminHost) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    if (MAIN_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      const target = ADMIN_SITE_URL || request.nextUrl.origin;
      return NextResponse.redirect(new URL("/admin/dashboard", target));
    }

    if (!pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // Local dev (localhost:3000): / and /admin/* on the same host — no redirect
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.png|.*\\..*).*)"],
};
