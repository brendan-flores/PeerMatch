const cookie = require('cookie');
const { Server } = require('socket.io');
const { COOKIE_NAME, verifyAccessToken } = require('../middleware/auth');
const { isValidId } = require('../db/id');
const Message = require('../models/Message');
const User = require('../models/User');
const { toChatMessageDto } = require('../utils/chatMessageDto');

/** @type {Map<string, Set<string>>} userId → socket ids */
const userIdToSocketIds = new Map();
/** @type {Map<string, string>} userId -> ISO timestamp when last seen offline */
const userIdToLastActiveAt = new Map();
/** @type {import('socket.io').Server | null} */
let ioInstance = null;

function markUserSocketConnected(userId, socketId) {
  const existing = userIdToSocketIds.get(userId);
  if (existing) {
    existing.add(socketId);
    return false;
  }
  userIdToSocketIds.set(userId, new Set([socketId]));
  return true;
}

function markUserSocketDisconnected(userId, socketId) {
  const sockets = userIdToSocketIds.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size > 0) return false;
  userIdToSocketIds.delete(userId);
  return true;
}

function getTokenFromHandshake(handshake) {
  const authToken = handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();
  const parsed = cookie.parse(handshake.headers.cookie || '');
  return parsed[COOKIE_NAME] || '';
}

/**
 * @param {import('http').Server} httpServer
 * @param {{ allowedOrigins: string[] }} options
 */
