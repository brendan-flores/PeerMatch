"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { CornerUpLeft, Forward, MoreVertical, SmilePlus } from "lucide-react";
import type { ChatMessagePayload } from "@/app/lib/chatTypes";

const DEFAULT_REACTIONS = ["❤️", "😆", "😮", "😢", "😡", "👍"] as const;

type ChatMessageRowProps = {
  m: ChatMessagePayload;
  currentUserId: string;
  allowUnsend: boolean;
  openMenuId: string | null;
  openReactionId: string | null;
  onOpenMenu: (id: string | null) => void;
  onOpenReaction: (id: string | null) => void;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (m: ChatMessagePayload) => void;
  onForward: (m: ChatMessagePayload) => void;
  onUnsendYou: (messageId: string) => void;
  onUnsendEveryone: (messageId: string) => void;
  /** Incoming messages only: hide from this chat with no tombstone */
  onRemoveIncomingFromView?: (messageId: string) => void;
};

function reactionChips(
  reactions: NonNullable<ChatMessagePayload["reactions"]> | undefined,
  myId: string,
) {
  if (!reactions?.length) return new Map<string, { count: number; mine: boolean }>();
  const map = new Map<string, { count: number; mine: boolean }>();
  const self = String(myId || "").trim();
  for (const r of reactions) {
    const e = r.emoji;
    const cur = map.get(e) || { count: 0, mine: false };
    cur.count += 1;
    if (String(r.userId || "").trim() === self) cur.mine = true;
    map.set(e, cur);
  }
  return map;
}

