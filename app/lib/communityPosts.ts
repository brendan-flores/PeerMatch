import { apiGetJson, apiPostJson } from "./api";
import type { CommunityPost, CommunityPostPriority } from "./postsStorage";

export const POST_REVIEW_MESSAGE = "Your post is under review and waiting for approval.";
export const POST_APPROVED_MESSAGE = "Your post has been approved.";

export const URGENCY_OPTIONS: CommunityPostPriority[] = ["Low", "Normal", "High"];

export type BudgetSuggestion = {
  minBudget: number;
  maxBudget: number;
  suggestedBudget: number;
  rationale: string;
  source: "ai" | "heuristic";
};

export function formatPhpBudget(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return `₱${Math.round(amount).toLocaleString("en-PH")}`;
}

type ApiFeedPost = CommunityPost & { status?: string };

type FeedResponse = { posts: ApiFeedPost[] };

export function urgencyBadgeClass(priority: CommunityPostPriority): string {
  if (priority === "High") return "bg-[#FF6B35] text-white";
  if (priority === "Low") return "bg-[#A8DADC] text-zinc-900";
  return "bg-[#56BA54] text-zinc-900";
}

function mapFeedPosts(posts: ApiFeedPost[] | undefined): CommunityPost[] {
  return (posts || []).map((post) => ({
    id: post.id,
    authorId: post.authorId,
    authorName: post.authorName,
    authorEmail: post.authorEmail,
    authorAccountType: post.authorAccountType,
    authorAvatarDataUrl: post.authorAvatarDataUrl,
    title: post.title,
    content: post.content,
    category: post.category,
    priority: normalizePriority(post.priority),
    budget: typeof post.budget === "number" ? post.budget : 0,
    createdAt: post.createdAt,
    status: post.status,
  }));
}

export async function fetchApprovedCommunityPosts(): Promise<CommunityPost[]> {
  const data = await apiGetJson<FeedResponse>("/api/tasks");
  return mapFeedPosts(data.posts);
}

export async function fetchMyCommunityPosts(): Promise<CommunityPost[]> {
  const data = await apiGetJson<FeedResponse>("/api/tasks/mine");
  return mapFeedPosts(data.posts);
}

export async function suggestTaskBudget(input: {
  title: string;
  description: string;
  subjectCategory: string;
  urgency: string;
}): Promise<BudgetSuggestion> {
  return apiPostJson<BudgetSuggestion>("/api/tasks/suggest-budget", {
    title: input.title,
    description: input.description,
    subjectCategory: input.subjectCategory,
    urgency: input.urgency,
  });
}

export function normalizePriority(value: string | undefined): CommunityPostPriority {
  const raw = String(value || "Normal").trim().toLowerCase();
  if (raw === "high" || raw === "important") return "High";
  if (raw === "low") return "Low";
  return "Normal";
}
