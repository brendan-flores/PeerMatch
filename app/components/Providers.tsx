"use client";

import type { ReactNode } from "react";
import { CommunityPostsProvider } from "@/app/lib/CommunityPostsContext";
import { CurrentUserProfileProvider } from "@/app/lib/CurrentUserProfileContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CurrentUserProfileProvider>
      <CommunityPostsProvider>{children}</CommunityPostsProvider>
    </CurrentUserProfileProvider>
  );
}
