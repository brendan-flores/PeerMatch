"use client";

import { NotificationsDropdown } from "@/app/components/NotificationsDropdown";
import {
  dashboardCenterBellAnchorClass,
  dashboardCenterBellInnerClass,
} from "@/app/components/dashboard/dashboardShellClasses";
import type { NotificationItem } from "@/app/lib/notifications";

type DashboardCenterBellProps = {
  items: NotificationItem[];
  onMarkAllRead: () => void | Promise<void>;
  onMarkOneRead: (id: string) => void | Promise<void>;
};

/** Floated above center white panel — not clipped by panel overflow or transform. */
export function DashboardCenterBell({ items, onMarkAllRead, onMarkOneRead }: DashboardCenterBellProps) {
  return (
    <div className={dashboardCenterBellAnchorClass}>
      <div
        className={`${dashboardCenterBellInnerClass} [&_button]:shadow-md [&_button]:ring-2 [&_button]:ring-white/90`}
      >
        <NotificationsDropdown
          items={items}
          onMarkAllRead={onMarkAllRead}
          onMarkOneRead={onMarkOneRead}
          className="relative"
        />
      </div>
    </div>
  );
}
