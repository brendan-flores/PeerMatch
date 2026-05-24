"use client";

import type { ReactNode } from "react";
import { DashboardCenterBell } from "@/app/components/dashboard/DashboardCenterBell";
import {
  dashboardCenterColumnContentClass,
  dashboardCenterColumnWrapClass,
} from "@/app/components/dashboard/dashboardShellClasses";
import type { NotificationItem } from "@/app/lib/notifications";

type DashboardCenterColumnProps = {
  children: ReactNode;
  items: NotificationItem[];
  onMarkAllRead: () => void | Promise<void>;
  onMarkOneRead: (id: string) => void | Promise<void>;
  onDeleteNotification?: (id: string) => void | Promise<void>;
  onNotificationClick?: (item: NotificationItem) => void;
  contentClassName?: string;
  /** When false, bell is omitted (e.g. freelancer bell is on the right aside). */
  showBell?: boolean;
};

export function DashboardCenterColumn({
  children,
  items,
  onMarkAllRead,
  onMarkOneRead,
  onDeleteNotification,
  onNotificationClick,
  contentClassName = "",
  showBell = true,
}: DashboardCenterColumnProps) {
  return (
    <div className={dashboardCenterColumnWrapClass}>
      {showBell ? (
        <DashboardCenterBell
          items={items}
          onMarkAllRead={onMarkAllRead}
          onMarkOneRead={onMarkOneRead}
          onDeleteNotification={onDeleteNotification}
          onNotificationClick={onNotificationClick}
        />
      ) : null}
      <div className={`${dashboardCenterColumnContentClass} ${contentClassName}`.trim()}>{children}</div>
    </div>
  );
}
