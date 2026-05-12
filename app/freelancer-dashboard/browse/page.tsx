"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCommunityPosts } from "@/app/lib/postsStorage";
import { FREELANCER_OFFERS_STORAGE_KEY, hasFreelancerOfferForPost } from "@/app/lib/freelancerOffersStorage";
import { useFreelancerDashboardUser } from "../FreelancerDashboardShell";
import { FreelancerCommunityPostCard } from "@/app/components/freelancer/FreelancerCommunityPostCard";
import { OfferHelpView } from "@/app/components/freelancer/OfferHelpView";

export default function FreelancerBrowsePage() {
  const searchParams = useSearchParams();
  const { user } = useFreelancerDashboardUser();
  const [posts, setPosts] = useState(() => getCommunityPosts());
  const [sentStateByPostId, setSentStateByPostId] = useState<Record<string, boolean>>({});
  const selectedPostId = searchParams.get("post") || "";

  useEffect(() => {
    const loadPosts = () => setPosts(getCommunityPosts());
    loadPosts();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "peermatch_community_posts_v1") loadPosts();
      if (!event.key || event.key === FREELANCER_OFFERS_STORAGE_KEY) setOfferSentTick((n) => n + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!selectedPostId) return;
    const element = document.getElementById(`browse-post-${selectedPostId}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedPostId, posts]);

  const formatTimeAgo = (value: string) => {
    const ts = new Date(value).getTime();
    if (!Number.isFinite(ts)) return "Just now";
    const diffMs = Date.now() - ts;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diffMs < minute) return "Just now";
    if (diffMs < hour) return `${Math.floor(diffMs / minute)} min ago`;
    if (diffMs < day) return `${Math.floor(diffMs / hour)} hr ago`;
    return `${Math.floor(diffMs / day)} day${Math.floor(diffMs / day) > 1 ? "s" : ""} ago`;
  };

  const handleOfferHelp = (post: ReturnType<typeof getCommunityPosts>[number]) => {
    if (!user?.id) return;

  const selectedPost = useMemo(
    () => (selectedPostId ? posts.find((p) => p.id === selectedPostId) ?? null : null),
    [posts, selectedPostId],
  );

  const handleOfferRecorded = () => setOfferSentTick((n) => n + 1);

  const offerSentIds = useMemo(() => {
    const uid = user?.id;
    if (!uid) return new Set<string>();
    return new Set(posts.filter((p) => hasFreelancerOfferForPost(uid, p.id)).map((p) => p.id));
  }, [posts, user?.id, offerSentTick]);

  return (
    <main className="h-full rounded-2xl border border-zinc-100/80 bg-white p-6 shadow-[0_4px_32px_rgba(15,23,42,0.04)] sm:p-8 lg:p-10">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Browse Posts</h1>
      <p className="mt-2 text-sm text-zinc-500">Explore posts from the community.</p>
      <div className="mt-6 space-y-4">
        {posts.map((post) => (
          <article
            key={post.id}
            id={`browse-post-${post.id}`}
            className={`group cursor-pointer rounded-2xl border bg-zinc-50/70 p-5 transition duration-200 sm:p-6 lg:p-7 hover:border-[#FF6B35]/45 hover:bg-[#FFF8F5] hover:shadow-[0_8px_28px_rgba(255,107,53,0.08)] ${
              selectedPostId === post.id ? "border-[#FF6B35] shadow-[0_8px_28px_rgba(255,107,53,0.12)]" : "border-zinc-100"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={post.authorAvatarDataUrl || "https://api.dicebear.com/7.x/initials/svg?seed=Client"}
                  alt={`${post.authorName} avatar`}
                  className="h-10 w-10 rounded-full border border-zinc-300"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-zinc-900 sm:text-lg">{post.authorName || "Client User"}</p>
                  <p className="text-xs text-zinc-500">{formatTimeAgo(post.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700">
                  {post.category || "General"}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    post.priority === "Important" ? "bg-[#FFC31E] text-zinc-900" : "bg-[#56BA54] text-zinc-900"
                  }`}
                >
                  {post.priority}
                </span>
              </div>
            </div>
            <p className="mt-4 text-xl font-semibold leading-tight text-zinc-900">{post.title}</p>
            <p className="mt-3 text-base leading-[1.6] text-zinc-700">{post.content}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-zinc-200/70 pt-4 opacity-0 transition duration-200 group-hover:opacity-100">
              {sentStateByPostId[post.id] ? (
                <>
                  <button
                    type="button"
                    disabled
                    className="rounded-xl bg-zinc-300 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Message sent
                  </button>
                  <p className="text-sm font-medium text-[#2E8B57]">Message sent to client.</p>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOfferHelp(post)}
                  className="rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e85f2c]"
                >
                  Offer Help
                </button>
              )}
            </div>
          </article>
        ))}
        {posts.length === 0 ? <p className="text-sm text-zinc-500">No posts yet.</p> : null}
      </div>
    </main>
  );
}
