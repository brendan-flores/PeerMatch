import { vercelApiEnvHint } from "@/app/lib/deployEnvHint";
import { extractApiErrorMessage, readApiResponsePayload } from "@/app/lib/parseApiError";
import { getApiBaseUrl as resolveApiBaseUrl } from "@/app/lib/siteUrls";

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

/** Works across Next.js chunks where `instanceof ApiError` can fail. */
export function isApiError(err: unknown): err is ApiError {
  if (err instanceof ApiError) return true;
  if (!err || typeof err !== "object") return false;
  const candidate = err as ApiError;
  return candidate.name === "ApiError" && typeof candidate.status === "number";
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (isApiError(err)) return err.message;
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  return fallback;
}

function getApiBaseUrl() {
  return resolveApiBaseUrl();
}

export async function apiPostJson<TResponse>(
  path: string,
  body: unknown,
  init?: Omit<RequestInit, "method" | "body" | "headers">
): Promise<TResponse> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "include",
      ...init,
    });
  } catch {
    const hint =
      typeof window !== "undefined" && !getApiBaseUrl()
        ? vercelApiEnvHint()
        : "";
    throw new ApiError(
      `Cannot connect to the server. Please make sure the API is running and try again.${hint}`,
      0,
    );
  }

  const payload = await readApiResponsePayload(res);

  if (!res.ok) {
    throw new ApiError(extractApiErrorMessage(payload, res.status), res.status, payload);
  }

  return payload as TResponse;
}

export async function apiPutJson<TResponse>(
  path: string,
  body: unknown,
  init?: Omit<RequestInit, "method" | "body" | "headers">
): Promise<TResponse> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "include",
      ...init,
    });
  } catch {
    const hint =
      typeof window !== "undefined" && !getApiBaseUrl()
        ? vercelApiEnvHint()
        : "";
    throw new ApiError(
      `Cannot connect to the server. Please make sure the API is running and try again.${hint}`,
      0,
    );
  }

  const payload = await readApiResponsePayload(res);

  if (!res.ok) {
    throw new ApiError(extractApiErrorMessage(payload, res.status), res.status, payload);
  }

  return payload as TResponse;
}

export async function apiGetJson<TResponse>(
  path: string,
  init?: Omit<RequestInit, "method" | "headers">,
): Promise<TResponse> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      credentials: "include",
      ...init,
    });
  } catch {
    const hint =
      typeof window !== "undefined" && !getApiBaseUrl()
        ? vercelApiEnvHint()
        : "";
    throw new ApiError(
      `Cannot connect to the server. Please make sure the API is running and try again.${hint}`,
      0,
    );
  }

  const payload = await readApiResponsePayload(res);

  if (!res.ok) {
    throw new ApiError(extractApiErrorMessage(payload, res.status), res.status, payload);
  }

  return payload as TResponse;
}

export async function apiPatchJson<TResponse>(
  path: string,
  body: unknown,
  init?: Omit<RequestInit, "method" | "body" | "headers">
): Promise<TResponse> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "include",
      ...init,
    });
  } catch {
    const hint =
      typeof window !== "undefined" && !getApiBaseUrl()
        ? vercelApiEnvHint()
        : "";
    throw new ApiError(
      `Cannot connect to the server. Please make sure the API is running and try again.${hint}`,
      0,
    );
  }

  const payload = await readApiResponsePayload(res);

  if (!res.ok) {
    throw new ApiError(extractApiErrorMessage(payload, res.status), res.status, payload);
  }

  return payload as TResponse;
}

export async function apiSend(
  path: string,
  method: "POST",
  init?: Omit<RequestInit, "method" | "body" | "headers">
): Promise<void> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      ...init,
    });
  } catch {
    const hint =
      typeof window !== "undefined" && !getApiBaseUrl()
        ? vercelApiEnvHint()
        : "";
    throw new ApiError(
      `Cannot connect to the server. Please make sure the API is running and try again.${hint}`,
      0,
    );
  }

  if (!res.ok) {
    const payload = await readApiResponsePayload(res);
    throw new ApiError(extractApiErrorMessage(payload, res.status), res.status, payload);
  }
}

export async function apiDeleteJson<TResponse>(
  path: string,
  init?: Omit<RequestInit, "method" | "headers">,
): Promise<TResponse> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "DELETE",
      credentials: "include",
      ...init,
    });
  } catch {
    const hint =
      typeof window !== "undefined" && !getApiBaseUrl()
        ? vercelApiEnvHint()
        : "";
    throw new ApiError(
      `Cannot connect to the server. Please make sure the API is running and try again.${hint}`,
      0,
    );
  }

  const payload = await readApiResponsePayload(res);

  if (!res.ok) {
    throw new ApiError(extractApiErrorMessage(payload, res.status), res.status, payload);
  }

  return payload as TResponse;
}
