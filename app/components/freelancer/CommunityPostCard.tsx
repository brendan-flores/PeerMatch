"use client";

import { useCurrentUserProfile } from "@/app/lib/CurrentUserProfileContext";
import { formatTimeAgo } from "@/app/lib/formatTimeAgo";
import { resolvePostAuthorAvatar } from "@/app/lib/profilePhotoDisplay";
import type { CommunityPost } from "@/app/lib/postsStorage";

type CommunityPostCardProps = {
  post: CommunityPost;
  onSelect: (post: CommunityPost) => void;
  highlight?: boolean;
};

<<<<<<< HEAD
export function CommunityPostCard({ post, onSelect, highlight = false }: CommunityPostCardProps) {
=======
export function CommunityPostCard({ post, onSelect }: CommunityPostCardProps) {
  const { userId, photoDataUrl, photoVersion } = useCurrentUserProfile();
  const avatarSrc = resolvePostAuthorAvatar(
    post,
    userId && photoDataUrl ? { id: userId, photoDataUrl } : null,
  );

>>>>>>> 2533af0fadfa975a0d7c550f747b67cc34899204
  const getPriorityStyles = () => {
    switch (post.priority) {
      case "High":
        return "bg-[#FF6B35] text-white";
      case "Low":
        return "bg-[#A8DADC] text-zinc-900";
      case "Normal":
      default:
        return "bg-[#56BA54] text-zinc-900";
    }
  };

  const getPriorityLabel = () => {
    if (post.priority === "High") return "Urgent";
    return post.priority;
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(post)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(post);
        }
      }}
      className={`cursor-pointer rounded-2xl border border-zinc-100 bg-zinc-50 p-5 transition hover:border-[#FF6B35]/30 hover:bg-white hover:shadow-[0_4px_24px_rgba(15,23,42,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/40 lg:p-7 ${
        highlight ? "animate-notification-highlight ring-2 ring-[#FF6B35]/80" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            key={`${post.id}-${avatarSrc.slice(-48)}-${photoVersion}`}
            src={avatarSrc}
            alt=""
            className="h-10 w-10 rounded-full border border-zinc-300 object-cover"
          />
          <div>
            <p className="text-lg font-semibold text-zinc-900">{post.authorName || "Client User"}</p>
            <p className="text-xs text-zinc-500">{formatTimeAgo(post.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.category ? (
            <span className="rounded-full border border-zinc-400 px-4 py-1 text-xs text-zinc-800">{post.category}</span>
          ) : null}
          <span
            className={`rounded-full px-4 py-1 text-xs font-semibold ${getPriorityStyles()}`}
          >
            {getPriorityLabel()}
          </span>
          <span className="rounded-full bg-[#FFF2EB] px-4 py-1 text-xs font-semibold text-[#C2410C]">
            P{post.budget}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xl font-semibold leading-tight text-zinc-900">{post.title}</p>
      <p className="mt-3 line-clamp-3 text-base leading-[1.6] text-zinc-700">{post.content}</p>
    </article>
  );
}
