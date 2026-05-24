"use client";

import { DashboardCenterBell } from "@/app/components/dashboard/DashboardCenterBell";
import {
  dashboardRightAsideHeaderClass,
  dashboardRightAsideListClass,
  dashboardRightAsideSectionClass,
  dashboardRightAsideWrapClass,
} from "@/app/components/dashboard/dashboardShellClasses";
import type { NotificationItem } from "@/app/lib/notifications";
import { useFreelancerSelectedPost } from "@/app/freelancer-dashboard/FreelancerDashboardShell";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useCommunityPostsContext } from "@/app/lib/CommunityPostsContext";
import {
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

type FreelancerRightAsideProps = {
  notifications: NotificationItem[];
  onMarkAllRead: () => void | Promise<void>;
  onMarkOneRead: (id: string) => void | Promise<void>;
  onDeleteNotification?: (id: string) => void | Promise<void>;
  onNotificationClick?: (item: NotificationItem) => void;
};

export function FreelancerRightAside({
  notifications,
  onMarkAllRead,
  onMarkOneRead,
  onDeleteNotification,
  onNotificationClick,
}: FreelancerRightAsideProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setSelectedPost } = useFreelancerSelectedPost();
  const isFixedLayout = pathname.startsWith("/freelancer-dashboard");
  const { approvedPosts } = useCommunityPostsContext();

  const handleRecentPostClick = useCallback(
    (post: CommunityPost) => {
      if (pathname === "/freelancer-dashboard") {
        setSelectedPost(post);
        return;
      }
      if (pathname === "/freelancer-dashboard/browse") {
        setSelectedPost(post);
        return;
      }
      router.push(`/freelancer-dashboard?openPost=${encodeURIComponent(post.id)}`);
    },
    [pathname, router, setSelectedPost],
  );

  const recentPosts = useMemo(
    () => approvedPosts.filter((post) => isCommunityPostWithinLast24Hours(post.createdAt)),
    [approvedPosts],
  );

  return (
    <aside
      className={`${dashboardRightAsideWrapClass} rounded-2xl border border-zinc-200/80 bg-[#E8EFEC] p-6 shadow-sm ${
        isFixedLayout ? "h-full" : "gap-8"
      }`}
    >
      <div className={dashboardRightAsideHeaderClass}>
        <h3 className="min-w-0 text-sm font-semibold text-zinc-900">Recent Posts</h3>
        <DashboardCenterBell
          placement="rightAside"
          items={notifications}
          onMarkAllRead={onMarkAllRead}
          onMarkOneRead={onMarkOneRead}
          onDeleteNotification={onDeleteNotification}
          onNotificationClick={onNotificationClick}
        />
      </div>
      <section className={isFixedLayout ? dashboardRightAsideSectionClass : ""}>
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
                  onClick={() => handleRecentPostClick(post)}
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
