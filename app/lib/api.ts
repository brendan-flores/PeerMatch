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
        ? " Set API_PROXY_URL on Vercel to your Render API URL, then redeploy."
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
        ? " Set API_PROXY_URL on Vercel to your Render API URL, then redeploy."
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
        ? " Set API_PROXY_URL on Vercel to your Render API URL, then redeploy."
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
        ? " Set API_PROXY_URL on Vercel to your Render API URL, then redeploy."
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
        ? " Set API_PROXY_URL on Vercel to your Render API URL, then redeploy."
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
        ? " Set API_PROXY_URL on Vercel to your Render API URL, then redeploy."
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
