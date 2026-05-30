"use client";

import Link from "next/link";
import { LogOut, X } from "lucide-react";
import type { ReactNode } from "react";
import { NavUnreadBadge } from "@/app/components/NavUnreadBadge";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  /** When set, used instead of navigation (e.g. dashboard reset). */
  onNavigate?: () => void;
};

const navItemClass =
  "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-zinc-900 transition-[background-color,color,box-shadow] duration-300 ease-in-out hover:bg-white/80 hover:shadow-sm";

const navActiveClass = "bg-[#FF6B35] text-white shadow-sm";

type MobileDashboardMenuProps = {
  open: boolean;
  onClose: () => void;
  items: MobileNavItem[];
  onLogout: () => void;
  isActive: (href: string) => boolean;
};

export function MobileDashboardMenu({
  open,
  onClose,
  items,
  onLogout,
  isActive,
}: MobileDashboardMenuProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] lg:hidden" role="presentation">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div
        className="absolute left-0 top-0 flex h-full w-[min(88vw,320px)] flex-col overflow-hidden rounded-r-[1.75rem] border border-zinc-200/80 bg-[#E8EFEC] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-900">Menu</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1" aria-label="Main">
          {items.map((item) => {
            const active = isActive(item.href);
            const content = (
              <>
                {item.icon}
                <span className="min-w-0 flex-1">{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 ? (
                  <NavUnreadBadge count={item.badge} active={active} />
                ) : null}
              </>
            );

            if (item.onNavigate) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    item.onNavigate?.();
                    onClose();
                  }}
                  className={`${navItemClass} w-full text-left ${active ? navActiveClass : ""}`}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`${navItemClass} ${active ? navActiveClass : ""}`}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => {
            onClose();
            void onLogout();
          }}
          className={`${navItemClass} mt-4 w-full justify-start border border-transparent`}
        >
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
