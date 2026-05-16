"use client";

import { ChevronDown, FileText } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiPutJson, ApiError } from "@/app/lib/api";
import { fetchMyCommunityPosts } from "@/app/lib/communityPosts";
import {
  COMMUNITY_POSTS_CHANGED_EVENT,
  notifyCommunityPostsChanged,
  type CommunityPost,
  type CommunityPostPriority,
} from "@/app/lib/postsStorage";

type FeaturedPostEditorProps = {
  authorId: string;
  authorAvatar?: string;
};

function formatTimeAgo(value: string) {
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
}

function priorityBadgeClass(priority: CommunityPostPriority) {
  if (priority === "High") return "bg-[#FF6B35] text-white";
  if (priority === "Low") return "bg-[#A8DADC] text-zinc-900";
  return "bg-[#56BA54] text-zinc-900";
}

export function FeaturedPostEditor({ authorId, authorAvatar }: FeaturedPostEditorProps) {
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPriority, setEditPriority] = useState<CommunityPostPriority>("Normal");
  const [editDescription, setEditDescription] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const posts = await fetchMyCommunityPosts();
      setMyPosts(posts);
    } catch {
      setMyPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
    const onRefresh = () => void loadPosts();
    window.addEventListener(COMMUNITY_POSTS_CHANGED_EVENT, onRefresh);
    return () => window.removeEventListener(COMMUNITY_POSTS_CHANGED_EVENT, onRefresh);
  }, [loadPosts]);

  useEffect(() => {
    if (myPosts.length === 0) {
      setSelectedPostId("");
      return;
    }
    if (!selectedPostId || !myPosts.some((post) => post.id === selectedPostId)) {
      setSelectedPostId(myPosts[0].id);
    }
  }, [myPosts, selectedPostId]);

  const selectedPost = useMemo(
    () => myPosts.find((post) => post.id === selectedPostId) ?? null,
    [myPosts, selectedPostId],
  );

  useEffect(() => {
    if (!selectedPost) return;
    setEditTitle(selectedPost.title);
    setEditCategory(selectedPost.category);
    setEditPriority(selectedPost.priority);
    setEditDescription(selectedPost.content);
    setSaveStatus("");
  }, [selectedPost]);

  const hasEditChanges = useMemo(() => {
    if (!selectedPost) return false;
    return (
      editTitle.trim() !== selectedPost.title ||
      editCategory.trim() !== selectedPost.category ||
      editPriority !== selectedPost.priority ||
      editDescription.trim() !== selectedPost.content
    );
  }, [selectedPost, editTitle, editCategory, editPriority, editDescription]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPost || !authorId || saving) return;

    const title = editTitle.trim();
    const category = editCategory.trim();
    const content = editDescription.trim();
    if (!title || !category || !content) {
      setSaveStatus("Please complete title, category, and description.");
      return;
    }

    setSaving(true);
    setSaveStatus("Saving...");
    try {
      await apiPutJson<{ message: string; post: CommunityPost }>(`/api/tasks/${selectedPost.id}`, {
        title,
        description: content,
        subjectCategory: category,
        urgency: editPriority.toLowerCase(),
      });
      setSaveStatus("Changes saved.");
      notifyCommunityPostsChanged();
      await loadPosts();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not save changes. Try again.";
      setSaveStatus(message);
    } finally {
      setSaving(false);
    }
  };

  const cardAvatar = authorAvatar || "https://api.dicebear.com/7.x/initials/svg?seed=Client";

  return (
    <div className="space-y-4">
      <article className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <FileText className="h-5 w-5 shrink-0 text-[#FF6B35]" strokeWidth={1.75} aria-hidden />
          Featured Post
        </h2>

        <p className="mt-3 text-xs font-semibold text-zinc-700">Your posts</p>
        {myPosts.length > 0 ? (
          <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {myPosts.map((post) => {
              const isSelected = post.id === selectedPostId;
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setSelectedPostId(post.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border bg-white p-3 text-left transition ${
                    isSelected
                      ? "border-[#FF6B35] bg-[#FFF7F3] shadow-sm"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <img src={cardAvatar} alt="" className="h-9 w-9 shrink-0 rounded-full border border-zinc-200" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">{post.title}</p>
                    <p className="truncate text-xs text-zinc-500">{post.category || "General"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${priorityBadgeClass(post.priority)}`}
                      >
                        {post.priority}
                      </span>
                      {isSelected ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#FF6B35]">
                          Editing
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-sm text-zinc-500">
            No posts yet. Create a post from the dashboard to manage it here.
          </div>
        )}
      </article>

      {selectedPost ? (
        <article className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">Edit featured post</h3>
            <span className="text-xs text-zinc-500">{formatTimeAgo(selectedPost.createdAt)}</span>
          </div>

          <form className="mt-4 space-y-3" onSubmit={handleSave}>
            <div>
              <label htmlFor="featured-post-title" className="block text-xs font-semibold text-zinc-700">
                Post Title
              </label>
              <input
                id="featured-post-title"
                type="text"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="featured-post-category" className="block text-xs font-semibold text-zinc-700">
                  Category
                </label>
                <input
                  id="featured-post-category"
                  type="text"
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                />
              </div>
              <div>
                <label htmlFor="featured-post-urgency" className="block text-xs font-semibold text-zinc-700">
                  Urgency Level
                </label>
                <div className="relative mt-1">
                  <select
                    id="featured-post-urgency"
                    value={editPriority}
                    onChange={(event) =>
                      setEditPriority(event.target.value as CommunityPostPriority)
                    }
                    className="h-10 w-full appearance-none rounded-xl border border-zinc-300 bg-white py-2 pl-3 pr-9 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600"
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="featured-post-description" className="block text-xs font-semibold text-zinc-700">
                Description
              </label>
              <textarea
                id="featured-post-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={4}
                className="mt-1 w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p
                className={`text-xs ${
                  saveStatus.includes("Could not") || saveStatus.includes("Please complete")
                    ? "text-red-600"
                    : "text-zinc-500"
                }`}
              >
                {saving ? "Saving..." : saveStatus || "Make changes then click Save Changes."}
              </p>
              <button
                type="submit"
                disabled={!hasEditChanges || saving}
                className={`inline-flex h-9 items-center justify-center rounded-xl px-3.5 text-xs font-semibold transition ${
                  hasEditChanges && !saving
                    ? "cursor-pointer bg-[#FF6B35] text-white hover:brightness-95 active:brightness-90"
                    : "cursor-not-allowed bg-zinc-500 text-zinc-100 opacity-85"
                }`}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </article>
      ) : null}
    </div>
  );
}
