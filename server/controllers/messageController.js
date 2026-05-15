const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
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

    // Allow either MongoDB ObjectId OR a partial/full name (e.g. "Roch", "Ro").
    // This prevents "Could not load conversation" when the UI passes a name.
    let otherId = rawOther;
    if (rawOther && !mongoose.Types.ObjectId.isValid(rawOther)) {
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

    const myOid = new mongoose.Types.ObjectId(myId);
    const otherOid = new mongoose.Types.ObjectId(otherId);

    const messages = await Message.find({
      $or: [
        { senderId: myOid, receiverId: otherOid },
        { senderId: otherOid, receiverId: myOid },
      ],
      vanishedForUsers: { $nin: [myOid] },
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
 * Returns a list of conversation partners that have at least one message
 * with the authenticated user.
 *
 * Response:
 * { conversations: [{ otherUserId, otherName, lastMessagePreview, lastTimestamp, hasUnread }] }
 */
async function getConversations(req, res) {
  try {
    const myId = String(req.user.userId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(myId)) {
      return res.json({ conversations: [] });
    }

    const myObjId = new mongoose.Types.ObjectId(myId);

    const conversations = await Message.aggregate([
      {
        $match: {
          $and: [
            { $or: [{ senderId: myObjId }, { receiverId: myObjId }] },
            { vanishedForUsers: { $nin: [myObjId] } },
          ],
        },
      },
      { $sort: { timestamp: -1 } },
      {
        $addFields: {
          otherUserId: {
            $cond: [{ $eq: ['$senderId', myObjId] }, '$receiverId', '$senderId'],
          },
        },
      },
      {
        $group: {
          _id: '$otherUserId',
          lastMessagePreview: {
            $first: {
              $cond: [{ $eq: ['$unsent', true] }, 'Deleted message', '$message'],
            },
          },
          lastTimestamp: { $first: '$timestamp' },
          lastStatus: { $first: { $ifNull: ['$status', 'sent'] } },
          lastReceiverId: { $first: '$receiverId' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          otherUserId: '$_id',
          otherName: { $ifNull: ['$user.name', 'Unknown'] },
          lastMessagePreview: 1,
          lastTimestamp: 1,
          hasUnread: {
            $cond: [
              {
                $and: [
                  { $eq: ['$lastReceiverId', myObjId] },
                  { $ne: ['$lastStatus', 'seen'] },
                ],
              },
              true,
              false,
            ],
          },
          _id: 0,
        },
      },
      { $sort: { lastTimestamp: -1 } },
      { $limit: 50 },
    ]);

    return res.json({
      conversations: conversations.map((c) => ({
        otherUserId: String(c.otherUserId),
        otherName: String(c.otherName || 'Unknown'),
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
 * POST /api/messages/seen
 * Marks messages as seen for the authenticated receiver.
 * Expected body: { otherUserId: string }
 */
async function markSeen(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const otherUserId = String(req.body?.otherUserId || '');

    if (!mongoose.Types.ObjectId.isValid(myId) || !mongoose.Types.ObjectId.isValid(otherUserId)) {
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
 * Unsend a single message if the authenticated user is the sender.
 */
async function deleteMessage(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const messageId = String(req.params.messageId || '');

    if (!mongoose.Types.ObjectId.isValid(myId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid id.' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Only allow the sender to delete their own message
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
 * Deletes all messages in a conversation between the authenticated user and another user.
 */
async function deleteConversation(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const otherUserId = String(req.params.otherUserId || '');

    if (!mongoose.Types.ObjectId.isValid(myId) || !mongoose.Types.ObjectId.isValid(otherUserId)) {
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
 * Hides a message for the authenticated user only (Messenger-style remove for you).
 */
async function removeMessageForMe(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const messageId = String(req.params.messageId || '');

    if (!mongoose.Types.ObjectId.isValid(myId) || !mongoose.Types.ObjectId.isValid(messageId)) {
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
 * Body: { emoji: string } — Messenger-style: one reaction per user; same emoji toggles off.
 */
async function setMessageReaction(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const messageId = String(req.params.messageId || '');
    const emoji = String(req.body?.emoji || '').trim();

    if (!mongoose.Types.ObjectId.isValid(myId) || !mongoose.Types.ObjectId.isValid(messageId)) {
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
      userId: new mongoose.Types.ObjectId(r.userId),
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
 * Incoming messages only: removes the message from this viewer's chat entirely (no tombstone).
 */
async function vanishIncomingMessageForViewer(req, res) {
  try {
    const myId = String(req.user.userId || '');
    const messageId = String(req.params.messageId || '');

    if (!mongoose.Types.ObjectId.isValid(myId) || !mongoose.Types.ObjectId.isValid(messageId)) {
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
  markSeen,
  deleteMessage,
  deleteConversation,
  removeMessageForMe,
  vanishIncomingMessageForViewer,
  setMessageReaction,
};
