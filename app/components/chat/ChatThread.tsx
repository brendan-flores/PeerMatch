"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Info, Phone, Send, Smile, Video, X } from "lucide-react";
import Picker from "emoji-picker-react";
import { ApiError, apiDeleteJson, apiGetJson, apiPostJson } from "@/app/lib/api";
import type { ChatMessagePayload } from "@/app/lib/chatTypes";
import { dedupeReactions, toggleMessageReaction } from "@/app/lib/reactionUtils";
import { ChatMessageRow } from "@/app/components/chat/ChatMessageRow";
import {
  connectSocket,
  emitMarkSeen,
  getChatSocket,
  sendChatMessageWithClientId,
  subscribeMessageReaction,
  subscribeMessageSent,
  subscribeMessageStatus,
  subscribeMessageVanishedForViewer,
  subscribeReceiveMessage,
  subscribeSocketError,
} from "@/app/lib/socket";

type ChatThreadProps = {
  currentUserId: string;
  otherUserId: string;
  otherUserLabel?: string;
  statusText?: string;
  allowUnsend?: boolean;
  onConversationUpdated?: (otherUserIdResolved: string, messages: ChatMessagePayload[]) => void;
  className?: string;
};

function isSameConversation(msg: ChatMessagePayload, a: string, b: string): boolean {
  const pair = new Set([msg.senderId, msg.receiverId]);
  return pair.has(a) && pair.has(b) && pair.size === 2;
}

