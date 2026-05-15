"use client";

import { useCallback, useEffect, useState } from "react";
import { getCommunityPosts, type CommunityPost } from "./postsStorage";

const POSTS_STORAGE_KEY = "peermatch_community_posts_v1";

export function useCommunityPosts(): CommunityPost[] {
  const [posts, setPosts] = useState<CommunityPost[]>(() => getCommunityPosts());

  const loadPosts = useCallback(() => {
    setPosts(getCommunityPosts());
  }, []);

  useEffect(() => {
    loadPosts();
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== POSTS_STORAGE_KEY) return;
      loadPosts();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadPosts]);

  return posts;
}
