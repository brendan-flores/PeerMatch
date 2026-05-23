"use client";

import { NotificationsDropdown } from "@/app/components/NotificationsDropdown";
import {
  dashboardCenterBellAnchorClass,
  dashboardCenterBellInnerClass,
  dashboardRightAsideBellClass,
} from "@/app/components/dashboard/dashboardShellClasses";
import type { NotificationItem } from "@/app/lib/notifications";

type DashboardCenterBellProps = {
  items: NotificationItem[];
  onMarkAllRead: () => void | Promise<void>;
  onMarkOneRead: (id: string) => void | Promise<void>;
  onNotificationClick?: (item: NotificationItem) => void;
  placement?: "center" | "rightAside";
};

/** Notification bell — center column overlay or right aside top corner. */
export function DashboardCenterBell({
  items,
  onMarkAllRead,
  onMarkOneRead,
  onNotificationClick,
  placement = "center",
}: DashboardCenterBellProps) {
  if (placement === "rightAside") {
    return (
      <div className={dashboardRightAsideBellClass}>
        <NotificationsDropdown
          items={items}
          onMarkAllRead={onMarkAllRead}
          onMarkOneRead={onMarkOneRead}
          onNotificationClick={onNotificationClick}
          menuAlign="right"
          menuElevated
          className="relative"
        />
      </div>
    );
  }

  return (
    <div className={dashboardCenterBellAnchorClass}>
      <div
        className={`${dashboardCenterBellInnerClass} [&_button]:shadow-md [&_button]:ring-2 [&_button]:ring-white/90`}
      >
        <NotificationsDropdown
          items={items}
          onMarkAllRead={onMarkAllRead}
          onMarkOneRead={onMarkOneRead}
          onNotificationClick={onNotificationClick}
          className="relative"
        />
      </div>
    </div>
  );
}
