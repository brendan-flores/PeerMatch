/** Shared dashboard chrome spacing (client + freelancer) — match Community Feed reference. */

export const dashboardShellClass =
  "relative bg-[#E5F6F4] px-4 py-4 sm:px-6 lg:px-8 lg:py-6";

export const dashboardShellFixedClass = "h-[100dvh] overflow-hidden";

export const dashboardGridClass =
  "mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px] xl:grid-cols-[280px_minmax(0,1fr)_320px]";

export const dashboardGridFixedClass = "h-full min-h-0";

export const notificationBellClass =
  "absolute left-4 top-4 z-50 lg:left-[calc(260px+1.5rem)] lg:top-6 xl:left-[calc(280px+2rem)] xl:top-6";

/** Center column wrapper + scroll (create post, profile, messages, etc.) */
export const dashboardCenterColumnClass = "h-full min-h-0 overflow-hidden";

export const dashboardPanelBodyClass =
  "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain";

/** Left / right column cards */
export const dashboardAsideClass =
  "flex min-h-0 flex-col rounded-2xl border border-zinc-200/80 bg-[#E8EFEC] p-6 shadow-sm lg:row-span-1";

export const dashboardAsideFixedClass = "h-full max-h-full min-h-0 overflow-hidden";

/** Center white panel (feed, profile, create post, messages, etc.) */
export const dashboardCenterPanelClass =
  "flex min-h-0 flex-col rounded-2xl border border-zinc-100/80 bg-white shadow-[0_4px_32px_rgba(15,23,42,0.04)] p-6 sm:p-8 lg:p-10";

export const dashboardCenterPanelFixedClass = "h-full overflow-hidden";

/** Community feed list spacing between post cards */
export const dashboardFeedListClass = "space-y-4";

export const dashboardFeedHeaderGapClass = "mt-5";

export const dashboardFeedScrollClass =
  "feed-scroll-pane min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]";

/** Profile layout */
export const dashboardProfileSectionClass = "flex min-h-0 flex-1 flex-col";

export const dashboardProfileGridClass =
  "flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-hidden xl:flex-row xl:items-stretch";

/** Profile panel body — fills center column; form column scrolls inside */
export const dashboardProfilePanelBodyClass = "flex h-full min-h-0 flex-1 flex-col overflow-hidden";

export const dashboardProfileSummaryCardClass =
  "h-fit w-full shrink-0 rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-5 shadow-sm sm:p-6 xl:w-[260px] xl:max-w-[260px]";

export const dashboardProfileFormCardClass =
  "rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-5 shadow-sm sm:p-6";

export const dashboardTipsAsideClass =
  "rounded-2xl border border-[#F3DCCF] bg-[#FFF2EB] p-5 shadow-sm sm:p-6";

export const dashboardProfileScrollClass =
  "profile-scroll-pane min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch] scroll-smooth";

/** Sidebar nav spacing below logo */
export const dashboardSidebarNavClass =
  "mt-8 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1";

/** Right column — Recent Posts */
export const dashboardRightAsideSectionClass =
  "flex min-h-0 flex-1 flex-col overflow-hidden";

export const dashboardRightAsideListClass =
  "mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-0.5";
