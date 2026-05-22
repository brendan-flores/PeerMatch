"use client";

import { Check, ChevronDown, FileText } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiDeleteJson, apiPutJson, ApiError } from "@/app/lib/api";
import {
  notifyAndRefreshCommunityPosts,
  useCommunityPostsContext,
} from "@/app/lib/CommunityPostsContext";
import { formatPhpBudget } from "@/app/lib/communityPosts";
import type { CommunityPost, CommunityPostPriority } from "@/app/lib/postsStorage";

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
  const {
    myPosts,
    myPostsLoading,
    refreshAll,
    updatePostLocally,
    removePostLocally,
  } = useCommunityPostsContext();

  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPriority, setEditPriority] = useState<CommunityPostPriority>("Normal");
  const [editBudget, setEditBudget] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const myAuthorPosts = useMemo(
    () => (authorId ? myPosts.filter((post) => post.authorId === authorId) : myPosts),
    [myPosts, authorId],
  );

  useEffect(() => {
    if (myAuthorPosts.length === 0) {
      setSelectedPostId("");
      return;
    }
    if (!selectedPostId || !myAuthorPosts.some((post) => post.id === selectedPostId)) {
      setSelectedPostId(myAuthorPosts[0].id);
    }
  }, [myAuthorPosts, selectedPostId]);

  const selectedPost = useMemo(
    () => myAuthorPosts.find((post) => post.id === selectedPostId) ?? null,
    [myAuthorPosts, selectedPostId],
  );

  const resetFormFromPost = useCallback((post: CommunityPost) => {
    setEditTitle(post.title);
    setEditCategory(post.category);
    setEditPriority(post.priority);
    setEditBudget(post.budget > 0 ? String(post.budget) : "");
    setEditDescription(post.content);
    setSaveStatus("");
    setShowDeleteConfirm(false);
  }, []);

  useEffect(() => {
    if (!selectedPost) return;
    resetFormFromPost(selectedPost);
    setShowSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset form when switching posts
  }, [selectedPostId]);

  const parsedEditBudget = useMemo(() => {
    const raw = editBudget.trim().replace(/,/g, "");
    if (!raw) return 0;
    const num = Number(raw);
    return Number.isFinite(num) ? Math.round(num) : NaN;
  }, [editBudget]);

  const hasEditChanges = useMemo(() => {
    if (!selectedPost) return false;
    const savedBudget = selectedPost.budget > 0 ? selectedPost.budget : 0;
    const editBudgetValue = Number.isFinite(parsedEditBudget) ? parsedEditBudget : savedBudget;
    return (
      editTitle.trim() !== selectedPost.title ||
      editCategory.trim() !== selectedPost.category ||
      editPriority !== selectedPost.priority ||
      editDescription.trim() !== selectedPost.content ||
      editBudgetValue !== savedBudget
    );
  }, [selectedPost, editTitle, editCategory, editPriority, editDescription, parsedEditBudget]);

  useEffect(() => {
    if (!showSaved) return;
    const timer = window.setTimeout(() => setShowSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [showSaved]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPost || !authorId || saving || !hasEditChanges) return;

    const title = editTitle.trim();
    const category = editCategory.trim();
    const content = editDescription.trim();
    if (!title || !category || !content) {
      setSaveStatus("Please complete title, category, and description.");
      return;
    }

    if (!Number.isFinite(parsedEditBudget) || parsedEditBudget <= 0) {
      setSaveStatus("Please enter a valid budget amount.");
      return;
    }

    setSaving(true);
    setSaveStatus("");
    setShowSaved(false);

    const patch = {
      title,
      content,
      category,
      priority: editPriority,
      budget: parsedEditBudget,
    };

    try {
      await apiPutJson<{ message: string; post: CommunityPost }>(`/api/tasks/${selectedPost.id}`, {
        title,
        description: content,
        subjectCategory: category,
        urgency: editPriority.toLowerCase(),
        budget: parsedEditBudget,
      });

      const updatedPost = { ...selectedPost, ...patch };
      updatePostLocally(selectedPost.id, patch);
      resetFormFromPost(updatedPost);
      setShowSaved(true);
      notifyAndRefreshCommunityPosts(refreshAll);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not save changes. Try again.";
      setSaveStatus(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPost || !authorId || deleting) return;

    setDeleting(true);
    try {
      await apiDeleteJson<{ message: string }>(`/api/tasks/${selectedPost.id}`);
      removePostLocally(selectedPost.id);
      setShowDeleteConfirm(false);
      notifyAndRefreshCommunityPosts(refreshAll);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not delete post. Try again.";
      setSaveStatus(message);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const cardAvatar = authorAvatar || "https://api.dicebear.com/7.x/initials/svg?seed=Client";

  const previewTitle = selectedPost ? editTitle.trim() || selectedPost.title : "";
  const previewCategory = selectedPost ? editCategory.trim() || selectedPost.category : "";
  const previewPriority = selectedPost ? editPriority : "Normal";
  const previewBudget =
    selectedPost && Number.isFinite(parsedEditBudget) && parsedEditBudget > 0
      ? parsedEditBudget
      : selectedPost?.budget ?? 0;

  return (
    <div className="space-y-4">
      {selectedPost ? (
        <article className="rounded-2xl border-2 border-[#FF6B35] bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <img src={cardAvatar} alt="" className="h-10 w-10 shrink-0 rounded-full border border-zinc-200" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900">{previewTitle}</p>
              <p className="truncate text-xs text-zinc-500">{previewCategory || "General"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${priorityBadgeClass(previewPriority)}`}
                >
                  {previewPriority}
                </span>
                {previewBudget > 0 ? (
                  <span className="rounded-full bg-[#FFF2EB] px-2.5 py-0.5 text-[10px] font-semibold text-[#C2410C]">
                    {formatPhpBudget(previewBudget)}
                  </span>
                ) : null}
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#FF6B35]">Editing</span>
              </div>
            </div>
          </div>
        </article>
      ) : null}

      <article className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <FileText className="h-5 w-5 shrink-0 text-[#FF6B35]" strokeWidth={1.75} aria-hidden />
          Featured Post
        </h2>

        <p className="mt-3 text-xs font-semibold text-zinc-700">Your posts</p>
        {myPostsLoading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading posts…</p>
        ) : myAuthorPosts.length > 0 ? (
          <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {myAuthorPosts.map((post) => {
              const isSelected = post.id === selectedPostId;
              const displayTitle = isSelected ? editTitle.trim() || post.title : post.title;
              const displayCategory = isSelected ? editCategory.trim() || post.category : post.category;
              const displayPriority = isSelected ? editPriority : post.priority;
              const displayBudget =
                isSelected && Number.isFinite(parsedEditBudget) && parsedEditBudget > 0
                  ? parsedEditBudget
                  : post.budget;

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
                    <p className="truncate text-sm font-semibold text-zinc-900">{displayTitle}</p>
                    <p className="truncate text-xs text-zinc-500">{displayCategory || "General"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${priorityBadgeClass(displayPriority)}`}
                      >
                        {displayPriority}
                      </span>
                      {displayBudget > 0 ? (
                        <span className="rounded-full bg-[#FFF2EB] px-2.5 py-0.5 text-[10px] font-semibold text-[#C2410C]">
                          {formatPhpBudget(displayBudget)}
                        </span>
                      ) : null}
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
              <label htmlFor="featured-post-budget" className="block text-xs font-semibold text-zinc-700">
                Budget (₱)
              </label>
              <input
                id="featured-post-budget"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={editBudget}
                onChange={(event) => setEditBudget(event.target.value)}
                placeholder="e.g. 500"
                className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
              />
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

            {showDeleteConfirm ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-900">
                  Are you sure you want to delete this post? This will remove it from all dashboards and the browse
                  page.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-red-600 px-3.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-70"
                  >
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300 bg-white px-3.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p
                className={`text-xs ${
                  saveStatus.includes("Could not") ||
                  saveStatus.includes("Please complete") ||
                  saveStatus.includes("valid budget")
                    ? "text-red-600"
                    : "text-zinc-500"
                }`}
              >
                {saving
                  ? "Saving..."
                  : showSaved
                    ? ""
                    : saveStatus || "Make changes then click Save Changes."}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {showSaved ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Saved!
                  </span>
                ) : null}
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={saving || deleting}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-red-300 bg-white px-3.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-70"
                  >
                    Delete post
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={!hasEditChanges || saving || deleting}
                  className={`inline-flex h-9 items-center justify-center rounded-xl px-3.5 text-xs font-semibold transition ${
                    hasEditChanges && !saving && !deleting
                      ? "cursor-pointer bg-[#FF6B35] text-white hover:brightness-95 active:brightness-90"
                      : "cursor-not-allowed bg-zinc-500 text-zinc-100 opacity-85"
                  }`}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </article>
      ) : null}
    </div>
  );
}