export function ChatMessageRow({
  m,
  currentUserId,
  allowUnsend,
  openMenuId,
  openReactionId,
  onOpenMenu,
  onOpenReaction,
  onReact,
  onReply,
  onForward,
  onUnsendYou,
  onUnsendEveryone,
  onRemoveIncomingFromView,
}: ChatMessageRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const mine = String(m.senderId || "").trim() === String(currentUserId || "").trim();
  const isTombstone = Boolean(m.viewerRemoved || m.unsent);
  const pending = m.id.startsWith("pending-");

  const displayText = useMemo(() => {
    if (m.viewerRemoved) return "You deleted a message";
    if (m.unsent) {
      if (m.tombstoneText) return m.tombstoneText;
      return mine ? "You deleted a message" : "This message was removed";
    }
    return m.message;
  }, [m.message, m.tombstoneText, m.unsent, m.viewerRemoved, mine]);

  const fwd = (m.forwardedFromPreview || "").trim();
  const hideBodyAsDuplicateForward =
    Boolean(fwd) && !isTombstone && displayText.trim() === fwd;

  const time = useMemo(
    () => new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    [m.timestamp],
  );

  const statusLabel =
    m.status === "seen" ? "Seen" : m.status === "delivered" ? "Delivered" : "Sent";

  const reactionMap = useMemo(() => reactionChips(m.reactions, currentUserId), [m.reactions, currentUserId]);

  const closeMenus = useCallback(() => {
    onOpenMenu(null);
    onOpenReaction(null);
  }, [onOpenMenu, onOpenReaction]);

  useEffect(() => {
    if (openMenuId !== m.id && openReactionId !== m.id) return;
    const onDoc = (e: MouseEvent) => {
      const el = rowRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      closeMenus();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [closeMenus, m.id, openMenuId, openReactionId]);

  /** Messenger-style: actions on the outer edge (left of your bubble, right of theirs). */
  const showActions = !isTombstone;

  const toolbar = showActions ? (
    <div
      className={`relative mb-1 flex shrink-0 flex-col items-center gap-0.5 self-end transition-opacity duration-150 ${
        openMenuId === m.id || openReactionId === m.id ? "z-[40]" : "z-0"
      } ${
        openMenuId === m.id || openReactionId === m.id
          ? "opacity-100"
          : "pointer-events-none opacity-0 group-hover/message:pointer-events-auto group-hover/message:opacity-100"
      }`}
    >
      <div className="flex items-center gap-0.5 rounded-full bg-white/95 px-0.5 py-0.5 shadow-sm ring-1 ring-zinc-200/80">
        {/* Order: ⋮ More, Reply, React (Messenger desktop) */}
        <div className="relative">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"
            aria-label="Message actions"
            title="More"
            onClick={() => {
              onOpenMenu(openMenuId === m.id ? null : m.id);
              onOpenReaction(null);
            }}
          >
            <MoreVertical className="h-4 w-4" strokeWidth={2} />
          </button>
          {openMenuId === m.id ? (
            <div
              className={`absolute top-full z-[100] mt-1 flex min-w-[180px] flex-col rounded-lg border border-zinc-200 bg-white py-1 shadow-lg ${
                mine ? "left-0" : "right-0"
              }`}
            >
              {mine && allowUnsend ? (
                <>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                    onClick={() => {
                      onUnsendYou(m.id);
                      closeMenus();
                    }}
                  >
                    Unsend for you
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                    onClick={() => {
                      onUnsendEveryone(m.id);
                      closeMenus();
                    }}
                  >
                    Unsend for everyone
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                onClick={() => {
                  onForward(m);
                  closeMenus();
                }}
              >
                <Forward className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.75} />
                Forward
              </button>
              {!mine && onRemoveIncomingFromView ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                  onClick={() => {
                    onRemoveIncomingFromView(m.id);
                    closeMenus();
                  }}
                >
                  <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
                  Remove
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"
          aria-label="Reply"
          title="Reply"
          onClick={() => {
            onReply(m);
            closeMenus();
          }}
        >
          <CornerUpLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <div className="relative">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"
            aria-label="React"
            title="React"
            onClick={() => {
              onOpenReaction(openReactionId === m.id ? null : m.id);
              onOpenMenu(null);
            }}
          >
            <SmilePlus className="h-4 w-4" strokeWidth={1.75} />
          </button>
          {openReactionId === m.id ? (
            <div
              className={`absolute bottom-full z-[100] mb-1 flex items-center gap-0.5 rounded-full border border-zinc-200 bg-white px-1.5 py-1 shadow-lg ${
                mine ? "left-0" : "right-0"
              }`}
            >
              {DEFAULT_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-zinc-100"
                  aria-label={`React ${emoji}`}
                  onClick={() => {
                    onReact(m.id, emoji);
                    onOpenReaction(null);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  const bubble = (
    <div className="relative z-[1] min-w-0 max-w-full">
      <div
        className={`rounded-xl px-4 py-2.5 ${
          isTombstone
            ? mine
              ? "rounded-tr-md bg-transparent text-zinc-500 ring-0"
              : "rounded-tl-md bg-transparent text-zinc-500 ring-0"
            : mine
              ? "rounded-tr-md bg-[#4DD2AC] text-white"
              : "rounded-tl-md bg-white text-zinc-900 ring-1 ring-zinc-200"
        }`}
      >
        {fwd && !isTombstone ? (
          <div
            className={`mb-2 border-l-2 pl-2 text-xs ${
              mine ? "border-white/50 text-white/90" : "border-zinc-300 text-zinc-500"
            }`}
          >
            <p className="font-semibold">Forwarded</p>
            <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap break-words">{fwd}</p>
          </div>
        ) : null}
        {m.replyTo && !isTombstone ? (
          <div
            className={`mb-2 border-l-2 pl-2 text-xs ${
              mine ? "border-white/50 text-white/90" : "border-zinc-300 text-zinc-500"
            }`}
          >
            <p className="font-semibold">Replying to</p>
            <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words">{m.replyTo.preview}</p>
          </div>
        ) : null}
        {!hideBodyAsDuplicateForward ? (
          <p
            className={`whitespace-pre-wrap break-words text-sm leading-5 ${
              isTombstone ? "text-zinc-400 italic" : mine && !isTombstone ? "text-white" : "text-zinc-900"
            }`}
          >
            {displayText}
          </p>
        ) : null}
        <div className="mt-1 flex items-center justify-between gap-2">
          <p
            className={`text-[11px] font-medium leading-4 ${
              isTombstone ? "text-zinc-400" : mine && !isTombstone ? "text-white/80" : "text-zinc-500"
            }`}
          >
            {time}
          </p>
          {mine && !isTombstone ? (
            <p
              className={`text-[11px] font-medium leading-4 ${
                mine && !isTombstone ? "text-white/80" : "text-zinc-500"
              }`}
            >
              {statusLabel}
            </p>
          ) : null}
        </div>
      </div>

      {reactionMap.size > 0 ? (
        <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : "justify-start"}`}>
          {[...reactionMap.entries()].map(([emoji, info]) => (
            <button
              key={emoji}
              type="button"
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm ${
                info.mine
                  ? mine
                    ? "border-[#4DD2AC]/60 bg-white/90 text-zinc-800"
                    : "border-[#4DD2AC]/50 bg-[#E8FFF8] text-zinc-800"
                  : "border-zinc-200 bg-white text-zinc-700"
              }`}
              onClick={() => onReact(m.id, emoji)}
            >
              <span>{emoji}</span>
              <span className="text-[10px] font-semibold">{info.count}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      ref={rowRef}
      className={`flex w-full min-w-0 ${mine ? "justify-end" : "justify-start"}`}
    >
      {/* flex-row: own messages = [⋮ Reply 😀][bubble] (actions left of bubble); incoming = [bubble][actions] */}
      <div className="group/message relative flex max-w-[min(100%,28rem)] flex-row items-end gap-1">
        {mine ? (
          <>
            {toolbar}
            {bubble}
          </>
        ) : (
          <>
            {bubble}
            {toolbar}
          </>
        )}
      </div>
    </div>
  );
}
