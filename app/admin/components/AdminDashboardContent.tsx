"use client";

import { useEffect, useState } from "react";
import { apiGetJson, ApiError } from "@/app/lib/api";
import { formatRelativeTime } from "../lib/formatTime";
import type { ActivityItem } from "../types";
import { useAdminLayoutStats } from "./AdminLayout";

function IconClipboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHourglass() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v4m0 10v4M6 7h12v2a4 4 0 01-4 4 4 4 0 014 4v2H6v-2a4 4 0 014-4 4 4 0 01-4-4V7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M13 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheckBox() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function fmt(n: number | undefined, loading: boolean) {
  if (loading) return "…";
  return (n ?? 0).toLocaleString();
}

function badgeLabel(badge: ActivityItem["badge"]) {
  if (badge === "completed") return "Completed";
  if (badge === "warning") return "Attention";
  return "Pending";
}

export default function AdminDashboardContent() {
  const { stats, statsLoading, statsError, reloadStats } = useAdminLayoutStats();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [actLoading, setActLoading] = useState(true);
  const [actError, setActError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setActLoading(true);
    setActError(null);
    apiGetJson<{ items: ActivityItem[] }>("/api/admin/activities?limit=20")
      .then((data) => {
        if (!cancelled) setActivities(data.items || []);
      })
      .catch((e) => {
        if (!cancelled) setActError(e instanceof ApiError ? e.message : "Failed to load activities.");
      })
      .finally(() => {
        if (!cancelled) setActLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Dashboard Overview</h1>
          <p className="admin-page-sub">Monitor platform activity and key metrics</p>
        </div>
      </div>

      {statsError ? (
        <p className="admin-inline-error" role="alert">
          {statsError}{" "}
          <button type="button" className="admin-link-btn" onClick={() => void reloadStats()}>
            Retry
          </button>
        </p>
      ) : null}

      <div className="admin-metrics">
        <article className="admin-metric-card">
          <div className="admin-metric-card__icon">
            <IconClipboard />
          </div>
          <div>
            <p className="admin-metric-card__label">Total Tasks</p>
            <p className="admin-metric-card__value">{fmt(stats?.totalTasks, statsLoading)}</p>
          </div>
        </article>
        <article className="admin-metric-card">
          <div className="admin-metric-card__icon">
            <IconHourglass />
          </div>
          <div>
            <p className="admin-metric-card__label">Pending Review</p>
            <p className="admin-metric-card__value">{fmt(stats?.pendingReview, statsLoading)}</p>
          </div>
        </article>
        <article className="admin-metric-card">
          <div className="admin-metric-card__icon">
            <IconPeople />
          </div>
          <div>
            <p className="admin-metric-card__label">Active Users</p>
            <p className="admin-metric-card__value">{fmt(stats?.activeUsers, statsLoading)}</p>
          </div>
        </article>
        <article className="admin-metric-card">
          <div className="admin-metric-card__icon admin-metric-card__icon--success">
            <IconCheckBox />
          </div>
          <div>
            <p className="admin-metric-card__label">Completed Tasks</p>
            <p className="admin-metric-card__value">{fmt(stats?.completedTasks, statsLoading)}</p>
          </div>
        </article>
      </div>

      <section className="admin-card admin-card--padded-lg">
        <div className="admin-card__head">
          <div>
            <h2 className="admin-card__title">Recent Activities</h2>
            <p className="admin-card__sub">Latest platform events</p>
          </div>
        </div>
        {actError ? (
          <p className="admin-inline-error" role="alert">
            {actError}
          </p>
        ) : null}
        {actLoading ? (
          <p className="admin-empty">Loading activity…</p>
        ) : activities.length === 0 ? (
          <p className="admin-empty">No recent activity yet.</p>
        ) : (
          <ul className="admin-activity-list">
            {activities.map((a) => (
              <li
                key={a.id}
                className={`admin-activity-row${a.kind === "task_approved" ? " admin-activity-row--approved" : ""}`}
              >
                <div className="admin-activity-row__body">
                  <p className="admin-activity-row__title">{a.title}</p>
                  {a.kind === "task_approved" ? (
                    <>
                      {a.taskTitle ? (
                        <p className="admin-activity-row__task">{a.taskTitle}</p>
                      ) : null}
                      <p className="admin-activity-row__detail">
                        Approved by: <span>{a.approvedByName || "Admin"}</span>
                      </p>
                      <p className="admin-activity-row__detail">
                        Client: <span>{a.clientName || a.sub || "Unknown client"}</span>
                      </p>
                    </>
                  ) : (
                    <p className="admin-activity-row__sub">{a.sub}</p>
                  )}
                </div>
                <div className="admin-activity-row__meta">
                  <span className="admin-activity-row__time">{formatRelativeTime(a.at)}</span>
                  <span className={`admin-badge admin-badge--${a.badge}`}>{badgeLabel(a.badge)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
