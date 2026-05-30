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
  normalizeUserId,
  USER_PROFILE_PHOTO_UPDATED_EVENT,
  type ProfilePhotoUpdatedDetail,
} from "./profilePhoto";
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
  approvedError: string | null;
  refreshApproved: () => Promise<void>;
  refreshMyPosts: () => Promise<CommunityPost[]>;
  refreshAll: () => Promise<void>;
  updatePostLocally: (postId: string, patch: Partial<CommunityPost>) => void;
  updateAuthorAvatarsLocally: (authorId: string, photoDataUrl: string) => void;
  removePostLocally: (postId: string) => void;
};

const CommunityPostsContext = createContext<CommunityPostsContextValue | null>(null);

export function CommunityPostsProvider({ children }: { children: ReactNode }) {
  const [approvedPosts, setApprovedPosts] = useState<CommunityPost[]>([]);
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);
  const [approvedLoading, setApprovedLoading] = useState(true);
  const [myPostsLoading, setMyPostsLoading] = useState(true);
  const [approvedError, setApprovedError] = useState<string | null>(null);

  const refreshApproved = useCallback(async () => {
    setApprovedLoading(true);
    try {
      const feed = await fetchApprovedCommunityPosts();
      setApprovedPosts(feed);
      setApprovedError(null);
      clearCommunityPostsStorage();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load community posts. Is the API server running?";
      setApprovedError(message);
      setApprovedPosts([]);
    } finally {
      setApprovedLoading(false);
    }
  }, []);

  const refreshMyPosts = useCallback(async (): Promise<CommunityPost[]> => {
    setMyPostsLoading(true);
    try {
      const posts = await fetchMyCommunityPosts();
      setMyPosts(posts);
      return posts;
    } catch {
      setMyPosts([]);
      return [];
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

  const updateAuthorAvatarsLocally = useCallback((authorId: string, photoDataUrl: string) => {
    const normalizedAuthorId = normalizeUserId(authorId);
    if (!normalizedAuthorId) return;
    const photo = String(photoDataUrl || "").trim();

    setMyPosts((myPrev) => {
      const myPostIds = new Set(myPrev.map((post) => post.id));
      const patchPosts = (posts: CommunityPost[]) =>
        posts.map((post) => {
          const matchAuthor = normalizeUserId(post.authorId) === normalizedAuthorId;
          const matchMine = myPostIds.has(post.id);
          if (!matchAuthor && !matchMine) return post;
          return {
            ...post,
            authorAvatarDataUrl: photo || undefined,
            authorId: post.authorId || normalizedAuthorId,
          };
        });

      const nextMy = patchPosts(myPrev);
      setApprovedPosts((prevApproved) => patchPosts(prevApproved));
      return nextMy;
    });
  }, []);

  useEffect(() => {
    void refreshApproved();
    // peermatch_token is HttpOnly — not visible on document.cookie; always try /api/tasks/mine.
    void refreshMyPosts();
    const onRefresh = () => void refreshAll();
    const onPhotoUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ProfilePhotoUpdatedDetail>).detail;
      const userId = normalizeUserId(detail?.userId);
      if (!userId) return;
      updateAuthorAvatarsLocally(userId, detail.photoDataUrl || "");
    };
    window.addEventListener(COMMUNITY_POSTS_CHANGED_EVENT, onRefresh);
    window.addEventListener(USER_PROFILE_PHOTO_UPDATED_EVENT, onPhotoUpdated);
    return () => {
      window.removeEventListener(COMMUNITY_POSTS_CHANGED_EVENT, onRefresh);
      window.removeEventListener(USER_PROFILE_PHOTO_UPDATED_EVENT, onPhotoUpdated);
    };
  }, [refreshAll, updateAuthorAvatarsLocally]);

  const value = useMemo(
    () => ({
      approvedPosts,
      myPosts,
      approvedLoading,
      myPostsLoading,
      approvedError,
      refreshApproved,
      refreshMyPosts,
      refreshAll,
      updatePostLocally,
      updateAuthorAvatarsLocally,
      removePostLocally,
    }),
    [
      approvedPosts,
      myPosts,
      approvedLoading,
      myPostsLoading,
      approvedError,
      refreshApproved,
      refreshMyPosts,
      refreshAll,
      updatePostLocally,
      updateAuthorAvatarsLocally,
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

/** Refresh community posts once (avoids duplicate refresh from event + direct call). */
export function notifyAndRefreshCommunityPosts(refreshAll: () => Promise<void>): void {
  void refreshAll();
}
