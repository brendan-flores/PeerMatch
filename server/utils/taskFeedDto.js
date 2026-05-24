const URGENCY_VALUES = ['low', 'normal', 'high'];

function normalizeUrgency(value) {
  const raw = String(value || 'normal').trim().toLowerCase();
  return URGENCY_VALUES.includes(raw) ? raw : 'normal';
}

function urgencyLabel(value) {
  const normalized = normalizeUrgency(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function resolveClientId(task) {
  const raw = task?.clientId;
  if (!raw) return '';
  if (typeof raw === 'object' && raw._id) return String(raw._id);
  return String(raw);
}

function mapTaskToFeedPost(task, client) {
  const clientDoc =
    client && typeof client === 'object' && client._id
      ? client
      : task.clientId && typeof task.clientId === 'object' && task.clientId.name
        ? task.clientId
        : client || null;
  const authorId = resolveClientId(task) || (clientDoc?._id ? String(clientDoc._id) : '');
  return {
    id: String(task._id),
    authorId,
    authorName: clientDoc?.name || 'Client User',
    authorEmail: clientDoc?.email || '',
    authorAccountType: clientDoc?.accountType || 'client',
    authorAvatarDataUrl: clientDoc?.photoDataUrl || undefined,
    title: task.title,
    content: task.description || '',
    category: task.subjectCategory || 'General',
    priority: urgencyLabel(task.urgency),
    budget: typeof task.budget === 'number' ? task.budget : 0,
    status: task.status,
    hireStatus: task.hireStatus || 'open',
    assignedFreelancerId: task.assignedFreelancerId
      ? String(task.assignedFreelancerId?._id || task.assignedFreelancerId)
      : undefined,
    assignedFreelancerName: task.assignedFreelancerName || undefined,
    completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : undefined,
    reviewSubmittedAt: task.reviewSubmittedAt
      ? new Date(task.reviewSubmittedAt).toISOString()
      : undefined,
    reviewRating: typeof task.reviewRating === 'number' ? task.reviewRating : null,
    reviewText: task.reviewText ? String(task.reviewText) : undefined,
    createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString(),
  };
}

module.exports = {
  URGENCY_VALUES,
  mapTaskToFeedPost,
  urgencyLabel,
  normalizeUrgency,
};
