"use client";

import { useCommunityPostsContext } from "@/app/lib/posts";

type UseCommunityPostsResult = {
  posts: ReturnType<typeof useCommunityPostsContext>["approvedPosts"];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useCommunityPosts(): UseCommunityPostsResult {
  const { approvedPosts, approvedLoading, approvedError, refreshApproved } = useCommunityPostsContext();
  return {
    posts: approvedPosts,
    loading: approvedLoading,
    error: approvedError,
    reload: refreshApproved,
  };
}
