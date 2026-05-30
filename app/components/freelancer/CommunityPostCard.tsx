"use client";

import { useCurrentUserProfile } from "@/app/lib/CurrentUserProfileContext";
import { formatPhpBudget } from "@/app/lib/communityPosts";
import { formatTimeAgo } from "@/app/lib/formatTimeAgo";
import { resolvePostAuthorAvatar } from "@/app/lib/profilePhotoDisplay";
import type { CommunityPost } from "@/app/lib/postsStorage";

type CommunityPostCardProps = {
  post: CommunityPost;
  onSelect: (post: CommunityPost) => void;
  highlight?: boolean;
};

const MOBILE_PREVIEW_LENGTH = 100;

export function CommunityPostCard({
  post,
  onSelect,
  highlight = false,
}: CommunityPostCardProps) {
  const { userId, photoDataUrl, photoVersion } =
    useCurrentUserProfile();

  const avatarSrc = resolvePostAuthorAvatar(
    post,
    userId && photoDataUrl
      ? { id: userId, photoDataUrl }
      : null,
  );

  const getPriorityStyles = () => {
    switch (post.priority) {
      case "High":
        return "bg-[#FF6B35] text-white";

      case "Low":
        return "bg-[#A8DADC] text-zinc-900";

      case "Normal":
      default:
        return "bg-[#56BA54] text-white";
    }
  };

  const getPriorityLabel = () => {
    if (post.priority === "High") return "Urgent";
    return post.priority;
  };

  const showSeeMore = post.content.trim().length > MOBILE_PREVIEW_LENGTH;
  const mobilePreview = showSeeMore
    ? `${post.content.trim().slice(0, MOBILE_PREVIEW_LENGTH).trimEnd()}`
    : post.content;

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
      className={`cursor-pointer rounded-2xl border border-zinc-100 bg-white p-4 transition hover:border-[#FF6B35]/30 hover:shadow-[0_4px_24px_rgba(15,23,42,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/40 sm:p-5 lg:p-7 ${
        highlight
          ? "animate-notification-highlight ring-2 ring-[#FF6B35]/80"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            key={`${post.id}-${avatarSrc.slice(-48)}-${photoVersion}`}
            src={avatarSrc}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full border border-zinc-300 object-cover"
          />

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-zinc-900 sm:text-base lg:text-lg lg:font-semibold">
              {post.authorName || "Client User"}
            </p>

            <p className="text-xs text-zinc-500">
              {formatTimeAgo(post.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold sm:px-3 sm:py-1 sm:text-xs ${getPriorityStyles()}`}
          >
            {getPriorityLabel()}
          </span>

          {post.category ? (
            <span className="rounded-full border border-zinc-400 bg-white px-2.5 py-0.5 text-[10px] text-zinc-800 sm:px-3 sm:py-1 sm:text-xs">
              {post.category}
            </span>
          ) : null}

          <span className="rounded-full bg-[#2563EB] px-2.5 py-0.5 text-[10px] font-semibold text-white sm:px-3 sm:py-1 sm:text-xs">
            {formatPhpBudget(post.budget)}
          </span>
        </div>
      </div>

      <p className="mt-3 text-base font-bold leading-snug text-zinc-900 sm:mt-4 sm:text-lg lg:text-xl lg:font-semibold">
        {post.title}
      </p>

      <p className="mt-2 text-sm leading-relaxed text-zinc-800 lg:mt-3 lg:line-clamp-3 lg:text-base lg:leading-[1.6] lg:text-zinc-700">
        <span className="lg:hidden">
          {mobilePreview}
          {showSeeMore ? (
            <span className="text-zinc-400"> ... see more</span>
          ) : null}
        </span>
        <span className="hidden lg:inline">{post.content}</span>
      </p>
    </article>
  );
}