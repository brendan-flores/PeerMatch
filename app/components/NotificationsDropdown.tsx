"use client";

import Image from "next/image";
import { Bell, Briefcase, Handshake, Heart, MessageCircle, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  onNotificationClick?: (item: NotificationItem) => void;
  className?: string;
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
  onNotificationClick,
  className = "",
}: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = wrapRef.current;
      if (!el?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div ref={wrapRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
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
          className="absolute left-0 top-full z-50 mt-3 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
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
              <li className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                No notifications yet
              </li>
            ) : (
              items.map((item) => (
                <li key={item.id} className="mb-2 last:mb-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!item.read) void onMarkOneRead(item.id);
                      onNotificationClick?.(item);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:brightness-[0.99] ${
                      item.read
                        ? "border border-zinc-100 bg-white"
                        : "border border-[#FFD4C2]/60 border-l-4 border-l-[#FF6B35] bg-[#FFF2EB]"
                    }`}
                  >
                    <NotificationAvatar item={item} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-zinc-900">{item.userName}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-zinc-600">{item.actionText}</span>
                      <span className="mt-1 block text-xs text-zinc-400">
                        {formatNotificationTimeAgo(item.createdAt)}
                      </span>
                    </span>
                    <span className="mt-1 shrink-0">{contextIcon(item.type)}</span>
                  </button>
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
  );
}
