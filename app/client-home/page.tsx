"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CirclePlus,
  Clock,
  FilePenLine,
  FileText,
  Handshake,
  Heart,
  MapPin,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MessageCircle,
  MessageSquare,
  MessageSquareQuote,
  ShieldAlert,
  Send,
  Star,
  Upload,
  UserCircle,
  User,
  Users,
} from "lucide-react";
import { apiGetJson, apiPostJson, ApiError } from "../lib/api";
import { createCommunityPost, getCommunityPosts, type CommunityPostPriority } from "../lib/postsStorage";
import { disconnectSocket } from "../lib/socket";
import { ChatLayout } from "../components/chat/ChatLayout";

type PostItem = {
  id: string;
  authorId: string;
  author: string;
  timeAgo: string;
  title: string;
  content: string;
  category: string;
  priority: "Normal" | "Important";
  avatar: string;
};

type ActivityItem = {
  id: string;
  name: string;
  message: string;
  timeAgo: string;
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
  const [profileStatusMessage, setProfileStatusMessage] = useState<string>("");
  const [meUserId, setMeUserId] = useState<string>("");
  const peerFromQuery = searchParams.get("with") || "";
  const [peerUserId, setPeerUserId] = useState<string>(peerFromQuery);
  const [peerSearchText, setPeerSearchText] = useState<string>(peerFromQuery);
  const [savedProfileSnapshot, setSavedProfileSnapshot] = useState<ProfileFormSnapshot | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [postCategoryInput, setPostCategoryInput] = useState("");
  const [postPriorityInput, setPostPriorityInput] = useState<CommunityPostPriority>("Normal");
  const [postTitleInput, setPostTitleInput] = useState("");
  const [postDescriptionInput, setPostDescriptionInput] = useState("");
  const [postStatusMessage, setPostStatusMessage] = useState("");
  const recentActivities: ActivityItem[] = [];
  const notifications: string[] = [];

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
    post: ReturnType<typeof getCommunityPosts>[number],
    fallbackAvatar: string,
  ): PostItem => ({
    id: post.id,
    authorId: post.authorId,
    author: post.authorName || "Client User",
    timeAgo: formatTimeAgo(post.createdAt),
    title: post.title,
    content: post.content,
    category: post.category || "General",
    priority: post.priority,
    avatar: post.authorAvatarDataUrl || fallbackAvatar,
  });

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

  useEffect(() => {
    const loadPosts = () => {
      const fallbackAvatar = profilePhotoDataUrl || "https://api.dicebear.com/7.x/initials/svg?seed=Client";
      const nextPosts = getCommunityPosts().map((post) => mapPostForUi(post, fallbackAvatar));
      setPosts(nextPosts);
    };
    loadPosts();
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "peermatch_community_posts_v1") return;
      loadPosts();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [profilePhotoDataUrl]);

  useEffect(() => {
    setIsPanelVisible(false);
    const timeoutId = window.setTimeout(() => {
      setIsPanelVisible(true);
    }, 90);
    return () => window.clearTimeout(timeoutId);
  }, [activePanel]);

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
        setProfilePhotoDataUrl(String(user.photoDataUrl || "").trim());
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
  }, [router]);

  const handleLogout = async () => {
    try {
      await apiPostJson("/api/auth/logout", {});
    } finally {
      disconnectSocket();
      router.push("/login");
    }
  };

  const featuredWork: Array<{ title: string; category: string; rating: number; reviews: number }> = [];
  const skillsAndExpertise: string[] = profileSkillsInput
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const recentReviews: Array<{ name: string; timeAgo: string; rating: number; comment: string }> = [];
  const profileName = profileNameInput || displayName || "Client User";
  const profileInitials = profileName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "CU";

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
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhotoDataUrl(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
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
    if (!category || !title || !content || !meUserId) {
      setPostStatusMessage("Please complete category, title, and description.");
      return;
    }
    const created = createCommunityPost({
      authorId: meUserId,
      authorName: profileNameInput.trim() || displayName || "Client User",
      authorEmail: displayEmail,
      authorAccountType: "client",
      authorAvatarDataUrl: profilePhotoDataUrl || undefined,
      category,
      title,
      content,
      priority: postPriorityInput,
    });
    setPosts((prev) =>
      [
        {
          id: created.id,
          authorId: created.authorId,
          author: created.authorName,
          timeAgo: "Just now",
          title: created.title,
          content: created.content,
          category: created.category,
          priority: created.priority,
          avatar: created.authorAvatarDataUrl || "https://api.dicebear.com/7.x/initials/svg?seed=Client",
        },
        ...prev,
      ].filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index),
    );
    setPostCategoryInput("");
    setPostPriorityInput("Normal");
    setPostTitleInput("");
    setPostDescriptionInput("");
    setPostStatusMessage("Post published.");
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
    { href: "/client-home?panel=profile", label: "Profile", icon: <User className="h-5 w-5 shrink-0" strokeWidth={1.75} /> },
  ];

  const isNavActive = (href: string) => {
    if (href === "/client-home") return pathname === "/client-home" && !activePanel;
    const panel = href.split("panel=")[1];
    return pathname === "/client-home" && panel === activePanel;
  };

  return (
    <div
      className={`bg-[#F0F7F4] px-4 sm:px-6 lg:px-8 ${
        activePanel === "messages" ? "h-[100dvh] overflow-hidden py-4 lg:py-4" : "min-h-screen py-6 lg:py-8"
      }`}
    >
      <div
        className={`mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px] xl:grid-cols-[280px_minmax(0,1fr)_320px] ${
          activePanel === "messages" ? "h-full min-h-0" : "min-h-[calc(100vh-3rem)]"
        }`}
      >
        <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-zinc-200/80 bg-[#E8EFEC] p-6 shadow-sm">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-3 shadow-sm">
            <Image src="/peermatch-logo.png" alt="PeerMatch logo" width={32} height={32} className="h-8 w-8 object-contain" />
            <div>
              <p className="text-sm font-semibold tracking-tight text-zinc-900">PeerMatch</p>
              <p className="text-[11px] text-zinc-500">Student Collaboration</p>
            </div>
          </div>

          <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-1.5" aria-label="Main">
            {navItems.map((item) => {
              const active = isNavActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`${navItemClass} ${active ? navActiveClass : ""}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className={`${navItemClass} mt-auto w-full justify-start border border-transparent pt-4`}
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            <span>Logout</span>
          </button>
        </aside>

        <main
          className={`flex h-full min-h-0 flex-col rounded-2xl border border-zinc-100/80 bg-white shadow-[0_4px_32px_rgba(15,23,42,0.04)] ${
            activePanel === "profile" || activePanel === "messages"
              ? "p-4"
              : "p-6 sm:p-8 lg:p-10"
          } ${activePanel === "messages" ? "overflow-hidden" : ""}`}
        >
          <div
            className={`flex min-h-0 flex-1 flex-col transform-gpu transition-all duration-[420ms] ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none ${
              isPanelVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.995] opacity-0"
            }`}
          >
            {activePanel === "create-post" ? (
              <section aria-labelledby="create-post-heading">
                <h1 id="create-post-heading" className="text-4xl font-bold tracking-tight text-zinc-900">
                  Create New Post
                </h1>
                <p className="mt-1.5 text-sm text-zinc-600">Share what you need help with and connect with peers</p>

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
                          Subject Category
                        </label>
                        <input
                          id="post-category"
                          type="text"
                          value={postCategoryInput}
                          onChange={(event) => setPostCategoryInput(event.target.value)}
                          placeholder="e.g. Mathematics, Physics, History"
                          className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                        />
                        <p className="mt-1.5 text-[11px] text-zinc-500">What subject do you need help with?</p>
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
                              onChange={(event) =>
                                setPostPriorityInput(event.target.value === "Important" ? "Important" : "Normal")
                              }
                              className="h-11 w-full appearance-none rounded-xl border border-zinc-300 bg-white px-3 pr-9 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                            >
                              <option value="Normal">Normal</option>
                              <option value="Important">Important</option>
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

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="submit"
                          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white transition hover:brightness-95"
                        >
                          <Send className="h-4 w-4" strokeWidth={2} />
                          <span>Post Request</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPostCategoryInput("");
                            setPostPriorityInput("Normal");
                            setPostTitleInput("");
                            setPostDescriptionInput("");
                            setPostStatusMessage("");
                          }}
                          className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Clear
                        </button>
                      </div>
                      {postStatusMessage ? (
                        <p className={`text-xs ${postStatusMessage === "Post published." ? "text-[#FF6B35]" : "text-red-600"}`}>
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
                        <li>- Offer fair rates</li>
                        <li>- Provide context for your request</li>
                      </ul>
                    </aside>
                  </div>
                </div>
              </section>
            ) : activePanel === "messages" ? (
              <section
                aria-labelledby="messages-heading"
                className="flex h-full max-h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
              >
                <div className="h-full max-h-full min-h-0 flex-1 overflow-hidden">
                  <ChatLayout
                    currentUserId={meUserId}
                    initialOtherQuery={peerUserId.trim()}
                    allowUnsend
                    className="!h-full !min-h-0 rounded-2xl border border-zinc-200 !bg-white"
                  />
                </div>
              </section>
            ) : activePanel === "profile" ? (
              <section aria-labelledby="profile-heading" className="flex min-h-0 flex-1 flex-col">
                <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
                  <article className="sticky top-4 z-10 h-fit w-full max-w-[320px] rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm xl:max-w-none">
                    <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border border-zinc-200 bg-[#E8EFEC]">
                      {profilePhotoDataUrl ? (
                        <img src={profilePhotoDataUrl} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-zinc-800">
                          {profileInitials}
                        </div>
                      )}
                    </div>
                    <input
                      ref={profilePhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePhotoChange}
                    />
                    <button
                      type="button"
                      onClick={() => profilePhotoInputRef.current?.click()}
                      className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Change photo
                    </button>
                    <h1 id="profile-heading" className="mt-3 text-center text-2xl font-bold tracking-tight text-zinc-900">
                      {profileName}
                    </h1>
                    <p className="mt-1 text-center text-xs text-zinc-500">{displayEmail || "No email on file"}</p>
                    <div className="mt-3 rounded-xl bg-white px-3 py-2 text-center">
                      <p className="text-xs font-semibold text-[#FF6B35]">Verified Peer Match Account</p>
                    </div>

                    <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 text-xs text-zinc-700">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        <input
                          type="text"
                          value={profileLocationInput}
                          onChange={(event) => setProfileLocationInput(event.target.value)}
                          placeholder="Add location"
                          className="h-8 w-full rounded-lg border border-zinc-300 bg-white px-2 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        <span>Response time: &lt; 1 hour</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        <span>Member since 2026</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-[#FF6B35] text-xs font-semibold text-white hover:brightness-95"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Message
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300 bg-white text-xs text-zinc-700 hover:bg-zinc-50"
                      >
                        <Heart className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>

                  <div className="profile-scroll-pane max-h-[calc(100vh-3.5rem)] min-h-0 min-w-0 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch] scroll-smooth">
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

                    <article className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                        <FileText className="h-5 w-5 shrink-0 text-[#FF6B35]" strokeWidth={1.75} aria-hidden />
                        Featured Post
                      </h2>
                      {featuredWork.length > 0 ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {featuredWork.map((work) => (
                            <div key={work.title} className="rounded-xl border border-zinc-200 bg-white p-3">
                              <div className="h-20 rounded-lg bg-[#E8EFEC]" />
                              <p className="mt-2 text-sm font-semibold text-zinc-900">{work.title}</p>
                              <p className="text-xs text-zinc-500">{work.category}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 min-h-20 rounded-xl border border-dashed border-zinc-300 bg-white" />
                      )}
                    </article>

                    <article className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                        <Handshake className="h-5 w-5 shrink-0 text-[#FF6B35]" strokeWidth={1.75} aria-hidden />
                        Helpers
                      </h2>
                      {skillsAndExpertise.length > 0 ? (
                        <div className="mt-3 space-y-2.5">
                          {skillsAndExpertise.map((helper, index) => (
                            <div key={`${helper}-${index}`} className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8EFEC] text-[11px] font-semibold text-zinc-700">
                                    {helper.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-zinc-900">{helper}</p>
                                    <p className="text-[10px] text-zinc-500">Helped recently</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] leading-none text-[#FF6B35]">★★★★★</p>
                                  <p className="mt-1 text-[10px] text-zinc-500">4.{(index % 5) + 5}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>

                    <article className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                        <MessageSquareQuote className="h-5 w-5 shrink-0 text-[#FF6B35]" strokeWidth={1.75} aria-hidden />
                        Reviews
                      </h2>
                      {recentReviews.length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {recentReviews.map((review) => (
                            <div key={`${review.name}-${review.timeAgo}`} className="rounded-xl border border-zinc-200 bg-white p-3">
                              <p className="text-sm font-semibold text-zinc-900">{review.name}</p>
                              <p className="text-xs text-zinc-500">{review.comment}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 min-h-20 rounded-xl border border-dashed border-zinc-300 bg-white" />
                      )}
                    </article>
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
                  </div>
                </div>
              </section>
            ) : (
              <>

              <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{postsHeading}</h2>

              <div className="mt-5 space-y-4">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => router.push(`/client-home?post=${encodeURIComponent(post.id)}`)}
                      className="block w-full rounded-2xl border border-zinc-100 bg-zinc-50 p-5 text-left hover:bg-zinc-100 lg:p-7"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={post.avatar}
                            alt={`${post.author} avatar`}
                            className="h-10 w-10 rounded-full border border-zinc-300"
                          />
                          <div>
                            <p className="text-2xl font-semibold text-zinc-900">{post.author}</p>
                            <p className="text-xs text-zinc-500">{post.timeAgo}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-zinc-400 px-4 py-1 text-xs text-zinc-800">
                            {post.category}
                          </span>
                          <span
                            className={`rounded-full px-4 py-1 text-xs font-semibold ${
                              post.priority === "Important"
                                ? "bg-[#FFC31E] text-zinc-900"
                                : "bg-[#56BA54] text-zinc-900"
                            }`}
                          >
                            {post.priority}
                          </span>
                        </div>
                      </div>
                      <p className="mt-4 text-2xl font-semibold leading-tight text-zinc-900">{post.title}</p>
                      <p className="mt-5 text-base leading-[1.6] text-zinc-700">{post.content}</p>
                    </button>
                  ))
                ) : null}
              </div>
              </>
            )}
          </div>
        </main>

        <aside className="flex h-full min-h-0 flex-col gap-8 rounded-2xl border border-zinc-200/80 bg-[#E8EFEC] p-6 shadow-sm">
          <section>
            <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
            {notifications.length === 0 ? (
              <button
                type="button"
                onClick={() => router.push("/client-home?panel=notifications")}
                className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-4 text-left text-xs text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Bell aria-hidden="true" className="h-4 w-4 text-zinc-600" strokeWidth={1.6} />
                  <span>Someone responded to your post</span>
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/client-home?panel=notifications")}
                className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-4 text-left text-xs text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Bell aria-hidden="true" className="h-4 w-4 text-zinc-600" strokeWidth={1.6} />
                  <span>{notifications[0]}</span>
                </span>
              </button>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-zinc-900">Recent Activities</h3>
            <div className="mt-3 space-y-3">
            {recentActivities.length === 0 ? (
              <>
                <div className="rounded-xl border border-[#E8DDD6] bg-[#F4EBE4] px-4 py-3 shadow-sm">
                  <p className="text-sm font-semibold text-zinc-900">Daddy</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="h-2 w-full max-w-[180px] rounded-full bg-zinc-300/80" />
                    <div className="h-2 w-full max-w-[140px] rounded-full bg-zinc-300/60" />
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">2 min ago</p>
                </div>
                <div className="rounded-xl border border-[#E8DDD6] bg-[#F4EBE4] px-4 py-3 shadow-sm">
                  <p className="text-sm font-semibold text-zinc-900">Allosaur</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="h-2 w-full max-w-[180px] rounded-full bg-zinc-300/80" />
                    <div className="h-2 w-full max-w-[140px] rounded-full bg-zinc-300/60" />
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">15 min ago</p>
                </div>
                <div className="rounded-xl border border-[#E8DDD6] bg-[#F4EBE4] px-4 py-3 shadow-sm">
                  <p className="text-sm font-semibold text-zinc-900">Hero</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="h-2 w-full max-w-[180px] rounded-full bg-zinc-300/80" />
                    <div className="h-2 w-full max-w-[140px] rounded-full bg-zinc-300/60" />
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">1 hr ago</p>
                </div>
              </>
            ) : (
              recentActivities.map((activity) => (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => router.push(`/client-home?activity=${encodeURIComponent(activity.id)}`)}
                  className="w-full rounded-xl border border-[#E8DDD6] bg-[#F4EBE4] px-4 py-3 text-left shadow-sm hover:bg-[#efe4dd]"
                >
                  <div className="flex gap-2">
                    <img
                      src={activity.avatar}
                      alt={`${activity.name} avatar`}
                      className="h-6 w-6 rounded-full border border-zinc-300"
                    />
                    <div>
                      <p className="text-xs font-semibold text-zinc-900">{activity.name}</p>
                      <p className="text-[11px] text-zinc-700">{activity.message}</p>
                      <p className="text-[10px] text-zinc-500">{activity.timeAgo}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
            </div>
          </section>
        </aside>
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
