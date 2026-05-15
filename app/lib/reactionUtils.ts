import type { ChatMessageReaction } from "@/app/lib/chatTypes";

export function normalizeReactionUserId(userId: string): string {
  return String(userId || "").trim();
}

/** Messenger-style: at most one reaction per user per message. */
export function dedupeReactions(reactions: ChatMessageReaction[] | undefined): ChatMessageReaction[] {
  if (!reactions?.length) return [];
  const byUser = new Map<string, ChatMessageReaction>();
  for (const r of reactions) {
    const userId = normalizeReactionUserId(r.userId);
    byUser.set(userId, { userId, emoji: String(r.emoji || "") });
  }
  return [...byUser.values()];
}

/**
 * Messenger-style toggle: one reaction per user on a message.
 * Same emoji again removes it; a different emoji replaces the previous one.
 */
export function toggleMessageReaction(
  reactions: ChatMessageReaction[] | undefined,
  userId: string,
  emoji: string,
): ChatMessageReaction[] {
  const myId = normalizeReactionUserId(userId);
  const list = dedupeReactions(reactions);
  const idx = list.findIndex((r) => normalizeReactionUserId(r.userId) === myId);
  if (idx >= 0) {
    if (list[idx].emoji === emoji) return list.filter((_, i) => i !== idx);
    return list.map((r, i) => (i === idx ? { userId: myId, emoji } : r));
  }
  return [...list, { userId: myId, emoji }];
}

export function myReactionEmoji(
  reactions: ChatMessageReaction[] | undefined,
  userId: string,
): string | null {
  const myId = normalizeReactionUserId(userId);
  return dedupeReactions(reactions).find((r) => normalizeReactionUserId(r.userId) === myId)?.emoji ?? null;
}
