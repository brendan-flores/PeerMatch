const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('../socket/socketServer');

function mapNotificationToDto(doc, actorPhotoDataUrl) {
  if (!doc) return null;
  const createdAt = doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString();
  const photo =
    typeof actorPhotoDataUrl === 'string' && actorPhotoDataUrl.trim()
      ? actorPhotoDataUrl.trim()
      : undefined;
  return {
    id: String(doc._id),
    userName: String(doc.actorName || '').trim() || 'User',
    actionText: String(doc.actionText || '').trim(),
    createdAt,
    type: doc.type,
    read: !!doc.read,
    relatedTaskId: doc.relatedTaskId ? String(doc.relatedTaskId) : undefined,
    relatedOfferId: doc.relatedOfferId ? String(doc.relatedOfferId) : undefined,
    ...(photo ? { actorPhotoDataUrl: photo } : {}),
  };
}

async function photoUrlForActorId(actorId) {
  const id = String(actorId || '').trim();
  if (!id) return undefined;
  const user = await User.findById(id).select('photoDataUrl').lean();
  const photo = String(user?.photoDataUrl || '').trim();
  return photo || undefined;
}

/**
 * Attach each actor's current profile photo from the User collection.
 * @param {object[]} docs
 */
async function enrichNotificationsWithActorPhotos(docs) {
  if (!docs?.length) return [];

  const actorIds = [
    ...new Set(
      docs
        .map((doc) => (doc.actorId ? String(doc.actorId) : ''))
        .filter((id) => id && id.length > 0),
    ),
  ];

  const photoByActorId = new Map();
  if (actorIds.length > 0) {
    const users = await User.find({ _id: { $in: actorIds } }).select('photoDataUrl').lean();
    users.forEach((user) => {
      const photo = String(user.photoDataUrl || '').trim();
      if (photo) photoByActorId.set(String(user._id), photo);
    });
  }

  return docs.map((doc) => {
    const actorId = doc.actorId ? String(doc.actorId) : '';
    const photo = actorId ? photoByActorId.get(actorId) : undefined;
    return mapNotificationToDto(doc, photo);
  });
}

/**
 * @param {object} params
 * @param {string} params.recipientId
 * @param {string|null} [params.actorId]
 * @param {string} params.actorName
 * @param {string} params.type
 * @param {string} params.actionText
 * @param {string|null} [params.relatedTaskId]
 * @param {string|null} [params.relatedOfferId]
 */
async function createNotification(params) {
  const recipientId = String(params.recipientId || '').trim();
  const actorName = String(params.actorName || '').trim();
  const actionText = String(params.actionText || '').trim();
  const type = String(params.type || '').trim();

  if (!recipientId || !actorName || !actionText || !type) {
    throw new Error('Invalid notification payload.');
  }

  const doc = await Notification.create({
    recipientId,
    actorId: params.actorId || null,
    actorName,
    type,
    actionText,
    relatedTaskId: params.relatedTaskId || null,
    relatedOfferId: params.relatedOfferId || null,
    read: false,
  });

  const actorPhotoDataUrl =
    params.actorPhotoDataUrl !== undefined
      ? params.actorPhotoDataUrl
      : await photoUrlForActorId(params.actorId);
  const dto = mapNotificationToDto(doc, actorPhotoDataUrl);
  emitToUser(recipientId, 'notification', { notification: dto });
  return doc;
}

/**
 * Notify all active freelancers when a client creates a new task/post.
 * @param {{ clientId: string, clientName: string, taskId: string }} params
 */
async function notifyFreelancersNewTask({ clientId, clientName, taskId }) {
  const freelancers = await User.find({
    role: 'user',
    accountType: 'freelancer',
    suspended: { $ne: true },
    _id: { $ne: clientId },
  })
    .select('_id')
    .lean();

  if (!freelancers.length) return;

  const actionText = 'posted a new task';
  const name = String(clientName || '').trim() || 'A client';
  const actorPhotoDataUrl = await photoUrlForActorId(clientId);

  const docs = await Notification.insertMany(
    freelancers.map((freelancer) => ({
      recipientId: freelancer._id,
      actorId: clientId,
      actorName: name,
      type: 'new_task',
      actionText,
      relatedTaskId: taskId,
      read: false,
    })),
    { ordered: false },
  );

  for (const doc of docs) {
    const dto = mapNotificationToDto(doc, actorPhotoDataUrl);
    emitToUser(String(doc.recipientId), 'notification', { notification: dto });
  }
}

