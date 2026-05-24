"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationItem } from "@/app/lib/notifications";

export type { NotificationItem };
import {
  deleteNotification,
  fetchNotifications,
  mapApiNotification,
  markAllNotificationsRead,
  markNotificationRead,
  upsertNotificationItem,
  type ApiNotification,
} from "@/app/lib/notificationsApi";
import { connectSocket, subscribeNotification } from "@/app/lib/socket";

export function useNotifications(userId: string | null) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await fetchNotifications();
      setItems(list);
    } catch {
      // keep existing items on transient errors
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    connectSocket(userId);
    const unsub = subscribeNotification((payload) => {
      const raw = payload?.notification;
      if (!raw?.id) return;
      const incoming = mapApiNotification(raw as ApiNotification);
      setItems((prev) => upsertNotificationItem(prev, incoming));
    });
    return unsub;
  }, [userId]);

  const markAllRead = useCallback(async () => {
    try {
      const list = await markAllNotificationsRead();
      setItems(list);
    } catch {
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    }
  }, []);

  const markOneRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    try {
      const updated = await markNotificationRead(id);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch {
      // optimistic update already applied
    }
  }, []);

  const deleteOne = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      try {
        await deleteNotification(id);
      } catch {
        void refresh();
      }
    },
    [refresh],
  );

  return { items, loading, refresh, markAllRead, markOneRead, deleteOne };
}
