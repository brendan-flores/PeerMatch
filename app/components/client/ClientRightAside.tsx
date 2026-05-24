"use client";

import { DashboardCenterBell } from "@/app/components/dashboard/DashboardCenterBell";
import {
  dashboardRightAsideHeaderClass,
  dashboardRightAsideListClass,
  dashboardRightAsideSectionClass,
  dashboardRightAsideWrapClass,
} from "@/app/components/dashboard/dashboardShellClasses";
import type { NotificationItem } from "@/app/lib/notifications";

export type ClientRecentPostItem = {
  id: string;
  author: string;
  title: string;
  timeAgo: string;
};

type ClientRightAsideProps = {
  recentPosts: ClientRecentPostItem[];
  notifications: NotificationItem[];
  onMarkAllRead: () => void | Promise<void>;
  onMarkOneRead: (id: string) => void | Promise<void>;
  onDeleteNotification?: (id: string) => void | Promise<void>;
  onNotificationClick?: (item: NotificationItem) => void;
  onRecentPostClick: (postId: string) => void;
};

export function ClientRightAside({
  recentPosts,
  notifications,
  onMarkAllRead,
  onMarkOneRead,
  onDeleteNotification,
  onNotificationClick,
  onRecentPostClick,
}: ClientRightAsideProps) {
  return (
    <aside
      className={`${dashboardRightAsideWrapClass} h-full rounded-2xl border border-zinc-200/80 bg-[#E8EFEC] p-6 shadow-sm lg:row-span-1`}
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
      <section className={dashboardRightAsideSectionClass}>
        <div className={dashboardRightAsideListClass}>
          {recentPosts.length === 0 ? (
            <p className="rounded-xl border border-[#E8DDD6] bg-[#F4EBE4] px-4 py-3 text-xs text-zinc-500 shadow-sm">
              No recent post
            </p>
          ) : (
            recentPosts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => onRecentPostClick(post.id)}
                className="w-full rounded-xl border border-[#E8DDD6] bg-[#F4EBE4] px-4 py-3 text-left shadow-sm hover:bg-[#efe4dd]"
              >
                <p className="text-sm font-semibold text-zinc-900">{post.author}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-snug text-zinc-700">{post.title}</p>
                <p className="mt-3 text-xs text-zinc-500">{post.timeAgo}</p>
              </button>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}
