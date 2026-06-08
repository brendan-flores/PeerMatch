/** Read upstream body reliably on Vercel (avoid empty bodies on larger JSON). */
export async function readUpstreamBodyText(upstream: Response): Promise<string> {
  try {
    const buffer = await upstream.arrayBuffer();
    if (!buffer.byteLength) return "";
    return new TextDecoder("utf-8").decode(buffer);
  } catch {
    return upstream.text().catch(() => "");
  }
}

/** Drop headers that conflict with a freshly buffered plaintext body. */
export function sanitizeProxiedResponseHeaders(headers: Headers, bodyByteLength: number): void {
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.delete("content-encoding");
  headers.delete("etag");
  if (bodyByteLength > 0) {
    headers.set("content-length", String(bodyByteLength));
  }
}
