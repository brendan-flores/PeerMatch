"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FreelancerSidebar } from "@/app/components/freelancer/FreelancerSidebar";
import { FreelancerRightAside } from "@/app/components/freelancer/FreelancerRightAside";
import { apiGetJson, ApiError } from "@/app/lib/api";
import { normalizeAuthUser, persistFreelancerFromMe } from "@/app/lib/freelancerStorage";
import type { CommunityPost } from "@/app/lib/postsStorage";
import { connectSocket, disconnectSocket } from "@/app/lib/socket";

type MeUser = { id: string; name: string; email: string; role: string; accountType?: string };

type MeResponse = { user: MeUser };

type FreelancerUserContextValue = {
  user: MeUser | null;
  loading: boolean;
  selectedPost: CommunityPost | null;
  setSelectedPost: (post: CommunityPost | null) => void;
};

const FreelancerUserContext = createContext<FreelancerUserContextValue | null>(null);

export function useFreelancerDashboardUser() {
  const ctx = useContext(FreelancerUserContext);
  if (!ctx) {
    throw new Error("useFreelancerDashboardUser must be used within FreelancerDashboardShell");
  }
  return { user: ctx.user, loading: ctx.loading };
}

export function useFreelancerSelectedPost() {
  const ctx = useContext(FreelancerUserContext);
  if (!ctx) {
    throw new Error("useFreelancerSelectedPost must be used within FreelancerDashboardShell");
  }
  return {
    selectedPost: ctx.selectedPost,
    setSelectedPost: ctx.setSelectedPost,
    clearSelectedPost: () => ctx.setSelectedPost(null),
  };
}

function isClientUser(user: MeUser | null): boolean {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase();
  const accountType = String(user.accountType || "").toLowerCase();
  return accountType === "client" || role === "client";
}

export function FreelancerDashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [isRouteContentVisible, setIsRouteContentVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiGetJson<MeResponse>("/api/auth/me");
        if (cancelled) return;
        const raw = me.user as Record<string, unknown>;
        const base = normalizeAuthUser(me.user);
        const nextUser: MeUser = {
          ...base,
          role: typeof raw.role === "string" ? raw.role : "",
          ...(typeof raw.accountType === "string" ? { accountType: raw.accountType } : {}),
        };
        persistFreelancerFromMe(base);
        setUser(nextUser);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!user?.id) return;
    connectSocket(user.id);
    return () => {
      disconnectSocket();
    };
  }, [user?.id]);

  const clientUser = isClientUser(user);

  useEffect(() => {
    if (!user || loading) return;
    if (clientUser) router.replace("/client-home");
  }, [user, loading, clientUser, router]);

  useEffect(() => {
    setIsRouteContentVisible(false);
    const timeoutId = window.setTimeout(() => {
      setIsRouteContentVisible(true);
    }, 90);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  useEffect(() => {
    const postsRoutes = ["/freelancer-dashboard", "/freelancer-dashboard/browse"];
    if (!postsRoutes.includes(pathname)) {
      setSelectedPost(null);
    }
  }, [pathname]);

  const value = useMemo(
    () => ({ user, loading, selectedPost, setSelectedPost }),
    [user, loading, selectedPost],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E5F6F4]">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#E5F6F4] px-4">
        <p className="text-sm text-zinc-600">We couldn&apos;t load your session.</p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-xl bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white transition-[background-color] duration-300 ease-in-out hover:bg-[#e85f2c]"
        >
          Go to login
        </button>
      </div>
    );
  }

  if (clientUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E5F6F4]">
        <p className="text-sm text-zinc-500">Redirecting…</p>
      </div>
    );
  }

  const isMessagesRoute = pathname === "/freelancer-dashboard/messages";

  return (
    <FreelancerUserContext.Provider value={value}>
      <div
        className={`bg-[#E5F6F4] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${
          isMessagesRoute ? "h-[100dvh] overflow-hidden" : "min-h-screen"
        }`}
      >
        <div
          className={`mx-auto w-full max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px] xl:grid-cols-[280px_minmax(0,1fr)_320px] ${
            isMessagesRoute ? "h-full min-h-0" : "min-h-[calc(100vh-3rem)]"
          } grid`}
        >
          <div className="min-h-0 lg:row-span-1">
            <FreelancerSidebar />
          </div>
          <div
            className={`min-h-0 transform-gpu transition-all duration-[420ms] ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none ${
              isMessagesRoute ? "h-full" : ""
            } ${
              isRouteContentVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.995] opacity-0"
            }`}
          >
            {children}
          </div>
          <div className="min-h-0 lg:row-span-1">
            <FreelancerRightAside />
          </div>
        </div>
      </div>
    </FreelancerUserContext.Provider>
  );
}
