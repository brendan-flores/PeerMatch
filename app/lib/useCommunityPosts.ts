"use client";

import { useCommunityPostsContext } from "./CommunityPostsContext";

type UseCommunityPostsResult = {
  posts: ReturnType<typeof useCommunityPostsContext>["approvedPosts"];
  loading: boolean;
  reload: () => Promise<void>;
};

export function useCommunityPosts(): UseCommunityPostsResult {
  const { approvedPosts, approvedLoading, refreshApproved } = useCommunityPostsContext();
  return {
    posts: approvedPosts,
    loading: approvedLoading,
    reload: refreshApproved,
  };
}
