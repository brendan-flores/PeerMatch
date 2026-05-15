"use client";

import { CommunityPostCard } from "@/app/components/freelancer/CommunityPostCard";
import { OfferHelpPanel } from "@/app/components/freelancer/OfferHelpPanel";
import { useCommunityPosts } from "@/app/lib/useCommunityPosts";
import { useFreelancerDashboardUser, useFreelancerSelectedPost } from "../FreelancerDashboardShell";

export default function FreelancerBrowsePage() {
  const { user } = useFreelancerDashboardUser();
  const { selectedPost, setSelectedPost, clearSelectedPost } = useFreelancerSelectedPost();
  const posts = useCommunityPosts();

  return (
    <main className="h-full rounded-2xl border border-zinc-100/80 bg-white p-6 shadow-[0_4px_32px_rgba(15,23,42,0.04)] sm:p-8 lg:p-10">
      {selectedPost && user ? (
        <OfferHelpPanel
          post={selectedPost}
          freelancerId={user.id}
          freelancerName={user.name}
          onBack={clearSelectedPost}
        />
      ) : (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Browse Post</h1>
          <p className="mt-2 text-sm text-zinc-500">Explore posts from the community.</p>
          <div className="mt-6 space-y-4">
            {posts.map((post) => (
              <CommunityPostCard key={post.id} post={post} onSelect={setSelectedPost} />
            ))}
            {posts.length === 0 ? <p className="text-sm text-zinc-500">No posts yet.</p> : null}
          </div>
        </>
      )}
    </main>
  );
}
