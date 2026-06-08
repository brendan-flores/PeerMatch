import { getSocketBaseUrl } from "../api/siteUrls";
import { io, type Socket } from "socket.io-client";
import type { ChatMessagePayload } from "./chatTypes";

function getSocketUrl(): string {
  return getSocketBaseUrl();
}

let socket: Socket | null = null;
let activeUserId: string | null = null;

function emitRegister(userId: string) {
  if (!socket) return;
  socket.emit("register", { userId });
}

/**
 * Connects the shared Socket.IO client (credentials: HTTP-only JWT cookie).
 * Idempotent for the same user; re-registers on reconnect.
 */
export function connectSocket(userId: string): Socket {
  const id = String(userId || "").trim();
  if (!id) {
    throw new Error("connectSocket requires a user id.");
  }
  activeUserId = id;

  if (!socket) {
    socket = io(getSocketUrl(), {
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      if (activeUserId) {
        emitRegister(activeUserId);
      }
    });
  } else if (socket.connected) {
    emitRegister(id);
  }

  return socket;
}

export function disconnectSocket(): void {
  activeUserId = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getChatSocket(): Socket | null {
  return socket;
}

export function sendChatMessage(receiverId: string, message: string): void {
  const s = socket;
  if (!s?.connected) return;
  const rid = String(receiverId || "").trim();
  const text = String(message || "").trim();
  if (!rid || !text) return;
  s.emit("send_message", { receiverId: rid, message: text });
}

export type SendMessageExtras = {
  replyToMessageId?: string;
  forwardedFromPreview?: string;
};

export function sendChatMessageWithClientId(
  receiverId: string,
  message: string,
  clientMessageId: string,
  extras?: SendMessageExtras,
): void {
  const s = socket;
  if (!s?.connected) return;
  const rid = String(receiverId || "").trim();
  const text = String(message || "").trim();
  const cid = String(clientMessageId || "").trim();
  if (!rid || !text || !cid) return;
  const replyToMessageId = String(extras?.replyToMessageId || "").trim();
  const forwardedFromPreview = String(extras?.forwardedFromPreview || "").trim().slice(0, 500);
  s.emit("send_message", {
    receiverId: rid,
    message: text,
    clientMessageId: cid,
    ...(replyToMessageId ? { replyToMessageId } : {}),
    ...(forwardedFromPreview ? { forwardedFromPreview } : {}),
  });
}

/**
 * Subscribe to incoming messages. Removes the listener on the returned cleanup.
 * Avoid duplicate handlers by always unsubscribing in useEffect cleanup.
 */
export function subscribeReceiveMessage(handler: (msg: ChatMessagePayload) => void): () => void {
  const s = socket;
  if (!s) {
    return () => {};
  }
  s.on("receive_message", handler);
  return () => {
    s.off("receive_message", handler);
  };
}

export function subscribeSocketError(handler: (payload: { message?: string }) => void): () => void {
  const s = socket;
  if (!s) {
    return () => {};
  }
  s.on("socket_error", handler);
  return () => {
    s.off("socket_error", handler);
  };
}

export type MessageStatusPayload = {
  id?: string;
  senderId?: string;
  receiverId?: string;
  status?: "sent" | "delivered" | "seen";
  seenAt?: string;
  unsent?: boolean;
  message?: string;
  deletedForEveryone?: boolean;
  tombstoneText?: string;
  viewerRemoved?: boolean;
};

export type MessageReactionPayload = {
  id?: string;
  senderId?: string;
  receiverId?: string;
  reactions?: { userId: string; emoji: string }[];
};

export type MessageVanishedPayload = {
  id?: string;
  senderId?: string;
  receiverId?: string;
  vanishedForViewer?: boolean;
};

export function subscribeMessageStatus(handler: (payload: MessageStatusPayload) => void): () => void {
  const s = socket;
  if (!s) {
    return () => {};
  }
  s.on("message_status", handler);
  return () => {
    s.off("message_status", handler);
  };
}

export function subscribeMessageSent(handler: (payload: ChatMessagePayload) => void): () => void {
  const s = socket;
  if (!s) {
    return () => {};
  }
  s.on("message_sent", handler);
  return () => {
    s.off("message_sent", handler);
  };
}

export function subscribeMessageReaction(handler: (payload: MessageReactionPayload) => void): () => void {
  const s = socket;
  if (!s) {
    return () => {};
  }
  s.on("message_reaction", handler);
  return () => {
    s.off("message_reaction", handler);
  };
}

export function subscribeMessageVanishedForViewer(handler: (payload: MessageVanishedPayload) => void): () => void {
  const s = socket;
  if (!s) {
    return () => {};
  }
  s.on("message_vanished_for_viewer", handler);
  return () => {
    s.off("message_vanished_for_viewer", handler);
  };
}

export function emitMarkSeen(otherUserId: string): void {
  const s = socket;
  if (!s?.connected) return;
  const id = String(otherUserId || "").trim();
  if (!id) return;
  s.emit("mark_seen", { otherUserId: id });
}

export type PresenceUpdatePayload = {
  userId?: string;
  online?: boolean;
  lastActiveAt?: string;
};

export type PresenceSnapshotPayload = {
  onlineUserIds?: string[];
  lastActiveByUserId?: Record<string, string>;
};

export function subscribePresenceUpdate(handler: (payload: PresenceUpdatePayload) => void): () => void {
  const s = socket;
  if (!s) {
    return () => {};
  }
  s.on("presence_update", handler);
  return () => {
    s.off("presence_update", handler);
  };
}

export function subscribePresenceSnapshot(handler: (payload: PresenceSnapshotPayload) => void): () => void {
  const s = socket;
  if (!s) {
    return () => {};
  }
  s.on("presence_snapshot", handler);
  return () => {
    s.off("presence_snapshot", handler);
  };
}

export type PostApprovedPayload = {
  message?: string;
  post?: {
    id: string;
    authorId: string;
    authorName: string;
    authorEmail?: string;
    authorAccountType?: string;
    authorAvatarDataUrl?: string;
    title: string;
    content: string;
    category: string;
    priority: string;
    createdAt: string;
    budget?: number;
  };
};

export function subscribePostApproved(handler: (payload: PostApprovedPayload) => void): () => void {
  const s = socket;
  if (!s) {
    return () => {};
  }
  s.on("post_approved", handler);
  return () => {
    s.off("post_approved", handler);
  };
}

export type NotificationSocketPayload = {
  notification?: {
    id: string;
    userName: string;
    actionText: string;
    createdAt: string;
    type: string;
    read: boolean;
    relatedTaskId?: string;
    relatedOfferId?: string;
    actorPhotoDataUrl?: string;
  };
};

export function subscribeNotification(handler: (payload: NotificationSocketPayload) => void): () => void {
  const s = socket;
  if (!s) {
    return () => {};
  }
  s.on("notification", handler);
  return () => {
    s.off("notification", handler);
  };
}
