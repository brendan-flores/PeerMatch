export type PostOffer = {
  id: string;
  postId: string;
  postTitle: string;
  freelancerId: string;
  freelancerName: string;
  clientId: string;
  clientName: string;
  rate?: string;
  message: string;
  createdAt: string;
};

const OFFERS_KEY = "peermatch_post_offers_v1";

function safeWindow(): Window | null {
  if (typeof window === "undefined") return null;
  return window;
}

function parseOffers(raw: string | null): PostOffer[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        id: String(item.id || ""),
        postId: String(item.postId || ""),
        postTitle: String(item.postTitle || "").trim(),
        freelancerId: String(item.freelancerId || ""),
        freelancerName: String(item.freelancerName || "").trim(),
        clientId: String(item.clientId || ""),
        clientName: String(item.clientName || "").trim(),
        rate: item.rate ? String(item.rate).trim() : undefined,
        message: String(item.message || "").trim(),
        createdAt: String(item.createdAt || ""),
      }))
      .filter((item) => item.id && item.postId && item.freelancerId && item.clientId && item.message);
  } catch {
    return [];
  }
}

function writeOffers(offers: PostOffer[]): void {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(OFFERS_KEY, JSON.stringify(offers));
}

export function getPostOffers(): PostOffer[] {
  const w = safeWindow();
  if (!w) return [];
  return parseOffers(w.localStorage.getItem(OFFERS_KEY)).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function createPostOffer(
  input: Omit<PostOffer, "id" | "createdAt"> & { id?: string; createdAt?: string },
): PostOffer {
  const offer: PostOffer = {
    id: String(input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    createdAt: input.createdAt || new Date().toISOString(),
    postId: String(input.postId || ""),
    postTitle: String(input.postTitle || "").trim(),
    freelancerId: String(input.freelancerId || ""),
    freelancerName: String(input.freelancerName || "").trim(),
    clientId: String(input.clientId || ""),
    clientName: String(input.clientName || "").trim(),
    rate: input.rate ? String(input.rate).trim() : undefined,
    message: String(input.message || "").trim().slice(0, 500),
  };
  writeOffers([offer, ...getPostOffers()]);
  return offer;
}

export function hasOfferForPost(postId: string, freelancerId: string): boolean {
  return getPostOffers().some((o) => o.postId === postId && o.freelancerId === freelancerId);
}
