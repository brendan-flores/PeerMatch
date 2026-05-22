"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiGetJson, apiPatchJson, ApiError } from "@/app/lib/api";
import { formatJoinedDate } from "../lib/formatTime";
import type { AdminUserRow } from "../types";
type RouteTab = "allusers" | "clients" | "freelancers" | "admin";

type DisplayRole = "Client" | "Freelancer" | "Admin" | "Student";

type UserRow = {
  id: string;
  name: string;
  joined: string;
  email: string;
  role: DisplayRole;
  status: "Active" | "Suspended";
  tasks: number;
  rating: number | null;
};

function displayRole(u: AdminUserRow): DisplayRole {
  if (u.role === "admin") return "Admin";
  if (u.accountType === "client") return "Client";
  if (u.accountType === "freelancer") return "Freelancer";
  return "Student";
}

function rolePillClass(r: DisplayRole): string {
  if (r === "Admin") return "admin";
  if (r === "Client") return "client";
  if (r === "Freelancer") return "free";
  return "user";
}

function IconMail() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="admin-email-icon">
      <path
        d="M4 4h16v16H4V4zm0 0l8 8 8-8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBan() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 19L19 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconCrown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#FA642C" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

const routeTabs: { id: RouteTab; label: string; path: string }[] = [
  { id: "allusers", label: "All Users", path: "/admin/usermanagement/allusers" },
  { id: "clients", label: "Clients", path: "/admin/usermanagement/clients" },
  { id: "freelancers", label: "Freelancers", path: "/admin/usermanagement/freelancers" },
  { id: "admin", label: "Admin", path: "/admin/usermanagement/admin" },
];

function apiToRow(u: AdminUserRow): UserRow {
  const dr = displayRole(u);
  return {
    id: u.id,
    name: u.name,
    joined: formatJoinedDate(u.joinedAt),
    email: u.email,
    role: dr,
    status: u.suspended ? "Suspended" : "Active",
    tasks: u.tasksPosted,
    rating: u.rating,
  };
}

function filterByRoute(list: UserRow[], t: RouteTab): UserRow[] {
  if (t === "admin") return list.filter((u) => u.role === "Admin");
  if (t === "clients") return list.filter((u) => u.role === "Client");
  if (t === "freelancers") return list.filter((u) => u.role === "Freelancer");
  return list.filter((u) => u.role !== "Admin");
}

export default function UserManagementContent() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const path = pathname.toLowerCase();
  const activeTab: RouteTab = path.endsWith("/usermanagement/admin")
    ? "admin"
    : path.endsWith("/usermanagement/clients")
      ? "clients"
      : path.endsWith("/usermanagement/freelancers")
        ? "freelancers"
        : "allusers";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGetJson<{ users: AdminUserRow[] }>("/api/admin/users")
      .then((data) => {
        if (!cancelled) setRows((data.users || []).map(apiToRow));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load users.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => filterByRoute(rows, activeTab), [rows, activeTab]);

  const handlePromoteToAdmin = async (userId: string) => {
    setPromotingId(userId);
    try {
      await apiPatchJson<{ user: { id: string; role: string } }>(
        `/api/admin/users/${userId}/role`,
        { role: 'admin' }
      );
      setRows((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: 'Admin' } : u))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to promote user to admin.');
    } finally {
      setPromotingId(null);
    }
  };

  return (
    <>
      <div className="admin-page-head admin-page-head--split">
        <div>
          <h1 className="admin-page-title">User Management</h1>
          <p className="admin-page-sub">Manage CIT-U student accounts and verify credentials.</p>
        </div>
      </div>

      {error ? (
        <p className="admin-inline-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-tabs" role="tablist" aria-label="User management tabs">
        {routeTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`admin-tabs__btn${activeTab === t.id ? " admin-tabs__btn--active" : ""}`}
            onClick={() => router.push(t.path)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Tasks</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <p className="admin-empty" style={{ margin: "1rem" }}>
                      Loading users…
                    </p>
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <p className="admin-empty" style={{ margin: "1rem" }}>
                      No users in this view.
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-cell__name">{u.name}</span>
                        <span className="admin-user-cell__joined">Joined {u.joined}</span>
                      </div>
                    </td>
                    <td>
                      <span className="admin-email">
                        <IconMail />
                        {u.email}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-pill admin-pill--role-${rolePillClass(u.role)}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`admin-pill admin-pill--user-${u.status === "Active" ? "active" : "suspended"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>{u.tasks}</td>
                    <td>
                      {u.rating != null ? (
                        <span className="admin-rating">
                          {u.rating.toFixed(1)} <IconStar />
                        </span>
                      ) : (
                        <span className="admin-muted-cell">—</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="admin-row-icon" aria-label={`View ${u.name}`}>
                          <IconShield />
                        </button>
                        {u.role !== 'Admin' && (
                          <button
                            type="button"
                            className="admin-row-icon"
                            aria-label={`Promote ${u.name} to admin`}
                            onClick={() => handlePromoteToAdmin(u.id)}
                            disabled={promotingId === u.id}
                          >
                            <IconCrown />
                          </button>
                        )}
                        <button type="button" className="admin-row-icon admin-row-icon--muted" aria-label="Suspend user">
                          <IconBan />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
