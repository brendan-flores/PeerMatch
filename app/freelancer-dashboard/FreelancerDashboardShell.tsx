"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { usePathname, useRouter } from "next/navigation";

import type { NotificationItem } from "@/app/lib/notifications";

import { DashboardCenterColumn } from "@/app/components/dashboard/DashboardCenterColumn";

import { FreelancerSidebar } from "@/app/components/freelancer/FreelancerSidebar";

import { FreelancerRightAside } from "@/app/components/freelancer/FreelancerRightAside";

import { useNotifications } from "@/app/hooks/useNotifications";

import { useUnreadMessageCount } from "@/app/hooks/useUnreadMessageCount";

import { apiGetJson, ApiError } from "@/app/lib/api";

import {
  normalizeAuthUser,
  persistFreelancerFromMe,
} from "@/app/lib/freelancerStorage";

import type { CommunityPost } from "@/app/lib/postsStorage";

import {
  USER_PROFILE_PHOTO_UPDATED_EVENT,
  type ProfilePhotoUpdatedDetail,
} from "@/app/lib/profilePhoto";

import { resetHighlightConsumption } from "@/app/lib/notificationHighlight";

import {
  connectSocket,
  disconnectSocket,
} from "@/app/lib/socket";

type MeUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  accountType?: string;
  photoDataUrl?: string;
};

type MeResponse = {
  user: MeUser;
};

type FreelancerUserContextValue = {
  user: MeUser | null;
  loading: boolean;
  selectedPost: CommunityPost | null;
  setSelectedPost: (
    post: CommunityPost | null
  ) => void;
  clearSelectedPost: () => void;
};

const FreelancerUserContext =
  createContext<FreelancerUserContextValue | null>(
    null
  );

export function useFreelancerDashboardUser() {
  const ctx = useContext(FreelancerUserContext);

  if (!ctx) {
    throw new Error(
      "useFreelancerDashboardUser must be used within FreelancerDashboardShell"
    );
  }

  return {
    user: ctx.user,
    loading: ctx.loading,
  };
}

export function useFreelancerSelectedPost() {
  const ctx = useContext(FreelancerUserContext);

  if (!ctx) {
    throw new Error(
      "useFreelancerSelectedPost must be used within FreelancerDashboardShell"
    );
  }

  return {
    selectedPost: ctx.selectedPost,
    setSelectedPost: ctx.setSelectedPost,
    clearSelectedPost: ctx.clearSelectedPost,
  };
}

function isClientUser(
  user: MeUser | null
): boolean {
  if (!user) return false;

  const role = String(
    user.role || ""
  ).toLowerCase();

  const accountType = String(
    user.accountType || ""
  ).toLowerCase();

  return (
    accountType === "client" ||
    role === "client"
  );
}

