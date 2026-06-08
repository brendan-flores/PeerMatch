import { apiGetJson, apiPatchJson } from "../api/client";

export const USER_PROFILE_PHOTO_UPDATED_EVENT = "peermatch:user-profile-photo-updated";

/** Keep under server MAX_PHOTO_DATA_URL_LENGTH after base64 encoding */
export const MAX_STORED_PHOTO_DATA_URL_LENGTH = 2_900_000;

const COMPRESS_ATTEMPTS: { maxDimension: number; quality: number }[] = [
  { maxDimension: 1600, quality: 0.92 },
  { maxDimension: 1200, quality: 0.88 },
  { maxDimension: 1024, quality: 0.85 },
  { maxDimension: 768, quality: 0.82 },
  { maxDimension: 512, quality: 0.78 },
  { maxDimension: 384, quality: 0.72 },
  { maxDimension: 256, quality: 0.65 },
];

export type ProfilePhotoUpdatedDetail = {
  userId: string;
  photoDataUrl: string;
};

export type ProfileSaveResponse = {
  message?: string;
  user?: { id?: string; photoDataUrl?: string; name?: string };
  photoDataUrl?: string;
};

const IMAGE_EXT_PATTERN = /\.(jpe?g|png|gif|webp|bmp|avif|heic|heif|tif{1,2}|svg)$/i;

export function normalizeUserId(id: string | undefined | null): string {
  return String(id || "").trim();
}

export function notifyProfilePhotoUpdated(detail: ProfilePhotoUpdatedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ProfilePhotoUpdatedDetail>(USER_PROFILE_PHOTO_UPDATED_EVENT, { detail }));
}

/** True when the browser might treat this file as an image (any common photo type). */
export function isLikelyImageFile(file: File): boolean {
  const type = String(file.type || "").trim().toLowerCase();
  if (type.startsWith("image/")) return true;
  return IMAGE_EXT_PATTERN.test(file.name || "");
}

type LoadedImage = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  cleanup: () => void;
};

async function loadImageFromFile(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, width, height) => {
          ctx.drawImage(bitmap, 0, 0, width, height);
        },
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall through to Image() loader.
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: (ctx, width, height) => {
          ctx.drawImage(img, 0, 0, width, height);
        },
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          "This file could not be used as a profile photo. Try JPG, PNG, WebP, GIF, or another standard image format.",
        ),
      );
    };

    img.src = objectUrl;
  });
}

function renderJpegDataUrl(source: LoadedImage, maxDimension: number, quality: number): string {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height, 1));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not process the image.");
  }
  source.draw(ctx, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Read any image file, resize/compress as needed, and return a data URL safe for MongoDB.
 */
export async function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!isLikelyImageFile(file)) {
    throw new Error(
      "Please choose an image file (JPG, PNG, WebP, GIF, HEIC, BMP, etc.).",
    );
  }

  const source = await loadImageFromFile(file);
  try {
    let last = "";
    for (const attempt of COMPRESS_ATTEMPTS) {
      last = renderJpegDataUrl(source, attempt.maxDimension, attempt.quality);
      if (last.length <= MAX_STORED_PHOTO_DATA_URL_LENGTH) {
        return last;
      }
    }
    throw new Error(
      "This photo is too large to store. Try a smaller image or a different file.",
    );
  } finally {
    source.cleanup();
  }
}

type ProfileApiResponse = {
  user?: { id?: string; photoDataUrl?: string };
  profile?: { photoDataUrl?: string };
  photoDataUrl?: string;
};

export async function fetchCurrentUserPhotoFromApi(): Promise<{
  photoDataUrl: string;
  userId: string;
}> {
  const res = await apiGetJson<ProfileApiResponse>("/api/auth/profile");
  return {
    photoDataUrl: String(res.photoDataUrl || res.user?.photoDataUrl || res.profile?.photoDataUrl || "").trim(),
    userId: normalizeUserId(res.user?.id),
  };
}

export async function saveProfilePhotoToDatabase(photoDataUrl: string): Promise<{
  photoDataUrl: string;
  user?: { id?: string; photoDataUrl?: string; name?: string };
}> {
  return apiPatchJson<{
    photoDataUrl: string;
    user?: { id?: string; photoDataUrl?: string; name?: string };
  }>("/api/auth/profile/photo", { photoDataUrl });
}

/** Apply saved registration/dashboard photo to global UI state. */
export function applySavedProfilePhoto(response: ProfileSaveResponse, fallbackPhoto = ""): void {
  const userId = normalizeUserId(response.user?.id);
  const photo = String(
    response.user?.photoDataUrl || response.photoDataUrl || fallbackPhoto || "",
  ).trim();
  if (userId && photo) {
    notifyProfilePhotoUpdated({ userId, photoDataUrl: photo });
  }
}

/** Save to DB, re-fetch canonical photo, and broadcast update for this user. */
export async function persistProfilePhotoFromFile(
  file: File,
  userId: string,
): Promise<{ photoDataUrl: string; userId: string }> {
  const dataUrl = await readImageFileAsDataUrl(file);
  const saved = await saveProfilePhotoToDatabase(dataUrl);

  let photo = String(saved.photoDataUrl || saved.user?.photoDataUrl || "").trim();
  let id = normalizeUserId(saved.user?.id || userId);

  if (!photo) {
    const fresh = await fetchCurrentUserPhotoFromApi();
    photo = fresh.photoDataUrl || dataUrl;
    if (!id) id = fresh.userId;
  }

  if (id) {
    notifyProfilePhotoUpdated({ userId: id, photoDataUrl: photo });
  }

  return { photoDataUrl: photo, userId: id };
}
