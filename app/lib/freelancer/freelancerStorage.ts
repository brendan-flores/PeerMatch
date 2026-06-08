const PROFILE_KEY = "peermatch_freelancer_profile";

export type FreelancerCachedProfile = {
  /** First word only; legacy / internal use */
  firstName: string;
  /** Full name as on the account (e.g. "Christian Paul") */
  displayName?: string;
  email: string;
  userId?: string;
};

function parseProfile(raw: string | null): FreelancerCachedProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    const firstName = typeof o.firstName === "string" ? o.firstName : "";
    const displayName = typeof o.displayName === "string" ? o.displayName : "";
    const email = typeof o.email === "string" ? o.email : "";
    if (!firstName && !displayName && !email) return null;
    return {
      firstName,
      ...(displayName ? { displayName } : {}),
      email,
      userId: typeof o.userId === "string" ? o.userId : undefined,
    };
  } catch {
    return null;
  }
}

export function getFirstNameFromFullName(fullName: string): string {
  return String(fullName || "")
    .trim()
    .split(/\s+/)[0] || "";
}

export function getCachedFreelancerProfile(): FreelancerCachedProfile | null {
  if (typeof window === "undefined") return null;
  return parseProfile(window.localStorage.getItem(PROFILE_KEY));
}

export function setCachedFreelancerProfile(profile: FreelancerCachedProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/** Login and /me payloads may use `id` or `_id`. */
export function normalizeAuthUser(raw: unknown): { id: string; name: string; email: string } {
  const o = raw as Record<string, unknown>;
  return {
    id: String(o.id ?? o._id ?? ""),
    name: typeof o.name === "string" ? o.name : "",
    email: typeof o.email === "string" ? o.email : "",
  };
}

export function persistFreelancerFromMe(user: { id: string; name: string; email: string }): void {
  const id = String(user.id ?? "");
  const displayName = normalizeGreetingDisplayName(String(user.name || ""));
  const firstName = getFirstNameFromFullName(displayName);
  const prev = getCachedFreelancerProfile();
  if (prev?.userId && prev.userId !== id) {
    setCachedFreelancerProfile({ firstName, displayName, email: user.email, userId: id });
    return;
  }
  setCachedFreelancerProfile({ firstName, displayName, email: user.email, userId: id });
}

/** "Christian Paul Christian Paul" → "Christian Paul" (bad first+last signup) */
function dedupeRepeatedHalfName(s: string): string {
  const words = s.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length % 2 !== 0) return s.trim();
  const half = words.length / 2;
  const first = words.slice(0, half).join(" ");
  const second = words.slice(half).join(" ");
  if (first === second) return first;
  return s.trim();
}

/** "Christian Christian Paul" → "Christian Paul" */
function collapseConsecutiveDuplicateWords(s: string): string {
  const words = s.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return s.trim();
  const out: string[] = [];
  for (const w of words) {
    if (out[out.length - 1] !== w) out.push(w);
  }
  return out.join(" ");
}

export function normalizeGreetingDisplayName(raw: string): string {
  let t = String(raw || "").trim().replace(/\s+/g, " ");
  t = dedupeRepeatedHalfName(t);
  t = collapseConsecutiveDuplicateWords(t);
  return t.trim();
}
