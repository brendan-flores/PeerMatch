"use client";

import { dashboardRightAsideListClass } from "@/app/components/dashboard/dashboardShellClasses";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchApprovedCommunityPosts } from "@/app/lib/communityPosts";
import {
  clearCommunityPostsStorage,
  isCommunityPostWithinLast24Hours,
  type CommunityPost,
} from "@/app/lib/postsStorage";
import { resolvePostAuthorAvatar } from "@/app/lib/profilePhotoDisplay";

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
  const isFixedLayout = pathname.startsWith("/freelancer-dashboard");
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
        isFixedLayout ? "h-full min-h-0 overflow-hidden" : "gap-8"
      }`}
    >
      <section className={isFixedLayout ? "flex min-h-0 flex-1 flex-col overflow-hidden" : ""}>
        <h3 className={`text-sm font-semibold text-zinc-900 ${isFixedLayout ? "shrink-0" : ""}`}>Recent Posts</h3>
        <ul className={isFixedLayout ? dashboardRightAsideListClass : "mt-3 space-y-3"}>
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
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvePostAuthorAvatar(post)}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full border border-zinc-200 object-cover"
                    />
                    <p className="min-w-0 truncate text-sm font-semibold text-zinc-900">
                      {post.authorName || "Client User"}
                    </p>
                  </div>
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
