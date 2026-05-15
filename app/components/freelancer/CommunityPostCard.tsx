"use client";

import type { CommunityPost } from "@/app/lib/postsStorage";
import { formatTimeAgo } from "@/app/lib/formatTimeAgo";

type CommunityPostCardProps = {
  post: CommunityPost;
  onSelect: (post: CommunityPost) => void;
};

export function CommunityPostCard({ post, onSelect }: CommunityPostCardProps) {
  const isUrgent = post.priority === "Important";

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
      className="cursor-pointer rounded-2xl border border-zinc-100 bg-zinc-50 p-5 transition hover:border-[#FF6B35]/30 hover:bg-white hover:shadow-[0_4px_24px_rgba(15,23,42,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/40 lg:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={
              post.authorAvatarDataUrl ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.authorName || "Client")}`
            }
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
            className={`rounded-full px-4 py-1 text-xs font-semibold ${
              isUrgent ? "bg-red-100 text-red-700" : "bg-[#56BA54] text-zinc-900"
            }`}
          >
            {isUrgent ? "Urgent" : post.priority}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xl font-semibold leading-tight text-zinc-900">{post.title}</p>
      <p className="mt-3 line-clamp-3 text-base leading-[1.6] text-zinc-700">{post.content}</p>
    </article>
  );
}