function attachSocketServer(httpServer, options) {
  const { allowedOrigins } = options;

  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
    },
  });
  ioInstance = io;

  io.use((socket, next) => {
    const token = getTokenFromHandshake(socket.handshake);
    const user = verifyAccessToken(token);
    if (!user) {
      return next(new Error('Unauthorized'));
    }
    socket.userId = user.userId;
    socket.userRole = user.role;
    return next();
  });

  io.on('connection', (socket) => {
    const uid = socket.userId;

    const becameOnline = markUserSocketConnected(uid, socket.id);
    if (becameOnline) {
      userIdToLastActiveAt.delete(uid);
      io.emit('presence_update', { userId: uid, online: true });
    }

    socket.emit('presence_snapshot', {
      onlineUserIds: Array.from(userIdToSocketIds.keys()),
      lastActiveByUserId: Object.fromEntries(userIdToLastActiveAt.entries()),
    });

    // Deliver any previously-sent messages to this user (offline → online).
    // We mark them as delivered once we emit them.
    Message.find({
      receiverId: uid,
      vanishedForUsers: { $nin: [uid] },
      $or: [{ status: 'sent' }, { status: { $exists: false } }],
    })
      .sort({ timestamp: 1 })
      .limit(200)
      .then(async (unread) => {
        if (!unread || unread.length === 0) return;
        const ids = unread.map((m) => m._id);

        await Message.updateMany({ _id: { $in: ids } }, { $set: { status: 'delivered' } });

        unread.forEach((m) => {
          const dto = toChatMessageDto(m, uid);
          socket.emit('receive_message', {
            ...dto,
            status: 'delivered',
          });

          const senderSockets = userIdToSocketIds.get(String(m.senderId));
          if (senderSockets && senderSockets.size > 0) {
            for (const sid of senderSockets) {
              io.to(sid).emit('message_status', {
                id: String(m._id),
                senderId: String(m.senderId),
                receiverId: String(m.receiverId),
                status: 'delivered',
              });
            }
          }
        });
      })
      .catch((err) => {
        console.error('Failed to deliver unread messages', err);
      });

    socket.on('register', (payload) => {
      const requested = String(payload?.userId || '').trim();
      if (requested !== uid) {
        socket.emit('socket_error', { message: 'Invalid registration.' });
        return;
      }
      const justOnline = markUserSocketConnected(uid, socket.id);
      if (justOnline) {
        userIdToLastActiveAt.delete(uid);
        io.emit('presence_update', { userId: uid, online: true });
      }
    });

    socket.on('send_message', async (payload) => {
      try {
        const receiverId = String(payload?.receiverId || '').trim();
        const text = String(payload?.message || '').trim();
        const clientMessageId = String(payload?.clientMessageId || '').trim();
        const replyToMessageIdRaw = String(payload?.replyToMessageId || '').trim();
        const forwardedFromPreview = String(payload?.forwardedFromPreview || '').trim().slice(0, 500);

        if (!receiverId || !text) {
          socket.emit('socket_error', { message: 'Message and recipient are required.' });
          return;
        }
        if (receiverId === uid) {
          socket.emit('socket_error', { message: 'Cannot message yourself.' });
          return;
        }
        if (!isValidId(receiverId)) {
          socket.emit('socket_error', { message: 'Invalid recipient.' });
          return;
        }

        const receiver = await User.findById(receiverId).select('_id').lean();
        if (!receiver) {
          socket.emit('socket_error', { message: 'Recipient not found.' });
          return;
        }

        let replyToMessageId = null;
        let replyPreview = '';
        if (replyToMessageIdRaw && isValidId(replyToMessageIdRaw)) {
          const parent = await Message.findById(replyToMessageIdRaw).lean();
          if (parent) {
            const ps = String(parent.senderId);
            const pr = String(parent.receiverId);
            const inThread =
              (ps === uid && pr === receiverId) || (ps === receiverId && pr === uid);
            if (inThread) {
              replyToMessageId = parent._id;
              replyPreview = parent.unsent
                ? 'Message'
                : String(parent.message || '').trim().slice(0, 280);
            }
          }
        }

        const createPayload = {
          senderId: uid,
          receiverId,
          message: text,
          timestamp: new Date(),
          status: 'sent',
        };
        if (replyToMessageId) {
          createPayload.replyToMessageId = replyToMessageId;
          createPayload.replyPreview = replyPreview || ' ';
        }
        if (forwardedFromPreview) {
          createPayload.forwardedFromPreview = forwardedFromPreview;
        }

        const doc = await Message.create(createPayload);
        const fresh = await Message.findById(doc._id).lean();

        const outSender = { ...toChatMessageDto(fresh, uid), status: 'sent' };
        socket.emit('message_sent', {
          ...outSender,
          ...(clientMessageId ? { clientMessageId } : {}),
        });

        const receiverSockets = userIdToSocketIds.get(receiverId);
        if (receiverSockets && receiverSockets.size > 0) {
          await Message.updateOne({ _id: doc._id }, { $set: { status: 'delivered' } });
          const delivered = await Message.findById(doc._id).lean();
          const outRecv = { ...toChatMessageDto(delivered, receiverId), status: 'delivered' };
          for (const sid of receiverSockets) {
            io.to(sid).emit('receive_message', outRecv);
          }
          socket.emit('message_status', {
            id: outSender.id,
            senderId: uid,
            receiverId,
            status: 'delivered',
          });
        }
      } catch (err) {
        console.error(err);
        socket.emit('socket_error', { message: 'Failed to send message.' });
      }
    });

    socket.on('mark_seen', async (payload) => {
      try {
        const otherUserId = String(payload?.otherUserId || '').trim();
        if (!otherUserId || !isValidId(otherUserId)) return;

        const docs = await Message.find({
          senderId: otherUserId,
          receiverId: uid,
          $or: [{ status: { $in: ['sent', 'delivered'] } }, { status: { $exists: false } }],
        })
          .select('_id senderId receiverId')
          .lean();

        if (!docs || docs.length === 0) return;

        const seenAt = new Date();
        const ids = docs.map((d) => d._id);
        await Message.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'seen', seenAt } },
        );

        const senderSockets = userIdToSocketIds.get(otherUserId);
        if (!senderSockets || senderSockets.size === 0) return;

        for (const d of docs) {
          for (const sid of senderSockets) {
            io.to(sid).emit('message_status', {
              id: String(d._id),
              senderId: String(d.senderId),
              receiverId: String(d.receiverId),
              status: 'seen',
              seenAt: seenAt.toISOString(),
            });
          }
        }
      } catch (err) {
        console.error('Failed to mark messages as seen via socket', err);
      }
    });

    socket.on('disconnect', () => {
      const becameOffline = markUserSocketDisconnected(uid, socket.id);
      if (becameOffline) {
        const lastActiveAt = new Date().toISOString();
        userIdToLastActiveAt.set(uid, lastActiveAt);
        io.emit('presence_update', { userId: uid, online: false, lastActiveAt });
      }
    });
  });

  return io;
}

