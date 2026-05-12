export const FREELANCER_OFFERS_STORAGE_KEY = "peermatch_freelancer_offer_submissions_v1";

const OFFERS_KEY = FREELANCER_OFFERS_STORAGE_KEY;

type StoredOfferRow = {
  postId: string;
  freelancerId: string;
  rateLabel: string;
  message: string;
  createdAt: string;
};

function safeWindow(): Window | null {
  if (typeof window === "undefined") return null;
  return window;
}

function readRows(): StoredOfferRow[] {
  const w = safeWindow();
  if (!w) return [];
  try {
    const raw = w.localStorage.getItem(OFFERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
      .map((row) => ({
        postId: String(row.postId || ""),
        freelancerId: String(row.freelancerId || ""),
        rateLabel: String(row.rateLabel || ""),
        message: String(row.message || ""),
        createdAt: String(row.createdAt || ""),
      }))
      .filter((row) => row.postId && row.freelancerId && row.message);
  } catch {
    return [];
  }
}

function writeRows(rows: StoredOfferRow[]): void {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(OFFERS_KEY, JSON.stringify(rows));
}

export function hasFreelancerOfferForPost(freelancerId: string, postId: string): boolean {
  const fid = String(freelancerId || "").trim();
  const pid = String(postId || "").trim();
  if (!fid || !pid) return false;
  return readRows().some((row) => row.freelancerId === fid && row.postId === pid);
}

export function recordFreelancerOffer(input: Omit<StoredOfferRow, "createdAt"> & { createdAt?: string }): void {
  const row: StoredOfferRow = {
    postId: String(input.postId || "").trim(),
    freelancerId: String(input.freelancerId || "").trim(),
    rateLabel: String(input.rateLabel || "").trim(),
    message: String(input.message || "").trim(),
    createdAt: input.createdAt || new Date().toISOString(),
  };
  if (!row.postId || !row.freelancerId || !row.message) return;
  const next = [row, ...readRows().filter((r) => !(r.freelancerId === row.freelancerId && r.postId === row.postId))];
  writeRows(next);
}
