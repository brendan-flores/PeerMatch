import type { CommunityPost } from "./postsStorage";

export function buildOfferChatMessage(
  post: Pick<CommunityPost, "title">,
  offerMessage: string,
  rate?: string,
): string {
  const title = String(post.title || "").trim() || "your post";
  const body = String(offerMessage || "").trim();
  const lines = [`Hi! I sent an offer for your post "${title}".`, "", body];
  const trimmedRate = String(rate || "").trim();
  if (trimmedRate) {
    lines.push("", `My rate: ₱${trimmedRate}`);
  }
  return lines.join("\n").trim();
}
