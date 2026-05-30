import type { NextRequest } from "next/server";
import { proxyAuthPostWithSessionCookie } from "@/app/lib/proxyAuthRoute";

export const runtime = "nodejs";
export const maxDuration = 10;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return proxyAuthPostWithSessionCookie(request, "/api/auth/verify-otp");
}
