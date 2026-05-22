import type { CommunityPost, CommunityPostPriority } from "./postsStorage";

/** Mirrors server Task.urgency enum (taskFeedDto URGENCY_VALUES). */
export const TASK_URGENCY_VALUES = ["low", "normal", "high"] as const;

export type TaskUrgencyValue = (typeof TASK_URGENCY_VALUES)[number];

export const FILTER_ALL = "all";

/** Minimum/maximum PHP budget — mirrors server/utils/budgetValidation.js */
export const MIN_POST_BUDGET = 50;
export const MAX_POST_BUDGET = 100_000;

export type UrgencyFilterOption = {
  id: typeof FILTER_ALL | TaskUrgencyValue;
  label: string;
  value: TaskUrgencyValue | null;
};

export const URGENCY_FILTER_OPTIONS: UrgencyFilterOption[] = [
  { id: FILTER_ALL, label: "Any urgency", value: null },
  ...TASK_URGENCY_VALUES.map((value) => ({
    id: value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
    value,
  })),
];

export type CommunityPostFeedFilters = {
  urgency?: typeof FILTER_ALL | TaskUrgencyValue;
  /** Raw input — PHP amount (from) */
  rateMin?: string;
  /** Raw input — PHP amount (to) */
  rateMax?: string;
};

export function parseBudgetFilterValue(value: string | undefined): number | null {
  const raw = String(value ?? "").trim().replace(/,/g, "");
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || !Number.isInteger(num)) return null;
  if (num < MIN_POST_BUDGET || num > MAX_POST_BUDGET) return null;
  return num;
}

export function priorityToUrgencyValue(priority: CommunityPostPriority): TaskUrgencyValue {
  const raw = priority.toLowerCase();
  if (raw === "high") return "high";
  if (raw === "low") return "low";
  return "normal";
}

export function buildFeedQueryString(filters?: CommunityPostFeedFilters): string {
  const params = new URLSearchParams();
  const urgency = filters?.urgency;

  if (urgency && urgency !== FILTER_ALL) {
    params.set("urgency", urgency);
  }

  const min = parseBudgetFilterValue(filters?.rateMin);
  const max = parseBudgetFilterValue(filters?.rateMax);
  if (min != null) params.set("minBudget", String(min));
  if (max != null) params.set("maxBudget", String(max));

  const qs = params.toString();
  return qs ? `/api/tasks?${qs}` : "/api/tasks";
}

export function hasActiveFeedFilters(filters?: CommunityPostFeedFilters): boolean {
  if (!filters) return false;
  if (filters.urgency && filters.urgency !== FILTER_ALL) return true;
  if (parseBudgetFilterValue(filters.rateMin) != null) return true;
  if (parseBudgetFilterValue(filters.rateMax) != null) return true;
  return false;
}

/** Client-side fallback matching server filter rules */
export function postMatchesFeedFilters(
  post: CommunityPost,
  filters?: CommunityPostFeedFilters,
): boolean {
  const urgency = filters?.urgency;
  if (urgency && urgency !== FILTER_ALL) {
    if (priorityToUrgencyValue(post.priority) !== urgency) return false;
  }

  const min = parseBudgetFilterValue(filters?.rateMin);
  const max = parseBudgetFilterValue(filters?.rateMax);
  const budget = typeof post.budget === "number" ? post.budget : 0;
  if (min != null && budget < min) return false;
  if (max != null && budget > max) return false;

  return true;
}
