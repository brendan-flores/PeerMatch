"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import SidebarBrand from "@/app/components/SidebarBrand";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, MessageCircle, Search, User } from "lucide-react";
import { NavUnreadBadge } from "@/app/components/NavUnreadBadge";
import { apiPostJson } from "@/app/lib/api";
import { disconnectSocket } from "@/app/lib/socket";
import { clearFreelancerGreetingSession } from "@/app/lib/freelancerStorage";

const navItemClass =
  "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-zinc-900 transition-[background-color,color,box-shadow] duration-300 ease-in-out hover:bg-white/80 hover:shadow-sm";
const navActiveClass = "bg-[#FF6B35] text-white shadow-sm";

type NavItem = { href: string; label: string; icon: ReactNode };

type FreelancerSidebarProps = {
  unreadMessageCount?: number;
};

export function FreelancerSidebar({ unreadMessageCount = 0 }: FreelancerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const items: NavItem[] = [
    { href: "/freelancer-dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5 shrink-0" strokeWidth={1.75} /> },
    { href: "/freelancer-dashboard/browse", label: "Browse Post", icon: <Search className="h-5 w-5 shrink-0" strokeWidth={1.75} /> },
    { href: "/freelancer-dashboard/messages", label: "Message", icon: <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={1.75} /> },
    { href: "/freelancer-dashboard/profile", label: "Profile", icon: <User className="h-5 w-5 shrink-0" strokeWidth={1.75} /> },
  ];

  const isFixedLayout =
    pathname === "/freelancer-dashboard/messages" ||
    pathname === "/freelancer-dashboard" ||
    pathname === "/freelancer-dashboard/browse";

  const isActive = (href: string) => {
    if (href === "/freelancer-dashboard") return pathname === "/freelancer-dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    try {
      await apiPostJson("/api/auth/logout", {});
    } finally {
      disconnectSocket();
      clearFreelancerGreetingSession();
      router.push("/login");
    }
  };

  return (
    <aside
      className={`flex min-h-0 flex-col rounded-2xl border border-zinc-200/80 bg-[#E8EFEC] p-6 shadow-sm ${
        isFixedLayout ? "h-full" : "sticky top-6 h-[calc(100vh-3rem)]"
      }`}
    >
      <SidebarBrand />

      <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1" aria-label="Main">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${navItemClass} ${active ? navActiveClass : ""}`}
            >
              {item.icon}
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.href === "/freelancer-dashboard/messages" ? (
                <NavUnreadBadge count={unreadMessageCount} active={active} />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className={`${navItemClass} mt-4 w-full justify-start border border-transparent`}
      >
        <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        <span>Logout</span>
      </button>
    </aside>
  );
}
