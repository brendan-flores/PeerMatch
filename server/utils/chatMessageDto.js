const mongoose = require('mongoose');

/** Messenger-style: at most one reaction per user per message. */
function dedupeReactions(reactions) {
  const list = Array.isArray(reactions) ? reactions : [];
  const byUser = new Map();
  for (const r of list) {
    const userId = String(r.userId);
    byUser.set(userId, { userId, emoji: String(r.emoji || '') });
  }
  return [...byUser.values()];
}

/** Same emoji removes; different emoji replaces the user's previous reaction. */
function toggleReactionForUser(reactions, myId, emoji) {
  const list = dedupeReactions(reactions);
  const idx = list.findIndex((r) => r.userId === myId);
  if (idx >= 0) {
    if (list[idx].emoji === emoji) return list.filter((_, i) => i !== idx);
    return list.map((r, i) => (i === idx ? { userId: myId, emoji } : r));
  }
  return [...list, { userId: myId, emoji }];
}

function mapReactions(m) {
  const list = Array.isArray(m.reactions) ? m.reactions : [];
  return dedupeReactions(
    list.map((r) => ({
      userId: String(r.userId),
      emoji: String(r.emoji || ''),
    })),
  );
}

function toChatMessageDto(m, myId) {
  const sid = String(m.senderId);
  const rid = String(m.receiverId);
  const removedList = (m.removedForUsers || []).map((id) => String(id));
  const hiddenForMe = removedList.includes(String(myId));

  const baseReply =
    m.replyToMessageId && mongoose.Types.ObjectId.isValid(String(m.replyToMessageId))
      ? { id: String(m.replyToMessageId), preview: String(m.replyPreview || '') }
      : undefined;

  if (m.unsent) {
    const isSender = sid === String(myId);
    return {
      id: String(m._id),
      senderId: sid,
      receiverId: rid,
      message: '',
      timestamp: m.timestamp.toISOString(),
      ...(m.status ? { status: m.status } : {}),
      ...(m.seenAt ? { seenAt: m.seenAt.toISOString() } : {}),
      unsent: true,
      deletedForEveryone: true,
      tombstoneText: isSender ? 'You deleted a message' : 'This message was removed',
      reactions: [],
    };
  }

  if (hiddenForMe) {
    return {
      id: String(m._id),
      senderId: sid,
      receiverId: rid,
      message: 'You deleted a message',
      timestamp: m.timestamp.toISOString(),
      ...(m.status ? { status: m.status } : {}),
      ...(m.seenAt ? { seenAt: m.seenAt.toISOString() } : {}),
      viewerRemoved: true,
      reactions: [],
    };
  }

  const fwd = String(m.forwardedFromPreview || '').trim();
  const rx = mapReactions(m);
  return {
    id: String(m._id),
    senderId: sid,
    receiverId: rid,
    message: m.message,
    timestamp: m.timestamp.toISOString(),
    ...(m.status ? { status: m.status } : {}),
    ...(m.seenAt ? { seenAt: m.seenAt.toISOString() } : {}),
    ...(rx.length ? { reactions: rx } : {}),
    ...(baseReply ? { replyTo: baseReply } : {}),
    ...(fwd ? { forwardedFromPreview: fwd } : {}),
  };
}

module.exports = {
  dedupeReactions,
  toggleReactionForUser,
  mapReactions,
  toChatMessageDto,
};
