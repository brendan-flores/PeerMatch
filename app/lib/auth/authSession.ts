import { vercelApiEnvHint } from "../api/deployEnvHint";
import { apiGetJson, ApiError, isApiError } from "../api/client";
import { extractApiErrorMessage } from "../api/parseApiError";

export type AuthMeUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  accountType?: string;
  photoDataUrl?: string;
};

export type AuthMeResponse = {
  user: AuthMeUser;
};

export type LoginUserPayload = AuthMeUser & {
  role?: string;
  accountType?: string;
};

function rawUserRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  const nested = record.user;
  if (nested && typeof nested === "object") {
    return nested as Record<string, unknown>;
  }
  return record;
}

/** Normalize POST /api/auth/login or GET /api/auth/me bodies. */
export function parseLoginUserFromPayload(payload: unknown): LoginUserPayload {
  const raw = rawUserRecord(payload);

  return {
    id: String(raw.id ?? raw._id ?? raw.userId ?? ""),
    name: typeof raw.name === "string" ? raw.name : "",
    email: typeof raw.email === "string" ? raw.email : "",
    role: typeof raw.role === "string" ? raw.role : "",
    accountType: typeof raw.accountType === "string" ? raw.accountType : undefined,
    photoDataUrl: typeof raw.photoDataUrl === "string" ? raw.photoDataUrl : undefined,
  };
}

/** Normalize GET /api/auth/me — always returns null instead of throwing on bad shape. */
export function parseAuthMeResponse(payload: unknown): AuthMeResponse | null {
  const parsed = parseLoginUserFromPayload(payload);
  if (!hasAuthUserId(parsed)) return null;

  return {
    user: {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      role: parsed.role || "",
      accountType: parsed.accountType,
      photoDataUrl: parsed.photoDataUrl,
    },
  };
}

export function hasAuthUserId(user: Pick<LoginUserPayload, "id">): boolean {
  return Boolean(String(user.id || "").trim());
}

const EMPTY_SESSION_BODY = "EMPTY_SESSION_BODY";

function isRetryableAuthMeError(err: unknown): boolean {
  if (!isApiError(err)) return true;
  if (err.status === 0) return true;
  if (err.status === 401) return true;
  if (err.status === 502 || err.status === 503 || err.status === 504) return true;
  if (err.status === 200 && err.message === EMPTY_SESSION_BODY) return true;
  return false;
}

function toSessionError(err: unknown): unknown {
  if (!isApiError(err)) return err;
  if (err.message !== EMPTY_SESSION_BODY) return err;
  return new ApiError(
    "Signed in, but your session did not load. Redeploy both Render and Vercel (latest login fix), hard-refresh, then try again. In DevTools → Application → Cookies, confirm peermatch_token exists on peermatch-app.site.",
    500,
    err.payload,
  );
}

function invalidMeResponseError(payload: unknown): ApiError {
  const emptyBody =
    payload === undefined ||
    payload === null ||
    (typeof payload === "object" &&
      payload !== null &&
      Object.keys(payload as object).length === 0);

  const hint =
    typeof payload === "string" && payload.includes("<html")
      ? `The API returned an HTML page instead of JSON.${vercelApiEnvHint()}`
      : emptyBody
        ? "Signed in, but the server returned an empty session response. Redeploy the latest Vercel build (login cookie fix), then try again in a private window."
        : `Could not read your session from the server. If /api/health works, redeploy Vercel and try login again.`;

  const fromPayload = extractApiErrorMessage(payload, 500);
  const message =
    fromPayload && !fromPayload.startsWith("Request failed (")
      ? fromPayload
      : hint;

  return new ApiError(message, 500, payload);
}

/**
 * Load /api/auth/me with retries (mobile Safari may apply Set-Cookie slightly after login).
 */
export async function fetchAuthMeWithRetry(options?: {
  attempts?: number;
  baseDelayMs?: number;
}): Promise<AuthMeResponse> {
  const attempts = options?.attempts ?? 5;
  const baseDelayMs = options?.baseDelayMs ?? 350;
  let lastErr: unknown;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const payload = await apiGetJson<unknown>("/api/auth/me");
      const parsed = parseAuthMeResponse(payload);
      if (parsed) return parsed;
      const emptyBody =
        payload === undefined ||
        payload === null ||
        (typeof payload === "object" &&
          payload !== null &&
          Object.keys(payload as object).length === 0);
      if (emptyBody) {
        throw new ApiError(EMPTY_SESSION_BODY, 200, payload);
      }
      throw invalidMeResponseError(payload);
    } catch (err) {
      lastErr = err;
      if (!isRetryableAuthMeError(err) || i === attempts - 1) {
        throw toSessionError(err);
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (i + 1)));
    }
  }

  throw toSessionError(lastErr);
}

/** Confirm the session cookie is stored before leaving the login page. */
export async function assertSessionAfterLogin(): Promise<AuthMeResponse> {
  try {
    return await fetchAuthMeWithRetry({ attempts: 8, baseDelayMs: 400 });
  } catch (err) {
    if (isApiError(err) && err.status === 401) {
      throw new ApiError(
        "Signed in, but this browser did not keep your session. Try again, or use the same site URL you bookmarked (not a redirect from another domain).",
        401,
        err.payload,
      );
    }
    throw toSessionError(err);
  }
}
