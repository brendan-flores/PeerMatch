"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileText, PhilippinePeso, Send } from "lucide-react";
import type { CommunityPost } from "@/app/lib/postsStorage";
import { formatTimeAgo } from "@/app/lib/formatTimeAgo";
import { buildOfferChatMessage } from "@/app/lib/offerChatMessage";
import { createPostOffer } from "@/app/lib/offersStorage";
import { sendChatMessageWithClientId } from "@/app/lib/socket";

const MESSAGE_MAX = 500;

const OFFER_TIPS = [
  "Introduce yourself and your relevant experience",
  "Explain how you can help with their specific needs",
  "Be clear about your availability and pricing",
];

type OfferHelpPanelProps = {
  post: CommunityPost;
  freelancerId: string;
  freelancerName: string;
  onBack: () => void;
};

function getInitials(name: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "CL";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

export function OfferHelpPanel({ post, freelancerId, freelancerName, onBack }: OfferHelpPanelProps) {
  const [rate, setRate] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const isUrgent = post.priority === "Important";
  const tags = useMemo(() => [post.category].filter(Boolean), [post.category]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || sent) return;

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Please enter a message for your offer.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const trimmedRate = rate.trim() || undefined;

      createPostOffer({
        postId: post.id,
        postTitle: post.title,
        freelancerId,
        freelancerName,
        clientId: post.authorId,
        clientName: post.authorName,
        rate: trimmedRate,
        message: trimmedMessage,
      });

      const chatText = buildOfferChatMessage(post, trimmedMessage, trimmedRate);
      sendChatMessageWithClientId(post.authorId, chatText, `offer-${post.id}-${Date.now()}`);

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center sm:py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF2EB] text-[#FF6B35]">
          <CheckCircle2 className="h-9 w-9" strokeWidth={1.75} aria-hidden />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-zinc-900">Offer sent</h2>
        <p className="mt-2 max-w-md text-sm text-zinc-500">
          Your offer for &ldquo;{post.title}&rdquo; was submitted. {post.authorName || "The client"} has been
          notified and can respond via message.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to posts
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-[#FF6B35]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to posts
      </button>

      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Offer Help</h2>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="space-y-5">
          <article className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {post.authorAvatarDataUrl ? (
                  <img
                    src={post.authorAvatarDataUrl}
                    alt=""
                    className="h-11 w-11 rounded-full border border-zinc-200 object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3B82F6] text-sm font-semibold text-white">
                    {getInitials(post.authorName)}
                  </span>
                )}
                <div>
                  <p className="font-semibold text-zinc-900">{post.authorName || "Client User"}</p>
                  <p className="text-xs text-zinc-500">Posted {formatTimeAgo(post.createdAt)}</p>
                </div>
              </div>
              {isUrgent ? (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Urgent</span>
              ) : null}
            </div>

            <h3 className="mt-5 text-xl font-bold text-zinc-900">{post.title}</h3>
            <div className="mt-3 flex items-center gap-2">
              <PhilippinePeso className="h-4 w-4 text-[#FF6B35]" aria-hidden />
              <span className="text-sm font-semibold text-zinc-900">Budget: ₱{post.budget.toLocaleString()}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{post.content}</p>

            {tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </article>

          <section className="rounded-2xl border border-[#FF6B35]/15 bg-[#FFF8F4] p-5 sm:p-6">
            <h4 className="font-bold text-zinc-900">Tips for a great offer</h4>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-600">
              {OFFER_TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-bold text-zinc-900">Your Offer</h3>

          <div className="mt-5">
            <label htmlFor="offer-rate" className="flex items-center gap-2 text-sm font-medium text-zinc-800">
              <PhilippinePeso className="h-4 w-4 text-[#FF6B35]" aria-hidden />
              Your Rate <span className="font-normal text-zinc-500">(Optional)</span>
            </label>
            <input
              id="offer-rate"
              type="text"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="₱ 0.00"
              className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
            />
            <p className="mt-1.5 text-xs text-zinc-500">Per hour or fixed price</p>
          </div>

          <div className="mt-5">
            <label htmlFor="offer-message" className="flex items-center gap-2 text-sm font-medium text-zinc-800">
              <FileText className="h-4 w-4 text-[#FF6B35]" aria-hidden />
              Your Message <span className="text-[#FF6B35]">*</span>
            </label>
            <textarea
              id="offer-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
              rows={7}
              required
              placeholder="Hi! I'd love to help you with this project. I have experience in..."
              className="mt-2 w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              {message.length}/{MESSAGE_MAX} characters
            </p>
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden />
            {submitting ? "Sending…" : "Send Offer"}
          </button>
          <p className="mt-3 text-center text-xs text-zinc-500">
            The client will be notified and can respond via message
          </p>
        </form>
      </div>
    </div>
  );
}
