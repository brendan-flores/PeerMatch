const { getSupabaseAdmin } = require('../db/supabaseAdmin');
const { createModel } = require('../db/createModel');
const { rowsToDocs } = require('../db/mappers');
const TABLES = require('../db/tables');

const Message = createModel({
  entity: 'message',
  table: TABLES.MESSAGES,
});

/**
 * Replaces MongoDB aggregation for GET /api/messages/conversations.
 * @param {string} myId
 */
Message.getConversationsAggregate = async function getConversationsAggregate(myId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLES.MESSAGES)
    .select('id, sender_id, receiver_id, message, timestamp, status, unsent, vanished_for_users')
    .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
    .order('timestamp', { ascending: false })
    .limit(5000);

  if (error) throw error;

  const messages = rowsToDocs('message', data).filter((m) => {
    const vanished = (m.vanishedForUsers || []).map(String);
    return !vanished.includes(String(myId));
  });

  const byOther = new Map();
  for (const m of messages) {
    const otherUserId =
      String(m.senderId) === String(myId) ? String(m.receiverId) : String(m.senderId);
    if (!byOther.has(otherUserId)) {
      byOther.set(otherUserId, {
        otherUserId,
        lastMessagePreview: m.unsent ? 'Deleted message' : String(m.message || ''),
        lastTimestamp: m.timestamp,
        lastStatus: m.status || 'sent',
        lastReceiverId: String(m.receiverId),
      });
    }
  }

  let conversations = [...byOther.values()];
  conversations.sort((a, b) => {
    const at = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
    const bt = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
    return bt - at;
  });
  conversations = conversations.slice(0, 50);

  const otherIds = conversations.map((c) => c.otherUserId).filter(Boolean);
  const User = require('./User');
  const users =
    otherIds.length > 0
      ? await User.find({ _id: { $in: otherIds } }).select('name photoDataUrl').lean()
      : [];
  const userById = new Map(users.map((u) => [String(u._id), u]));

  return conversations.map((c) => {
    const user = userById.get(String(c.otherUserId));
    const photo = user?.photoDataUrl;
    return {
      otherUserId: c.otherUserId,
      otherName: user?.name || 'Unknown',
      otherPhotoDataUrl: typeof photo === 'string' ? photo : '',
      lastMessagePreview: c.lastMessagePreview,
      lastTimestamp: c.lastTimestamp,
      hasUnread:
        String(c.lastReceiverId) === String(myId) && String(c.lastStatus || 'sent') !== 'seen',
    };
  });
};

module.exports = Message;