/**
 * Notify a client when a freelancer sends an offer.
 * @param {{ clientId: string, freelancerId: string, freelancerName: string, taskId: string, offerId: string }} params
 */
async function notifyClientNewOffer({ clientId, freelancerId, freelancerName, taskId, offerId }) {
  const name = String(freelancerName || '').trim() || 'A freelancer';
  await createNotification({
    recipientId: clientId,
    actorId: freelancerId,
    actorName: name,
    type: 'new_offer',
    actionText: 'sent you an offer',
    relatedTaskId: taskId,
    relatedOfferId: offerId,
  });
}

/**
 * System notification for the client after submitting a post for review.
 */
async function notifyClientPostReview({ clientId }) {
  await createNotification({
    recipientId: clientId,
    actorId: null,
    actorName: 'PeerMatch',
    type: 'post_review',
    actionText: 'Your post is under review and waiting for approval.',
    relatedTaskId: null,
  });
}

/**
 * System notification for the client when their post is approved.
 */
/**
 * Notify a freelancer when the client accepts their offer.
 */
async function notifyFreelancerOfferAccepted({
  freelancerId,
  clientId,
  clientName,
  taskId,
  offerId,
  taskTitle,
}) {
  const name = String(clientName || '').trim() || 'The client';
  const title = String(taskTitle || '').trim();
  const actionText = title
    ? `accepted your offer for "${title}"`
    : 'accepted your offer';
  await createNotification({
    recipientId: freelancerId,
    actorId: clientId,
    actorName: name,
    type: 'response',
    actionText,
    relatedTaskId: taskId,
    relatedOfferId: offerId,
  });
}

/**
 * Notify a freelancer when the client marks a task as completed.
 */
/**
 * Notify a freelancer when the client rejects their offer.
 */
async function notifyFreelancerOfferRejected({
  freelancerId,
  clientId,
  clientName,
  taskId,
  offerId,
  taskTitle,
}) {
  const name = String(clientName || '').trim() || 'The client';
  const title = String(taskTitle || '').trim();
  const actionText = title
    ? `declined your offer for "${title}"`
    : 'declined your offer';
  await createNotification({
    recipientId: freelancerId,
    actorId: clientId,
    actorName: name,
    type: 'response',
    actionText,
    relatedTaskId: taskId,
    relatedOfferId: offerId,
  });
}

async function notifyFreelancerTaskCompleted({ freelancerId, clientId, clientName, taskId, taskTitle }) {
  const name = String(clientName || '').trim() || 'The client';
  const title = String(taskTitle || '').trim();
  const actionText = title
    ? `marked "${title}" as completed`
    : 'marked your task as completed';
  await createNotification({
    recipientId: freelancerId,
    actorId: clientId,
    actorName: name,
    type: 'response',
    actionText,
    relatedTaskId: taskId,
  });
}

async function notifyClientPostApproved({ clientId, taskId }) {
  await Notification.updateMany(
    { recipientId: clientId, type: 'post_review', read: false },
    { $set: { read: true } },
  );

  await createNotification({
    recipientId: clientId,
    actorId: null,
    actorName: 'PeerMatch',
    type: 'post_approved',
    actionText: 'Your post has been approved.',
    relatedTaskId: taskId || null,
  });
}

module.exports = {
  mapNotificationToDto,
  enrichNotificationsWithActorPhotos,
  createNotification,
  notifyFreelancersNewTask,
  notifyClientNewOffer,
  notifyClientPostReview,
  notifyClientPostApproved,
  notifyFreelancerOfferAccepted,
  notifyFreelancerOfferRejected,
  notifyFreelancerTaskCompleted,
};
