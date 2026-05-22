"use client";

import type { ReactNode } from "react";

type FreelancerFeedMainProps = {
  children: ReactNode;
  /** When true, only `scroll` scrolls; header stays pinned in the column */
  scrollable?: boolean;
  header?: ReactNode;
  scroll?: ReactNode;
};

/** Center column shell for dashboard / browse — fixed height, scrollable feed body */
export function FreelancerFeedMain({ children, scrollable, header, scroll }: FreelancerFeedMainProps) {
  if (scrollable && header != null && scroll != null) {
    return (
      <main className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-100/80 bg-white p-6 shadow-[0_4px_32px_rgba(15,23,42,0.04)] sm:p-8 lg:p-10">
        <div className="shrink-0">{header}</div>
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">{scroll}</div>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-100/80 bg-white p-6 shadow-[0_4px_32px_rgba(15,23,42,0.04)] sm:p-8 lg:p-10">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">{children}</div>
    </main>
  );
}
