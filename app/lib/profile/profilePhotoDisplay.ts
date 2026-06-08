import { normalizeUserId } from "./profilePhoto";

export type PostAuthorAvatarInput = {
  authorId?: string;
  authorName?: string;
  authorAvatarDataUrl?: string;
};

export type UserAvatarInput = {
  id?: string;
  name?: string;
  photoDataUrl?: string;
};

export type CurrentUserAvatarInput = {
  id: string;
  photoDataUrl: string;
};

export function dicebearInitialsAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed || "User")}`;
}

export function initialsFromName(name: string, fallback = "U"): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).filter(Boolean);
  return letters.join("") || fallback;
}

/** Resolve a user's profile photo (DB field or signed-in user's cached photo). */
export function resolveUserPhotoDataUrl(
  user: UserAvatarInput,
  currentUser?: CurrentUserAvatarInput | null,
): string {
  const stored = String(user.photoDataUrl || "").trim();
  if (stored) return stored;

  const userId = normalizeUserId(user.id);
  const meId = normalizeUserId(currentUser?.id);
  const mePhoto = String(currentUser?.photoDataUrl || "").trim();
  if (userId && meId && userId === meId && mePhoto) return mePhoto;

  return "";
}

/** Prefer stored post avatar, then the signed-in user's photo when they authored the post. */
export function resolvePostAuthorAvatar(
  post: PostAuthorAvatarInput,
  currentUser?: CurrentUserAvatarInput | null,
): string {
  const stored = String(post.authorAvatarDataUrl || "").trim();
  if (stored) return stored;

  const authorId = normalizeUserId(post.authorId);
  const meId = normalizeUserId(currentUser?.id);
  const mePhoto = String(currentUser?.photoDataUrl || "").trim();
  if (authorId && meId && authorId === meId && mePhoto) return mePhoto;

  return dicebearInitialsAvatar(post.authorName || "User");
}
