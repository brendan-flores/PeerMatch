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

module.exports = {
  MAX_PHOTO_DATA_URL_LENGTH,
  INVALID_PHOTO_MESSAGE,
  sanitizePhotoDataUrl,
};
