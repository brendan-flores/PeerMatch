export type ChatMessageReaction = {
  userId: string;
  emoji: string;
};

export type ChatMessagePayload = {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
  status?: "sent" | "delivered" | "seen";
  seenAt?: string;
  clientMessageId?: string;
  unsent?: boolean;
  deletedForEveryone?: boolean;
  tombstoneText?: string;
  viewerRemoved?: boolean;
  reactions?: ChatMessageReaction[];
  replyTo?: { id: string; preview: string };
  forwardedFromPreview?: string;
};