export function FreelancerDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const pathname = usePathname();

  const [user, setUser] =
    useState<MeUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [selectedPost, setSelectedPost] =
    useState<CommunityPost | null>(null);

  const clearSelectedPost = useCallback(
    () => setSelectedPost(null),
    []
  );

  const [
    isRouteContentVisible,
    setIsRouteContentVisible,
  ] = useState(true);

  const {
    items: notifications,
    markAllRead,
    markOneRead,
  } = useNotifications(user?.id ?? null);

  const { count: unreadMessageCount } =
    useUnreadMessageCount(user?.id ?? null);

  const handleNotificationClick =
    useCallback(
      (item: NotificationItem) => {
        if (
          item.type === "new_task" &&
          item.relatedTaskId
        ) {
          setSelectedPost(null);

          resetHighlightConsumption(
            item.relatedTaskId
          );

          router.push(
            `/freelancer-dashboard?highlightPost=${encodeURIComponent(
              item.relatedTaskId
            )}`
          );
        }
      },
      [router, setSelectedPost]
    );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me =
          await apiGetJson<MeResponse>(
            "/api/auth/me"
          );

        if (cancelled) return;

        const raw =
          me.user as Record<
            string,
            unknown
          >;

        const base = normalizeAuthUser(
          me.user
        );

        const photoDataUrl = String(
          raw.photoDataUrl || ""
        ).trim();

        const nextUser: MeUser = {
          ...base,

          role:
            typeof raw.role === "string"
              ? raw.role
              : "",

          ...(typeof raw.accountType ===
          "string"
            ? {
                accountType:
                  raw.accountType,
              }
            : {}),

          ...(photoDataUrl
            ? { photoDataUrl }
            : {}),
        };

        persistFreelancerFromMe(base);

        setUser(nextUser);
      } catch (err) {
        if (cancelled) return;

        if (
          err instanceof ApiError &&
          err.status === 401
        ) {
          router.push("/login");
          return;
        }

        setUser(null);
      } finally {
        if (!cancelled)
          setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const onPhotoUpdated = (
      event: Event
    ) => {
      const detail = (
        event as CustomEvent<ProfilePhotoUpdatedDetail>
      ).detail;

      const userId = String(
        detail?.userId || ""
      ).trim();

      if (!userId) return;

      setUser((prev) =>
        prev &&
        String(prev.id) === userId
          ? {
              ...prev,
              photoDataUrl:
                detail.photoDataUrl,
            }
          : prev
      );
    };

    window.addEventListener(
      USER_PROFILE_PHOTO_UPDATED_EVENT,
      onPhotoUpdated
    );

    return () =>
      window.removeEventListener(
        USER_PROFILE_PHOTO_UPDATED_EVENT,
        onPhotoUpdated
      );
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    connectSocket(user.id);

    return () => {
      disconnectSocket();
    };
  }, [user?.id]);

  const clientUser =
    isClientUser(user);

  useEffect(() => {
    if (!user || loading) return;

    if (clientUser)
      router.replace("/client-home");
  }, [
    user,
    loading,
    clientUser,
    router,
  ]);

  useEffect(() => {
    setIsRouteContentVisible(false);

    const timeoutId =
      window.setTimeout(() => {
        setIsRouteContentVisible(true);
      }, 90);

    return () =>
      window.clearTimeout(timeoutId);
  }, [pathname]);

  useEffect(() => {
    const search =
      window.location.search;

    const openingPostFromQuery =
      search.includes("openPost");

    if (!openingPostFromQuery) {
      clearSelectedPost();
    }

    if (
      pathname !==
        "/freelancer-dashboard" &&
      pathname !==
        "/freelancer-dashboard/browse" &&
      (search.includes(
        "highlightPost"
      ) ||
        search.includes("openPost"))
    ) {
      router.replace(pathname);
    }
  }, [
    pathname,
    clearSelectedPost,
    router,
  ]);

  const value = useMemo(
    () => ({
      user,
      loading,
      selectedPost,
      setSelectedPost,
      clearSelectedPost,
    }),
    [
      user,
      loading,
      selectedPost,
      clearSelectedPost,
    ]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E5F6F4]">
        <p className="text-sm text-zinc-500">
          Loading…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#E5F6F4] px-4">
        <p className="text-sm text-zinc-600">
          We couldn&apos;t load your
          session.
        </p>

        <button
          type="button"
          onClick={() =>
            router.push("/login")
          }
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
        <p className="text-sm text-zinc-500">
          Redirecting…
        </p>
      </div>
    );
  }

  return (
    <FreelancerUserContext.Provider
      value={value}
    >
      <div className="relative h-[100dvh] overflow-hidden bg-[#E5F6F4] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto grid h-full min-h-0 w-full max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <div className="h-full min-h-0 overflow-hidden lg:row-span-1">
            <FreelancerSidebar />
          </div>

          <DashboardCenterColumn
            items={notifications}
            onMarkAllRead={
              markAllRead
            }
            onMarkOneRead={
              markOneRead
            }
            onNotificationClick={
              handleNotificationClick
            }
            showBell={false}
            contentClassName={`transform-gpu transition-all duration-[420ms] ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none ${
              isRouteContentVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-1 scale-[0.995] opacity-0"
            }`}
          >
            {children}
          </DashboardCenterColumn>

          <div className="relative z-10 h-full min-h-0 lg:row-span-1">
            <FreelancerRightAside
              notifications={
                notifications
              }
              onMarkAllRead={
                markAllRead
              }
              onMarkOneRead={
                markOneRead
              }
              onNotificationClick={
                handleNotificationClick
              }
            />
          </div>
        </div>
      </div>
    </FreelancerUserContext.Provider>
  );
}