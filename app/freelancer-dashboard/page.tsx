"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FeedPageHeader } from "@/app/components/dashboard/FeedPageHeader";
import { CommunityPostCard } from "@/app/components/freelancer/CommunityPostCard";
import { FreelancerFeedMain } from "@/app/components/freelancer/FreelancerFeedMain";
import { OfferHelpPanel } from "@/app/components/freelancer/OfferHelpPanel";
import { useCommunityPosts } from "@/app/lib/useCommunityPosts";
import { useFreelancerDashboardUser, useFreelancerSelectedPost } from "./FreelancerDashboardShell";

function FreelancerDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postFromQuery = searchParams.get("post");
  const fromNotification = searchParams.get("fromNotification") === "1";
  const { user } = useFreelancerDashboardUser();
  const { selectedPost, setSelectedPost, clearSelectedPost } = useFreelancerSelectedPost();
  const { posts, loading, error, reload } = useCommunityPosts();
  const [highlightPost, setHighlightPost] = useState(false);

  useEffect(() => {
    const postId = String(postFromQuery || "").trim();
    if (!postId || loading) return;
    const post = posts.find((entry) => entry.id === postId);
    if (!post) return;
    setSelectedPost(post);
    if (fromNotification) {
      setHighlightPost(true);
      const clearHighlight = window.setTimeout(() => setHighlightPost(false), 2400);
      const clearQuery = window.setTimeout(() => {
        router.replace(`/freelancer-dashboard?post=${encodeURIComponent(postId)}`);
      }, 2600);
      return () => {
        window.clearTimeout(clearHighlight);
        window.clearTimeout(clearQuery);
      };
    }
  }, [postFromQuery, fromNotification, loading, posts, setSelectedPost, router]);

  if (selectedPost && user) {
    return (
      <FreelancerFeedMain>
        <section aria-labelledby="latest-posts-heading">
          <OfferHelpPanel
            post={selectedPost}
            freelancerId={user.id}
            freelancerName={user.name}
            onBack={clearSelectedPost}
            highlight={highlightPost}
          />
        </section>
      </FreelancerFeedMain>
    );
  }

  return (
    <FreelancerFeedMain
      scrollable
      header={
        <FeedPageHeader title="Community Feed" />
      }
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
            posts.map((post) => <CommunityPostCard key={post.id} post={post} onSelect={setSelectedPost} />)}
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
