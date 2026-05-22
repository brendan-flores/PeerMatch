"use client";

import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchApprovedCommunityPosts } from "@/app/lib/communityPosts";
import {
  clearCommunityPostsStorage,
  isCommunityPostWithinLast24Hours,
  type CommunityPost,
} from "@/app/lib/postsStorage";

function formatTimeAgo(value: string) {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "Just now";
  const diffMs = Date.now() - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hr ago`;
  return `${Math.floor(diffMs / day)} day${Math.floor(diffMs / day) > 1 ? "s" : ""} ago`;
}

export function FreelancerRightAside() {
  const pathname = usePathname();
  const router = useRouter();
  const isMessagesLayout = pathname === "/freelancer-dashboard/messages";
  const isFeedLayout =
    pathname === "/freelancer-dashboard" || pathname === "/freelancer-dashboard/browse";
  const isPinnedColumn = isMessagesLayout || isFeedLayout;
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const feed = await fetchApprovedCommunityPosts();
        if (!cancelled) {
          setPosts(feed);
          clearCommunityPostsStorage();
        }
      } catch {
        if (!cancelled) setPosts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recentPosts = useMemo(
    () => posts.filter((post) => isCommunityPostWithinLast24Hours(post.createdAt)),
    [posts],
  );

  return (
    <aside
      className={`flex flex-col rounded-2xl border border-zinc-200/80 bg-[#E8EFEC] p-6 shadow-sm ${
        isMessagesLayout
          ? "h-full max-h-full min-h-0 overflow-hidden"
          : isFeedLayout
            ? "sticky top-6 h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] min-h-0 overflow-hidden"
            : "gap-8"
      }`}
    >
      <section className={isPinnedColumn ? "mb-6 shrink-0" : ""}>
        <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-zinc-600">
              <Bell className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <p className="text-sm leading-snug text-zinc-700">Someone responded to your post</p>
          </div>
        </div>
      </section>

      <section className={isPinnedColumn ? "flex min-h-0 flex-1 flex-col overflow-hidden" : ""}>
        <h3 className={`text-sm font-semibold text-zinc-900 ${isPinnedColumn ? "shrink-0" : ""}`}>Recent Posts</h3>
        <ul
          className={`mt-3 space-y-3 ${isPinnedColumn ? "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5" : ""}`}
        >
          {recentPosts.length === 0 ? (
            <li className="rounded-xl border border-[#E8DDD6] bg-[#F4EBE4] px-4 py-3 text-xs text-zinc-500 shadow-sm">
              No recent post
            </li>
          ) : (
            recentPosts.map((post) => (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/freelancer-dashboard/client/${encodeURIComponent(post.authorId)}`)
                  }
                  className="w-full rounded-xl border border-[#E8DDD6] bg-[#F4EBE4] px-4 py-3 text-left shadow-sm hover:bg-[#efe4dd]"
                >
                  <p className="text-sm font-semibold text-zinc-900">{post.authorName || "Client User"}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-snug text-zinc-700">{post.title}</p>
                  <p className="mt-3 text-xs text-zinc-500">{formatTimeAgo(post.createdAt)}</p>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </aside>
  );
}
