"use client";

import { useEffect, type ReactNode } from "react";
import { formatRelativeTime } from "../lib/formatTime";
import type { AdminTaskRow } from "../types";

type AdminTaskDetailModalProps = {
  task: AdminTaskRow | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
};

function labelStatus(status: AdminTaskRow["status"]) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function labelCategory(category: AdminTaskRow["category"]) {
  return category === "academic" ? "Academic" : "Non-Academic";
}

function labelUrgency(urgency?: string) {
  const value = String(urgency || "normal").toLowerCase();
  if (value === "high") return "High";
  if (value === "low") return "Low";
  return "Normal";
}

function labelHireStatus(hireStatus?: string) {
  const value = String(hireStatus || "open").toLowerCase();
  if (value === "assigned") return "In progress";
  if (value === "completed") return "Completed";
  return "Open for offers";
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="admin-detail-row">
      <dt className="admin-detail-row__label">{label}</dt>
      <dd className="admin-detail-row__value">{value}</dd>
    </div>
  );
}

export function AdminTaskDetailModal({ task, loading, error, onClose }: AdminTaskDetailModalProps) {
  const isOpen = loading || !!task || !!error;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-task-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-modal__head">
          <h2 id="admin-task-detail-title" className="admin-modal__title">
            Task details
          </h2>
          <button type="button" className="admin-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {loading ? (
          <p className="admin-empty">Loading task details…</p>
        ) : error ? (
          <p className="admin-inline-error" role="alert">
            {error}
          </p>
        ) : task ? (
          <div className="admin-modal__body">
            <section className="admin-modal__section">
              <h3 className="admin-modal__section-title">Post</h3>
              <dl className="admin-detail-list">
                <DetailRow label="Title" value={task.title} />
                <DetailRow
                  label="Description"
                  value={
                    <span className="admin-detail-multiline">
                      {task.description?.trim() || "—"}
                    </span>
                  }
                />
                <DetailRow label="Category" value={labelCategory(task.category)} />
                <DetailRow label="Subject / topic" value={task.subjectCategory?.trim() || "—"} />
                <DetailRow label="Budget" value={`₱${task.budget.toLocaleString()}`} />
                <DetailRow label="Urgency" value={labelUrgency(task.urgency)} />
                <DetailRow label="Moderation status" value={labelStatus(task.status)} />
                <DetailRow label="Hire status" value={labelHireStatus(task.hireStatus)} />
                <DetailRow label="Flagged" value={task.flagged ? "Yes" : "No"} />
                <DetailRow
                  label="Submitted"
                  value={task.createdAt ? formatRelativeTime(task.createdAt) : "—"}
                />
                {task.approvedByName ? (
                  <DetailRow label="Approved by" value={task.approvedByName} />
                ) : null}
                {task.rejectedByName ? (
                  <DetailRow label="Rejected by" value={task.rejectedByName} />
                ) : null}
              </dl>
            </section>

            <section className="admin-modal__section">
              <h3 className="admin-modal__section-title">Client</h3>
              <dl className="admin-detail-list">
                <DetailRow label="Name" value={task.clientName} />
                <DetailRow label="Email" value={task.clientEmail?.trim() || "—"} />
                <DetailRow
                  label="Account type"
                  value={task.clientAccountType ? String(task.clientAccountType) : "—"}
                />
                <DetailRow label="Course" value={task.clientCourse?.trim() || "—"} />
                <DetailRow label="Year level" value={task.clientYearLevel?.trim() || "—"} />
              </dl>
            </section>

            {task.assignedFreelancerName ? (
              <section className="admin-modal__section">
                <h3 className="admin-modal__section-title">Assigned freelancer</h3>
                <dl className="admin-detail-list">
                  <DetailRow label="Name" value={task.assignedFreelancerName} />
                  <DetailRow
                    label="Email"
                    value={task.assignedFreelancerEmail?.trim() || "—"}
                  />
                  {task.completedAt ? (
                    <DetailRow
                      label="Completed"
                      value={formatRelativeTime(task.completedAt)}
                    />
                  ) : null}
                  {task.reviewSubmittedAt ? (
                    <>
                      <DetailRow
                        label="Review submitted"
                        value={formatRelativeTime(task.reviewSubmittedAt)}
                      />
                      <DetailRow
                        label="Rating"
                        value={
                          task.reviewRating != null ? `${task.reviewRating} / 5` : "—"
                        }
                      />
                    </>
                  ) : null}
                </dl>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
