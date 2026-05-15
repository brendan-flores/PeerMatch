"use client";

import { useMemo } from "react";
import { Clock, Users } from "lucide-react";
import { DashboardStatCard } from "@/app/components/freelancer/DashboardStatCard";
import { CommunityPostCard } from "@/app/components/freelancer/CommunityPostCard";
import { OfferHelpPanel } from "@/app/components/freelancer/OfferHelpPanel";
import { useCommunityPosts } from "@/app/lib/useCommunityPosts";
import {
  resolveFreelancerGreetingDisplayName,
  resolveFreelancerGreetingMode,
} from "@/app/lib/freelancerStorage";
import { useFreelancerDashboardUser, useFreelancerSelectedPost } from "./FreelancerDashboardShell";

export default function FreelancerDashboardPage() {
  const { user } = useFreelancerDashboardUser();
  const { selectedPost, setSelectedPost, clearSelectedPost } = useFreelancerSelectedPost();
  const posts = useCommunityPosts();

  const greetingName = useMemo(
    () => (user ? resolveFreelancerGreetingDisplayName(user) : ""),
    [user],
  );

  const leadLabel = useMemo(() => {
    if (!user?.id) return "Welcome";
    const mode = resolveFreelancerGreetingMode(String(user.id));
    return mode === "welcome_back" ? "Welcome back" : "Welcome";
  }, [user]);

  return (
    <main className="h-full rounded-2xl border border-zinc-100/80 bg-white p-6 shadow-[0_4px_32px_rgba(15,23,42,0.04)] sm:p-8 lg:p-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          <span className="text-zinc-900">{leadLabel},</span>{" "}
          <span className="text-zinc-900">{greetingName || "…"}</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500">Here&apos;s what&apos;s happening in your learning community</p>
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <DashboardStatCard
          title="Active Connections"
          description="Students you're helping or getting help from"
          icon={<Users className="h-6 w-6" strokeWidth={1.75} />}
          onClick={() => router.push("/freelancer-dashboard?panel=connections")}
        />
        <DashboardStatCard
          title="Hours This Week"
          description="Time spent in peer collaboration"
          icon={<Clock className="h-6 w-6" strokeWidth={1.75} />}
          onClick={() => router.push("/freelancer-dashboard?panel=hours")}
        />
      </div>

      <hr className="my-10 border-zinc-200" />

      <section aria-labelledby="latest-posts-heading">
        {selectedPost && user ? (
          <OfferHelpPanel
            post={selectedPost}
            freelancerId={user.id}
            freelancerName={user.name}
            onBack={clearSelectedPost}
          />
        ) : (
          <>
            <h2 id="latest-posts-heading" className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
              Latest Post By CIT Community
            </h2>
            <div className="mt-5 space-y-4">
              {posts.map((post) => (
                <CommunityPostCard key={post.id} post={post} onSelect={setSelectedPost} />
              ))}
              {posts.length === 0 ? <p className="text-sm text-zinc-500">No posts yet.</p> : null}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
