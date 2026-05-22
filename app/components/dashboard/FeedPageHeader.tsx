"use client";

import type { ReactNode } from "react";
import { dashboardCenterTitleOffsetClass } from "@/app/components/dashboard/dashboardShellClasses";

type FeedPageHeaderProps = {
  title?: string;
  children?: ReactNode;
};

/** Page title in center column — bell is placed on the panel corner by the parent wrapper. */
export function FeedPageHeader({ title, children }: FeedPageHeaderProps) {
  return (
    <div className={dashboardCenterTitleOffsetClass}>
      {children ??
        (title ? (
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{title}</h2>
        ) : null)}
    </div>
  );
}
