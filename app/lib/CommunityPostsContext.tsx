"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchApprovedCommunityPosts, fetchMyCommunityPosts } from "./communityPosts";
import {
  clearCommunityPostsStorage,
  COMMUNITY_POSTS_CHANGED_EVENT,
  notifyCommunityPostsChanged,
  type CommunityPost,
} from "./postsStorage";

type CommunityPostsContextValue = {
  approvedPosts: CommunityPost[];
  myPosts: CommunityPost[];
  approvedLoading: boolean;
  myPostsLoading: boolean;
  refreshApproved: () => Promise<void>;
  refreshMyPosts: () => Promise<void>;
  refreshAll: () => Promise<void>;
  updatePostLocally: (postId: string, patch: Partial<CommunityPost>) => void;
  removePostLocally: (postId: string) => void;
};

const CommunityPostsContext = createContext<CommunityPostsContextValue | null>(null);

export function CommunityPostsProvider({ children }: { children: ReactNode }) {
  const [approvedPosts, setApprovedPosts] = useState<CommunityPost[]>([]);
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);
  const [approvedLoading, setApprovedLoading] = useState(true);
  const [myPostsLoading, setMyPostsLoading] = useState(true);

  const refreshApproved = useCallback(async () => {
    setApprovedLoading(true);
    try {
      const feed = await fetchApprovedCommunityPosts();
      setApprovedPosts(feed);
      clearCommunityPostsStorage();
    } catch {
      setApprovedPosts([]);
    } finally {
      setApprovedLoading(false);
    }
  }, []);

  const refreshMyPosts = useCallback(async () => {
    setMyPostsLoading(true);
    try {
      const posts = await fetchMyCommunityPosts();
      setMyPosts(posts);
    } catch {
      setMyPosts([]);
    } finally {
      setMyPostsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshApproved(), refreshMyPosts()]);
  }, [refreshApproved, refreshMyPosts]);

  const updatePostLocally = useCallback((postId: string, patch: Partial<CommunityPost>) => {
    const apply = (posts: CommunityPost[]) =>
      posts.map((post) => (post.id === postId ? { ...post, ...patch } : post));
    setApprovedPosts((prev) => apply(prev));
    setMyPosts((prev) => apply(prev));
  }, []);

  const removePostLocally = useCallback((postId: string) => {
    setApprovedPosts((prev) => prev.filter((post) => post.id !== postId));
    setMyPosts((prev) => prev.filter((post) => post.id !== postId));
  }, []);

  useEffect(() => {
    void refreshAll();
    const onRefresh = () => void refreshAll();
    window.addEventListener(COMMUNITY_POSTS_CHANGED_EVENT, onRefresh);
    return () => window.removeEventListener(COMMUNITY_POSTS_CHANGED_EVENT, onRefresh);
  }, [refreshAll]);

  const value = useMemo(
    () => ({
      approvedPosts,
      myPosts,
      approvedLoading,
      myPostsLoading,
      refreshApproved,
      refreshMyPosts,
      refreshAll,
      updatePostLocally,
      removePostLocally,
    }),
    [
      approvedPosts,
      myPosts,
      approvedLoading,
      myPostsLoading,
      refreshApproved,
      refreshMyPosts,
      refreshAll,
      updatePostLocally,
      removePostLocally,
    ],
  );

  return <CommunityPostsContext.Provider value={value}>{children}</CommunityPostsContext.Provider>;
}

export function useCommunityPostsContext(): CommunityPostsContextValue {
  const ctx = useContext(CommunityPostsContext);
  if (!ctx) {
    throw new Error("useCommunityPostsContext must be used within CommunityPostsProvider");
  }
  return ctx;
}

export function notifyAndRefreshCommunityPosts(refreshAll: () => Promise<void>): void {
  notifyCommunityPostsChanged();
  void refreshAll();
}
