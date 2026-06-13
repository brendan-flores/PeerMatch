const Message = require('../models/Message');
const User = require('../models/User');
const { isValidId } = require('../db/id');
const {
  emitMessageUnsent,
  emitMessageReactionUpdate,
  emitViewerRemovedMessage,
  emitMessageVanishedForViewer,
} = require('../socket/socketServer');
const { mapReactions, toChatMessageDto, toggleReactionForUser } = require('../utils/chatMessageDto');

const ALLOWED_REACTIONS = new Set(['❤️', '😆', '😮', '😢', '😡', '👍']);

/**
 * GET /api/messages/conversation/:otherUserId
 */
async function getConversation(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const rawOther = String(req.params.otherUserId || '').trim();

    let otherId = rawOther;
    if (rawOther && !isValidId(rawOther)) {
      const tokens = rawOther
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const safeTokens = tokens.map((t) =>
        String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      );

      const nameQuery =
        safeTokens.length > 0
          ? {
              $and: safeTokens.map((token) => ({
                name: { $regex: token, $options: 'i' },
              })),
            }
          : null;

      const otherUser = nameQuery
        ? await User.findOne({
            verified: true,
            suspended: { $ne: true },
            ...nameQuery,
          }).select('_id')
        : null;

      if (!otherUser) {
        return res.json({ messages: [] });
      }
      otherId = String(otherUser._id);
    }

    if (!otherId || otherId === myId) {
      return res.json({ messages: [] });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
      vanishedForUsers: { $nin: [myId] },
    })
      .sort({ timestamp: 1 })
      .limit(500)
      .lean();

    return res.json({
      messages: messages.map((m) => toChatMessageDto(m, myId)),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not load messages.' });
  }
}

/**
 * GET /api/messages/conversations
 */
