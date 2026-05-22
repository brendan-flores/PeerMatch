"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SidebarBrand from "@/app/components/SidebarBrand";
import { apiGetJson, ApiError } from "@/app/lib/api";
import { useAdminAuth } from "../context/AdminAuthContext";
import type { AdminOutletContext, AdminStats } from "../types";

const AdminLayoutContext = createContext<AdminOutletContext | null>(null);

export function AdminLayoutStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const reloadStats = useCallback(async () => {
    setStatsError(null);
    try {
      const data = await apiGetJson<AdminStats>("/api/admin/stats");
      setStats(data);
    } catch (e) {
      setStatsError(e instanceof ApiError ? e.message : "Failed to load stats.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadStats();
  }, [reloadStats]);

  const value = useMemo<AdminOutletContext>(
    () => ({
      stats,
      statsLoading,
      statsError,
      reloadStats,
    }),
    [stats, statsLoading, statsError, reloadStats],
  );

  return <AdminLayoutContext.Provider value={value}>{children}</AdminLayoutContext.Provider>;
}

export function useAdminLayoutStats() {
  const ctx = useContext(AdminLayoutContext);
  if (!ctx) throw new Error("useAdminLayoutStats must be used within AdminLayoutStatsProvider");
  return ctx;
}

function navClass(active: boolean) {
  return `admin-nav__link${active ? " admin-nav__link--active" : ""}`;
}

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function IconTasks({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 12l2 2 4-4M8 6h8M6 4h12v16H6V4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8zm8 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useAdminAuth();
  const { stats, statsLoading } = useAdminLayoutStats();
  const pathname = usePathname();

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <SidebarBrand />
        </div>

        <nav className="admin-nav" aria-label="Main">
          <Link href="/admin/dashboard" className={navClass(pathname === "/admin/dashboard")}>
            <IconDashboard className="admin-nav__icon" />
            Dashboard
          </Link>
          <Link
            href="/admin/tasks/pending"
            className={navClass(pathname.startsWith("/admin/tasks"))}
          >
            <IconTasks className="admin-nav__icon" />
            Task Moderation
          </Link>
          <Link
            href="/admin/usermanagement/allusers"
            className={navClass(pathname.startsWith("/admin/usermanagement"))}
          >
            <IconUsers className="admin-nav__icon" />
            User Management
          </Link>
        </nav>

        <div className="admin-sidebar__footer">
          <p className="admin-sidebar__footer-label">Active Users</p>
          <p className="admin-sidebar__footer-value">
            {statsLoading ? "…" : (stats?.activeUsers ?? 0).toLocaleString()}
          </p>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-search">
            <IconSearch className="admin-search__icon" />
            <input
              type="search"
              className="admin-search__input"
              placeholder="Search tasks or users..."
              aria-label="Search tasks or users"
            />
          </div>
          <div className="admin-topbar__actions">
            <button
              type="button"
              className="admin-icon-btn"
              aria-label="Sign out"
              onClick={() => void logout()}
            >
              <IconLogout />
            </button>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
