"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { FeedPageHeader } from "@/app/components/dashboard/FeedPageHeader";
import { CommunityPostCard } from "@/app/components/freelancer/CommunityPostCard";
import { FreelancerFeedMain } from "@/app/components/freelancer/FreelancerFeedMain";
import { OfferHelpPanel } from "@/app/components/freelancer/OfferHelpPanel";
import { consumeHighlightOnce } from "@/app/lib/notificationHighlight";
import { useCommunityPosts } from "@/app/lib/useCommunityPosts";
import { useFreelancerDashboardUser, useFreelancerSelectedPost } from "./FreelancerDashboardShell";
import { useOpenPostFromQuery } from "./useOpenPostFromQuery";

function FreelancerDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightPostId = searchParams.get("highlightPost");
  const { user } = useFreelancerDashboardUser();
  const { selectedPost, setSelectedPost, clearSelectedPost } = useFreelancerSelectedPost();
  const { posts, loading, error, reload } = useCommunityPosts();
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const postRefs = useRef<Record<string, HTMLElement | null>>({});

  useOpenPostFromQuery(posts, loading, setSelectedPost, "/freelancer-dashboard");

  useEffect(() => {
    const postId = String(highlightPostId || "").trim();
    if (!postId) return;
    if (loading) return;
    if (!consumeHighlightOnce(postId)) return;

    let animTimeout: ReturnType<typeof window.setTimeout> | undefined;
    let clearQueryTimeout: ReturnType<typeof window.setTimeout> | undefined;
    let cancelled = false;
    let attempts = 0;

    const run = () => {
      if (cancelled) return;
      const el = postRefs.current[postId];
      if (!el) {
        if (attempts++ < 24) requestAnimationFrame(run);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedPostId(postId);
      animTimeout = window.setTimeout(() => setHighlightedPostId(null), 1200);
      clearQueryTimeout = window.setTimeout(() => {
        router.replace("/freelancer-dashboard");
      }, 1300);
    };

    run();

    return () => {
      cancelled = true;
      if (animTimeout) window.clearTimeout(animTimeout);
      if (clearQueryTimeout) window.clearTimeout(clearQueryTimeout);
    };
  }, [highlightPostId, loading, router]);

  if (selectedPost && user) {
    return (
      <FreelancerFeedMain>
        <section aria-labelledby="latest-posts-heading">
          <OfferHelpPanel
            post={selectedPost}
            freelancerId={user.id}
            freelancerName={user.name}
            onBack={clearSelectedPost}
          />
        </section>
      </FreelancerFeedMain>
    );
  }

  return (
    <FreelancerFeedMain
      scrollable
      header={<FeedPageHeader title="Community Feed" />}
      scroll={
        <section aria-labelledby="latest-posts-heading" className="space-y-4">
          {loading ? <p className="text-sm text-zinc-500">Loading posts…</p> : null}
          {!loading && error ? (
            <p className="text-sm text-red-600">
              {error}{" "}
              <button type="button" className="font-semibold underline" onClick={() => void reload()}>
                Retry
              </button>
            </p>
          ) : null}
          {!loading &&
            !error &&
            posts.map((post) => (
              <div
                key={post.id}
                ref={(node) => {
                  postRefs.current[post.id] = node;
                }}
              >
                <CommunityPostCard
                  post={post}
                  onSelect={setSelectedPost}
                  highlight={highlightedPostId === post.id}
                />
              </div>
            ))}
          {!loading && !error && posts.length === 0 ? (
            <p className="text-sm text-zinc-500">No posts yet.</p>
          ) : null}
        </section>
      }
    />
  );
}

export default function FreelancerDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      }
    >
      <FreelancerDashboardPageContent />
    </Suspense>
  );
}
