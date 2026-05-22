"use client";

import type { ReactNode } from "react";

type FreelancerFeedMainProps = {
  children: ReactNode;
  /** When true, renders `header` above `scroll` in the same column */
  scrollable?: boolean;
  header?: ReactNode;
  scroll?: ReactNode;
};

/** Center column shell for dashboard / browse — grows with content; page scrolls */
export function FreelancerFeedMain({ children, scrollable, header, scroll }: FreelancerFeedMainProps) {
  if (scrollable && header != null && scroll != null) {
    return (
      <main className="rounded-2xl border border-zinc-100/80 bg-white p-6 shadow-[0_4px_32px_rgba(15,23,42,0.04)] sm:p-8 lg:p-10">
        {header}
        <div className="mt-5">{scroll}</div>
      </main>
    );
  }

  return (
    <main className="rounded-2xl border border-zinc-100/80 bg-white p-6 shadow-[0_4px_32px_rgba(15,23,42,0.04)] sm:p-8 lg:p-10">
      {children}
    </main>
  );
}
