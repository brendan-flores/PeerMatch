"use client";

import { UserAvatar } from "@/app/components/UserAvatar";

type ProfileAvatarProps = {
  imageSrc?: string;
  name?: string;
  alt?: string;
};

export default function ProfileAvatar({
  imageSrc,
  name = "PeerMatch",
  alt = "Profile avatar",
}: ProfileAvatarProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <UserAvatar
        name={name}
        photoDataUrl={imageSrc}
        size="2xl"
        alt={alt}
        initialsClassName="bg-slate-100 text-slate-700"
      />
      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">Profile avatar</p>
      </div>
    </div>
  );
}
