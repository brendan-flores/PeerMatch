import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { getCommunityPosts } from "@/app/lib/postsStorage";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function formatTimeAgo(value: string, now: number): string {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "Just now";
  const diffMs = Math.max(0, now - ts);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hr ago`;
  return `${Math.floor(diffMs / day)} day${Math.floor(diffMs / day) > 1 ? "s" : ""} ago`;
}

export function FreelancerRightAside() {
  const router = useRouter();
  const [posts, setPosts] = useState(() => getCommunityPosts());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const loadPosts = () => setPosts(getCommunityPosts());
    loadPosts();
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "peermatch_community_posts_v1") return;
      loadPosts();
    };
    window.addEventListener("storage", onStorage);
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
      loadPosts();
    }, 60 * 1000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(intervalId);
    };
  }, []);

  const recentPost = useMemo(() => {
    const nowTs = Date.now();
    return posts.find((post) => {
      const createdAt = new Date(post.createdAt).getTime();
      return Number.isFinite(createdAt) && nowTs - createdAt < ONE_DAY_MS;
    });
  }, [posts, now]);

  return (
    <aside className="flex h-full min-h-0 flex-col gap-8 rounded-2xl border border-zinc-200/80 bg-[#E8EFEC] p-6 shadow-sm">
      <section>
        <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-zinc-600">
              <Bell className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <p className="text-sm leading-snug text-zinc-700">Someone responded to your post</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-900">Recent Post</h3>
        <div className="mt-3 space-y-3">
          {recentPost ? (
            <button
              type="button"
              onClick={() => router.push(`/freelancer-dashboard/browse?post=${encodeURIComponent(recentPost.id)}`)}
              className="w-full cursor-pointer rounded-xl border border-[#E8DDD6] bg-[#F4EBE4] px-4 py-3 text-left shadow-sm transition hover:bg-[#efe4dd]"
            >
              <p className="text-sm font-semibold text-zinc-900">{recentPost.authorName || "Client User"}</p>
              <p className="mt-2 line-clamp-1 text-xs font-semibold text-zinc-800">{recentPost.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-zinc-700">{recentPost.content}</p>
              <p className="mt-3 text-xs text-zinc-500">{formatTimeAgo(recentPost.createdAt, now)}</p>
            </button>
          ) : (
            <div className="rounded-xl border border-[#E8DDD6] bg-[#F4EBE4] px-4 py-3 shadow-sm">
              <p className="text-sm font-semibold text-zinc-900">No recent post</p>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