export function ChatThread({
  currentUserId,
  otherUserId,
  otherUserLabel,
  statusText = "Online",
  allowUnsend = false,
  onConversationUpdated,
  className = "",
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [resolvingUser, setResolvingUser] = useState(false);
  const [resolvedOtherId, setResolvedOtherId] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [openReactionId, setOpenReactionId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; preview: string } | null>(null);
  const [forwardFrom, setForwardFrom] = useState<ChatMessagePayload | null>(null);
  const [forwardConversations, setForwardConversations] = useState<
    { otherUserId: string; otherName: string }[]
  >([]);
  const [forwardNote, setForwardNote] = useState("");
  const [forwardLoading, setForwardLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const onConversationUpdatedRef = useRef(onConversationUpdated);
  const lastSeenEmitAtRef = useRef<number>(0);

  useEffect(() => {
    onConversationUpdatedRef.current = onConversationUpdated;
  }, [onConversationUpdated]);

  const trimmedOther = String(otherUserId || "").trim();

  function looksLikeObjectId(v: string) {
    return /^[a-fA-F0-9]{24}$/.test(v);
  }

  const canChat = Boolean(currentUserId && resolvedOtherId && resolvedOtherId !== currentUserId);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    connectSocket(currentUserId);
  }, [currentUserId]);

  // Resolve a name/partial into a MongoDB _id so both the history fetch and socket matching work.
  useEffect(() => {
    let cancelled = false;
    const raw = String(otherUserId || "").trim();

    setResolvedOtherId("");
    if (!raw || !currentUserId || raw === currentUserId) return;
    if (looksLikeObjectId(raw)) {
      setResolvedOtherId(raw);
      return;
    }

    setResolvingUser(true);
    (async () => {
      try {
        const data = await apiGetJson<{ user?: { id: string; name?: string } }>(
          `/api/users/resolve?q=${encodeURIComponent(raw)}`,
        );
        if (cancelled) return;
        setResolvedOtherId(String(data.user?.id || ""));
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : "User lookup failed.";
        // Requirement: do not show an error for "no conversation"; just treat as empty.
        void message;
        setResolvedOtherId("");
      } finally {
        if (!cancelled) setResolvingUser(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [otherUserId, currentUserId]);

  useEffect(() => {
    if (!canChat) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoadingHistory(true);

    (async () => {
      try {
        const data = await apiGetJson<{ messages: ChatMessagePayload[] }>(
          `/api/messages/conversation/${encodeURIComponent(resolvedOtherId)}`,
        );
        if (cancelled) return;
        setMessages(data.messages || []);
      } catch {
        // Requirement: if no conversation / invalid input, show empty state instead of error.
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canChat, resolvedOtherId, currentUserId]);

  // Keep sidebar conversation preview in sync (last message + timestamp).
  useEffect(() => {
    if (!canChat) return;
    if (!resolvedOtherId) return;
    if (typeof onConversationUpdatedRef.current !== "function") return;
    onConversationUpdatedRef.current(resolvedOtherId, messages);
  }, [messages, canChat, resolvedOtherId]);

  // Mark conversation messages as seen when the chat is open.
  useEffect(() => {
    if (!canChat) return;
    const hasUnseenIncoming = messages.some(
      (m) => m.senderId === resolvedOtherId && m.receiverId === currentUserId && m.status !== "seen",
    );
    if (!hasUnseenIncoming) return;

    const now = Date.now();
    if (now - lastSeenEmitAtRef.current < 350) return;
    lastSeenEmitAtRef.current = now;

    emitMarkSeen(resolvedOtherId);
    // Fallback for non-socket receivers / legacy clients.
    void apiPostJson("/api/messages/seen", { otherUserId: resolvedOtherId }).catch(() => undefined);
  }, [canChat, resolvedOtherId, messages, currentUserId]);

  useEffect(() => {
    if (!canChat) return;

    const unsub = subscribeReceiveMessage((msg) => {
      if (!isSameConversation(msg, currentUserId, resolvedOtherId)) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return unsub;
  }, [canChat, currentUserId, resolvedOtherId]);

  useEffect(() => {
    if (!canChat) return;
    const unsub = subscribeMessageSent((msg) => {
      if (!isSameConversation(msg, currentUserId, resolvedOtherId)) return;
      const clientMessageId = String(msg.clientMessageId || "").trim();
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        if (clientMessageId) {
          const idx = prev.findIndex((m) => m.id === clientMessageId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...msg };
            return next;
          }
        }
        return [...prev, msg];
      });
    });
    return unsub;
  }, [canChat, currentUserId, resolvedOtherId]);

  useEffect(() => {
    if (!canChat) return;
    const unsub = subscribeMessageStatus((payload) => {
      if (!payload?.id) return;
      const senderId = String(payload.senderId || "").trim();
      const receiverId = String(payload.receiverId || "").trim();
      if (!senderId || !receiverId) return;
      const pair = new Set([senderId, receiverId]);
      if (!pair.has(currentUserId) || !pair.has(resolvedOtherId) || pair.size !== 2) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.id
            ? {
                ...m,
                ...(payload.status ? { status: payload.status } : {}),
                ...(payload.seenAt ? { seenAt: payload.seenAt } : {}),
                ...(payload.viewerRemoved
                  ? {
                      viewerRemoved: true,
                      message: payload.message || "You deleted a message",
                      unsent: false,
                      deletedForEveryone: false,
                      tombstoneText: undefined,
                      reactions: [],
                      replyTo: undefined,
                      forwardedFromPreview: undefined,
                    }
                  : {}),
                ...(payload.unsent
                  ? {
                      unsent: true,
                      deletedForEveryone: true,
                      message: "",
                      tombstoneText: payload.tombstoneText,
                      reactions: [],
                      replyTo: undefined,
                      forwardedFromPreview: undefined,
                      viewerRemoved: false,
                    }
                  : {}),
              }
            : m,
        ),
      );
    });
    return unsub;
  }, [canChat, currentUserId, resolvedOtherId]);

  useEffect(() => {
    if (!canChat) return;
    const unsub = subscribeMessageReaction((payload) => {
      if (!payload?.id) return;
      const senderId = String(payload.senderId || "").trim();
      const receiverId = String(payload.receiverId || "").trim();
      if (!senderId || !receiverId) return;
      const pair = new Set([senderId, receiverId]);
      if (!pair.has(currentUserId) || !pair.has(resolvedOtherId) || pair.size !== 2) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.id
            ? { ...m, reactions: dedupeReactions(Array.isArray(payload.reactions) ? payload.reactions : []) }
            : m,
        ),
      );
    });
    return unsub;
  }, [canChat, currentUserId, resolvedOtherId]);

  useEffect(() => {
    if (!canChat) return;
    const unsub = subscribeMessageVanishedForViewer((payload) => {
      if (!payload?.id) return;
      const senderId = String(payload.senderId || "").trim();
      const receiverId = String(payload.receiverId || "").trim();
      if (!senderId || !receiverId) return;
      const pair = new Set([senderId, receiverId]);
      if (!pair.has(currentUserId) || !pair.has(resolvedOtherId) || pair.size !== 2) return;
      setMessages((prev) => prev.filter((m) => m.id !== payload.id));
    });
    return unsub;
  }, [canChat, currentUserId, resolvedOtherId]);

  useEffect(() => {
    const unsub = subscribeSocketError((p) => {
      setSocketError(typeof p?.message === "string" ? p.message : "Messaging error.");
    });
    return unsub;
  }, []);

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    setDraft((prev) => prev + emojiData.emoji);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showEmojiPicker) return;
      
      const target = event.target as Node;
      const pickerElement = emojiPickerRef.current;
      const buttonElement = emojiButtonRef.current;
      
      // Don't close if clicking inside the picker or on the emoji button
      if (pickerElement?.contains(target) || buttonElement?.contains(target)) {
        return;
      }
      
      setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const send = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      if (!canChat) return;
      const text = draft.trim();
      if (!text) return;

      const s = getChatSocket();
      if (!s?.connected) {
        setSocketError("Not connected. Check that the API server is running.");
        return;
      }

      setSocketError(null);
      const clientMessageId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const replyToMessageId =
        replyingTo && /^[a-fA-F0-9]{24}$/.test(replyingTo.id) ? replyingTo.id : undefined;
      const pending: ChatMessagePayload = {
        id: clientMessageId,
        senderId: currentUserId,
        receiverId: resolvedOtherId,
        message: text,
        timestamp: new Date().toISOString(),
        status: "sent",
        clientMessageId,
        ...(replyingTo ? { replyTo: { id: replyingTo.id, preview: replyingTo.preview } } : {}),
      };
      setMessages((prev) => [...prev, pending]);
      sendChatMessageWithClientId(resolvedOtherId, text, clientMessageId, {
        ...(replyToMessageId ? { replyToMessageId } : {}),
      });
      setDraft("");
      setReplyingTo(null);
    },
    [canChat, currentUserId, draft, replyingTo, resolvedOtherId],
  );

  const unsendForEveryone = useCallback(
    async (messageId: string) => {
      if (!allowUnsend) return;
      if (!messageId) return;

      if (messageId.startsWith("pending-")) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                unsent: true,
                deletedForEveryone: true,
                message: "",
                tombstoneText: "You deleted a message",
                reactions: [],
                replyTo: undefined,
                forwardedFromPreview: undefined,
                viewerRemoved: false,
              }
            : m,
        ),
      );

      try {
        await apiDeleteJson(`/api/messages/${encodeURIComponent(messageId)}`);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to delete message.";
        setSocketError(message);
        try {
          const data = await apiGetJson<{ messages: ChatMessagePayload[] }>(
            `/api/messages/conversation/${encodeURIComponent(resolvedOtherId)}`,
          );
          setMessages(data.messages || []);
        } catch {
          /* keep optimistic state if refetch fails */
        }
      }
    },
    [allowUnsend, resolvedOtherId],
  );

  const unsendForYou = useCallback(
    async (messageId: string) => {
      if (!messageId) return;

      if (messageId.startsWith("pending-")) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                viewerRemoved: true,
                message: "You deleted a message",
                unsent: false,
                deletedForEveryone: false,
                reactions: [],
                replyTo: undefined,
                forwardedFromPreview: undefined,
              }
            : m,
        ),
      );

      try {
        await apiPostJson(`/api/messages/${encodeURIComponent(messageId)}/remove-for-me`, {});
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Could not remove message.";
        setSocketError(message);
        try {
          const data = await apiGetJson<{ messages: ChatMessagePayload[] }>(
            `/api/messages/conversation/${encodeURIComponent(resolvedOtherId)}`,
          );
          setMessages(data.messages || []);
        } catch {
          /* keep optimistic state if refetch fails */
        }
      }
    },
    [resolvedOtherId],
  );

  /** Incoming messages only: drop from this thread with no tombstone (persists for this viewer). */
  const vanishIncomingFromView = useCallback(
    async (messageId: string) => {
      if (!messageId) return;

      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      if (messageId.startsWith("pending-")) {
        return;
      }

      try {
        await apiPostJson(`/api/messages/${encodeURIComponent(messageId)}/vanish-for-me`, {});
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Could not remove message.";
        setSocketError(message);
        try {
          const data = await apiGetJson<{ messages: ChatMessagePayload[] }>(
            `/api/messages/conversation/${encodeURIComponent(resolvedOtherId)}`,
          );
          setMessages(data.messages || []);
        } catch {
          /* keep filtered list if refetch fails */
        }
      }
    },
    [resolvedOtherId],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!messageId) return;

      const applyLocal = (prev: ChatMessagePayload[]) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const next = toggleMessageReaction(m.reactions, currentUserId, emoji);
          return { ...m, reactions: next.length ? next : undefined };
        });

      if (messageId.startsWith("pending-")) {
        setMessages(applyLocal);
        return;
      }

      setMessages(applyLocal);
      try {
        const data = await apiPostJson<{ reactions: { userId: string; emoji: string }[] }>(
          `/api/messages/${encodeURIComponent(messageId)}/reactions`,
          { emoji },
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, reactions: dedupeReactions(data.reactions || []) } : m,
          ),
        );
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Could not react.";
        setSocketError(message);
      }
    },
    [currentUserId],
  );

  const loadForwardTargets = useCallback(async () => {
    setForwardLoading(true);
    try {
      const data = await apiGetJson<{ conversations: { otherUserId: string; otherName: string }[] }>(
        "/api/messages/conversations",
      );
      setForwardConversations(data.conversations || []);
    } catch {
      setForwardConversations([]);
    } finally {
      setForwardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!forwardFrom) return;
    void loadForwardTargets();
  }, [forwardFrom, loadForwardTargets]);

  const submitForward = useCallback(
    (targetUserId: string) => {
      if (!forwardFrom) return;
      const excerpt =
        forwardFrom.forwardedFromPreview ||
        forwardFrom.message ||
        forwardFrom.replyTo?.preview ||
        "";
      const preview = excerpt.trim().slice(0, 500);
      const note = forwardNote.trim();
      const body = note || preview;
      if (!body.trim()) {
        setSocketError("Nothing to forward.");
        return;
      }

      const s = getChatSocket();
      if (!s?.connected) {
        setSocketError("Not connected. Check that the API server is running.");
        return;
      }

      setSocketError(null);
      const clientMessageId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const isSameThread = targetUserId === resolvedOtherId;

      if (isSameThread) {
        const pending: ChatMessagePayload = {
          id: clientMessageId,
          senderId: currentUserId,
          receiverId: targetUserId,
          message: body,
          timestamp: new Date().toISOString(),
          status: "sent",
          clientMessageId,
          ...(preview ? { forwardedFromPreview: preview } : {}),
        };
        setMessages((prev) => [...prev, pending]);
      }

      sendChatMessageWithClientId(targetUserId, body, clientMessageId, {
        ...(preview ? { forwardedFromPreview: preview } : {}),
      });
      setForwardFrom(null);
      setForwardNote("");
    },
    [currentUserId, forwardFrom, forwardNote, resolvedOtherId],
  );

  const title = useMemo(() => {
    if (!trimmedOther) return "Select a conversation";
    if (otherUserLabel?.trim()) return otherUserLabel.trim();
    if (resolvedOtherId) return `User ${resolvedOtherId.slice(0, 8)}…`;
    return "Conversation";
  }, [otherUserLabel, resolvedOtherId, trimmedOther]);

  if (!currentUserId) {
    return (
      <div className={`rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 ${className}`}>
        Sign in to use messages.
      </div>
    );
  }

  return (
    <div className={`flex h-full max-h-full min-h-0 flex-col overflow-hidden ${className}`}>
      <header className="shrink-0 min-h-[76px] border-b border-zinc-200 bg-white px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate leading-tight text-sm font-semibold text-zinc-900">{title}</p>
            <p
              className={`mt-1 text-xs font-medium leading-tight ${
                statusText === "Online" ? "text-[#4DD2AC]" : "text-zinc-700"
              }`}
            >
              {canChat ? statusText : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Call">
              <Phone className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <button type="button" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Video">
              <Video className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <button type="button" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Info">
              <Info className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F5F5F5] px-6 py-6">
        <div className="space-y-4 pb-2">
          {loadingHistory ? <p className="text-sm text-zinc-500">Loading messages…</p> : null}
          {resolvingUser ? <p className="text-sm text-zinc-500">Looking up user…</p> : null}
          {socketError ? <p className="text-sm text-red-600">{socketError}</p> : null}

          {!trimmedOther ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <div className="max-w-md text-center">
                <p className="text-sm font-semibold text-zinc-900">Select a conversation</p>
                <p className="mt-2 text-sm text-zinc-500">Choose a user from the left sidebar to load messages.</p>
              </div>
            </div>
          ) : null}

          {!loadingHistory && !resolvingUser && messages.length === 0 ? (
            trimmedOther ? <p className="text-sm text-zinc-500">No messages yet</p> : null
          ) : null}

          {messages.map((m) => (
            <ChatMessageRow
              key={m.id}
              m={m}
              currentUserId={currentUserId}
              allowUnsend={allowUnsend}
              openMenuId={openActionMenuId}
              openReactionId={openReactionId}
              onOpenMenu={setOpenActionMenuId}
              onOpenReaction={setOpenReactionId}
              onReact={toggleReaction}
              onReply={(msg) => {
                if (msg.unsent || msg.viewerRemoved) return;
                const preview =
                  msg.forwardedFromPreview ||
                  msg.message ||
                  (msg.replyTo ? msg.replyTo.preview : "") ||
                  "";
                setReplyingTo({ id: msg.id, preview: preview.slice(0, 280) });
              }}
              onForward={(msg) => {
                setOpenActionMenuId(null);
                setOpenReactionId(null);
                setForwardFrom(msg);
              }}
              onUnsendYou={unsendForYou}
              onUnsendEveryone={unsendForEveryone}
              onRemoveIncomingFromView={vanishIncomingFromView}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={send} className="shrink-0 border-t border-zinc-200 bg-white px-6 py-4">
        {replyingTo ? (
          <div className="mb-3 flex items-start justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Replying to</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-zinc-700">{replyingTo.preview}</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
              aria-label="Cancel reply"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiPicker(!showEmojiPicker);
              }}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              aria-label="Add emoji"
              disabled={!canChat}
            >
              <Smile className="h-5 w-5" strokeWidth={1.8} />
            </button>
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 z-20">
                <Picker onEmojiClick={handleEmojiClick} lazyLoadEmojis />
              </div>
            )}
          </div>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            className="h-10 min-w-0 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm leading-5 text-zinc-800 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-[#4DD2AC]/30"
            disabled={!canChat}
          />
          <button
            type="submit"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4DD2AC] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-zinc-300"
            aria-label="Send message"
            disabled={!canChat || !draft.trim()}
          >
            <Send className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </form>

      {forwardFrom ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forward-dialog-title"
        >
          <div className="max-h-[min(520px,90vh)] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 id="forward-dialog-title" className="text-sm font-semibold text-zinc-900">
                Forward message
              </h2>
              <button
                type="button"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
                aria-label="Close"
                onClick={() => {
                  setForwardFrom(null);
                  setForwardNote("");
                }}
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              <p className="text-[11px] font-semibold text-zinc-500">Preview</p>
              <p className="mt-1 line-clamp-6 whitespace-pre-wrap break-words">
                {forwardFrom.forwardedFromPreview ||
                  forwardFrom.message ||
                  forwardFrom.replyTo?.preview ||
                  ""}
              </p>
            </div>
            <div className="px-4 py-3">
              <label className="text-xs font-medium text-zinc-600" htmlFor="forward-note">
                Optional note
              </label>
              <input
                id="forward-note"
                type="text"
                value={forwardNote}
                onChange={(e) => setForwardNote(e.target.value)}
                placeholder="Say something about this forward…"
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-[#4DD2AC]/30"
              />
            </div>
            <div className="max-h-56 overflow-y-auto px-2 pb-4">
              {forwardLoading ? <p className="px-2 py-2 text-sm text-zinc-500">Loading conversations…</p> : null}
              {!forwardLoading && forwardConversations.length === 0 ? (
                <p className="px-2 py-2 text-sm text-zinc-500">No conversations to forward to.</p>
              ) : null}
              <ul className="space-y-1">
                {forwardConversations.map((c) => (
                  <li key={c.otherUserId}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                      onClick={() => submitForward(c.otherUserId)}
                    >
                      <span className="truncate font-medium">{c.otherName}</span>
                      <span className="ml-2 shrink-0 text-xs text-zinc-400">Send</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
