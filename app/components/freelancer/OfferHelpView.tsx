"use client";

import { useState } from "react";
import type { CommunityPost } from "@/app/lib/postsStorage";
import { formatCommunityPostTimeAgo } from "@/app/lib/postsStorage";
import { recordFreelancerOffer } from "@/app/lib/freelancerOffersStorage";
import { connectSocket, getChatSocket, sendChatMessageWithClientId } from "@/app/lib/socket";
import { ArrowLeft, FileText, PhilippinePeso, Send } from "lucide-react";

const MESSAGE_MAX = 500;

function buildPredefinedOfferChatBody(post: CommunityPost): string {
  return `You've received an offer through PeerMatch on your post "${post.title}". Reply in this chat to coordinate details—I'll follow up here.`;
}

function composeOfferChatMessage(post: CommunityPost, userMessage: string, rateFormatted: string | null): string {
  const parts: string[] = [];
  parts.push(buildPredefinedOfferChatBody(post));
  if (rateFormatted) {
    parts.push(`Suggested rate: ${rateFormatted}.`);
  }
  parts.push("");
  parts.push(userMessage.trim());
  return parts.join("\n");
}

function formatRateForStorage(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return t.startsWith("₱") ? t : `₱${t}`;
}

type Props = {
  post: CommunityPost;
  freelancerId: string;
  listTitle?: string;
  onBackToList: () => void;
  onOfferSent?: () => void;
};

