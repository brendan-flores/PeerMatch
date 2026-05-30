import { apiGetJson, ApiError, isApiError } from "@/app/lib/api";

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
      return await apiGetJson<AuthMeResponse>("/api/auth/me");
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
