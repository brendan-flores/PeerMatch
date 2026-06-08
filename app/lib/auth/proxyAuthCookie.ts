import { cookies } from "next/headers";

/** Must match Render `JWT_COOKIE_NAME` (default peermatch_token). */
export const SESSION_COOKIE_NAME =
  process.env.JWT_COOKIE_NAME || "peermatch_token";

const DEFAULT_MAX_AGE_SEC = 7 * 24 * 60 * 60;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectSetCookieLines(upstream: Response): string[] {
  if (typeof upstream.headers.getSetCookie === "function") {
    const list = upstream.headers.getSetCookie();
    if (list.length > 0) return list;
  }
  const single = upstream.headers.get("set-cookie");
  return single ? [single] : [];
}

export function parseTokenFromSetCookieLine(raw: string): string | null {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;

  const nameValue = trimmed.split(";")[0]?.trim() || "";
  const match = nameValue.match(
    new RegExp(`^${escapeRegExp(SESSION_COOKIE_NAME)}=(.+)$`, "i"),
  );
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

export function parseMaxAgeFromSetCookieLine(raw: string): number | undefined {
  const match = String(raw || "").match(/(?:^|;)\s*max-age=(\d+)/i);
  if (!match?.[1]) return undefined;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Copy JWT from Render Set-Cookie onto the Vercel app host (reliable on mobile Safari).
 */
export async function setSessionCookieOnAppHost(
  token: string,
  maxAgeSec = DEFAULT_MAX_AGE_SEC,
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  });
}

export async function applySessionCookieFromUpstream(
  upstream: Response,
): Promise<boolean> {
  for (const line of collectSetCookieLines(upstream)) {
    const token = parseTokenFromSetCookieLine(line);
    if (!token) continue;

    const maxAge = parseMaxAgeFromSetCookieLine(line) ?? DEFAULT_MAX_AGE_SEC;
    await setSessionCookieOnAppHost(token, maxAge);
    return true;
  }
  return false;
}

/** Read sessionToken from login/verify JSON (fallback when Set-Cookie is not visible to fetch). */
export async function applySessionFromAuthJsonBody(
  bodyText: string,
): Promise<boolean> {
  if (!bodyText.trim()) return false;
  try {
    const data = JSON.parse(bodyText) as { sessionToken?: unknown };
    const token =
      typeof data.sessionToken === "string" ? data.sessionToken.trim() : "";
    if (!token) return false;
    await setSessionCookieOnAppHost(token);
    return true;
  } catch {
    return false;
  }
}

export function stripSessionTokenFromAuthJson(bodyText: string): string {
  if (!bodyText.trim()) return "{}";
  try {
    const data = JSON.parse(bodyText) as Record<string, unknown>;
    if (!("sessionToken" in data)) return bodyText;
    const { sessionToken: _removed, ...rest } = data;
    return JSON.stringify(rest);
  } catch {
    return bodyText;
  }
}

export async function clearSessionCookieOnAppHost(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
