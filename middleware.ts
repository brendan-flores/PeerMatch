import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function normalizeHost(host: string): string {
  return host.split(":")[0].toLowerCase();
}

function parseHosts(raw: string | undefined): string[] {
  return String(raw || "")
    .split(",")
    .map((entry) => normalizeHost(entry.trim()))
    .filter(Boolean);
}

function trimOrigin(value: string | undefined): string {
  return String(value || "").trim().replace(/\/$/, "");
}

const MAIN_HOSTS = parseHosts(
  process.env.MAIN_SITE_HOSTS || process.env.NEXT_PUBLIC_MAIN_SITE_HOST,
);
const ADMIN_HOSTS = parseHosts(
  process.env.ADMIN_SITE_HOSTS || process.env.NEXT_PUBLIC_ADMIN_SITE_HOST,
);
const MAIN_SITE_URL = trimOrigin(
  process.env.NEXT_PUBLIC_MAIN_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL,
);
const ADMIN_SITE_URL = trimOrigin(process.env.NEXT_PUBLIC_ADMIN_SITE_URL);

const MAIN_ONLY_PREFIXES = [
  "/login",
  "/home",
  "/client-home",
  "/freelancer-dashboard",
  "/register",
  "/forgot-password",
];

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

  const host = normalizeHost(request.headers.get("host") || "");
  const onAdminHost = ADMIN_HOSTS.length > 0 && ADMIN_HOSTS.includes(host);
  const onMainHost = MAIN_HOSTS.length > 0 && MAIN_HOSTS.includes(host);

  if (!onAdminHost && !onMainHost) {
    return NextResponse.next();
  }

  if (onAdminHost) {
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

  if (onMainHost && pathname.startsWith("/admin")) {
    const targetBase = ADMIN_SITE_URL || request.nextUrl.origin;
    const dest = new URL(`${pathname}${request.nextUrl.search}`, targetBase);
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.png|.*\\..*).*)"],
};
