/** Shared dashboard chrome spacing (client + freelancer) — match Community Feed reference. */

export const dashboardShellClass =
  "relative bg-[#E5F6F4] px-4 py-4 sm:px-6 lg:px-8 lg:py-6";

export const dashboardShellFixedClass = "h-[100dvh] overflow-hidden";

export const dashboardGridClass =
  "mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px] xl:grid-cols-[280px_minmax(0,1fr)_320px]";

export const dashboardGridFixedClass = "h-full min-h-0";

/** Wrapper for center column — bell overlay sits outside the scrolling panel layer */
export const dashboardCenterColumnWrapClass = "relative h-full min-h-0";

/** Panel + route transition (below bell overlay) */
export const dashboardCenterColumnContentClass = "relative z-0 h-full min-h-0 overflow-hidden";

/** Full-size overlay so the bell stays clickable above the white card */
export const dashboardCenterBellAnchorClass = "pointer-events-none absolute inset-0 z-[100]";

/** Top-left of center white card — tight to corner, clear of rounded border */
export const dashboardCenterBellInnerClass = "pointer-events-auto absolute left-3.5 top-3.5 sm:left-4 sm:top-4";

/** Titles and first content row sit to the right of the bell (44px + gap) */
export const dashboardCenterTitleOffsetClass = "min-w-0 pl-12 sm:pl-14";

/** Centered page title block (create post, offers, messages sidebar header) */
export const dashboardCenterPanelHeadingClass = "min-w-0 text-center";

/** Left-aligned feed / browse titles in the center panel */
export const dashboardFeedPageHeadingClass = "min-w-0 text-left";

/** Right aside — panel root; avoid overflow-hidden here so the notification menu can stack above content */
export const dashboardRightAsideWrapClass = "relative flex min-h-0 flex-col";

/** Header row: title + bell; sits above scrollable recent posts */
export const dashboardRightAsideHeaderClass =
  "relative z-30 flex shrink-0 items-start justify-between gap-3";

export const dashboardRightAsideBellClass =
  "relative shrink-0 [&_[data-bell-trigger]]:rounded-full [&_[data-bell-trigger]]:shadow-md [&_[data-bell-trigger]]:ring-2 [&_[data-bell-trigger]]:ring-white/90";

/** Scroll panels inside the center column (bell clearance is on titles via dashboardCenterTitleOffsetClass) */
export const dashboardPanelScrollInsetClass = "min-w-0";

/** Compact center panel padding (create post, offers, messages) — avoids double top gap with bell */
export const dashboardCenterPanelCompactPaddingClass =
  "px-4 pt-4 pb-4 sm:px-5 sm:pt-5 sm:pb-6 lg:px-6 lg:pb-8";

/** Center column wrapper + scroll (create post, profile, messages, etc.) */
export const dashboardCenterColumnClass = "h-full min-h-0 overflow-hidden";

export const dashboardPanelBodyClass =
  "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain";

/** Center panel body — scrollable, scrollbar hidden */
export const dashboardPanelScrollClass =
  "panel-scroll-pane flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]";

/** Client offers panel — fills center column; inner list scrolls */
export const dashboardOffersPanelWrapClass =
  "flex h-full min-h-0 flex-1 flex-col overflow-hidden";

export const dashboardOffersPanelScrollClass =
  "panel-scroll-pane min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] max-lg:px-4 max-lg:py-4 lg:pr-1";

/** Left / right column cards */
export const dashboardAsideClass =
  "flex min-h-0 flex-col rounded-2xl border border-zinc-200/80 bg-[#E8EFEC] p-6 shadow-sm lg:row-span-1";

export const dashboardAsideFixedClass = "h-full max-h-full min-h-0 overflow-hidden";

/** Center white panel (feed, profile, create post, messages, etc.) */
export const dashboardCenterPanelClass =
  "flex min-h-0 flex-col rounded-2xl border border-zinc-100/80 bg-white shadow-[0_4px_32px_rgba(15,23,42,0.04)] p-6 sm:p-8 lg:p-10";

/** Community feed — match side column padding so headings align */
export const dashboardCenterPanelFeedClass =
  "flex min-h-0 flex-col rounded-2xl border border-zinc-100/80 bg-white shadow-[0_4px_32px_rgba(15,23,42,0.04)] p-6";

export const dashboardCenterPanelFixedClass = "h-full overflow-hidden";

/** Community feed list spacing between post cards */
export const dashboardFeedListClass = "space-y-4";

export const dashboardFeedHeaderGapClass = "mt-4";

export const dashboardFeedScrollClass =
  "feed-scroll-pane min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]";

/** Mobile: centered white panel on mint background (profile, panels, feed body, chats) */
export const mobileDashboardWhitePanelClass =
  "max-lg:mx-auto max-lg:flex max-lg:h-full max-lg:min-h-0 max-lg:w-full max-lg:max-w-lg max-lg:flex-col max-lg:overflow-hidden max-lg:rounded-2xl max-lg:border max-lg:border-zinc-100/80 max-lg:bg-white max-lg:shadow-[0_4px_32px_rgba(15,23,42,0.04)]";

/** Mobile: single scroll region inside the white panel */
export const mobileDashboardPanelScrollClass =
  "max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:px-4 max-lg:py-4 max-lg:[-webkit-overflow-scrolling:touch]";

/** Profile layout */
export const dashboardProfileSectionClass = "flex min-h-0 flex-1 flex-col";

export const dashboardProfileGridClass =
  "flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-hidden xl:flex-row xl:items-stretch";

/** Profile panel body — fills center column; form column scrolls inside */
export const dashboardProfilePanelBodyClass = "flex h-full min-h-0 flex-1 flex-col overflow-hidden";

export const dashboardProfileSummaryCardClass =
  "h-fit w-full shrink-0 rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-5 shadow-sm sm:p-6 xl:w-[260px] xl:max-w-[260px]";

/** Profile page scroll area — gap between name card and About stack on mobile */
export const dashboardProfileScrollPaneClass =
  "panel-scroll-pane flex h-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] max-lg:gap-6 max-lg:px-4 max-lg:py-5 xl:flex-row xl:gap-4 xl:overflow-hidden xl:px-0 xl:py-0";

/** About, featured post, and save row — extra vertical spacing on mobile */
export const dashboardProfileFormStackClass =
  "mx-auto w-full max-w-md space-y-4 max-lg:space-y-6 max-lg:overflow-visible max-lg:flex-none xl:mx-0 xl:max-w-none xl:min-h-0 xl:flex-1";

export const dashboardProfileFormCardClass =
  "rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-5 shadow-sm sm:p-6";

export const dashboardProfileScrollClass =
  "profile-scroll-pane min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch] scroll-smooth";

/** Sidebar nav spacing below logo */
export const dashboardSidebarNavClass =
  "mt-8 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1";

/** Right column — Recent Posts */
export const dashboardRightAsideSectionClass =
  "relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden";

export const dashboardRightAsideListClass =
  "panel-scroll-pane mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-0.5";

/** Sidebar nav — scrollable list, scrollbar hidden */
export const dashboardSidebarNavScrollClass =
  "panel-scroll-pane mt-8 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1";
