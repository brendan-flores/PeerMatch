type ErrorPayload = {
  message?: string;
  error?: string;
};

export function extractApiErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const record = payload as ErrorPayload;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error.trim();
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    const trimmed = payload.trim();
    if (trimmed.startsWith("{")) {
      try {
        return extractApiErrorMessage(JSON.parse(trimmed) as unknown, status);
      } catch {
        // fall through
      }
    }
    if (trimmed.length <= 280 && !trimmed.includes("<html")) {
      return trimmed;
    }
  }

  if (status === 502 || status === 504) {
    return "The server took too long to respond. Wait a moment and try again (the API may be waking up).";
  }
  if (status === 503) {
    return "The server is temporarily unavailable. Please try again shortly.";
  }

  return `Request failed (${status}). Please try again.`;
}

export async function readApiResponsePayload(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
