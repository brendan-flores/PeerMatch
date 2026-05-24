"use client";

import Image from "next/image";
import { Bell, Briefcase, Handshake, Heart, MessageCircle, MoreHorizontal, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  avatarGradientForId,
  formatNotificationTimeAgo,
  isSystemNotificationActor,
  PEERMATCH_LOGO_URL,
  type NotificationItem,
  type NotificationType,
} from "@/app/lib/notifications";

function NotificationAvatar({ item }: { item: NotificationItem }) {
  const photo = String(item.actorPhotoDataUrl || "").trim();
  const useLogo = !photo && isSystemNotificationActor(item.userName, item.type);

  if (photo) {
    return (
      <img
        key={photo.slice(-48)}
        src={photo}
        alt=""
        className="mt-0.5 h-10 w-10 shrink-0 rounded-full border border-zinc-200/80 object-cover shadow-sm"
      />
    );
  }

  if (useLogo) {
    return (
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200/80 bg-white shadow-sm">
        <Image src={PEERMATCH_LOGO_URL} alt="" width={40} height={40} className="h-full w-full object-contain p-1.5" />
      </span>
    );
  }

  return (
    <span
      className="mt-0.5 h-10 w-10 shrink-0 rounded-full shadow-sm"
      style={{ background: avatarGradientForId(item.id) }}
      aria-hidden="true"
    />
  );
}

type NotificationsDropdownProps = {
  items: NotificationItem[];
  onMarkAllRead: () => void | Promise<void>;
  onMarkOneRead: (id: string) => void | Promise<void>;
  onDeleteNotification?: (id: string) => void | Promise<void>;
  onNotificationClick?: (item: NotificationItem) => void;
  className?: string;
  menuAlign?: "left" | "right";
  /** Use on right aside so the panel scroll area does not paint over the menu */
  menuElevated?: boolean;
};

function contextIcon(type: NotificationType) {
  const className = "h-5 w-5 shrink-0 text-zinc-400";
  const stroke = 1.5;
  switch (type) {
    case "new_task":
      return <Briefcase className={className} strokeWidth={stroke} />;
    case "new_offer":
      return <Handshake className={className} strokeWidth={stroke} />;
    case "message":
    case "post_review":
    case "post_approved":
    case "response":
      return <MessageCircle className={className} strokeWidth={stroke} />;
    case "like":
      return <Heart className={className} strokeWidth={stroke} />;
    case "follow":
      return <UserPlus className={className} strokeWidth={stroke} />;
    default:
      return <Bell className={className} strokeWidth={stroke} />;
  }
}

export function NotificationsDropdown({
  items,
  onMarkAllRead,
  onMarkOneRead,
  onDeleteNotification,
  onNotificationClick,
  className = "",
  menuAlign = "left",
  menuElevated = false,
}: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if ((target as Element).closest?.("[data-notification-delete-modal]")) return;
      const el = wrapRef.current;
      if (!el?.contains(target)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open && !deleteTargetId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteTargetId) {
          setDeleteTargetId(null);
        } else {
          setOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, deleteTargetId]);

  const handleConfirmDelete = async () => {
    if (!deleteTargetId || !onDeleteNotification) return;
    setDeleting(true);
    try {
      await onDeleteNotification(deleteTargetId);
      setDeleteTargetId(null);
    } finally {
      setDeleting(false);
    }
  };

  const deleteModal =
    deleteTargetId && typeof document !== "undefined"
      ? createPortal(
          <div
            data-notification-delete-modal
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={() => {
              if (!deleting) setDeleteTargetId(null);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-notification-title"
              className="w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              <p id="delete-notification-title" className="text-center text-base font-semibold text-zinc-900">
                Delete this notification?
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleConfirmDelete()}
                  disabled={deleting}
                  className="inline-flex h-10 min-w-[88px] items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deleting ? "Deleting..." : "Yes"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(null)}
                  disabled={deleting}
                  className="inline-flex h-10 min-w-[88px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  No
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={wrapRef} className={`relative inline-flex ${className}`}>
        <button
          type="button"
          data-bell-trigger
          onClick={() => setOpen((prev) => !prev)}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          aria-label="Notifications"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <Bell className="h-5 w-5" strokeWidth={1.6} />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF6B35] px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>

        {open ? (
          <div
            role="dialog"
            aria-label="Notifications"
            className={`absolute top-full mt-3 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)] ${
              menuAlign === "right" ? "right-0" : "left-0"
            } ${menuElevated ? "z-[200]" : "z-50"}`}
          >
            <header className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3.5">
              <Bell className="h-5 w-5 shrink-0 text-zinc-700" strokeWidth={1.6} />
              <h2 className="text-base font-bold text-zinc-900">Notifications</h2>
              {unreadCount > 0 ? (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#FF6B35] px-1.5 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </header>

            <ul className="max-h-[min(420px,60vh)] overflow-y-auto overscroll-contain p-3">
              {items.length === 0 ? (
                <li className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-zinc-500 shadow-[0_2px_12px_rgba(15,23,42,0.08)]">
                  No notifications yet
                </li>
              ) : (
                items.map((item) => (
                  <li key={item.id} className="mb-2 last:mb-0">
                    <div
                      className={`flex w-full items-stretch gap-1 rounded-2xl bg-white transition hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)] ${
                        item.read
                          ? "shadow-[0_2px_12px_rgba(15,23,42,0.08)]"
                          : "shadow-[0_2px_14px_rgba(255,107,53,0.18)]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!item.read) void onMarkOneRead(item.id);
                          onNotificationClick?.(item);
                          setOpen(false);
                        }}
                        className="flex min-w-0 flex-1 items-start gap-3 bg-transparent px-3 py-3 text-left shadow-none ring-0 hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/25 rounded-none"
                      >
                        <NotificationAvatar item={item} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-zinc-900">{item.userName}</span>
                          <span className="mt-0.5 block text-sm leading-snug text-zinc-600">{item.actionText}</span>
                          <span className="mt-1 block text-xs text-zinc-400">
                            {formatNotificationTimeAgo(item.createdAt)}
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0 flex-col items-center gap-1 px-2 py-3">
                        <span className="shrink-0">{contextIcon(item.type)}</span>
                        {onDeleteNotification ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(item.id);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                            aria-label="Delete notification"
                          >
                            <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>

            {items.length > 0 ? (
              <footer className="border-t border-zinc-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => void onMarkAllRead()}
                  disabled={unreadCount === 0}
                  className="mx-auto block w-full py-1 text-center text-sm font-medium text-zinc-500 transition hover:text-zinc-800 disabled:cursor-default disabled:opacity-50"
                >
                  Mark all as read
                </button>
              </footer>
            ) : null}
          </div>
        ) : null}
      </div>
      {deleteModal}
    </>
  );
}