function emitMessageUnsent(payload) {
  if (!ioInstance) return;
  const senderId = String(payload?.senderId || '').trim();
  const receiverId = String(payload?.receiverId || '').trim();
  const messageId = String(payload?.id || '').trim();
  if (!senderId || !receiverId || !messageId) return;

  const base = {
    id: messageId,
    senderId,
    receiverId,
    unsent: true,
    deletedForEveryone: true,
    message: '',
  };

  const senderSockets = userIdToSocketIds.get(senderId);
  if (senderSockets && senderSockets.size > 0) {
    for (const sid of senderSockets) {
      ioInstance.to(sid).emit('message_status', {
        ...base,
        tombstoneText: 'You deleted a message',
      });
    }
  }

  const receiverSockets = userIdToSocketIds.get(receiverId);
  if (receiverSockets && receiverSockets.size > 0) {
    for (const sid of receiverSockets) {
      ioInstance.to(sid).emit('message_status', {
        ...base,
        tombstoneText: 'This message was removed',
      });
    }
  }
}

function emitMessageReactionUpdate(payload) {
  if (!ioInstance) return;
  const senderId = String(payload?.senderId || '').trim();
  const receiverId = String(payload?.receiverId || '').trim();
  const messageId = String(payload?.id || '').trim();
  if (!senderId || !receiverId || !messageId) return;

  const out = {
    id: messageId,
    senderId,
    receiverId,
    reactions: Array.isArray(payload.reactions) ? payload.reactions : [],
  };

  const senderSockets = userIdToSocketIds.get(senderId);
  if (senderSockets && senderSockets.size > 0) {
    for (const sid of senderSockets) {
      ioInstance.to(sid).emit('message_reaction', out);
    }
  }
  const receiverSockets = userIdToSocketIds.get(receiverId);
  if (receiverSockets && receiverSockets.size > 0) {
    for (const sid of receiverSockets) {
      ioInstance.to(sid).emit('message_reaction', out);
    }
  }
}

function emitViewerRemovedMessage(payload) {
  if (!ioInstance) return;
  const affectedUserId = String(payload?.affectedUserId || '').trim();
  const messageId = String(payload?.id || '').trim();
  const senderId = String(payload?.senderId || '').trim();
  const receiverId = String(payload?.receiverId || '').trim();
  if (!affectedUserId || !messageId) return;

  const sockets = userIdToSocketIds.get(affectedUserId);
  if (!sockets || sockets.size === 0) return;

  const out = {
    id: messageId,
    senderId,
    receiverId,
    viewerRemoved: true,
    message: 'You deleted a message',
  };

  for (const sid of sockets) {
    ioInstance.to(sid).emit('message_status', out);
  }
}

function emitMessageVanishedForViewer(payload) {
  if (!ioInstance) return;
  const viewerId = String(payload?.viewerId || '').trim();
  const messageId = String(payload?.id || '').trim();
  const senderId = String(payload?.senderId || '').trim();
  const receiverId = String(payload?.receiverId || '').trim();
  if (!viewerId || !messageId) return;

  const sockets = userIdToSocketIds.get(viewerId);
  if (!sockets || sockets.size === 0) return;

  const out = {
    id: messageId,
    senderId,
    receiverId,
    vanishedForViewer: true,
  };

  for (const sid of sockets) {
    ioInstance.to(sid).emit('message_vanished_for_viewer', out);
  }
}

/**
 * Emit a real-time event to every socket owned by a user (e.g. post approved).
 * @param {string} userId
 * @param {string} event
 * @param {unknown} payload
 */
function emitToUser(userId, event, payload) {
  if (!ioInstance) return;
  const uid = String(userId || '').trim();
  if (!uid) return;
  const sockets = userIdToSocketIds.get(uid);
  if (!sockets || sockets.size === 0) return;
  for (const sid of sockets) {
    ioInstance.to(sid).emit(event, payload);
  }
}

module.exports = {
  attachSocketServer,
  emitMessageUnsent,
  emitMessageReactionUpdate,
  emitViewerRemovedMessage,
  emitMessageVanishedForViewer,
  emitToUser,
};
