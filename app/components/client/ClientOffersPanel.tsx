"use client";

import { Check, Handshake, Star } from "lucide-react";
import { dashboardFeedPageHeadingClass } from "@/app/components/dashboard/dashboardShellClasses";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/app/lib/api";
import { formatPhpBudget } from "@/app/lib/posts";
import { useCommunityPostsContext } from "@/app/lib/posts";
import { freelancerProfilePath } from "@/app/lib/freelancer";
import {
  acceptClientOffer,
  completeClientTask,
  countPendingOffers,
  fetchClientOffers,
  isOfferPending,
  rejectClientOffer,
  submitTaskReview,
  type ClientOffer,
} from "@/app/lib/offers";
import type { CommunityPost, TaskHireStatus } from "@/app/lib/posts";
import { UserAvatar } from "@/app/components/UserAvatar";
import { formatTimeAgo } from "@/app/lib/time";

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

function formatOfferRate(rate: string | undefined): string | null {
  const trimmed = String(rate || "").trim();
  if (!trimmed) return null;
  if (/^₱/.test(trimmed)) return trimmed;
  const numeric = Number(trimmed.replace(/[^\d.]/g, ""));
  if (Number.isFinite(numeric) && numeric > 0) return formatPhpBudget(numeric);
  return trimmed;
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`h-3.5 w-3.5 ${
            value <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function offerStatusClass(status: ClientOffer["status"]) {
  if (status === "accepted") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "rejected") return "bg-zinc-100 text-zinc-500 border-zinc-200";
  return "bg-white text-zinc-800 border-zinc-200";
}

function postHasAssignedFreelancer(post: CommunityPost, offers: ClientOffer[]): boolean {
  const hireStatus = post.hireStatus || "open";
  return (
    hireStatus === "assigned" ||
    hireStatus === "completed" ||
    offers.some((offer) => offer.status === "accepted")
  );
}

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

function latestTimestamp(values: string[]): number {
  return values.reduce((max, value) => {
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? Math.max(max, ts) : max;
  }, 0);
}

type PostOfferGroup = {
  post: CommunityPost;
  offers: ClientOffer[];
};

type RejectedOfferEntry = {
  offer: ClientOffer;
  post: CommunityPost;
};

type ClientOffersPanelProps = {
  onPendingCountChange?: (count: number) => void;
  highlightPostId?: string | null;
  onHighlightComplete?: () => void;
};

type OffersViewTab = "offers" | "completed" | "rejected";

type OffersTabButtonProps = {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
};

function OffersTabButton({ label, count, active, onClick }: OffersTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ui-interactive flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-[#FF6B35] text-white shadow-sm"
          : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
      }`}
      aria-pressed={active}
    >
      <span>{label}</span>
      {count > 0 ? (
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
            active ? "bg-white text-[#FF6B35]" : "bg-[#FF6B35] text-white"
          }`}
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}

export function ClientOffersPanel({
  onPendingCountChange,
  highlightPostId = null,
  onHighlightComplete,
}: ClientOffersPanelProps) {
  const { myPosts, refreshAll, updatePostLocally } = useCommunityPostsContext();
  const [offers, setOffers] = useState<ClientOffer[]>([]);
  const [offerPosts, setOfferPosts] = useState<CommunityPost[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; text: string }>>({});
  const loadRequestIdRef = useRef(0);
  const postRefs = useRef<Record<string, HTMLElement | null>>({});
  const [animatingPostId, setAnimatingPostId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OffersViewTab>("offers");

  const loadOffers = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    const requestId = ++loadRequestIdRef.current;
    if (!silent) setInitialLoading(true);
    try {
      const { offers: list, posts } = await fetchClientOffers();
      if (requestId !== loadRequestIdRef.current) return;
      setOffers(list);
      setOfferPosts(posts);
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
  }, [loadOffers]);

  const approvedMyPosts = useMemo(
    () => myPosts.filter((post) => post.status === "approved"),
    [myPosts],
  );

  const postById = useMemo(() => {
    const map = new Map<string, CommunityPost>();
    approvedMyPosts.forEach((post) => map.set(post.id, post));
    offerPosts.forEach((post) => {
      const existing = map.get(post.id);
      map.set(post.id, existing ? { ...existing, ...post } : post);
    });
    return map;
  }, [approvedMyPosts, offerPosts]);

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

    return result;
  }, [approvedMyPosts, offers, postById]);

  const offersColumnGroups = useMemo(() => {
    return groups
      .filter(({ post, offers: postOffers }) => {
        const hireStatus = post.hireStatus || "open";
        if (hireStatus === "completed" && post.reviewSubmittedAt) return false;
        const hasPending = postOffers.some((offer) => isOfferPending(offer.status));
        if (hasPending && hireStatus === "open") return true;
        if (hireStatus === "assigned") return true;
        if (hireStatus === "completed" && !post.reviewSubmittedAt) return true;
        return false;
      })
      .map((group) => ({
        ...group,
        offers: group.offers
          .filter((offer) => isOfferPending(offer.status) || offer.status === "accepted")
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      }))
      .sort((a, b) => {
        const aPending = a.offers.filter((o) => isOfferPending(o.status));
        const bPending = b.offers.filter((o) => isOfferPending(o.status));
        const aKey =
          aPending.length > 0
            ? latestTimestamp(aPending.map((o) => o.createdAt))
            : new Date(a.post.completedAt || a.post.createdAt).getTime();
        const bKey =
          bPending.length > 0
            ? latestTimestamp(bPending.map((o) => o.createdAt))
            : new Date(b.post.completedAt || b.post.createdAt).getTime();
        return bKey - aKey;
      });
  }, [groups]);

  const completedColumnGroups = useMemo(() => {
    return groups
      .filter(
        ({ post }) =>
          (post.hireStatus || "open") === "completed" && Boolean(post.reviewSubmittedAt),
      )
      .sort(
        (a, b) =>
          new Date(b.post.reviewSubmittedAt || b.post.completedAt || b.post.createdAt).getTime() -
          new Date(a.post.reviewSubmittedAt || a.post.completedAt || a.post.createdAt).getTime(),
      );
  }, [groups]);

  const rejectedEntries = useMemo(() => {
    const entries: RejectedOfferEntry[] = offers
      .filter((offer) => offer.status === "rejected")
      .map((offer) => ({
        offer,
        post: postById.get(offer.postId) || postFromOffer(offer, postById.get(offer.postId)),
      }))
      .sort(
        (a, b) => new Date(b.offer.createdAt).getTime() - new Date(a.offer.createdAt).getTime(),
      );
    return entries;
  }, [offers, postById]);

  const pendingCount = useMemo(() => countPendingOffers(offers), [offers]);

  const offersTabCount = useMemo(() => {
    const pending = offersColumnGroups.reduce(
      (sum, g) => sum + g.offers.filter((o) => isOfferPending(o.status)).length,
      0,
    );
    return pending > 0 ? pending : offersColumnGroups.length;
  }, [offersColumnGroups]);

  const completedTabCount = completedColumnGroups.length;
  const rejectedTabCount = rejectedEntries.length;

  useEffect(() => {
    if (highlightPostId) {
      setActiveTab("offers");
    }
  }, [highlightPostId]);

  const allRenderableIds = useMemo(() => {
    const ids = new Set<string>();
    offersColumnGroups.forEach((g) => ids.add(g.post.id));
    completedColumnGroups.forEach((g) => ids.add(g.post.id));
    rejectedEntries.forEach((e) => ids.add(e.post.id));
    return ids;
  }, [offersColumnGroups, completedColumnGroups, rejectedEntries]);

  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [pendingCount, onPendingCountChange]);

  useEffect(() => {
    const postId = String(highlightPostId || "").trim();
    if (!postId || initialLoading || !allRenderableIds.has(postId)) return;

    let animTimeout: number | undefined;
    let notifyTimeout: number | undefined;
    let retryTimeout: number | undefined;

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
  }, [highlightPostId, initialLoading, allRenderableIds, onHighlightComplete]);

  const handleAccept = async (offerId: string) => {
    setBusyOfferId(offerId);
    setStatusMessage("");
    try {
      await acceptClientOffer(offerId);
      await Promise.all([loadOffers({ silent: true }), refreshAll()]);
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
      const result = await completeClientTask(postId);
      if (result.post) {
        setOfferPosts((prev) =>
          prev.map((post) => (post.id === postId ? { ...post, ...result.post } : post)),
        );
        updatePostLocally(postId, result.post);
      }
      await Promise.all([loadOffers({ silent: true }), refreshAll()]);
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
      const result = await submitTaskReview(postId, { rating: draft.rating, text: draft.text.trim() });
      if (result.post) {
        setOfferPosts((prev) =>
          prev.map((post) => (post.id === postId ? { ...post, ...result.post } : post)),
        );
        updatePostLocally(postId, result.post);
      }
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

  const renderPostCard = (group: PostOfferGroup, options: { showPendingOnly?: boolean }) => {
    const { post, offers: postOffers } = group;
    const hireStatus = post.hireStatus || "open";
    const acceptedOffer = postOffers.find((offer) => offer.status === "accepted");
    const listOffers = options.showPendingOnly
      ? postOffers.filter((offer) => isOfferPending(offer.status))
      : postOffers;
    const canAccept = hireStatus === "open";
    const reviewDraft = reviewDrafts[post.id] || { rating: 5, text: "" };

    return (
      <article
        key={post.id}
        ref={(node) => {
          postRefs.current[post.id] = node;
        }}
        className={`rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm sm:p-5 ${
          animatingPostId === post.id
            ? "animate-notification-highlight ring-2 ring-[#FF6B35]/80"
            : ""
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-zinc-900">{post.title}</h3>
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
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <span className="font-semibold">Assigned:</span> {post.assignedFreelancerName}
          </div>
        ) : null}

        {hireStatus === "assigned" ? (
          <div className="mt-3">
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
          <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4">
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

        {hireStatus === "completed" && post.reviewSubmittedAt && post.reviewRating ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <Check className="h-4 w-4 shrink-0" strokeWidth={2} />
              Review submitted — thank you!
            </p>
            <div className="mt-2 flex items-center gap-2">
              <ReviewStars rating={post.reviewRating} />
              <span className="text-xs font-medium text-emerald-800">{post.reviewRating} / 5</span>
            </div>
            {post.reviewText ? (
              <p className="mt-2 text-sm leading-snug text-emerald-900/90">{post.reviewText}</p>
            ) : null}
          </div>
        ) : null}

        {listOffers.length > 0 ? (
          <div className="mt-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {listOffers.length === 1 ? "1 offer" : `${listOffers.length} offers`}
            </h4>
            {listOffers.map((offer) => (
              <div
                key={offer.id}
                className={`rounded-xl border px-3 py-3 ${offerStatusClass(offer.status)}`}
              >
                <div className="flex items-start gap-3">
                  <UserAvatar
                    name={offer.freelancerName || "Freelancer"}
                    photoDataUrl={offer.freelancerPhotoDataUrl}
                    size="md"
                    initialsClassName="bg-[#E8EFEC] text-zinc-800"
                  />
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
                    {formatOfferRate(offer.rate) ? (
                      <p className="mt-0.5 text-xs font-medium text-[#FF6B35]">
                        Rate: {formatOfferRate(offer.rate)}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm leading-snug text-zinc-700">{offer.message}</p>
                    {acceptedOffer?.id === offer.id && post.reviewRating ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <ReviewStars rating={post.reviewRating} />
                        <span className="text-xs font-medium text-amber-700">
                          Your rating: {post.reviewRating}/5
                        </span>
                      </div>
                    ) : null}
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
            ))}
          </div>
        ) : null}
      </article>
    );
  };

  const renderRejectedCard = (entry: RejectedOfferEntry) => {
    const { offer, post } = entry;
    return (
      <article
        key={offer.id}
        ref={(node) => {
          postRefs.current[post.id] = node;
        }}
        className={`rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm ${
          animatingPostId === post.id ? "animate-notification-highlight ring-2 ring-[#FF6B35]/80" : ""
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Post</p>
        <h3 className="mt-1 text-sm font-bold text-zinc-900">{post.title}</h3>
        <div className={`mt-3 rounded-xl border px-3 py-3 ${offerStatusClass("rejected")}`}>
          <div className="flex items-start gap-3">
            <UserAvatar
              name={offer.freelancerName || "Freelancer"}
              photoDataUrl={offer.freelancerPhotoDataUrl}
              size="md"
              initialsClassName="bg-[#E8EFEC] text-zinc-800"
            />
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
              {formatOfferRate(offer.rate) ? (
                <p className="mt-0.5 text-xs font-medium text-[#FF6B35]">
                  Rate: {formatOfferRate(offer.rate)}
                </p>
              ) : null}
              <p className="mt-2 text-sm leading-snug text-zinc-600">{offer.message}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Rejected
              </p>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const hasAnyContent =
    offersColumnGroups.length > 0 ||
    completedColumnGroups.length > 0 ||
    rejectedEntries.length > 0;

  return (
    <section aria-labelledby="offers-heading" className="space-y-6">
      <div className={dashboardFeedPageHeadingClass}>
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

      {!initialLoading && !hasAnyContent ? (
        <div className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] px-5 py-8 text-center shadow-sm">
          <Handshake className="mx-auto h-10 w-10 text-zinc-400" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-zinc-800">No offers yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            When freelancers offer help on your approved posts, they will appear here.
          </p>
        </div>
      ) : null}

      {!initialLoading && hasAnyContent ? (
        <div className="space-y-4">
          <div
            className="grid grid-cols-3 gap-2 rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-2"
            role="tablist"
            aria-label="Offer categories"
          >
            <OffersTabButton
              label="Offers"
              count={offersTabCount}
              active={activeTab === "offers"}
              onClick={() => setActiveTab("offers")}
            />
            <OffersTabButton
              label="Completed"
              count={completedTabCount}
              active={activeTab === "completed"}
              onClick={() => setActiveTab("completed")}
            />
            <OffersTabButton
              label="Rejected"
              count={rejectedTabCount}
              active={activeTab === "rejected"}
              onClick={() => setActiveTab("rejected")}
            />
          </div>

          <div
            role="tabpanel"
            aria-label={
              activeTab === "offers"
                ? "Offers"
                : activeTab === "completed"
                  ? "Completed"
                  : "Rejected"
            }
            className="space-y-4"
          >
            {activeTab === "offers" ? (
              offersColumnGroups.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 bg-[#F8FAFC] px-3 py-8 text-center text-sm text-zinc-500">
                  No pending offers. New freelancer offers appear here, newest first.
                </p>
              ) : (
                offersColumnGroups.map((group) =>
                  renderPostCard(
                    {
                      ...group,
                      offers: group.offers
                        .filter((o) => isOfferPending(o.status) || o.status === "accepted")
                        .sort(
                          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                        ),
                    },
                    { showPendingOnly: (group.post.hireStatus || "open") === "open" },
                  ),
                )
              )
            ) : null}

            {activeTab === "completed" ? (
              completedColumnGroups.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 bg-[#F8FAFC] px-3 py-8 text-center text-sm text-zinc-500">
                  Finished and reviewed tasks appear here.
                </p>
              ) : (
                completedColumnGroups.map((group) => renderPostCard(group, { showPendingOnly: false }))
              )
            ) : null}

            {activeTab === "rejected" ? (
              rejectedEntries.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 bg-[#F8FAFC] px-3 py-8 text-center text-sm text-zinc-500">
                  Offers you declined are listed here.
                </p>
              ) : (
                rejectedEntries.map((entry) => renderRejectedCard(entry))
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
