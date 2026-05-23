"use client";

import type { ReactNode } from "react";
import { dashboardFeedPageHeadingClass } from "@/app/components/dashboard/dashboardShellClasses";

type FeedPageHeaderProps = {
  title?: string;
  children?: ReactNode;
};

/** Page title in center column (left-aligned; notifications bell lives on the right aside). */
export function FeedPageHeader({ title, children }: FeedPageHeaderProps) {
  return (
    <div className={dashboardFeedPageHeadingClass}>
      {children ??
        (title ? (
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{title}</h2>
        ) : null)}
    </div>
  );
}