export function OfferHelpView({ post, freelancerId, listTitle = "posts", onBackToList, onOfferSent }: Props) {
  const [rateRaw, setRateRaw] = useState("");
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const urgencyIsHigh = post.priority === "Important";
  const trimmedMessage = message.trim();
  const messageLen = message.length;
  const canSubmit =
    trimmedMessage.length > 0 && trimmedMessage.length <= MESSAGE_MAX && !submitting && phase === "form";

  if (phase === "success") {
    return (
      <div className="space-y-8">
        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 transition hover:text-[#FF6B35]"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          Back to {listTitle}
        </button>
        <div className="rounded-2xl border border-[#56BA54]/35 bg-[#f2faf2] px-8 py-12 text-center shadow-[0_8px_32px_rgba(86,186,84,0.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#56BA54] text-white shadow-md">
            <Send className="h-7 w-7" strokeWidth={2} aria-hidden />
          </div>
          <p className="mt-5 text-xl font-bold text-zinc-900">Offer sent</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600">
            Your offer and intro message were sent to {post.authorName || "the client"}. They can reply here when ready.
          </p>
          <button
            type="button"
            onClick={onBackToList}
            className="mt-8 rounded-xl bg-[#FF6B35] px-8 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,107,53,0.35)] transition hover:bg-[#e85f2c]"
          >
            Back to {listTitle}
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    setSendError(null);
    if (!canSubmit) return;

    const clientId = String(post.authorId || "").trim();
    if (!clientId) {
      setSendError("This post is missing client information.");
      return;
    }
    if (clientId === freelancerId) {
      setSendError("You can't send an offer on your own post.");
      return;
    }

    const rateStorage = rateRaw.trim();
    const rateFormatted = rateStorage ? formatRateForStorage(rateStorage) : null;
    const chatBody = composeOfferChatMessage(post, trimmedMessage, rateFormatted);

    const completeSend = (): boolean => {
      const sock = getChatSocket();
      if (!sock?.connected) return false;
      const clientMessageId = `offer-${post.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      sendChatMessageWithClientId(clientId, chatBody, clientMessageId);
      recordFreelancerOffer({
        postId: post.id,
        freelancerId,
        rateLabel: rateFormatted || "",
        message: trimmedMessage,
      });
      setPhase("success");
      setSubmitting(false);
      onOfferSent?.();
      return true;
    };

    setSubmitting(true);
    connectSocket(freelancerId);

    if (completeSend()) return;

    const sock = getChatSocket();
    const onFail = () => {
      setSubmitting(false);
      setSendError("Couldn't reach chat. Check your connection and try again.");
    };

    const t = window.setTimeout(() => {
      sock?.off("connect", onConnect);
      if (!completeSend()) onFail();
    }, 8000);

    const onConnect = () => {
      window.clearTimeout(t);
      sock?.off("connect", onConnect);
      if (!completeSend()) onFail();
    };

    sock?.once("connect", onConnect);
  };

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={onBackToList}
        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 transition hover:text-[#FF6B35]"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        Back to {listTitle}
      </button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={
                    post.authorAvatarDataUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.authorName || "Client")}`
                  }
                  alt={`${post.authorName} avatar`}
                  className="h-11 w-11 shrink-0 rounded-full border border-zinc-200"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-zinc-900">{post.authorName || "Client User"}</p>
                  <p className="text-xs text-zinc-500">Posted {formatCommunityPostTimeAgo(post.createdAt)}</p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  urgencyIsHigh ? "bg-[#FECACA] text-[#991B1B]" : "bg-[#56BA54] text-zinc-900"
                }`}
              >
                {urgencyIsHigh ? "Urgent" : "Normal"}
              </span>
            </div>

            <h2 className="mt-5 text-xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-[1.35rem]">{post.title}</h2>
            <p className="mt-3 text-base leading-[1.65] text-zinc-700">{post.content}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700">{post.category || "General"}</span>
              {urgencyIsHigh ? (
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">High priority</span>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-[#f5dfd0]/80 bg-[#FFF5EE] px-5 py-5 sm:px-6 sm:py-6">
            <p className="text-sm font-bold text-zinc-900">Tips for a great offer</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
              <li>Introduce yourself and your relevant experience</li>
              <li>Explain how you can help with their specific needs</li>
              <li>Be clear about your availability and pricing</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-5 sm:p-6 lg:p-7">
          <h3 className="text-lg font-bold text-zinc-900">Your Offer</h3>

          <label className="mt-7 block">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
              <PhilippinePeso className="h-4 w-4 text-zinc-500" aria-hidden strokeWidth={2} />
              Your Rate (Optional)
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="₱ 0.00"
              autoComplete="off"
              value={rateRaw}
              onChange={(e) => setRateRaw(e.target.value)}
              disabled={submitting}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-[#FF6B35]/50 focus:ring-2 focus:ring-[#FF6B35]/20 disabled:opacity-60"
            />
            <span className="mt-1.5 block text-xs text-zinc-500">Per hour or fixed price</span>
          </label>

          <label className="mt-6 block">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
              <FileText className="h-4 w-4 text-zinc-500" aria-hidden strokeWidth={2} />
              Your Message
              <span className="text-red-600" aria-hidden>
                *
              </span>
            </span>
            <textarea
              placeholder="Hi! I'd love to help you with this. I have experience in…"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
              disabled={submitting}
              rows={6}
              className="mt-2 w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-[#FF6B35]/50 focus:ring-2 focus:ring-[#FF6B35]/20 disabled:opacity-60"
            />
            <div className="mt-1.5 flex justify-between text-xs text-zinc-500">
              <span>{trimmedMessage.length === 0 ? "Required" : null}</span>
              <span>
                {messageLen}/{MESSAGE_MAX} characters
              </span>
            </div>
          </label>

          {sendError ? <p className="mt-3 text-sm font-medium text-red-600">{sendError}</p> : null}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3.5 text-sm font-semibold text-white shadow-[0_6px_24px_rgba(255,107,53,0.28)] transition hover:bg-[#e85f2c] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none"
          >
            <Send className="h-4 w-4" strokeWidth={2} aria-hidden />
            {submitting ? "Sending…" : "Send Offer"}
          </button>
          <p className="mt-3 text-center text-xs text-zinc-500">The client will be notified and can respond via message</p>
        </div>
      </div>
    </div>
  );
}
