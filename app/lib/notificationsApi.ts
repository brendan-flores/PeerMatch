import { apiDeleteJson, apiGetJson, apiPatchJson } from "./api";
import type { NotificationItem } from "./notifications";

export type ApiNotification = {
  id: string;
  userName: string;
  actionText: string;
  createdAt: string;
  type: NotificationItem["type"];
  read: boolean;
  relatedTaskId?: string;
  relatedOfferId?: string;
  actorPhotoDataUrl?: string;
};

export function mapApiNotification(n: ApiNotification): NotificationItem {
  const photo = String(n.actorPhotoDataUrl || "").trim();
  const relatedTaskId = String(n.relatedTaskId || "").trim();
  const relatedOfferId = String(n.relatedOfferId || "").trim();
  return {
    id: n.id,
    userName: n.userName,
    actionText: n.actionText,
    createdAt: n.createdAt,
    type: n.type,
    read: n.read,
    ...(photo ? { actorPhotoDataUrl: photo } : {}),
    ...(relatedTaskId ? { relatedTaskId } : {}),
    ...(relatedOfferId ? { relatedOfferId } : {}),
  };
}

export function upsertNotificationItem(
  items: NotificationItem[],
  incoming: NotificationItem,
): NotificationItem[] {
  const withoutDup = items.filter((item) => item.id !== incoming.id);
  return [incoming, ...withoutDup].slice(0, 50);
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await apiGetJson<{ notifications: ApiNotification[] }>("/api/notifications");
  return (res.notifications || []).map(mapApiNotification);
}

export async function markAllNotificationsRead(): Promise<NotificationItem[]> {
  const res = await apiPatchJson<{ notifications: ApiNotification[] }>("/api/notifications/read-all", {});
  return (res.notifications || []).map(mapApiNotification);
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const res = await apiPatchJson<{ notification: ApiNotification }>(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    {},
  );
  return mapApiNotification(res.notification);
}

export async function deleteNotification(id: string): Promise<void> {
  await apiDeleteJson<{ ok: boolean }>(`/api/notifications/${encodeURIComponent(id)}`);
}
