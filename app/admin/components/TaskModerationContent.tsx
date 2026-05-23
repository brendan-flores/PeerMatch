"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiGetJson, apiPatchJson, ApiError } from "@/app/lib/api";
import { formatRelativeTime } from "../lib/formatTime";
import type { AdminTaskRow } from "../types";
import { AdminTaskDetailModal } from "./AdminTaskDetailModal";
import { useAdminLayoutStats } from "./AdminLayout";

type TaskRouteTab = "pending" | "approved" | "declined";

type RowStatus = "Pending" | "Approved" | "Rejected";

type TaskRow = {
  id: string;
  title: string;
  ago: string;
  client: string;
  budget: number;
  category: "Academic" | "Non-Academic";
  status: RowStatus;
};

function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7zM12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

const tabs: { id: TaskRouteTab; label: string; path: string }[] = [
  { id: "pending", label: "Pending", path: "/admin/tasks/pending" },
  { id: "approved", label: "Approved", path: "/admin/tasks/approved" },
  { id: "declined", label: "Declined", path: "/admin/tasks/declined" },
];

function apiToRow(t: AdminTaskRow): TaskRow {
  const raw = String(t.status || "pending").toLowerCase();
  const status: RowStatus =
    raw === "approved" ? "Approved" : raw === "rejected" ? "Rejected" : "Pending";
  return {
    id: t.id,
    title: t.title,
    ago: t.createdAt ? formatRelativeTime(t.createdAt) : "—",
    client: t.clientName,
    budget: t.budget,
    category: t.category === "academic" ? "Academic" : "Non-Academic",
    status,
  };
}

function filterRows(list: TaskRow[], t: TaskRouteTab): TaskRow[] {
  if (t === "pending") return list.filter((r) => r.status === "Pending");
  if (t === "approved") return list.filter((r) => r.status === "Approved");
  if (t === "declined") return list.filter((r) => r.status === "Rejected");
  return list;
}

export default function TaskModerationContent() {
  const { reloadStats } = useAdminLayoutStats();
  const pathname = usePathname();
  const router = useRouter();
  const path = pathname.toLowerCase();

  const tab: TaskRouteTab = path.endsWith("/tasks/approved")
    ? "approved"
    : path.endsWith("/tasks/declined")
      ? "declined"
      : "pending";

  const [rows, setRows] = useState<TaskRow[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<AdminTaskRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGetJson<{ tasks: AdminTaskRow[]; pendingTotal: number }>("/api/admin/tasks");
      setRows((data.tasks || []).map(apiToRow));
      setPendingTotal(data.pendingTotal ?? 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const visible = useMemo(() => filterRows(rows, tab), [rows, tab]);

  const openTaskDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetailTask(null);
    try {
      const data = await apiGetJson<{ task: AdminTaskRow }>(`/api/admin/tasks/${encodeURIComponent(id)}`);
      setDetailTask(data.task);
    } catch (e) {
      setDetailError(e instanceof ApiError ? e.message : "Could not load task details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeTaskDetail = () => {
    setDetailTask(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    setError(null);
    try {
      await apiPatchJson<{ task: AdminTaskRow }>(`/api/admin/tasks/${id}`, { status });
      await loadTasks();
      await reloadStats();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Task Moderation</h1>
          <p className="admin-page-sub">Review and approve tasks before publication</p>
        </div>
      </div>

      {error ? (
        <p className="admin-inline-error" role="alert">
          {error}{" "}
          <button type="button" className="admin-link-btn" onClick={() => void loadTasks()}>
            Retry
          </button>
        </p>
      ) : null}

      <div className="admin-tabs" role="tablist" aria-label="Task filters">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`admin-tabs__btn${tab === t.id ? " admin-tabs__btn--active" : ""}`}
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
                <th>Task Title</th>
                <th>Client</th>
                <th>Budget</th>
                <th>Category</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <p className="admin-empty" style={{ margin: "1rem" }}>
                      Loading tasks…
                    </p>
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className="admin-empty" style={{ margin: "1rem" }}>
                      No tasks in this view.
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="admin-task-cell">
                        <span className="admin-task-cell__title">{r.title}</span>
                        <span className="admin-task-cell__ago">{r.ago}</span>
                      </div>
                    </td>
                    <td>{r.client}</td>
                    <td>
                      <span className="admin-budget">₱{r.budget.toLocaleString()}</span>
                    </td>
                    <td>
                      <span
                        className={`admin-pill admin-pill--cat-${r.category === "Academic" ? "academic" : "non"}`}
                      >
                        {r.category}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-pill admin-pill--status-${r.status.toLowerCase()}`}>{r.status}</span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-row-icon"
                          aria-label={`View ${r.title}`}
                          onClick={() => void openTaskDetail(r.id)}
                        >
                          <IconEye />
                        </button>
                        {r.status === "Pending" ? (
                          <>
                            <button
                              type="button"
                              className="admin-row-icon admin-row-icon--ok"
                              aria-label="Approve"
                              disabled={busyId === r.id}
                              onClick={() => void setStatus(r.id, "approved")}
                            >
                              <IconCheck />
                            </button>
                            <button
                              type="button"
                              className="admin-row-icon admin-row-icon--no"
                              aria-label="Reject"
                              disabled={busyId === r.id}
                              onClick={() => void setStatus(r.id, "rejected")}
                            >
                              <IconX />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-table-footer">
          <p className="admin-table-footer__status">
            Showing {visible.length} task{visible.length === 1 ? "" : "s"}
            {tab === "pending" ? ` · ${pendingTotal.toLocaleString()} pending overall` : ""}
          </p>
          <div className="admin-table-footer__pager">
            <button type="button" className="admin-pager-btn admin-pager-btn--ghost" disabled>
              Previous
            </button>
            <button type="button" className="admin-pager-btn admin-pager-btn--primary" disabled>
              Next
            </button>
          </div>
        </div>
      </div>

      <AdminTaskDetailModal
        task={detailTask}
        loading={detailLoading}
        error={detailError}
        onClose={closeTaskDetail}
      />
    </>
  );
}
