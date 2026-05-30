"use client";

import type { ReactNode } from "react";
import { CommunityPostsProvider } from "@/app/lib/CommunityPostsContext";
import { CurrentUserProfileProvider } from "@/app/lib/CurrentUserProfileContext";

export function Providers({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <CurrentUserProfileProvider>
      <CommunityPostsProvider>
        <div className={className || undefined}>{children}</div>
      </CommunityPostsProvider>
    </CurrentUserProfileProvider>
  );
}
