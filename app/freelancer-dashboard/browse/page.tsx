"use client";

import { useCallback, useEffect, useState } from "react";
import { FeedPageHeader } from "@/app/components/dashboard/FeedPageHeader";
import { BrowsePostFilters } from "@/app/components/freelancer/BrowsePostFilters";
import { CommunityPostCard } from "@/app/components/freelancer/CommunityPostCard";
import { FreelancerFeedMain } from "@/app/components/freelancer/FreelancerFeedMain";
import { OfferHelpPanel } from "@/app/components/freelancer/OfferHelpPanel";
import { ApiError } from "@/app/lib/api";
import { fetchApprovedCommunityPosts } from "@/app/lib/communityPosts";
import {
  FILTER_ALL,
  hasActiveFeedFilters,
  type CommunityPostFeedFilters,
} from "@/app/lib/postFilters";
import type { CommunityPost } from "@/app/lib/postsStorage";
import { useFreelancerDashboardUser, useFreelancerSelectedPost } from "../FreelancerDashboardShell";

const defaultFilters: CommunityPostFeedFilters = {
  urgency: FILTER_ALL,
  rateMin: "",
  rateMax: "",
};

export default function FreelancerBrowsePage() {
  const { user } = useFreelancerDashboardUser();
  const { selectedPost, setSelectedPost, clearSelectedPost } = useFreelancerSelectedPost();
  const [filters, setFilters] = useState<CommunityPostFeedFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<CommunityPostFeedFilters>(defaultFilters);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedFilters(filters);
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [filters]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const feed = await fetchApprovedCommunityPosts(appliedFilters);
      setPosts(feed);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not load posts. Is the API server running?";
      setError(message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

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

  const hasActiveFilters = hasActiveFeedFilters(appliedFilters);

  return (
    <FreelancerFeedMain
      scrollable
      header={
        <FeedPageHeader>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Browse Post</h1>
          <p className="mt-1 text-sm text-zinc-500">Explore posts from the community.</p>
        </FeedPageHeader>
      }
      scroll={
        <div className="space-y-4">
          <BrowsePostFilters value={filters} onChange={setFilters} />

          {loading ? <p className="text-sm text-zinc-500">Loading posts…</p> : null}
          {!loading && error ? (
            <p className="text-sm text-red-600">
              {error}{" "}
              <button type="button" className="font-semibold underline" onClick={() => void loadPosts()}>
                Retry
              </button>
            </p>
          ) : null}
          {!loading &&
            !error &&
            posts.map((post) => <CommunityPostCard key={post.id} post={post} onSelect={setSelectedPost} />)}
          {!loading && !error && posts.length === 0 ? (
            <p className="text-sm text-zinc-500">
              {hasActiveFilters ? "No posts match your filters." : "No posts yet."}
            </p>
          ) : null}
        </div>
      }
    />
  );
}
