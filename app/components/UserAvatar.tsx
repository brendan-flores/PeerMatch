"use client";

import { useCurrentUserProfile } from "@/app/lib/CurrentUserProfileContext";
import {
  initialsFromName,
  resolveUserPhotoDataUrl,
  type UserAvatarInput,
} from "@/app/lib/profilePhotoDisplay";

const sizeClasses = {
  xs: "h-8 w-8 text-xs",
  sm: "h-9 w-9 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-11 w-11 text-sm",
  xl: "h-16 w-16 text-lg",
  "2xl": "h-24 w-24 text-2xl",
} as const;

type UserAvatarProps = UserAvatarInput & {
  size?: keyof typeof sizeClasses;
  className?: string;
  alt?: string;
  initialsClassName?: string;
  imageClassName?: string;
};

export function UserAvatar({
  id,
  name = "",
  photoDataUrl,
  size = "md",
  className = "",
  alt,
  initialsClassName = "bg-[#FF6B35] text-white",
  imageClassName = "object-cover",
}: UserAvatarProps) {
  const { userId: meId, photoDataUrl: mePhoto, photoVersion } = useCurrentUserProfile();
  const photo = resolveUserPhotoDataUrl(
    { id, name, photoDataUrl },
    meId && mePhoto ? { id: meId, photoDataUrl: mePhoto } : null,
  );
  const sizeClass = sizeClasses[size];
  const label = alt || name || "User";

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={`${id || name}-${photo.slice(-48)}-${photoVersion}`}
        src={photo}
        alt={label}
        className={`shrink-0 rounded-full border border-zinc-200 ${sizeClass} ${imageClassName} ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-zinc-200 font-semibold ${sizeClass} ${initialsClassName} ${className}`}
      aria-hidden={!alt}
      title={label}
    >
      {initialsFromName(name)}
    </span>
  );
}
