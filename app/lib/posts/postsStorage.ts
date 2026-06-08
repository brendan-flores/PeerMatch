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

/** Client featured-post lists: approved tasks that are not yet completed. */
export function isEligibleFeaturedPost(post: Pick<CommunityPost, "status" | "hireStatus">): boolean {
  const status = post.status || "approved";
  if (status !== "approved") return false;
  return (post.hireStatus || "open") !== "completed";
}

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
