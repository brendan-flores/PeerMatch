"use client";

import { FeedPageHeader } from "@/app/components/dashboard/FeedPageHeader";
import { CommunityPostCard } from "@/app/components/freelancer/CommunityPostCard";
import { FreelancerFeedMain } from "@/app/components/freelancer/FreelancerFeedMain";
import { OfferHelpPanel } from "@/app/components/freelancer/OfferHelpPanel";
import { useCommunityPosts } from "@/app/lib/useCommunityPosts";
import { useFreelancerDashboardUser, useFreelancerSelectedPost } from "../FreelancerDashboardShell";

export default function FreelancerBrowsePage() {
  const { user } = useFreelancerDashboardUser();
  const { selectedPost, setSelectedPost, clearSelectedPost } = useFreelancerSelectedPost();
  const { posts, loading, error, reload } = useCommunityPosts();

  if (selectedPost && user) {
    return (
      <FreelancerFeedMain>
        <OfferHelpPanel
          post={selectedPost}
          freelancerId={user.id}
          freelancerName={user.name}
          onBack={clearSelectedPost}
        />
      </FreelancerFeedMain>
    );
  }

  return (
    <FreelancerFeedMain
      scrollable
      header={
        <FeedPageHeader userId={user?.id ?? null}>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Browse Post</h1>
          <p className="mt-1 text-sm text-zinc-500">Explore posts from the community.</p>
        </FeedPageHeader>
      }
      scroll={
        <div className="space-y-4">
          {loading ? <p className="text-sm text-zinc-500">Loading posts…</p> : null}
          {!loading && error ? (
            <p className="text-sm text-red-600">
              {error}{" "}
              <button type="button" className="font-semibold underline" onClick={() => void reload()}>
                Retry
              </button>
            </p>
          ) : null}
          {!loading && !error && posts.map((post) => <CommunityPostCard key={post.id} post={post} onSelect={setSelectedPost} />)}
          {!loading && !error && posts.length === 0 ? <p className="text-sm text-zinc-500">No posts yet.</p> : null}
        </div>
      }
    />
  );
}
