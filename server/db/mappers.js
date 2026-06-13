/** camelCase JS field → snake_case DB column per entity. */
const FIELD_MAPS = {
  user: {
    _id: 'id',
    id: 'id',
    username: 'username',
    name: 'name',
    email: 'email',
    password: 'password',
    role: 'role',
    accountType: 'account_type',
    course: 'course',
    yearLevel: 'year_level',
    aboutMe: 'about_me',
    skills: 'skills',
    location: 'location',
    photoDataUrl: 'photo_data_url',
    freelancerProfile: 'freelancer_profile',
    profileCompleted: 'profile_completed',
    verified: 'verified',
    verification: 'verification',
    suspended: 'suspended',
    createdAt: 'created_at',
  },
  clientTask: {
    _id: 'id',
    id: 'id',
    title: 'title',
    description: 'description',
    subjectCategory: 'subject_category',
    urgency: 'urgency',
    clientId: 'client_id',
    budget: 'budget',
    category: 'category',
    status: 'status',
    hireStatus: 'hire_status',
    assignedFreelancerId: 'assigned_freelancer_id',
    completedAt: 'completed_at',
    reviewRating: 'review_rating',
    reviewText: 'review_text',
    reviewSubmittedAt: 'review_submitted_at',
    flagged: 'flagged',
    approvedBy: 'approved_by',
    rejectedBy: 'rejected_by',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  adminActivity: {
    _id: 'id',
    id: 'id',
    title: 'title',
    sub: 'sub',
    badge: 'badge',
    kind: 'kind',
    occurredAt: 'occurred_at',
    clientName: 'client_name',
    moderatorName: 'moderator_name',
    taskTitle: 'task_title',
    taskId: 'task_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  freelancerReview: {
    _id: 'id',
    id: 'id',
    freelancerId: 'freelancer_id',
    clientId: 'client_id',
    taskId: 'task_id',
    reviewerName: 'reviewer_name',
    text: 'text',
    rating: 'rating',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  message: {
    _id: 'id',
    id: 'id',
    senderId: 'sender_id',
    receiverId: 'receiver_id',
    message: 'message',
    timestamp: 'timestamp',
    status: 'status',
    seenAt: 'seen_at',
    unsent: 'unsent',
    removedForUsers: 'removed_for_users',
    vanishedForUsers: 'vanished_for_users',
    reactions: 'reactions',
    replyToMessageId: 'reply_to_message_id',
    replyPreview: 'reply_preview',
    forwardedFromPreview: 'forwarded_from_preview',
  },
  notification: {
    _id: 'id',
    id: 'id',
    recipientId: 'recipient_id',
    actorId: 'actor_id',
    actorName: 'actor_name',
    type: 'type',
    actionText: 'action_text',
    relatedTaskId: 'related_task_id',
    relatedOfferId: 'related_offer_id',
    read: 'read',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  offer: {
    _id: 'id',
    id: 'id',
    postId: 'post_id',
    postTitle: 'post_title',
    freelancerId: 'freelancer_id',
    freelancerName: 'freelancer_name',
    clientId: 'client_id',
    rate: 'rate',
    message: 'message',
    status: 'status',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
};

const JSONB_FIELDS = new Set([
  'freelancer_profile',
  'verification',
  'removed_for_users',
  'vanished_for_users',
  'reactions',
]);

const DATE_FIELDS = new Set([
  'created_at',
  'updated_at',
  'occurred_at',
  'completed_at',
  'review_submitted_at',
  'timestamp',
  'seen_at',
]);

function getFieldMap(entity) {
  const map = FIELD_MAPS[entity];
  if (!map) throw new Error(`Unknown entity: ${entity}`);
  return map;
}

function jsToDb(entity, jsField) {
  const map = getFieldMap(entity);
  if (jsField === '_id') return 'id';
  return map[jsField] || jsField;
}

function dbToJs(entity, dbCol) {
  const map = getFieldMap(entity);
  for (const [js, db] of Object.entries(map)) {
    if (db === dbCol && js !== 'id') return js;
  }
  if (dbCol === 'id') return '_id';
  return dbCol;
}

function normalizeJsonb(value) {
  if (value == null) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function rowToDoc(entity, row) {
  if (!row) return null;
  const map = getFieldMap(entity);
  const doc = {};
  for (const [jsField, dbCol] of Object.entries(map)) {
    if (jsField === 'id') continue;
    if (!(dbCol in row)) continue;
    let val = row[dbCol];
    if (JSONB_FIELDS.has(dbCol)) val = normalizeJsonb(val);
    if (DATE_FIELDS.has(dbCol) && val != null) val = new Date(val);
    doc[jsField] = val;
  }
  if (doc._id == null && row.id != null) doc._id = row.id;
  return doc;
}

function docToRow(entity, doc, { forInsert = false } = {}) {
  const map = getFieldMap(entity);
  const row = {};
  const source = { ...doc };
  if (source._id != null && source.id == null) source.id = source._id;

  for (const [jsField, dbCol] of Object.entries(map)) {
    if (jsField === '_id' || jsField === 'id') continue;
    if (!(jsField in source)) continue;
    let val = source[jsField];
    if (val === undefined) continue;
    if (JSONB_FIELDS.has(dbCol) && val != null && typeof val !== 'string') {
      val = val;
    }
    if (DATE_FIELDS.has(dbCol) && val instanceof Date) {
      val = val.toISOString();
    }
    row[dbCol] = val;
  }

  if (!forInsert && (source._id != null || source.id != null)) {
    row.id = String(source._id || source.id);
  }

  return row;
}

function rowsToDocs(entity, rows) {
  return (rows || []).map((row) => rowToDoc(entity, row));
}

module.exports = {
  FIELD_MAPS,
  getFieldMap,
  jsToDb,
  dbToJs,
  rowToDoc,
  docToRow,
  rowsToDocs,
};
