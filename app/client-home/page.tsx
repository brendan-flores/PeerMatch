"use client";

import Link from "next/link";
import SidebarBrand from "../components/SidebarBrand";
import { CommunityPostCard } from "../components/freelancer/CommunityPostCard";
import { FreelancerFeedMain } from "../components/freelancer/FreelancerFeedMain";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  CirclePlus,
  FilePenLine,
  FileText,
  Handshake,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MessageCircle,
  ShieldAlert,
  Send,
  Sparkles,
  Upload,
  UserCircle,
  User,
} from "lucide-react";
import { apiGetJson, apiPostJson, ApiError } from "../lib/api";
import {
  formatPhpBudget,
  POST_REVIEW_MESSAGE,
  urgencyBadgeClass,
  URGENCY_OPTIONS,
} from "../lib/communityPosts";
import { useCommunityPostsContext } from "../lib/CommunityPostsContext";
import { ClientOffersPanel } from "../components/client/ClientOffersPanel";
import { ClientRightAside } from "../components/client/ClientRightAside";
import { FeaturedPostEditor } from "../components/client/FeaturedPostEditor";
import {
  isCommunityPostWithinLast24Hours,
  isEligibleFeaturedPost,
  notifyCommunityPostsChanged,
  type CommunityPostPriority,
} from "../lib/postsStorage";
import { connectSocket, disconnectSocket, subscribePostApproved } from "../lib/socket";
import { ChatLayout } from "../components/chat/ChatLayout";
import { DashboardCenterColumn } from "../components/dashboard/DashboardCenterColumn";
import {
  dashboardPanelScrollClass,
  dashboardCenterPanelCompactPaddingClass,
  dashboardCenterPanelHeadingClass,
  dashboardFeedPageHeadingClass,
  dashboardPanelScrollInsetClass,
  dashboardProfileScrollClass,
  dashboardSidebarNavScrollClass,
  mobileDashboardWhitePanelClass,
} from "../components/dashboard/dashboardShellClasses";
import { FeedPageHeader } from "../components/dashboard/FeedPageHeader";
import { MobileFeedTopBar } from "../components/dashboard/MobileFeedTopBar";
import { buildClientMobileNavItems } from "../components/dashboard/dashboardMobileNavItems";
import { NavUnreadBadge } from "../components/NavUnreadBadge";
import { fetchClientOffers, isOfferPending } from "../lib/offersApi";
import { useCurrentUserProfile } from "../lib/CurrentUserProfileContext";
import { persistProfilePhotoFromFile } from "../lib/profilePhoto";
import { UserAvatar } from "../components/UserAvatar";
import { dicebearInitialsAvatar } from "../lib/profilePhotoDisplay";
import { useNotifications, type NotificationItem } from "@/app/hooks/useNotifications";
import { useUnreadMessageCount } from "../hooks/useUnreadMessageCount";

type PostItem = {
  id: string;
  authorId: string;
  author: string;
  timeAgo: string;
  createdAt: string;
  title: string;
  content: string;
  category: string;
  priority: CommunityPostPriority;
  budget: number;
  avatar: string;
};

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  accountType?: string;
  course?: string;
  yearLevel?: string;
  aboutMe?: string;
  skills?: string;
  location?: string;
  photoDataUrl?: string;
};

type ProfileFormSnapshot = {
  name: string;
  course: string;
  yearLevel: string;
  location: string;
  aboutMe: string;
  skills: string;
  photoDataUrl: string;
};

const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const courseOptions = [
  // Engineering & Architecture
  "BS Architecture",
  "BS Chemical Engineering",
  "BS Civil Engineering",
  "BS Computer Engineering",
  "BS Electrical Engineering",
  "BS Electronics Engineering",
  "BS Industrial Engineering",
  "BS Mechanical Engineering",
  "BS Mining Engineering",

  // Management, Business & Accountancy
  "BS Accountancy",
  "BS Accounting Information Systems",
  "BS Management Accounting",
  "BS Business Administration",
  "BS Hospitality Management",
  "BS Tourism Management",
  "BS Office Administration",
  "Bachelor in Public Administration",

  // Arts, Sciences & Education
  "AB Communication",
  "AB English with Applied Linguistics",
  "Bachelor of Elementary Education",
  "Bachelor of Secondary Education",
  "Bachelor of Multimedia Arts",
  "BS Biology",
  "BS Math with Applied Industrial Mathematics",
  "BS Psychology",

  // Computer Studies
  "BS Computer Science",
  "BS Information Technology",

  // Health & Allied Health Sciences
  "BS Nursing",
  "BS Pharmacy",
  "BS Medical Technology",

  // Criminal Justice
  "BS Criminology",
] as const;

const navItemClass =
  "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-zinc-900 transition-[background-color,color,box-shadow] duration-300 ease-in-out hover:bg-white/80 hover:shadow-sm";
const navActiveClass = "bg-[#FF6B35] text-white shadow-sm";

function ClientHomePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePanel = searchParams.get("panel");
  const highlightPost = searchParams.get("highlightPost");
  const [displayName, setDisplayName] = useState<string>("");
  const [displayEmail, setDisplayEmail] = useState<string>("");
  const [profileNameInput, setProfileNameInput] = useState<string>("");
  const [profileCourseInput, setProfileCourseInput] = useState<string>("");
  const [profileYearLevelInput, setProfileYearLevelInput] = useState<string>("");
  const [profileLocationInput, setProfileLocationInput] = useState<string>("");
  const [profileAboutInput, setProfileAboutInput] = useState<string>("");
  const [profileSkillsInput, setProfileSkillsInput] = useState<string>("");
  const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState<string>("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profilePhotoSaving, setProfilePhotoSaving] = useState(false);
  const [profileStatusMessage, setProfileStatusMessage] = useState<string>("");
  const { photoDataUrl: globalPhotoDataUrl, syncProfile } = useCurrentUserProfile();
  const [meUserId, setMeUserId] = useState<string>("");
  const peerFromQuery = searchParams.get("with") || "";
  const [peerUserId, setPeerUserId] = useState<string>(peerFromQuery);
  const [peerSearchText, setPeerSearchText] = useState<string>(peerFromQuery);
  const [savedProfileSnapshot, setSavedProfileSnapshot] = useState<ProfileFormSnapshot | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const {
    approvedPosts,
    myPosts,
    approvedLoading,
    approvedError,
    refreshAll,
    refreshMyPosts,
    updateAuthorAvatarsLocally,
  } = useCommunityPostsContext();
  const [postCategoryInput, setPostCategoryInput] = useState("");
  const [postPriorityInput, setPostPriorityInput] = useState<CommunityPostPriority>("Normal");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [postTitleInput, setPostTitleInput] = useState("");
  const [postDescriptionInput, setPostDescriptionInput] = useState("");
  const [postBudgetInput, setPostBudgetInput] = useState("");
  const [postStatusMessage, setPostStatusMessage] = useState("");
  const knownApprovedPostIdsRef = useRef<Set<string>>(new Set());

  const activeConnections: number | null | undefined = undefined;
  const hoursThisWeek: number | null | undefined = undefined;
  const displayConnectionsRaw =
    typeof activeConnections === "number" && Number.isFinite(activeConnections) ? activeConnections : 0;
  const displayHoursRaw = typeof hoursThisWeek === "number" && Number.isFinite(hoursThisWeek) ? hoursThisWeek : 0;

  const displayConnections = displayConnectionsRaw;
  const displayHours = displayHoursRaw;

  const postsHeading = "Community Feed";

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

  const mapPostForUi = (
    post: {
      id: string;
      authorId: string;
      authorName: string;
      createdAt: string;
      title: string;
      content: string;
      category: string;
      priority: CommunityPostPriority;
      budget?: number;
      authorAvatarDataUrl?: string;
    },
    me: { id: string; photo: string },
  ): PostItem => {
    const isMine = Boolean(me.id && post.authorId && String(post.authorId) === String(me.id));
    const avatar =
      String(post.authorAvatarDataUrl || "").trim() ||
      (isMine && me.photo ? me.photo : "") ||
      dicebearInitialsAvatar(post.authorName || "Client");
    return {
      id: post.id,
      authorId: post.authorId,
      author: post.authorName || "Client User",
      timeAgo: formatTimeAgo(post.createdAt),
      createdAt: post.createdAt,
      title: post.title,
      content: post.content,
      category: post.category || "General",
      priority: post.priority,
      budget: typeof post.budget === "number" ? post.budget : 0,
      avatar,
    };
  };

  useEffect(() => {
    setPeerUserId(peerFromQuery);
    setPeerSearchText(peerFromQuery);
  }, [peerFromQuery]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiGetJson<{ user: { id: string; name: string; email: string; role: string } }>(
          "/api/auth/me",
        );
        const fullName = String(me.user?.name || "").trim();
        const email = String(me.user?.email || "").trim();
        if (!cancelled) {
          setDisplayName(fullName);
          setDisplayEmail(email);
          setProfileNameInput(fullName);
          if (me.user?.id) {
            setMeUserId(String(me.user.id));
          }
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const displayProfilePhoto = globalPhotoDataUrl || profilePhotoDataUrl;
  const posts = useMemo(
    () =>
      approvedPosts.map((post) =>
        mapPostForUi(post, { id: meUserId, photo: displayProfilePhoto }),
      ),
    [approvedPosts, meUserId, displayProfilePhoto],
  );

  const recentPosts = useMemo(
    () => posts.filter((post) => isCommunityPostWithinLast24Hours(post.createdAt)),
    [posts],
  );

  const { items: notifications, markAllRead, markOneRead, deleteOne, refresh: refreshNotifications } =
    useNotifications(meUserId || null);
  const { count: unreadMessageCount } = useUnreadMessageCount(meUserId || null);

  const handleNotificationClick = useCallback(
    (item: NotificationItem) => {
      if (item.type === "new_offer" && item.relatedTaskId) {
        router.push(
          `/client-home?panel=offers&highlightPost=${encodeURIComponent(item.relatedTaskId)}`,
        );
      }
      if ((item.type === "post_review" || item.type === "post_approved") && item.relatedTaskId) {
        router.push(`/client-home?post=${encodeURIComponent(item.relatedTaskId)}`);
      }
    },
    [router],
  );

  const clearOfferHighlightFromUrl = useCallback(() => {
    if (!highlightPost) return;
    router.replace("/client-home?panel=offers");
  }, [highlightPost, router]);

  const handlePostApproved = useCallback(
    (message?: string) => {
      void refreshAll();
      void refreshNotifications();
    },
    [refreshAll, refreshNotifications],
  );

  useEffect(() => {
    if (!meUserId) return;
    connectSocket(meUserId);
    const unsub = subscribePostApproved((payload) => {
      if (payload.post?.id) {
        knownApprovedPostIdsRef.current.add(payload.post.id);
      }
      handlePostApproved(payload.message);
    });
    return unsub;
  }, [meUserId, handlePostApproved]);

  useEffect(() => {
    if (!meUserId) return;
    for (const post of myPosts) {
      if (post.status === "approved") {
        knownApprovedPostIdsRef.current.add(post.id);
      }
    }
  }, [meUserId, myPosts]);

  const awaitingPostApproval =
    notifications.some((item) => item.type === "post_review" && !item.read);

  useEffect(() => {
    if (!meUserId || !awaitingPostApproval) return;

    let cancelled = false;
    const pollForApproval = async () => {
      try {
        const mine = await refreshMyPosts();
        if (cancelled) return;
        const newlyApproved = mine.filter(
          (post) => post.status === "approved" && !knownApprovedPostIdsRef.current.has(post.id),
        );
        if (newlyApproved.length === 0) return;
        for (const post of newlyApproved) {
          knownApprovedPostIdsRef.current.add(post.id);
        }
        handlePostApproved();
      } catch {
        // retry on next interval
      }
    };

    void pollForApproval();
    const intervalId = window.setInterval(() => void pollForApproval(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [meUserId, awaitingPostApproval, handlePostApproved, refreshMyPosts]);

  useEffect(() => {
    setIsPanelVisible(false);
    const timeoutId = window.setTimeout(() => {
      setIsPanelVisible(true);
    }, 90);
    return () => window.clearTimeout(timeoutId);
  }, [activePanel]);

  const hasUnreadOfferNotification = useMemo(
    () => notifications.some((item) => item.type === "new_offer" && !item.read),
    [notifications],
  );

  useEffect(() => {
    if (!meUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const { offers } = await fetchClientOffers();
        if (cancelled) return;
        setPendingOffersCount(offers.filter((offer) => isOfferPending(offer.status)).length);
      } catch {
        // ignore — offers panel will surface errors when opened
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meUserId, hasUnreadOfferNotification]);

  useEffect(() => {
    setPeerUserId(peerFromQuery);
  }, [peerFromQuery]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await apiGetJson<{ user: ProfileUser }>("/api/auth/profile");
        if (cancelled) return;
        const user = profile.user;
        if (user.id) {
          setMeUserId(String(user.id));
        }
        setDisplayName(String(user.name || "").trim());
        setDisplayEmail(String(user.email || "").trim());
        setProfileNameInput(String(user.name || "").trim());
        setProfileCourseInput(String(user.course || "").trim());
        setProfileYearLevelInput(String(user.yearLevel || "").trim());
        setProfileLocationInput(String(user.location || "").trim());
        setProfileAboutInput(String(user.aboutMe || "").trim());
        setProfileSkillsInput(String(user.skills || "").trim());
        const photo = String(user.photoDataUrl || "").trim();
        setProfilePhotoDataUrl(photo);
        if (user.id) syncProfile(String(user.id), photo);
        setSavedProfileSnapshot({
          name: String(user.name || "").trim(),
          course: String(user.course || "").trim(),
          yearLevel: String(user.yearLevel || "").trim(),
          location: String(user.location || "").trim(),
          aboutMe: String(user.aboutMe || "").trim(),
          skills: String(user.skills || "").trim(),
          photoDataUrl: String(user.photoDataUrl || "").trim(),
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
      } finally {
        if (!cancelled) setProfileLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, syncProfile]);

  const handleLogout = async () => {
    try {
      await apiPostJson("/api/auth/logout", {});
    } finally {
      disconnectSocket();
      router.push("/login");
    }
  };

  const myFeaturedPosts = useMemo(
    () => (meUserId ? myPosts.filter(isEligibleFeaturedPost) : []),
    [myPosts, meUserId],
  );
  const profileName = profileNameInput || displayName || "Client User";
  const hasUnsavedProfileChanges = useMemo(() => {
    if (!savedProfileSnapshot || !profileLoaded) return false;
    const s = savedProfileSnapshot;
    return (
      profileNameInput.trim() !== s.name ||
      profileCourseInput.trim() !== s.course ||
      profileYearLevelInput.trim() !== s.yearLevel ||
      profileLocationInput.trim() !== s.location ||
      profileAboutInput.trim() !== s.aboutMe ||
      profileSkillsInput.trim() !== s.skills ||
      profilePhotoDataUrl.trim() !== s.photoDataUrl
    );
  }, [
    savedProfileSnapshot,
    profileLoaded,
    profileNameInput,
    profileCourseInput,
    profileYearLevelInput,
    profileLocationInput,
    profileAboutInput,
    profileSkillsInput,
    profilePhotoDataUrl,
  ]);

  const canSaveProfile = hasUnsavedProfileChanges && profileLoaded && !profileSaving;

  const handleProfilePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void (async () => {
      setProfilePhotoSaving(true);
      setProfileStatusMessage("Saving profile photo...");
      try {
        const { photoDataUrl: photo, userId } = await persistProfilePhotoFromFile(file, meUserId);
        setProfilePhotoDataUrl(photo);
        if (userId) {
          setMeUserId(userId);
          syncProfile(userId, photo);
        }
        setSavedProfileSnapshot((prev) =>
          prev
            ? { ...prev, photoDataUrl: photo }
            : {
                name: profileNameInput.trim(),
                course: profileCourseInput.trim(),
                yearLevel: profileYearLevelInput.trim(),
                location: profileLocationInput.trim(),
                aboutMe: profileAboutInput.trim(),
                skills: profileSkillsInput.trim(),
                photoDataUrl: photo,
              },
        );
        updateAuthorAvatarsLocally(userId || meUserId, photo);
        await refreshAll();
        void refreshNotifications();
        setProfileStatusMessage("Profile photo saved");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not save profile photo.";
        setProfileStatusMessage(message);
      } finally {
        setProfilePhotoSaving(false);
        event.target.value = "";
      }
    })();
  };

  const handleSaveProfile = async () => {
    if (!profileLoaded || profileSaving || !hasUnsavedProfileChanges) return;
    setProfileSaving(true);
    setProfileStatusMessage("Saving profile...");
    try {
      await apiPostJson<{ user: ProfileUser }>("/api/auth/profile", {
        name: profileNameInput,
        course: profileCourseInput,
        yearLevel: profileYearLevelInput,
        location: profileLocationInput,
        aboutMe: profileAboutInput,
        skills: profileSkillsInput,
        photoDataUrl: profilePhotoDataUrl,
      });
      setDisplayName(profileNameInput.trim());
      setSavedProfileSnapshot({
        name: profileNameInput.trim(),
        course: profileCourseInput.trim(),
        yearLevel: profileYearLevelInput.trim(),
        location: profileLocationInput.trim(),
        aboutMe: profileAboutInput.trim(),
        skills: profileSkillsInput.trim(),
        photoDataUrl: profilePhotoDataUrl.trim(),
      });
      setProfileStatusMessage("Profile saved");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not save profile.";
      setProfileStatusMessage(message);
    } finally {
      setProfileSaving(false);
    }
  };


  const handleCreatePost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const category = postCategoryInput.trim();
    const title = postTitleInput.trim();
    const content = postDescriptionInput.trim();
    const budgetRaw = postBudgetInput.trim();
    const budget = Number(budgetRaw.replace(/,/g, ""));
    if (!category || !title || !content || !meUserId) {
      setPostStatusMessage("Please complete category, title, and description.");
      return;
    }
    if (!budgetRaw || !Number.isFinite(budget) || budget < 50) {
      setPostStatusMessage("Enter a valid budget of at least ₱50.");
      return;
    }
    if (postSubmitting) return;
    void (async () => {
      setPostSubmitting(true);
      setPostStatusMessage("");
      try {
        const created = await apiPostJson<{ message: string; post?: { id: string } }>("/api/tasks", {
          title,
          description: content,
          subjectCategory: category,
          urgency: postPriorityInput.toLowerCase(),
          budget: Math.round(budget),
        });
        if (created.post?.id) {
          knownApprovedPostIdsRef.current.delete(created.post.id);
        }
        setPostCategoryInput("");
        setPostPriorityInput("Normal");
        setPostTitleInput("");
        setPostDescriptionInput("");
        setPostBudgetInput("");
        void refreshNotifications();
        await refreshAll();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Could not save your post. Please try again.";
        setPostStatusMessage(message);
      } finally {
        setPostSubmitting(false);
      }
    })();
  };

  const navItems = [
    { href: "/client-home", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5 shrink-0" strokeWidth={1.75} /> },
    {
      href: "/client-home?panel=create-post",
      label: "Create Post",
      icon: <CirclePlus className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
    },
    {
      href: "/client-home?panel=messages",
      label: "Message",
      icon: <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
    },
    {
      href: "/client-home?panel=offers",
      label: "Offers",
      icon: <Handshake className="h-5 w-5 shrink-0" strokeWidth={1.75} />,
    },
    { href: "/client-home?panel=profile", label: "Profile", icon: <User className="h-5 w-5 shrink-0" strokeWidth={1.75} /> },
  ];

  const isNavActive = (href: string) => {
    if (href === "/client-home") return pathname === "/client-home" && !activePanel;
    const panel = href.split("panel=")[1];
    return pathname === "/client-home" && panel === activePanel;
  };

  const isFeedView = pathname === "/client-home" && !activePanel;

  const mobileNavItems = useMemo(
    () =>
      buildClientMobileNavItems({
        unreadMessageCount,
        pendingOffersCount,
        onDashboardNavigate: () => router.push("/client-home"),
      }),
    [router, unreadMessageCount, pendingOffersCount],
  );

  const panelTransitionClass = `transform-gpu transition-all duration-[420ms] ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none ${
    isPanelVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.995] opacity-0"
  }`;

  return (
    <div
      className={`flex h-[100dvh] flex-col overflow-hidden bg-[#E5F6F4] px-4 py-4 sm:px-6 lg:px-8 lg:py-6 ${
        activePanel === "messages" ? "max-lg:px-0 max-lg:py-0" : ""
      }`}
    >
      {activePanel !== "messages" ? (
        <MobileFeedTopBar
          items={mobileNavItems}
          isActive={isNavActive}
          onLogout={handleLogout}
          notifications={notifications}
          onMarkAllRead={markAllRead}
          onMarkOneRead={markOneRead}
          onDeleteNotification={deleteOne}
          onNotificationClick={handleNotificationClick}
        />
      ) : null}

      <div
        className={`mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px] xl:grid-cols-[280px_minmax(0,1fr)_320px] ${
          activePanel === "messages" ? "max-lg:gap-0" : ""
        }`}
      >
        <aside className="hidden h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-[#E8EFEC] p-6 shadow-sm lg:flex lg:row-span-1">
          <SidebarBrand />

          <nav className={dashboardSidebarNavScrollClass} aria-label="Main">
            {navItems.map((item) => {
              const active = isNavActive(item.href);
              const isDashboard = item.href === "/client-home";
              return (
                isDashboard ? (
                  <Link
                    key={item.href}
                    href="/client-home"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push("/client-home");
                    }}
                    aria-current={active ? "page" : undefined}
                    className={`${navItemClass} ${active ? navActiveClass : ""}`}
                  >
                    {item.icon}
                    <span className="min-w-0 flex-1">{item.label}</span>
                  </Link>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`${navItemClass} ${active ? navActiveClass : ""}`}
                  >
                    {item.icon}
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {item.href.includes("panel=messages") ? (
                      <NavUnreadBadge count={unreadMessageCount} active={active} />
                    ) : null}
                    {item.href.includes("panel=offers") ? (
                      <NavUnreadBadge count={pendingOffersCount} active={active} />
                    ) : null}
                  </Link>
                )
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className={`${navItemClass} mt-4 w-full justify-start border border-transparent`}
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            <span>Logout</span>
          </button>
        </aside>

        {isFeedView ? (
          <DashboardCenterColumn
            items={notifications}
            onMarkAllRead={markAllRead}
            onMarkOneRead={markOneRead}
            onDeleteNotification={deleteOne}
            onNotificationClick={handleNotificationClick}
            showBell={false}
            contentClassName={panelTransitionClass}
          >
            <FreelancerFeedMain
              scrollable
              children={null}
              header={<FeedPageHeader title={postsHeading} className="hidden lg:block" />}
              scroll={
                <section aria-labelledby="client-community-feed" className="space-y-4">
                  {approvedLoading ? (
                    <p className="text-sm text-zinc-500">Loading community posts...</p>
                  ) : approvedError ? (
                    <p className="text-sm text-red-600">{approvedError}</p>
                  ) : approvedPosts.length > 0 ? (
                    approvedPosts.map((post) => (
                      <CommunityPostCard
                        key={post.id}
                        post={post}
                        onSelect={(selected) =>
                          router.push(`/client-home?post=${encodeURIComponent(selected.id)}`)
                        }
                      />
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No posts yet.</p>
                  )}
                </section>
              }
            />
          </DashboardCenterColumn>
        ) : (
        <DashboardCenterColumn
          items={notifications}
          onMarkAllRead={markAllRead}
          onMarkOneRead={markOneRead}
          onDeleteNotification={deleteOne}
          onNotificationClick={handleNotificationClick}
          showBell={false}
          contentClassName={panelTransitionClass}
        >
        <main
          className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-100/80 bg-white shadow-[0_4px_32px_rgba(15,23,42,0.04)] ${
            activePanel === "messages"
              ? "max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none lg:px-6 lg:pb-8 lg:pt-4"
              : activePanel === "create-post" || activePanel === "offers" || activePanel === "profile" || activePanel === "featured-post"
              ? "max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none lg:p-4"
              : "p-6 sm:p-8 lg:p-10"
          } ${
            activePanel === "create-post" || activePanel === "offers"
              ? `${dashboardCenterPanelCompactPaddingClass} max-lg:!p-0`
              : activePanel === "profile" || activePanel === "featured-post"
                ? "max-lg:!p-0"
                : ""
          }`}
        >
          <div className="flex h-full min-h-0 flex-1 flex-col">
            {activePanel === "create-post" ? (
              <div className={`${mobileDashboardWhitePanelClass} h-full min-h-0`}>
              <div className={`${dashboardPanelScrollClass} max-lg:px-4 max-lg:py-4`}>
              <section aria-labelledby="create-post-heading" className="min-w-0">
                <div className={dashboardFeedPageHeadingClass}>
                  <h1 id="create-post-heading" className="text-4xl font-bold tracking-tight text-zinc-900">
                    Create New Post
                  </h1>
                  <p className="mt-1.5 text-sm text-zinc-600">
                    Share what you need help with and connect with peers
                  </p>
                </div>

                <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_230px]">
                  <article className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-5 shadow-sm sm:p-6">
                    <form className="space-y-4" onSubmit={handleCreatePost}>
                      <div>
                        <label
                          htmlFor="post-category"
                          className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900"
                        >
                          <span className="inline-flex items-center justify-center rounded-md bg-[#FFF2EB] p-1 text-[#FF6B35]">
                            <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
                          </span>
                          Category
                        </label>
                        <input
                          id="post-category"
                          type="text"
                          value={postCategoryInput}
                          onChange={(event) => setPostCategoryInput(event.target.value)}
                          placeholder="e.g. Tutoring, Design, Moving help, Errands"
                          className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                        />
                        <p className="mt-1.5 text-[11px] text-zinc-500">What type of help or request is this?</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="post-urgency"
                            className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900"
                          >
                            <span className="inline-flex items-center justify-center rounded-md bg-[#FFF2EB] p-1 text-[#FF6B35]">
                              <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2} />
                            </span>
                            Urgency Level
                          </label>
                          <div className="relative">
                            <select
                              id="post-urgency"
                              value={postPriorityInput}
                              onChange={(event) => setPostPriorityInput(event.target.value as CommunityPostPriority)}
                              className="h-11 w-full appearance-none rounded-xl border border-zinc-300 bg-white px-3 pr-9 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                            >
                              {URGENCY_OPTIONS.map((level) => (
                                <option key={level} value={level}>
                                  {level}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              aria-hidden="true"
                              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-700"
                              strokeWidth={2}
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="post-title"
                            className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900"
                          >
                            <span className="inline-flex items-center justify-center rounded-md bg-[#FFF2EB] p-1 text-[#FF6B35]">
                              <FileText className="h-3.5 w-3.5" strokeWidth={2} />
                            </span>
                            Post Title
                          </label>
                          <input
                            id="post-title"
                            type="text"
                            value={postTitleInput}
                            onChange={(event) => setPostTitleInput(event.target.value)}
                            placeholder="e.g. Need help understanding Trigonometry"
                            className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="post-description"
                          className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900"
                        >
                          <span className="inline-flex items-center justify-center rounded-md bg-[#FFF2EB] p-1 text-[#FF6B35]">
                            <FilePenLine className="h-3.5 w-3.5" strokeWidth={2} />
                          </span>
                          Description
                        </label>
                        <textarea
                          id="post-description"
                          value={postDescriptionInput}
                          onChange={(event) => setPostDescriptionInput(event.target.value)}
                          placeholder="Describe what you need help with in detail. Be specific about topics, deadlines, and learning goals..."
                          className="h-32 w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                        />
                        <p className="mt-1.5 text-[11px] text-zinc-500">Detailed descriptions get better responses</p>
                      </div>

                      <div>
                        <label
                          htmlFor="post-budget"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900"
                        >
                          <span className="inline-flex items-center justify-center rounded-md bg-[#FFF2EB] p-1 text-[#FF6B35]">
                            <CircleDollarSign className="h-3.5 w-3.5" strokeWidth={2} />
                          </span>
                          Budget (PHP)
                        </label>
                        <div className="relative mt-1.5">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-500">
                            ₱
                          </span>
                          <input
                            id="post-budget"
                            type="number"
                            min={50}
                            step={50}
                            value={postBudgetInput}
                            onChange={(event) => setPostBudgetInput(event.target.value)}
                            placeholder="e.g. 800"
                            className="h-11 w-full rounded-xl border border-zinc-300 bg-white py-2 pl-9 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-zinc-500">
                          How much you are willing to pay a peer for this help (Philippine Peso).
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={postSubmitting}
                          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Send className="h-4 w-4" strokeWidth={2} />
                          <span>{postSubmitting ? "Submitting…" : "Post Request"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPostCategoryInput("");
                            setPostPriorityInput("Normal");
                            setPostTitleInput("");
                            setPostDescriptionInput("");
                            setPostBudgetInput("");
                            setPostStatusMessage("");
                          }}
                          className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Clear
                        </button>
                      </div>
                      {postStatusMessage && postStatusMessage !== POST_REVIEW_MESSAGE ? (
                        <p className="text-xs text-red-600" role="alert">
                          {postStatusMessage}
                        </p>
                      ) : null}
                    </form>
                  </article>

                  <div className="space-y-4 xl:max-h-[calc(100vh-11rem)] xl:overflow-y-auto xl:pr-1">
                    <aside className="rounded-2xl border border-[#F3DCCF] bg-[#FFF2EB] p-4 shadow-sm">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                        <Lightbulb className="h-4 w-4 text-[#FF6B35]" strokeWidth={1.8} />
                        <span>Pro Tips</span>
                      </h2>
                      <ul className="mt-3 space-y-1.5 text-xs leading-5 text-zinc-600">
                        <li>- Be specific about what you need</li>
                        <li>- Set realistic deadlines</li>
                        <li>- Use AI to find a fair PHP rate, then set your budget</li>
                        <li>- Provide context for your request</li>
                      </ul>
                    </aside>
                  </div>
                </div>
              </section>
              </div>
              </div>
            ) : activePanel === "offers" ? (
              <div className={`${mobileDashboardWhitePanelClass} h-full min-h-0`}>
              <div className={`${dashboardPanelScrollClass} max-lg:px-4 max-lg:py-4`}>
                <ClientOffersPanel
                  onPendingCountChange={setPendingOffersCount}
                  highlightPostId={highlightPost}
                  onHighlightComplete={clearOfferHighlightFromUrl}
                />
              </div>
              </div>
            ) : activePanel === "messages" ? (
              <section
                aria-labelledby="messages-heading"
                className="flex h-full max-h-full min-h-0 w-full flex-1 flex-col overflow-hidden max-lg:rounded-none"
              >
                <div className="h-full max-h-full min-h-0 flex-1 overflow-hidden">
                  <ChatLayout
                    currentUserId={meUserId}
                    initialOtherQuery={peerUserId.trim()}
                    allowUnsend
                    currentUserName={profileNameInput || displayName}
                    currentUserPhoto={displayProfilePhoto}
                    mobileNav={{
                      items: mobileNavItems,
                      isActive: isNavActive,
                      onLogout: handleLogout,
                    }}
                    notifications={notifications}
                    onMarkAllRead={markAllRead}
                    onMarkOneRead={markOneRead}
                    onDeleteNotification={deleteOne}
                    onNotificationClick={handleNotificationClick}
                    className="!h-full !min-h-0 !rounded-none !border-0 !bg-[#E5F6F4] lg:!rounded-2xl lg:!border lg:!border-zinc-200 lg:!bg-white"
                  />
                </div>
              </section>
            ) : activePanel === "profile" || activePanel === "featured-post" ? (
              <section
                aria-labelledby={activePanel === "featured-post" ? "featured-post-heading" : "profile-heading"}
                className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden ${dashboardPanelScrollInsetClass}`}
              >
                <div className={`h-full min-h-0 ${mobileDashboardWhitePanelClass}`}>
                  <div
                    className={`panel-scroll-pane flex h-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] max-lg:px-4 max-lg:py-4 xl:flex-row xl:gap-4 xl:overflow-hidden xl:px-0 xl:py-0`}
                  >
                    <article className="mx-auto h-fit w-full max-w-md shrink-0 rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm xl:mx-0 xl:max-w-[260px]">
                    <div className="mx-auto flex justify-center">
                      <UserAvatar
                        id={meUserId}
                        name={profileName}
                        photoDataUrl={displayProfilePhoto}
                        size="2xl"
                        alt="Profile"
                        initialsClassName="bg-[#E8EFEC] text-zinc-800"
                      />
                    </div>
                    <input
                      ref={profilePhotoInputRef}
                      type="file"
                      accept="image/*,.heic,.heif,.avif,.bmp,.tif,.tiff,.svg"
                      className="hidden"
                      onChange={handleProfilePhotoChange}
                    />
                    <button
                      type="button"
                      onClick={() => profilePhotoInputRef.current?.click()}
                      disabled={profilePhotoSaving}
                      className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {profilePhotoSaving ? "Saving photo..." : "Change photo"}
                    </button>
                    <h1 id="profile-heading" className="mt-3 text-center text-2xl font-bold tracking-tight text-zinc-900">
                      {profileName}
                    </h1>
                    <p className="mt-1 text-center text-xs text-zinc-500">{displayEmail || "No email on file"}</p>
                    <div className="mt-3 rounded-xl bg-white px-3 py-2 text-center">
                      <p className="text-xs font-semibold text-[#FF6B35]">Verified Peer Match Account</p>
                    </div>
                  </article>

                  <div className={`mx-auto w-full max-w-md space-y-4 max-lg:overflow-visible max-lg:flex-none xl:mx-0 xl:max-w-none xl:min-h-0 xl:flex-1 ${dashboardProfileScrollClass}`}>
                    {activePanel === "featured-post" ? (
                      <FeaturedPostEditor authorId={meUserId} authorAvatar={displayProfilePhoto || undefined} />
                    ) : (
                      <>
                    <article className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                        <UserCircle className="h-5 w-5 shrink-0 text-[#FF6B35]" strokeWidth={1.75} aria-hidden />
                        About
                      </h2>
                      <label className="mt-3 block text-xs font-semibold text-zinc-700">Full Name</label>
                      <input
                        type="text"
                        value={profileNameInput}
                        onChange={(event) => setProfileNameInput(event.target.value)}
                        className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                      />
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700">Course</label>
                          <div className="relative mt-1">
                            <select
                              value={profileCourseInput}
                              onChange={(event) => setProfileCourseInput(event.target.value)}
                              className="h-10 w-full appearance-none rounded-xl border border-zinc-300 bg-white py-2 pl-3 pr-9 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                            >
                              <option value="" disabled>
                                Select a course
                              </option>
                              {courseOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              aria-hidden="true"
                              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600"
                              strokeWidth={2}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700">Year Level</label>
                          <div className="relative mt-1">
                            <select
                              value={profileYearLevelInput}
                              onChange={(event) => setProfileYearLevelInput(event.target.value)}
                              className="h-10 w-full appearance-none rounded-xl border border-zinc-300 bg-white py-2 pl-3 pr-9 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                            >
                              <option value="" disabled>
                                Select a year level
                              </option>
                              {yearLevels.map((level) => (
                                <option key={level} value={level}>
                                  {level}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              aria-hidden="true"
                              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600"
                              strokeWidth={2}
                            />
                          </div>
                        </div>
                      </div>
                      <label className="mt-3 block text-xs font-semibold text-zinc-700">About Me</label>
                      <textarea
                        value={profileAboutInput}
                        onChange={(event) => setProfileAboutInput(event.target.value)}
                        placeholder="Write a short introduction..."
                        rows={4}
                        className="mt-1 w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                      />
                    </article>

                    <Link
                      href="/client-home?panel=featured-post"
                      className="block rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm transition hover:border-[#FF6B35]/40 hover:bg-[#FFF9F6]"
                    >
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                        <FileText className="h-5 w-5 shrink-0 text-[#FF6B35]" strokeWidth={1.75} aria-hidden />
                        Featured Post
                      </h2>
                      {myFeaturedPosts.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {myFeaturedPosts.slice(0, 3).map((post) => (
                            <div key={post.id} className="rounded-xl border border-zinc-200 bg-white p-3">
                              <p className="truncate text-sm font-semibold text-zinc-900">{post.title}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <p className="text-xs text-zinc-500">{post.category}</p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgencyBadgeClass(post.priority)}`}
                                >
                                  {post.priority}
                                </span>
                                {post.budget > 0 ? (
                                  <span className="rounded-full bg-[#FFF2EB] px-2 py-0.5 text-[10px] font-semibold text-[#C2410C]">
                                    {formatPhpBudget(post.budget)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                          <p className="text-xs font-medium text-[#FF6B35]">Manage featured posts →</p>
                        </div>
                      ) : (
                        <div className="mt-3 flex min-h-20 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-4 text-center text-sm text-zinc-500">
                          Add or manage your posts
                        </div>
                      )}
                    </Link>

                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-xs ${profileStatusMessage.includes("Could not") ? "text-red-600" : "text-zinc-500"}`}>
                        {profileSaving ? "Saving profile..." : profileStatusMessage || "Make changes then click Save Updates."}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleSaveProfile()}
                        disabled={!canSaveProfile}
                        className={`inline-flex h-9 items-center justify-center rounded-xl px-3.5 text-xs font-semibold transition ${
                          canSaveProfile
                            ? "cursor-pointer bg-[#FF6B35] text-white hover:brightness-95 active:brightness-90"
                            : "cursor-not-allowed bg-zinc-500 text-zinc-100 opacity-85"
                        }`}
                      >
                        {profileSaving ? "Saving..." : "Save Updates"}
                      </button>
                    </div>
                      </>
                    )}
                  </div>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </main>
        </DashboardCenterColumn>
        )}

        <div className="hidden h-full min-h-0 lg:block lg:row-span-1">
          <ClientRightAside
            recentPosts={recentPosts}
            notifications={notifications}
            onMarkAllRead={markAllRead}
            onMarkOneRead={markOneRead}
            onDeleteNotification={deleteOne}
            onNotificationClick={handleNotificationClick}
            onRecentPostClick={(postId) =>
              router.push(`/client-home?post=${encodeURIComponent(postId)}`)
            }
          />
        </div>
      </div>
    </div>
  );
}

export default function ClientHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#E5F6F4]">
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      }
    >
      <ClientHomePageContent />
    </Suspense>
  );
}
