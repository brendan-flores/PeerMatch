import { apiGetJson, ApiError, isApiError } from "@/app/lib/api";
import { extractApiErrorMessage } from "@/app/lib/parseApiError";

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

function isRetryableAuthMeError(err: unknown): boolean {
  if (!isApiError(err)) return true;
  return (
    err.status === 0 ||
    err.status === 401 ||
    err.status === 502 ||
    err.status === 503 ||
    err.status === 504
  );
}

function invalidMeResponseError(payload: unknown): ApiError {
  const hint =
    typeof payload === "string" && payload.includes("<html")
      ? "The API returned an HTML page instead of JSON. Set API_PROXY_URL on Vercel to your Render URL and redeploy."
      : "Could not read your session from the server. On Vercel set API_PROXY_URL and NEXT_PUBLIC_API_BASE_URL to your Render API URL, then redeploy.";

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
      throw invalidMeResponseError(payload);
    } catch (err) {
      lastErr = err;
      if (!isRetryableAuthMeError(err) || i === attempts - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (i + 1)));
    }
  }

  throw lastErr;
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
    throw err;
  }
}
