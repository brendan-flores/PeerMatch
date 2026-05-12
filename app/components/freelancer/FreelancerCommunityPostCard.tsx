"use client";

import type { CommunityPost } from "@/app/lib/postsStorage";
import { formatCommunityPostTimeAgo } from "@/app/lib/postsStorage";

type Props = {
  post: CommunityPost;
  onOpen: () => void;
  offerSent?: boolean;
};

export function FreelancerCommunityPostCard({ post, onOpen, offerSent }: Props) {
  const urgencyIsHigh = post.priority === "Important";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-2xl border border-zinc-100 bg-zinc-50/70 p-5 text-left transition duration-200 sm:p-6 lg:p-7 hover:border-[#FF6B35]/45 hover:bg-[#FFF8F5] hover:shadow-[0_8px_28px_rgba(255,107,53,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B35]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={post.authorAvatarDataUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.authorName || "Client")}`}
            alt={`${post.authorName} avatar`}
            className="h-10 w-10 shrink-0 rounded-full border border-zinc-300"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-zinc-900 sm:text-lg">{post.authorName || "Client User"}</p>
            <p className="text-xs text-zinc-500">{formatCommunityPostTimeAgo(post.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {offerSent ? (
            <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#166534]">Offer sent</span>
          ) : null}
          <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700">{post.category || "General"}</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              urgencyIsHigh ? "bg-[#FECACA] text-[#991B1B]" : "bg-[#56BA54] text-zinc-900"
            }`}
          >
            {urgencyIsHigh ? "Urgent" : "Normal"}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xl font-semibold leading-tight text-zinc-900">{post.title}</p>
      <p className="mt-3 line-clamp-4 text-base leading-[1.6] text-zinc-700 sm:line-clamp-none">{post.content}</p>
      <p className="mt-4 text-xs font-medium text-[#FF6B35] opacity-0 transition duration-200 group-hover:opacity-100">Click to offer help</p>
    </button>
  );
}
