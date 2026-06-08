"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { CommunityPost } from "@/app/lib/posts";

export function useOpenPostFromQuery(
  posts: CommunityPost[],
  loading: boolean,
  setSelectedPost: (post: CommunityPost) => void,
  basePath: "/freelancer-dashboard" | "/freelancer-dashboard/browse",
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openPostId = searchParams.get("openPost");
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const postId = String(openPostId || "").trim();
    if (!postId) {
      handledRef.current = null;
      return;
    }
    if (loading) return;
    if (handledRef.current === postId) return;

    const post = posts.find((entry) => entry.id === postId);
    if (!post) return;

    handledRef.current = postId;
    setSelectedPost(post);
    router.replace(basePath);
  }, [openPostId, loading, posts, setSelectedPost, router, basePath]);
}
