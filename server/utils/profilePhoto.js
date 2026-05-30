/** Max stored data URL length (~3MB base64 payload). */
const MAX_PHOTO_DATA_URL_LENGTH = 3_000_000;

const INVALID_PHOTO_MESSAGE =
  'Could not save that image. Use a photo file (JPG, PNG, WebP, GIF, etc.) under about 3MB after upload.';

function sanitizePhotoDataUrl(value) {
  const str = String(value || '').trim();
  if (!str) return '';
  if (!/^data:image\/[a-zA-Z0-9+.-]+;base64,/i.test(str)) {
    return null;
  }
  if (str.length > MAX_PHOTO_DATA_URL_LENGTH) {
    return null;
  }
  return str;
}

/** Feed/list APIs must stay small — full base64 avatars break Vercel proxy responses. */
const MAX_FEED_AVATAR_DATA_URL_LENGTH = 512;

function photoDataUrlForFeed(value) {
  const str = String(value || '').trim();
  if (!str || str.length > MAX_FEED_AVATAR_DATA_URL_LENGTH) return undefined;
  if (!/^data:image\/[a-zA-Z0-9+.-]+;base64,/i.test(str)) return undefined;
  return str;
}

module.exports = {
  MAX_PHOTO_DATA_URL_LENGTH,
  MAX_FEED_AVATAR_DATA_URL_LENGTH,
  INVALID_PHOTO_MESSAGE,
  sanitizePhotoDataUrl,
  photoDataUrlForFeed,
};
