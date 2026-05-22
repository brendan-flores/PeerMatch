"use client";

import type { ReactNode } from "react";
import { NotificationsDropdown } from "@/app/components/NotificationsDropdown";
import { useNotifications } from "@/app/hooks/useNotifications";
import type { NotificationItem } from "@/app/lib/notifications";

type FeedPageHeaderProps = {
  userId: string | null;
  title?: string;
  children?: ReactNode;
  items?: NotificationItem[];
  onMarkAllRead?: () => void | Promise<void>;
  onMarkOneRead?: (id: string) => void | Promise<void>;
};

/** Bell + page title on one row — aligns with side panel headings (no extra top gap). */
export function FeedPageHeader({
  userId,
  title,
  children,
  items: itemsProp,
  onMarkAllRead: onMarkAllReadProp,
  onMarkOneRead: onMarkOneReadProp,
}: FeedPageHeaderProps) {
  const fromHook = useNotifications(itemsProp ? null : userId);

  return (
    <div className="flex shrink-0 items-center gap-3">
      <NotificationsDropdown
        items={itemsProp ?? fromHook.items}
        onMarkAllRead={onMarkAllReadProp ?? fromHook.markAllRead}
        onMarkOneRead={onMarkOneReadProp ?? fromHook.markOneRead}
      />
      <div className="min-w-0 flex-1">
        {children ??
          (title ? (
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{title}</h2>
          ) : null)}
      </div>
    </div>
  );
}
