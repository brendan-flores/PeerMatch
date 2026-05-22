"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetJson } from "@/app/lib/api";
import { connectSocket, subscribeMessageStatus, subscribeReceiveMessage } from "@/app/lib/socket";

export const UNREAD_MESSAGES_REFRESH_EVENT = "peermatch:unread-messages-refresh";

export function dispatchUnreadMessagesRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(UNREAD_MESSAGES_REFRESH_EVENT));
}

export function useUnreadMessageCount(userId: string | null) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    try {
      const res = await apiGetJson<{ count: number }>("/api/messages/unread-count");
      const next = typeof res.count === "number" && res.count > 0 ? Math.floor(res.count) : 0;
      setCount(next);
    } catch {
      // keep previous count on transient errors
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    connectSocket(userId);

    const unsubReceive = subscribeReceiveMessage((msg) => {
      if (String(msg.receiverId || "").trim() === userId) {
        void refresh();
      }
    });

    const unsubStatus = subscribeMessageStatus((payload) => {
      if (String(payload.receiverId || "").trim() === userId && payload.status === "seen") {
        void refresh();
      }
    });

    const onRefreshEvent = () => void refresh();
    window.addEventListener(UNREAD_MESSAGES_REFRESH_EVENT, onRefreshEvent);

    return () => {
      unsubReceive();
      unsubStatus();
      window.removeEventListener(UNREAD_MESSAGES_REFRESH_EVENT, onRefreshEvent);
    };
  }, [userId, refresh]);

  return { count, refresh };
}
