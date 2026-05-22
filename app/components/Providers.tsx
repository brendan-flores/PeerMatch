"use client";

import type { ReactNode } from "react";
import { CommunityPostsProvider } from "@/app/lib/CommunityPostsContext";

export function Providers({ children }: { children: ReactNode }) {
  return <CommunityPostsProvider>{children}</CommunityPostsProvider>;
}
