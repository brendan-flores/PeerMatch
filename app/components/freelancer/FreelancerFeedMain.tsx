"use client";

import type { ReactNode } from "react";
import {
  dashboardCenterPanelFeedClass,
  dashboardFeedHeaderGapClass,
  dashboardFeedScrollClass,
  dashboardPanelScrollClass,
  mobileDashboardWhitePanelClass,
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
      <main className={`${dashboardCenterPanelFeedClass} relative z-0 h-full overflow-hidden max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none`}>
        <div className={mobileDashboardWhitePanelClass}>
          <div className="shrink-0 max-lg:px-4 max-lg:pt-4">{header}</div>
          <div className={`${dashboardFeedScrollClass} ${dashboardFeedHeaderGapClass} max-lg:px-4 max-lg:pb-4`}>
            {scroll}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`${dashboardCenterPanelFeedClass} relative z-0 h-full overflow-hidden max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none`}>
      <div className={dashboardPanelScrollClass}>{children}</div>
    </main>
  );
}
