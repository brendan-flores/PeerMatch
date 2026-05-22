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
  onNotificationClick?: (item: NotificationItem) => void;
  contentClassName?: string;
};

export function DashboardCenterColumn({
  children,
  items,
  onMarkAllRead,
  onMarkOneRead,
  onNotificationClick,
  contentClassName = "",
}: DashboardCenterColumnProps) {
  return (
    <div className={dashboardCenterColumnWrapClass}>
      <DashboardCenterBell
        items={items}
        onMarkAllRead={onMarkAllRead}
        onMarkOneRead={onMarkOneRead}
        onNotificationClick={onNotificationClick}
      />
      <div className={`${dashboardCenterColumnContentClass} ${contentClassName}`.trim()}>{children}</div>
    </div>
  );
}
