export type NotificationType =
  | "message"
  | "like"
  | "follow"
  | "post_review"
  | "post_approved"
  | "response"
  | "new_task"
  | "new_offer";

export type NotificationItem = {
  id: string;
  userName: string;
  actionText: string;
  createdAt: string;
  type: NotificationType;
  read: boolean;
  actorPhotoDataUrl?: string;
  relatedTaskId?: string;
  relatedOfferId?: string;
};

export const PEERMATCH_LOGO_URL = "/peermatch-logo.png";

export function isSystemNotificationActor(userName: string, type: NotificationType): boolean {
  const name = String(userName || "").trim().toLowerCase();
  return name === "peermatch" || type === "post_review" || type === "post_approved";
}

export const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #a855f7 0%, #ec4899 45%, #f97316 100%)",
  "linear-gradient(135deg, #22c55e 0%, #84cc16 50%, #facc15 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #06b6d4 55%, #8b5cf6 100%)",
] as const;

export function formatNotificationTimeAgo(value: string): string {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "Just now";
  const diffMs = Date.now() - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  const days = Math.floor(diffMs / day);
  return `${days}d ago`;
}

export function avatarGradientForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % AVATAR_GRADIENTS.length;
  }
  return AVATAR_GRADIENTS[hash];
}
