"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  dashboardCenterPanelClass,
  dashboardCenterPanelFixedClass,
} from "@/app/components/dashboard/dashboardShellClasses";
import { ChatLayout } from "@/app/components/chat/ChatLayout";
import { useFreelancerDashboardUser } from "../FreelancerDashboardShell";

function FreelancerMessagesPageContent() {
  const { user } = useFreelancerDashboardUser();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("with") || "";
  const [peerUserId, setPeerUserId] = useState(fromUrl);

  useEffect(() => {
    setPeerUserId(fromUrl);
  }, [fromUrl]);

  if (!user) {
    return null;
  }

  return (
    <main className={`${dashboardCenterPanelClass} ${dashboardCenterPanelFixedClass} max-h-full p-4`}>
      <div className="h-full max-h-full min-h-0 flex-1 overflow-hidden">
        <ChatLayout
          currentUserId={user.id}
          initialOtherQuery={peerUserId.trim()}
          allowUnsend
          className="!h-full !min-h-0 rounded-2xl border border-zinc-200 !bg-white"
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
