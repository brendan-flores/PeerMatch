export type CommunityPostPriority = "Low" | "Normal" | "High";

export type CommunityPostStatus = "pending" | "approved" | "rejected";

export type TaskHireStatus = "open" | "assigned" | "completed";

export type CommunityPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorAccountType?: string;
  authorAvatarDataUrl?: string;
  title: string;
  content: string;
  category: string;
  priority: CommunityPostPriority;
  budget: number;
  createdAt: string;
  status?: CommunityPostStatus;
  hireStatus?: TaskHireStatus;
  assignedFreelancerId?: string;
  assignedFreelancerName?: string;
  completedAt?: string;
  reviewSubmittedAt?: string;
  reviewRating?: number | null;
  reviewText?: string;
};

export const COMMUNITY_POSTS_STORAGE_KEY = "peermatch_community_posts_v2";
export const COMMUNITY_POSTS_CHANGED_EVENT = "peermatch:posts-changed";

const POSTS_KEY = COMMUNITY_POSTS_STORAGE_KEY;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function isCommunityPostWithinLast24Hours(createdAt: string): boolean {
  const ts = new Date(createdAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < TWENTY_FOUR_HOURS_MS;
}

function safeWindow(): Window | null {
  if (typeof window === "undefined") return null;
  return window;
}

function normalizeStoredPriority(value: unknown): CommunityPostPriority {
  const raw = String(value || "Normal").trim().toLowerCase();
  if (raw === "high" || raw === "important") return "High";
  if (raw === "low") return "Low";
  return "Normal";
}

function parsePosts(raw: string | null): CommunityPost[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        id: String(item.id || ""),
        authorId: String(item.authorId || ""),
        authorName: String(item.authorName || "").trim(),
        authorEmail: String(item.authorEmail || "").trim(),
        authorAccountType: String(item.authorAccountType || "").trim() || undefined,
        authorAvatarDataUrl: String(item.authorAvatarDataUrl || "").trim() || undefined,
        title: String(item.title || "").trim(),
        content: String(item.content || "").trim(),
        category: String(item.category || "").trim(),
        priority: normalizeStoredPriority(item.priority),
        budget: Math.max(0, Number(item.budget) || 0),
        createdAt: String(item.createdAt || ""),
      }))
      .filter((item) => item.id && item.authorId && item.title && item.content);
  } catch {
    return [];
  }
}

export function notifyCommunityPostsChanged(): void {
  const w = safeWindow();
  if (!w) return;
  w.dispatchEvent(new CustomEvent(COMMUNITY_POSTS_CHANGED_EVENT));
}

/** Removes legacy browser-only posts so feeds match MongoDB after API sync. */
export function clearCommunityPostsStorage(): void {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.removeItem(POSTS_KEY);
}

function notifyPostsChanged(): void {
  notifyCommunityPostsChanged();
}

function writePosts(posts: CommunityPost[]): void {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  notifyPostsChanged();
}

export function subscribeToCommunityPosts(onChange: () => void): () => void {
  const w = safeWindow();
  if (!w) return () => {};
  const onCustom = () => onChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== POSTS_KEY) return;
    onChange();
  };
  w.addEventListener(COMMUNITY_POSTS_CHANGED_EVENT, onCustom);
  w.addEventListener("storage", onStorage);
  return () => {
    w.removeEventListener(COMMUNITY_POSTS_CHANGED_EVENT, onCustom);
    w.removeEventListener("storage", onStorage);
  };
}

export function getCommunityPosts(): CommunityPost[] {
  const w = safeWindow();
  if (!w) return [];
  const posts = parsePosts(w.localStorage.getItem(POSTS_KEY));
  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** @deprecated Prefer POST /api/tasks — kept for legacy local drafts */
export function createCommunityPost(
  input: Omit<CommunityPost, "id" | "createdAt"> & { createdAt?: string; id?: string },
): CommunityPost {
  const post: CommunityPost = {
    id: String(input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    createdAt: input.createdAt || new Date().toISOString(),
    authorId: String(input.authorId || ""),
    authorName: String(input.authorName || "").trim(),
    authorEmail: String(input.authorEmail || "").trim(),
    authorAccountType: String(input.authorAccountType || "").trim() || undefined,
    authorAvatarDataUrl: String(input.authorAvatarDataUrl || "").trim() || undefined,
    title: String(input.title || "").trim().slice(0, 120),
    content: String(input.content || "").trim().slice(0, 1200),
    category: String(input.category || "").trim().slice(0, 80),
    priority: normalizeStoredPriority(input.priority),
    budget: Math.max(0, Number(input.budget) || 0),
  };

  const nextPosts = [post, ...getCommunityPosts()];
  writePosts(nextPosts);
  return post;
}

export function getCommunityPostsByAuthor(authorId: string): CommunityPost[] {
  const id = String(authorId || "").trim();
  if (!id) return [];
  return getCommunityPosts().filter((post) => post.authorId === id);
}

export function updateCommunityPost(
  postId: string,
  authorId: string,
  patch: Partial<Pick<CommunityPost, "title" | "content" | "category" | "priority">>,
): CommunityPost | null {
  const posts = getCommunityPosts();
  const index = posts.findIndex((post) => post.id === postId && post.authorId === authorId);
  if (index === -1) return null;

  const current = posts[index];
  const updated: CommunityPost = {
    ...current,
    title: patch.title !== undefined ? String(patch.title).trim().slice(0, 120) : current.title,
    content: patch.content !== undefined ? String(patch.content).trim().slice(0, 1200) : current.content,
    category: patch.category !== undefined ? String(patch.category).trim().slice(0, 80) : current.category,
    priority:
      patch.priority !== undefined ? normalizeStoredPriority(patch.priority) : current.priority,
  };

  if (!updated.title || !updated.content) return null;

  const nextPosts = [...posts];
  nextPosts[index] = updated;
  writePosts(nextPosts);
  return updated;
}
