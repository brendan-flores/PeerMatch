"use client";

import {
  CirclePlus,
  Handshake,
  LayoutDashboard,
  MessageCircle,
  Search,
  User,
} from "lucide-react";
import type { MobileNavItem } from "@/app/components/dashboard/MobileDashboardMenu";

export function buildClientMobileNavItems(options: {
  unreadMessageCount: number;
  pendingOffersCount: number;
  onDashboardNavigate: () => void;
}): MobileNavItem[] {
  return [
    {
      href: "/client-home",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
      onNavigate: options.onDashboardNavigate,
    },
    {
      href: "/client-home?panel=create-post",
      label: "Create Post",
      icon: <CirclePlus className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
    },
    {
      href: "/client-home?panel=messages",
      label: "Message",
      icon: <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
      badge: options.unreadMessageCount,
    },
    {
      href: "/client-home?panel=offers",
      label: "Offers",
      icon: <Handshake className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
      badge: options.pendingOffersCount,
    },
    {
      href: "/client-home?panel=profile",
      label: "Profile",
      icon: <User className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
    },
  ];
}

export function buildFreelancerMobileNavItems(unreadMessageCount: number): MobileNavItem[] {
  return [
    {
      href: "/freelancer-dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
    },
    {
      href: "/freelancer-dashboard/browse",
      label: "Browse Post",
      icon: <Search className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
    },
    {
      href: "/freelancer-dashboard/messages",
      label: "Message",
      icon: <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
      badge: unreadMessageCount,
    },
    {
      href: "/freelancer-dashboard/profile",
      label: "Profile",
      icon: <User className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
    },
  ];
}
