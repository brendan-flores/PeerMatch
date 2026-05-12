export type CommunityPostPriority = "Normal" | "Important";

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
  createdAt: string;
};

const POSTS_KEY = "peermatch_community_posts_v1";

function safeWindow(): Window | null {
  if (typeof window === "undefined") return null;
  return window;
}

function parsePosts(raw: string | null): CommunityPost[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(
        (item): CommunityPost => ({
          id: String(item.id || ""),
          authorId: String(item.authorId || ""),
          authorName: String(item.authorName || "").trim(),
          authorEmail: String(item.authorEmail || "").trim(),
          authorAccountType: String(item.authorAccountType || "").trim() || undefined,
          authorAvatarDataUrl: String(item.authorAvatarDataUrl || "").trim() || undefined,
          title: String(item.title || "").trim(),
          content: String(item.content || "").trim(),
          category: String(item.category || "").trim(),
          priority: item.priority === "Important" ? "Important" : "Normal",
          createdAt: String(item.createdAt || ""),
        }),
      )
      .filter((item) => item.id && item.authorId && item.title && item.content);
  } catch {
    return [];
  }
}

function writePosts(posts: CommunityPost[]): void {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

export function getCommunityPosts(): CommunityPost[] {
  const w = safeWindow();
  if (!w) return [];
  const posts = parsePosts(w.localStorage.getItem(POSTS_KEY));
  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Relative time for post timestamps (ISO string). */
export function formatCommunityPostTimeAgo(value: string): string {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "Just now";
  const diffMs = Date.now() - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hr ago`;
  const d = Math.floor(diffMs / day);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

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
    priority: input.priority === "Important" ? "Important" : "Normal",
  };

  const nextPosts = [post, ...getCommunityPosts()];
  writePosts(nextPosts);
  return post;
}

export function updateCommunityPost(
  postId: string,
  patch: Partial<Omit<CommunityPost, "id" | "authorId" | "authorName" | "authorEmail" | "authorAccountType" | "authorAvatarDataUrl" | "createdAt">> & {
    priority?: CommunityPostPriority;
  },
): CommunityPost | null {
  const current = getCommunityPosts();
  const idx = current.findIndex((p) => p.id === String(postId || "").trim());
  if (idx < 0) return null;

  const next = current.map((post) => {
    if (post.id !== current[idx].id) return post;

    const nextTitle = patch.title !== undefined ? String(patch.title || "").trim().slice(0, 120) : post.title;
    const nextContent = patch.content !== undefined ? String(patch.content || "").trim().slice(0, 1200) : post.content;
    const nextCategory =
      patch.category !== undefined ? String(patch.category || "").trim().slice(0, 80) : post.category;
    const nextPriority =
      patch.priority !== undefined ? (patch.priority === "Important" ? "Important" : "Normal") : post.priority;

    return {
      ...post,
      title: nextTitle,
      content: nextContent,
      category: nextCategory,
      priority: nextPriority,
    };
  });

  const updated = next.find((p) => p.id === current[idx].id) || null;
  writePosts(next);
  return updated;
}

export function deleteCommunityPost(postId: string): boolean {
  const normalized = String(postId || "").trim();
  if (!normalized) return false;

  const current = getCommunityPosts();
  const next = current.filter((p) => p.id !== normalized);

  if (next.length === current.length) return false;
  writePosts(next);
  return true;
}
