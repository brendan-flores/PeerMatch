"use client";

import type { ReactNode } from "react";
import {
  dashboardCenterPanelFeedClass,
  dashboardFeedHeaderGapClass,
  dashboardFeedScrollClass,
  dashboardPanelScrollClass,
} from "@/app/components/dashboard/dashboardShellClasses";

type FreelancerFeedMainProps = {
  children?: ReactNode;
  /** When true, only `scroll` scrolls; header stays pinned in the column */
  scrollable?: boolean;
  header?: ReactNode;
  scroll?: ReactNode;
};

/** Center column shell for dashboard / browse — fixed height, scrollable feed body */
export function FreelancerFeedMain({ children, scrollable, header, scroll }: FreelancerFeedMainProps) {
  if (scrollable && header != null && scroll != null) {
    return (
      <main className={`${dashboardCenterPanelFeedClass} relative z-0 h-full overflow-hidden`}>
        <div className="shrink-0">{header}</div>
        <div className={`${dashboardFeedScrollClass} ${dashboardFeedHeaderGapClass}`}>{scroll}</div>
      </main>
    );
  }

  return (
    <main className={`${dashboardCenterPanelFeedClass} relative z-0 h-full overflow-hidden`}>
      <div className={dashboardPanelScrollClass}>{children}</div>
    </main>
  );
}
