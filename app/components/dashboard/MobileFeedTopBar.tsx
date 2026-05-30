"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import PeerMatchBrandLogo from "@/app/components/PeerMatchBrandLogo";
import { NotificationsDropdown } from "@/app/components/NotificationsDropdown";
import {
  MobileDashboardMenu,
  type MobileNavItem,
} from "@/app/components/dashboard/MobileDashboardMenu";
import type { NotificationItem } from "@/app/lib/notifications";

type MobileFeedTopBarProps = {
  items: MobileNavItem[];
  isActive: (href: string) => boolean;
  onLogout: () => void | Promise<void>;
  notifications: NotificationItem[];
  onMarkAllRead: () => void | Promise<void>;
  onMarkOneRead: (id: string) => void | Promise<void>;
  onDeleteNotification?: (id: string) => void | Promise<void>;
  onNotificationClick?: (item: NotificationItem) => void;
};

export function MobileFeedTopBar({
  items,
  isActive,
  onLogout,
  notifications,
  onMarkAllRead,
  onMarkOneRead,
  onDeleteNotification,
  onNotificationClick,
}: MobileFeedTopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="relative z-[90] mb-3 shrink-0 rounded-2xl border border-zinc-100 bg-white px-3 py-2.5 shadow-sm lg:hidden">
        <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-800 transition hover:bg-zinc-50"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>

          <div className="flex min-w-0 justify-center">
            <PeerMatchBrandLogo variant="compact" surface="header" className="h-8 w-auto max-w-[min(100%,11rem)]" />
          </div>

          <div className="flex justify-end">
            <NotificationsDropdown
              items={notifications}
              onMarkAllRead={onMarkAllRead}
              onMarkOneRead={onMarkOneRead}
              onDeleteNotification={onDeleteNotification}
              onNotificationClick={onNotificationClick}
              menuAlign="right"
              menuElevated
              compact
              centerOnMobile
              className="relative"
            />
          </div>
        </div>
      </header>

      <MobileDashboardMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={items}
        isActive={isActive}
        onLogout={() => void onLogout()}
      />
    </>
  );
}