async function getConversations(req, res) {
  try {
    const myId = String(req.user.userId || '').trim();
    if (!isValidId(myId)) {
      return res.json({ conversations: [] });
    }

    const conversations = await Message.getConversationsAggregate(myId);

    return res.json({
      conversations: conversations.map((c) => ({
        otherUserId: String(c.otherUserId),
        otherName: String(c.otherName || 'Unknown'),
        otherPhotoDataUrl: String(c.otherPhotoDataUrl || '').trim(),
        lastMessagePreview: String(c.lastMessagePreview || ''),
        lastTimestamp: c.lastTimestamp ? new Date(c.lastTimestamp).toISOString() : null,
        hasUnread: Boolean(c.hasUnread),
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not load conversations.' });
  }
}

/**
 * GET /api/messages/unread-count
 */
async function getUnreadCount(req, res) {
  try {
    const myId = String(req.user.userId || '').trim();
    if (!isValidId(myId)) {
      return res.json({ count: 0 });
    }

    const count = await Message.countDocuments({
      receiverId: myId,
      unsent: { $ne: true },
      vanishedForUsers: { $nin: [myId] },
      $or: [{ status: { $in: ['sent', 'delivered'] } }, { status: { $exists: false } }],
    });

    return res.json({ count });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not load unread count.' });
  }
}

/**
 * POST /api/messages/seen
 */
async function markSeen(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const otherUserId = String(req.body?.otherUserId || '');

    if (!isValidId(myId) || !isValidId(otherUserId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    await Message.updateMany(
      {
        senderId: otherUserId,
        receiverId: myId,
        $or: [{ status: { $in: ['sent', 'delivered'] } }, { status: { $exists: false } }],
      },
      { $set: { status: 'seen', seenAt: new Date() } },
    );

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not mark messages as seen.' });
  }
}

/**
 * DELETE /api/messages/:messageId
 */
async function deleteMessage(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const messageId = String(req.params.messageId || '');

    if (!isValidId(myId) || !isValidId(messageId)) {
      return res.status(400).json({ message: 'Invalid id.' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    if (String(message.senderId) !== myId) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }

    if (message.unsent) {
      return res.status(409).json({ message: 'Message already unsent.' });
    }

    message.unsent = true;
    message.message = 'Message unsent';
    await message.save();

    emitMessageUnsent({
      id: String(message._id),
      senderId: String(message.senderId),
      receiverId: String(message.receiverId),
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not delete message.' });
  }
}

/**
 * DELETE /api/messages/conversation/:otherUserId
 */
async function deleteConversation(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const otherUserId = String(req.params.otherUserId || '');

    if (!isValidId(myId) || !isValidId(otherUserId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    if (otherUserId === myId) {
      return res.status(400).json({ message: 'Cannot delete conversation with yourself.' });
    }

    await Message.deleteMany({
      $or: [
        { senderId: myId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: myId },
      ],
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not delete conversation.' });
  }
}

/**
 * POST /api/messages/:messageId/remove-for-me
 */
async function removeMessageForMe(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const messageId = String(req.params.messageId || '');

    if (!isValidId(myId) || !isValidId(messageId)) {
      return res.status(400).json({ message: 'Invalid id.' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    if (message.unsent) {
      return res.status(409).json({ message: 'Message is no longer available.' });
    }

    const sid = String(message.senderId);
    const rid = String(message.receiverId);
    if (sid !== myId && rid !== myId) {
      return res.status(403).json({ message: 'Not part of this conversation.' });
    }

    await Message.updateOne(
      { _id: message._id },
      { $addToSet: { removedForUsers: myId } },
    );

    emitViewerRemovedMessage({
      id: String(message._id),
      senderId: sid,
      receiverId: rid,
      affectedUserId: myId,
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not update message.' });
  }
}

/**
 * POST /api/messages/:messageId/reactions
 */
async function setMessageReaction(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const messageId = String(req.params.messageId || '');
    const emoji = String(req.body?.emoji || '').trim();

    if (!isValidId(myId) || !isValidId(messageId)) {
      return res.status(400).json({ message: 'Invalid id.' });
    }

    if (!ALLOWED_REACTIONS.has(emoji)) {
      return res.status(400).json({ message: 'Reaction not allowed.' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    if (message.unsent) {
      return res.status(409).json({ message: 'Cannot react to this message.' });
    }

    const sid = String(message.senderId);
    const rid = String(message.receiverId);
    if (sid !== myId && rid !== myId) {
      return res.status(403).json({ message: 'Not part of this conversation.' });
    }

    const next = toggleReactionForUser(message.reactions, myId, emoji);
    message.reactions = next.map((r) => ({
      userId: r.userId,
      emoji: r.emoji,
    }));
    await message.save();

    const payload = {
      id: String(message._id),
      senderId: sid,
      receiverId: rid,
      reactions: mapReactions(message),
    };

    emitMessageReactionUpdate(payload);

    return res.json({ reactions: payload.reactions });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not save reaction.' });
  }
}

/**
 * POST /api/messages/:messageId/vanish-for-me
 */
async function vanishIncomingMessageForViewer(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const messageId = String(req.params.messageId || '');

    if (!isValidId(myId) || !isValidId(messageId)) {
      return res.status(400).json({ message: 'Invalid id.' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    if (message.unsent) {
      return res.status(409).json({ message: 'Message is no longer available.' });
    }

    const sid = String(message.senderId);
    const rid = String(message.receiverId);
    if (sid !== myId && rid !== myId) {
      return res.status(403).json({ message: 'Not part of this conversation.' });
    }

    if (sid === myId) {
      return res.status(400).json({ message: 'Use Unsend for your own messages.' });
    }

    await Message.updateOne({ _id: message._id }, { $addToSet: { vanishedForUsers: myId } });

    emitMessageVanishedForViewer({
      id: String(message._id),
      senderId: sid,
      receiverId: rid,
      viewerId: myId,
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Could not update message.' });
  }
}

module.exports = {
  getConversation,
  getConversations,
  getUnreadCount,
  markSeen,
  deleteMessage,
  deleteConversation,
  removeMessageForMe,
  vanishIncomingMessageForViewer,
  setMessageReaction,
};
