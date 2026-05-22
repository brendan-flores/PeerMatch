"use client";

import { Check, Handshake, Star } from "lucide-react";
import { dashboardCenterPanelHeadingClass } from "@/app/components/dashboard/dashboardShellClasses";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/app/lib/api";
import { formatPhpBudget } from "@/app/lib/communityPosts";
import { notifyAndRefreshCommunityPosts, useCommunityPostsContext } from "@/app/lib/CommunityPostsContext";
import { freelancerProfilePath } from "@/app/lib/freelancerProfileApi";
import {
  acceptClientOffer,
  completeClientTask,
  fetchClientOffers,
  isOfferPending,
  rejectClientOffer,
  submitTaskReview,
  type ClientOffer,
} from "@/app/lib/offersApi";
import type { CommunityPost, TaskHireStatus } from "@/app/lib/postsStorage";

function formatTimeAgo(value: string) {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "Just now";
  const diffMs = Date.now() - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hr ago`;
  return `${Math.floor(diffMs / day)} day${Math.floor(diffMs / day) > 1 ? "s" : ""} ago`;
}

function hireStatusLabel(status: TaskHireStatus | undefined) {
  if (status === "assigned") return "In progress";
  if (status === "completed") return "Completed";
  return "Open for offers";
}

function hireStatusClass(status: TaskHireStatus | undefined) {
  if (status === "assigned") return "bg-[#FFF2EB] text-[#9A3412] border-[#FFD4C2]";
  if (status === "completed") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function offerStatusClass(status: ClientOffer["status"]) {
  if (status === "accepted") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "rejected") return "bg-zinc-100 text-zinc-500 border-zinc-200";
  return "bg-white text-zinc-800 border-zinc-200";
}

type PostOfferGroup = {
  post: CommunityPost;
  offers: ClientOffer[];
};

function postFromOffer(offer: ClientOffer, existing?: CommunityPost): CommunityPost {
  if (existing) return existing;
  return {
    id: offer.postId,
    authorId: offer.clientId,
    authorName: "You",
    authorEmail: "",
    title: offer.postTitle || "Your post",
    content: "",
    category: "General",
    priority: "Normal",
    budget: 0,
    createdAt: offer.createdAt,
    status: "approved",
    hireStatus: "open",
  };
}

type ClientOffersPanelProps = {
  onPendingCountChange?: (count: number) => void;
  highlightPostId?: string | null;
  onHighlightComplete?: () => void;
};

export function ClientOffersPanel({
  onPendingCountChange,
  highlightPostId = null,
  onHighlightComplete,
}: ClientOffersPanelProps) {
  const { myPosts, refreshAll } = useCommunityPostsContext();
  const [offers, setOffers] = useState<ClientOffer[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; text: string }>>({});
  const loadRequestIdRef = useRef(0);
  const postRefs = useRef<Record<string, HTMLElement | null>>({});
  const [animatingPostId, setAnimatingPostId] = useState<string | null>(null);

  const loadOffers = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    const requestId = ++loadRequestIdRef.current;
    if (!silent) setInitialLoading(true);
    try {
      const list = await fetchClientOffers();
      if (requestId !== loadRequestIdRef.current) return;
      setOffers(list);
      setStatusMessage("");
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      const message = err instanceof ApiError ? err.message : "Could not load offers.";
      setStatusMessage(message);
    } finally {
      if (requestId !== loadRequestIdRef.current) return;
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOffers();
    const interval = window.setInterval(() => {
      void loadOffers({ silent: true });
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadOffers]);

  const approvedMyPosts = useMemo(
    () => myPosts.filter((post) => post.status === "approved"),
    [myPosts],
  );

  const postById = useMemo(() => {
    const map = new Map<string, CommunityPost>();
    approvedMyPosts.forEach((post) => map.set(post.id, post));
    return map;
  }, [approvedMyPosts]);

  const groups = useMemo(() => {
    const offersByPost = new Map<string, ClientOffer[]>();
    offers.forEach((offer) => {
      const list = offersByPost.get(offer.postId) || [];
      list.push(offer);
      offersByPost.set(offer.postId, list);
    });

    const result: PostOfferGroup[] = [];
    const seenPostIds = new Set<string>();

    offersByPost.forEach((postOffers, postId) => {
      if (postOffers.length === 0) return;
      const sorted = [...postOffers].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const post = postFromOffer(sorted[0], postById.get(postId));
      result.push({ post, offers: sorted });
      seenPostIds.add(postId);
    });

    approvedMyPosts.forEach((post) => {
      const hireStatus = post.hireStatus || "open";
      if (hireStatus !== "assigned" && hireStatus !== "completed") return;
      if (seenPostIds.has(post.id)) return;
      const postOffers = offersByPost.get(post.id) || [];
      result.push({ post, offers: postOffers });
      seenPostIds.add(post.id);
    });

    return result.sort(
      (a, b) => new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime(),
    );
  }, [approvedMyPosts, offers, postById]);

  const pendingCount = useMemo(
    () => offers.filter((offer) => isOfferPending(offer.status)).length,
    [offers],
  );

  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [pendingCount, onPendingCountChange]);

  useEffect(() => {
    const postId = String(highlightPostId || "").trim();
    if (!postId || initialLoading) return;

    let animTimeout: ReturnType<typeof window.setTimeout> | undefined;
    let notifyTimeout: ReturnType<typeof window.setTimeout> | undefined;
    let retryTimeout: ReturnType<typeof window.setTimeout> | undefined;

    const trigger = () => {
      const el = postRefs.current[postId];
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setAnimatingPostId(postId);
      animTimeout = window.setTimeout(() => setAnimatingPostId(null), 2400);
      notifyTimeout = window.setTimeout(() => onHighlightComplete?.(), 2600);
      return true;
    };

    if (!trigger()) {
      retryTimeout = window.setTimeout(() => trigger(), 150);
    }

    return () => {
      if (animTimeout) window.clearTimeout(animTimeout);
      if (notifyTimeout) window.clearTimeout(notifyTimeout);
      if (retryTimeout) window.clearTimeout(retryTimeout);
    };
  }, [highlightPostId, initialLoading, groups, onHighlightComplete]);

  const handleAccept = async (offerId: string) => {
    setBusyOfferId(offerId);
    setStatusMessage("");
    try {
      await acceptClientOffer(offerId);
      await loadOffers({ silent: true });
      await refreshAll();
      notifyAndRefreshCommunityPosts(refreshAll);
      setStatusMessage("Offer accepted. The freelancer has been notified.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not accept the offer.";
      setStatusMessage(message);
    } finally {
      setBusyOfferId(null);
    }
  };

  const handleReject = async (offerId: string) => {
    setBusyOfferId(offerId);
    setStatusMessage("");
    try {
      await rejectClientOffer(offerId);
      await loadOffers({ silent: true });
      setStatusMessage("Offer rejected.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not reject the offer.";
      setStatusMessage(message);
    } finally {
      setBusyOfferId(null);
    }
  };

  const handleComplete = async (postId: string) => {
    setBusyPostId(postId);
    setStatusMessage("");
    try {
      await completeClientTask(postId);
      await loadOffers({ silent: true });
      await refreshAll();
      notifyAndRefreshCommunityPosts(refreshAll);
      setStatusMessage("Task marked as completed. You can leave a review below.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not mark the task as completed.";
      setStatusMessage(message);
    } finally {
      setBusyPostId(null);
    }
  };

  const handleReview = async (postId: string) => {
    const draft = reviewDrafts[postId];
    if (!draft?.rating || !draft.text.trim()) {
      setStatusMessage("Please add a rating and review before submitting.");
      return;
    }
    setBusyPostId(postId);
    setStatusMessage("");
    try {
      await submitTaskReview(postId, { rating: draft.rating, text: draft.text.trim() });
      await loadOffers({ silent: true });
      await refreshAll();
      setStatusMessage("Thank you for your review.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not submit your review.";
      setStatusMessage(message);
    } finally {
      setBusyPostId(null);
    }
  };

  return (
    <section aria-labelledby="offers-heading" className="space-y-6">
      <div className={dashboardCenterPanelHeadingClass}>
        <h1 id="offers-heading" className="text-4xl font-bold tracking-tight text-zinc-900">
          Offers
        </h1>
        <p className="mt-1.5 text-sm text-zinc-600">
          Review freelancer offers on your posts, accept a match, and complete tasks when done.
        </p>
      </div>

      {statusMessage ? (
        <p className="rounded-xl border border-zinc-200 bg-[#F3F6F5] px-4 py-3 text-sm text-zinc-700">
          {statusMessage}
        </p>
      ) : null}

      {initialLoading ? (
        <p className="text-sm text-zinc-500">Loading offers...</p>
      ) : null}

      {!initialLoading && groups.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] px-5 py-8 text-center shadow-sm">
          <Handshake className="mx-auto h-10 w-10 text-zinc-400" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-zinc-800">No offers yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            When freelancers offer help on your approved posts, they will appear here.
          </p>
        </div>
      ) : null}

      <div className="space-y-5">
        {groups.map(({ post, offers: postOffers }) => {
          const hireStatus = post.hireStatus || "open";
          const acceptedOffer = postOffers.find((offer) => offer.status === "accepted");
          const canAccept = hireStatus === "open";
          const reviewDraft = reviewDrafts[post.id] || { rating: 5, text: "" };

          return (
            <article
              key={post.id}
              ref={(node) => {
                postRefs.current[post.id] = node;
              }}
              className={`rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-5 shadow-sm sm:p-6 ${
                animatingPostId === post.id
                  ? "animate-notification-highlight ring-2 ring-[#FF6B35]/80"
                  : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-zinc-900">{post.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{post.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>{post.category}</span>
                    <span>·</span>
                    <span>{formatPhpBudget(post.budget)}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${hireStatusClass(hireStatus)}`}
                >
                  {hireStatusLabel(hireStatus)}
                </span>
              </div>

              {hireStatus === "assigned" && post.assignedFreelancerName ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <span className="font-semibold">Assigned:</span> {post.assignedFreelancerName}
                </div>
              ) : null}

              {hireStatus === "assigned" ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => void handleComplete(post.id)}
                    disabled={busyPostId === post.id}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-[#FF6B35] px-4 text-xs font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busyPostId === post.id ? "Saving..." : "Mark task as completed"}
                  </button>
                </div>
              ) : null}

              {hireStatus === "completed" && !post.reviewSubmittedAt ? (
                <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-sm font-semibold text-zinc-900">Rate your freelancer</p>
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setReviewDrafts((prev) => ({
                            ...prev,
                            [post.id]: { ...reviewDraft, rating: value },
                          }))
                        }
                        className="rounded p-0.5 transition hover:scale-105"
                        aria-label={`Rate ${value} stars`}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            value <= reviewDraft.rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"
                          }`}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewDraft.text}
                    onChange={(event) =>
                      setReviewDrafts((prev) => ({
                        ...prev,
                        [post.id]: { ...reviewDraft, text: event.target.value },
                      }))
                    }
                    rows={3}
                    placeholder="Share how the collaboration went..."
                    className="mt-3 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                  />
                  <button
                    type="button"
                    onClick={() => void handleReview(post.id)}
                    disabled={busyPostId === post.id}
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-[#FF6B35] px-4 text-xs font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busyPostId === post.id ? "Submitting..." : "Submit review"}
                  </button>
                </div>
              ) : null}

              {hireStatus === "completed" && post.reviewSubmittedAt ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-emerald-800">
                  <Check className="h-4 w-4 shrink-0" strokeWidth={2} />
                  Review submitted — thank you!
                </p>
              ) : null}

              <div className="mt-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {postOffers.length === 0
                    ? "Offers"
                    : `${postOffers.length} offer${postOffers.length === 1 ? "" : "s"}`}
                </h3>
                {postOffers.length === 0 ? (
                  <p className="text-xs text-zinc-500">No freelancer offers for this post yet.</p>
                ) : (
                  postOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className={`rounded-xl border px-4 py-3 ${offerStatusClass(offer.status)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-[#E8EFEC] text-sm font-bold text-zinc-800">
                          {offer.freelancerPhotoDataUrl ? (
                            <img
                              src={offer.freelancerPhotoDataUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (offer.freelancerName || "F").slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <a
                              href={freelancerProfilePath(offer.freelancerId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-zinc-900 hover:underline"
                            >
                              {offer.freelancerName}
                            </a>
                            <span className="text-xs text-zinc-500">{formatTimeAgo(offer.createdAt)}</span>
                          </div>
                          {offer.rate ? (
                            <p className="mt-0.5 text-xs font-medium text-[#FF6B35]">Rate: {offer.rate}</p>
                          ) : null}
                          <p className="mt-2 text-sm leading-snug text-zinc-700">{offer.message}</p>
                          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                            {offer.status === "accepted"
                              ? "Accepted"
                              : offer.status === "rejected"
                                ? "Rejected"
                                : "Pending"}
                          </p>
                        </div>
                      </div>
                      {canAccept && isOfferPending(offer.status) ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleAccept(offer.id)}
                            disabled={busyOfferId === offer.id}
                            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-[#FF6B35] px-4 text-xs font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
                          >
                            {busyOfferId === offer.id ? "Working..." : "Accept offer"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReject(offer.id)}
                            disabled={busyOfferId === offer.id}
                            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
                          >
                            Reject offer
                          </button>
                        </div>
                      ) : null}
                      {acceptedOffer?.id === offer.id && hireStatus !== "open" ? (
                        <p className="mt-2 text-xs font-semibold text-emerald-800">Assigned freelancer</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
