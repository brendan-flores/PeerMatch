"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  dashboardCenterPanelFixedClass,
} from "@/app/components/dashboard/dashboardShellClasses";
import { buildFreelancerMobileNavItems } from "@/app/components/dashboard/dashboardMobileNavItems";
import { ChatLayout } from "@/app/components/chat/ChatLayout";
import { useNotifications } from "@/app/hooks/useNotifications";
import { useUnreadMessageCount } from "@/app/hooks/useUnreadMessageCount";
import { apiPostJson } from "@/app/lib/api";
import type { NotificationItem } from "@/app/lib/notifications";
import { resetHighlightConsumption } from "@/app/lib/notifications";
import { disconnectSocket } from "@/app/lib/chat";
import { useFreelancerDashboardUser } from "@/app/components/freelancer/FreelancerDashboardShell";

function FreelancerMessagesPageContent() {
  const { user } = useFreelancerDashboardUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("with") || "";
  const [peerUserId, setPeerUserId] = useState(fromUrl);
  const { count: unreadMessageCount } = useUnreadMessageCount(user?.id ?? null);
  const {
    items: notifications,
    markAllRead,
    markOneRead,
    deleteOne,
  } = useNotifications(user?.id ?? null);

  useEffect(() => {
    setPeerUserId(fromUrl);
  }, [fromUrl]);

  const isFreelancerNavActive = useCallback(
    (href: string) => {
      if (href === "/freelancer-dashboard") {
        return pathname === "/freelancer-dashboard";
      }
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  );

  const handleLogout = useCallback(async () => {
    try {
      await apiPostJson("/api/auth/logout", {});
    } finally {
      disconnectSocket();
      router.push("/login");
    }
  }, [router]);

  const handleNotificationClick = useCallback(
    (item: NotificationItem) => {
      if (item.type === "new_task" && item.relatedTaskId) {
        resetHighlightConsumption(item.relatedTaskId);
        router.push(
          `/freelancer-dashboard?highlightPost=${encodeURIComponent(item.relatedTaskId)}`,
        );
      }
    },
    [router],
  );

  const mobileNavItems = useMemo(
    () => buildFreelancerMobileNavItems(unreadMessageCount),
    [unreadMessageCount],
  );

  if (!user) {
    return null;
  }

  return (
    <main
      className={`${dashboardCenterPanelFixedClass} h-full max-h-full max-lg:bg-transparent lg:rounded-2xl lg:border lg:border-zinc-100/80 lg:bg-white lg:p-4`}
    >
      <div className="h-full max-h-full min-h-0 flex-1 overflow-hidden">
        <ChatLayout
          currentUserId={user.id}
          initialOtherQuery={peerUserId.trim()}
          allowUnsend
          currentUserName={user.name}
          currentUserPhoto={user.photoDataUrl}
          mobileNav={{
            items: mobileNavItems,
            isActive: isFreelancerNavActive,
            onLogout: handleLogout,
          }}
          notifications={notifications}
          onMarkAllRead={markAllRead}
          onMarkOneRead={markOneRead}
          onDeleteNotification={deleteOne}
          onNotificationClick={handleNotificationClick}
          className="!h-full !min-h-0 !rounded-none !border-0 !bg-[#E5F6F4] lg:!rounded-2xl lg:!border lg:!border-zinc-200 lg:!bg-white"
        />
      </div>
    </main>
  );
}

export default function FreelancerMessagesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[400px] items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8">
          <p className="text-sm text-zinc-500">Loading messages…</p>
        </main>
      }
    >
      <FreelancerMessagesPageContent />
    </Suspense>
  );
}
