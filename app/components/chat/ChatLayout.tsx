"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, MoreVertical, Search, Trash2 } from "lucide-react";
import type { ChatMessagePayload } from "@/app/lib/chat";
import { dispatchUnreadMessagesRefresh } from "@/app/hooks/useUnreadMessageCount";
import { apiDeleteJson, apiGetJson } from "@/app/lib/api";
import {
  connectSocket,
  subscribeMessageStatus,
  subscribePresenceSnapshot,
  subscribePresenceUpdate,
  subscribeReceiveMessage,
} from "@/app/lib/chat";
import type { UserSearchResult } from "@/app/lib/chat";
import { searchUsersByQuery } from "@/app/lib/chat";
import { ChatThread } from "@/app/components/chat/ChatThread";
import { UserAvatar } from "@/app/components/UserAvatar";
import { NotificationsDropdown } from "@/app/components/NotificationsDropdown";
import { dashboardCenterPanelHeadingClass } from "@/app/components/dashboard/dashboardShellClasses";
import {
  MobileDashboardMenu,
  type MobileNavItem,
} from "@/app/components/dashboard/MobileDashboardMenu";
import type { NotificationItem } from "@/app/lib/notifications";

type Conversation = {
  otherUserId: string;
  otherName: string;
  otherPhotoDataUrl?: string;
  lastMessagePreview: string;
  lastTimestamp: string | null; // ISO
  hasUnread?: boolean;
};

function messagesBelongToPeer(me: string, other: string, msgs: ChatMessagePayload[]) {
  if (!msgs.length) return true;
  const pair = new Set([me, other]);
  return msgs.every((m) => {
    const s = String(m.senderId || "").trim();
    const r = String(m.receiverId || "").trim();
    if (!s || !r) return false;
    return pair.has(s) && pair.has(r);
  });
}

function formatTimeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatChatListTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const diffDay = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

type ChatLayoutProps = {
  currentUserId: string;
  initialOtherQuery?: string; // ObjectId or name fragment (from ?with=)
  allowUnsend?: boolean;
  className?: string;
  currentUserName?: string;
  currentUserPhoto?: string;
  mobileNav?: {
    items: MobileNavItem[];
    isActive: (href: string) => boolean;
    onLogout: () => void | Promise<void>;
  };
  notifications?: NotificationItem[];
  onMarkAllRead?: () => void | Promise<void>;
  onMarkOneRead?: (id: string) => void | Promise<void>;
  onDeleteNotification?: (id: string) => void | Promise<void>;
  onNotificationClick?: (item: NotificationItem) => void;
};

export function ChatLayout({
  currentUserId,
  initialOtherQuery,
  allowUnsend = false,
  className = "",
  mobileNav,
  notifications = [],
  onMarkAllRead,
  onMarkOneRead,
  onDeleteNotification,
  onNotificationClick,
}: ChatLayoutProps) {
  const [searchText, setSearchText] = useState<string>("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Temporary user search results for starting a new chat.
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Persisted conversations only (computed from MongoDB messages).
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [activeUserId, setActiveUserId] = useState<string>("");
  const [activeUserName, setActiveUserName] = useState<string>("");
  const [activeUserPhoto, setActiveUserPhoto] = useState<string>("");
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastActiveByUserId, setLastActiveByUserId] = useState<Record<string, string>>({});
  const [statusNowTick, setStatusNowTick] = useState(0);

  // Conversation delete menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userNameByIdRef = useRef<Record<string, string>>({});
  const userPhotoByIdRef = useRef<Record<string, string>>({});
  const lastSidebarUpdateByUserIdRef = useRef<Record<string, { lastId?: string; lastTimestamp?: string }>>({});

  const conversationsLoadedRef = useRef(false);
  const dropdownWrapRef = useRef<HTMLDivElement | null>(null);

  // Resolve initial `?with=` to a real user id + name.
  useEffect(() => {
    let cancelled = false;
    const raw = String(initialOtherQuery || "").trim();
    if (!raw || !currentUserId) return;

    (async () => {
      try {
        const data = await apiGetJson<{ user?: { id: string; name: string; photoDataUrl?: string } }>(
          `/api/users/resolve?q=${encodeURIComponent(raw)}`,
        );
        if (cancelled) return;
        const user = data.user;
        if (user?.id) {
          const photo = String(user.photoDataUrl || "").trim();
          setActiveUserId(user.id);
          setActiveUserName(user.name || "");
          setActiveUserPhoto(photo);
          userPhotoByIdRef.current[user.id] = photo;
          setSearchText(user.name || "");
        }
      } catch {
        // ignore initial resolution errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialOtherQuery, currentUserId]);

  // Debounced user search (dropdown only). Selecting a user does NOT persist into sidebar until a message exists.
  useEffect(() => {
    const q = String(searchText || "").trim();
    if (!q) {
      setUserResults([]);
      setDropdownOpen(false);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);

    const t = window.setTimeout(async () => {
      try {
        const users = await searchUsersByQuery(q);
        if (cancelled) return;
        setUserResults(users);
        setDropdownOpen(searchFocused);
      } catch {
        if (cancelled) return;
        setUserResults([]);
        setSearchError("Could not search users.");
        setDropdownOpen(searchFocused);
      } finally {
        if (cancelled) return;
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [searchText]);

  // Close dropdown on outside click.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = dropdownWrapRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setDropdownOpen(false);
      setSearchFocused(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Close conversation menu on outside click.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (menuOpenId === null) return;
      const target = e.target as Node;
      // Check if the click is not on a menu button or menu content
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest('[data-menu-id]') && !target.closest('[data-menu-content]')) {
        setMenuOpenId(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpenId]);

  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const data = await apiGetJson<{ conversations: Conversation[] }>(`/api/messages/conversations`);
      const list = data.conversations || [];
      setConversations(list);
      for (const c of list) {
        userNameByIdRef.current[c.otherUserId] = c.otherName;
        userPhotoByIdRef.current[c.otherUserId] = String(c.otherPhotoDataUrl || "").trim();
      }
      conversationsLoadedRef.current = true;
    } catch {
      setConversations([]);
      conversationsLoadedRef.current = true;
    }
  }, [currentUserId]);

  // Load persisted conversations from MongoDB messages.
  useEffect(() => {
    if (!currentUserId) return;
    if (conversationsLoadedRef.current) return;
    void loadConversations();
  }, [currentUserId, loadConversations]);

  useEffect(() => {
    if (!currentUserId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadConversations();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [currentUserId, loadConversations]);

  useEffect(() => {
    if (!currentUserId) {
      setOnlineUserIds(new Set());
      setLastActiveByUserId({});
      return;
    }

    connectSocket(currentUserId);

    const unsubSnapshot = subscribePresenceSnapshot((payload) => {
      const ids = Array.isArray(payload?.onlineUserIds) ? payload.onlineUserIds : [];
      setOnlineUserIds(new Set(ids.map((id) => String(id))));
      const lastActive = payload?.lastActiveByUserId && typeof payload.lastActiveByUserId === "object"
        ? payload.lastActiveByUserId
        : {};
      setLastActiveByUserId(
        Object.fromEntries(
          Object.entries(lastActive).map(([id, ts]) => [String(id), String(ts || "")]).filter(([, ts]) => ts),
        ),
      );
    });

    const unsubUpdate = subscribePresenceUpdate((payload) => {
      const userId = String(payload?.userId || "").trim();
      if (!userId) return;
      const isOnline = Boolean(payload?.online);
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
      setLastActiveByUserId((prev) => {
        const next = { ...prev };
        if (isOnline) {
          delete next[userId];
        } else {
          const timestamp = String(payload?.lastActiveAt || "").trim() || new Date().toISOString();
          next[userId] = timestamp;
        }
        return next;
      });
    });

    return () => {
      unsubSnapshot();
      unsubUpdate();
    };
  }, [currentUserId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setStatusNowTick((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const unsub = subscribeReceiveMessage((msg) => {
      const senderId = String(msg?.senderId || "").trim();
      const receiverId = String(msg?.receiverId || "").trim();
      if (!senderId || !receiverId) return;
      if (senderId !== currentUserId && receiverId !== currentUserId) return;

      const otherId = senderId === currentUserId ? receiverId : senderId;
      if (!otherId) return;

      const knownName = userNameByIdRef.current[otherId] || (otherId === activeUserId ? activeUserName : "") || "Unknown";
      userNameByIdRef.current[otherId] = knownName;

      setConversations((prevList) => {
        const existing = prevList.find((c) => c.otherUserId === otherId);
        const hasUnread = senderId !== currentUserId && otherId !== activeUserId;
        const nextItem: Conversation = {
          otherUserId: otherId,
          otherName: existing?.otherName || knownName,
          otherPhotoDataUrl:
            existing?.otherPhotoDataUrl || userPhotoByIdRef.current[otherId] || "",
          lastMessagePreview: msg.unsent ? "Deleted message" : msg.message || "",
          lastTimestamp: msg.timestamp || null,
          hasUnread,
        };

        const merged = existing
          ? prevList.map((c) => (c.otherUserId === otherId ? { ...c, ...nextItem } : c))
          : [nextItem, ...prevList];

        return merged.sort((a, b) => {
          const at = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
          const bt = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
          return bt - at;
        });
      });

      if (senderId !== currentUserId) {
        dispatchUnreadMessagesRefresh();
      }
    });

    return unsub;
  }, [currentUserId, activeUserId, activeUserName]);

  useEffect(() => {
    if (!allowUnsend) return;
    if (!currentUserId) return;
    const unsub = subscribeMessageStatus((payload) => {
      if (!payload?.id || !payload.unsent) return;
      const senderId = String(payload.senderId || "").trim();
      const receiverId = String(payload.receiverId || "").trim();
      if (!senderId || !receiverId) return;
      if (senderId !== currentUserId && receiverId !== currentUserId) return;
      const otherId = senderId === currentUserId ? receiverId : senderId;

      setConversations((prevList) =>
        prevList.map((c) =>
          c.otherUserId === otherId
            ? {
                ...c,
                lastMessagePreview: "Deleted message",
              }
            : c,
        ),
      );
    });
    return unsub;
  }, [allowUnsend, currentUserId]);
  const filteredConversations = useMemo(() => {
    // Filter out conversations without actual messages (no timestamp means no messages)
    return conversations.filter((c) => c.lastTimestamp !== null);
  }, [conversations]);

  const activeUserConnected = useMemo(() => {
    const id = String(activeUserId || "").trim();
    if (!id) return false;
    return onlineUserIds.has(id);
  }, [activeUserId, onlineUserIds]);

  const activeConversationLastTimestamp = useMemo(() => {
    const id = String(activeUserId || "").trim();
    if (!id) return "";
    const hit = conversations.find((item) => item.otherUserId === id);
    return String(hit?.lastTimestamp || "").trim();
  }, [activeUserId, conversations]);

  const activeUserStatusText = useMemo(() => {
    const id = String(activeUserId || "").trim();
    if (!id) return "";
    if (activeUserConnected) return "Online";
    const lastActiveAt = String(lastActiveByUserId[id] || "").trim() || activeConversationLastTimestamp;
    if (!lastActiveAt) return "Offline";
    const lastActiveTime = new Date(lastActiveAt).getTime();
    if (!Number.isFinite(lastActiveTime)) return "Offline";
    const diffMs = Date.now() - lastActiveTime;
    if (!Number.isFinite(diffMs) || diffMs < 0) return "Offline";
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `Active ${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Active ${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `Active ${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return "Active 1 day ago";
    if (diffDay < 7) return `Active ${diffDay} days ago`;
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek === 1) return "Active a week ago";
    return `Active ${diffWeek} weeks ago`;
  }, [activeUserId, activeUserConnected, lastActiveByUserId, activeConversationLastTimestamp, statusNowTick]);
  const handleSelectUserFromSearch = (u: UserSearchResult) => {
    // Temporary selection only.
    const photo = String(u.photoDataUrl || "").trim();
    setActiveUserId(u.id);
    setActiveUserName(u.name);
    setActiveUserPhoto(photo);
    userNameByIdRef.current[u.id] = u.name;
    userPhotoByIdRef.current[u.id] = photo;
    setSearchText("");
    setUserResults([]);
    setSearchFocused(false);
    setDropdownOpen(false);
  };

  const resolvePeerPhoto = async (userId: string) => {
    const cached = String(userPhotoByIdRef.current[userId] || "").trim();
    if (cached) return cached;
    try {
      const data = await apiGetJson<{ user?: { photoDataUrl?: string } }>(
        `/api/users/resolve?q=${encodeURIComponent(userId)}`,
      );
      const photo = String(data.user?.photoDataUrl || "").trim();
      userPhotoByIdRef.current[userId] = photo;
      return photo;
    } catch {
      return "";
    }
  };

  const handleSelectConversationFromSidebar = (c: Conversation) => {
    const photo = String(c.otherPhotoDataUrl || userPhotoByIdRef.current[c.otherUserId] || "").trim();
    setActiveUserId(c.otherUserId);
    setActiveUserName(c.otherName);
    setActiveUserPhoto(photo);
    userNameByIdRef.current[c.otherUserId] = c.otherName;
    userPhotoByIdRef.current[c.otherUserId] = photo;
    if (!photo) {
      void resolvePeerPhoto(c.otherUserId).then((resolved) => {
        if (!resolved) return;
        setActiveUserPhoto((prev) => prev || resolved);
        userPhotoByIdRef.current[c.otherUserId] = resolved;
        setConversations((prevList) =>
          prevList.map((item) =>
            item.otherUserId === c.otherUserId ? { ...item, otherPhotoDataUrl: resolved } : item,
          ),
        );
      });
    }
    setConversations((prev) =>
      prev.map((item) => (item.otherUserId === c.otherUserId ? { ...item, hasUnread: false } : item)),
    );
    dispatchUnreadMessagesRefresh();
    setDropdownOpen(false);
    setSearchFocused(false);
    setSearchText("");
    setUserResults([]);
  };

  const handleNewChat = () => {
    setActiveUserId("");
    setActiveUserName("");
    setActiveUserPhoto("");
    setDropdownOpen(false);
    setUserResults([]);
    setSearchText("");
    setSearchFocused(false);
  };

  const handleDeleteConversation = async (otherUserId: string) => {
    try {
      await apiDeleteJson(`/api/messages/conversation/${otherUserId}`);
      setConversations((prev) => prev.filter((c) => c.otherUserId !== otherUserId));
      
      // If the deleted conversation was active, clear the active chat
      if (activeUserId === otherUserId) {
        setActiveUserId("");
        setActiveUserName("");
        setActiveUserPhoto("");
      }
      
      setMenuOpenId(null);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleBackFromThread = () => {
    setActiveUserId("");
    setActiveUserName("");
    setActiveUserPhoto("");
  };

  const showMobileThread = Boolean(activeUserId);

  return (
    <div
      className={`flex h-full max-h-full min-h-0 w-full min-w-0 overflow-hidden bg-[#E5F6F4] lg:bg-[#F5F5F5] ${
        showMobileThread ? "max-lg:px-0 max-lg:pb-0 max-lg:pt-0" : "max-lg:px-3 max-lg:pb-3 max-lg:pt-0"
      } lg:px-0 lg:pb-0 lg:pt-0 ${className}`}
    >
      {/* Left sidebar / mobile chat list */}
      <aside
        className={`flex h-full max-h-full min-h-0 shrink-0 flex-col overflow-hidden bg-[#E5F6F4] lg:w-[300px] lg:border-r lg:border-zinc-200 lg:bg-white ${
          showMobileThread ? "hidden lg:flex" : "flex w-full"
        }`}
      >
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:bg-white">
        <div className={`shrink-0 px-4 pt-3 pb-3 ${dashboardCenterPanelHeadingClass}`}>
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-800 transition hover:bg-zinc-50"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>

            <h1 className="text-base font-bold tracking-tight text-zinc-900">Chats</h1>

            <NotificationsDropdown
              items={notifications}
              onMarkAllRead={onMarkAllRead ?? (() => undefined)}
              onMarkOneRead={onMarkOneRead ?? (() => undefined)}
              onDeleteNotification={onDeleteNotification}
              onNotificationClick={onNotificationClick}
              menuAlign="right"
              menuElevated
              compact
              centerOnMobile
              className="relative shrink-0"
            />
          </div>

          <h1 className="hidden text-2xl font-bold tracking-tight text-zinc-900 lg:block">Messages</h1>

          <div ref={dropdownWrapRef} className="relative mt-4">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              strokeWidth={1.8}
            />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-full border border-zinc-200 bg-zinc-100 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-[#4DD2AC]/30 lg:rounded-xl lg:border-zinc-200 lg:bg-white"
              autoComplete="off"
              spellCheck={false}
              onFocus={() => {
                const q = String(searchText || "").trim();
                setSearchFocused(true);
                if (q) setDropdownOpen(true);
              }}
            />

          {dropdownOpen ? (
            <div className="mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              {searchLoading ? <div className="p-3 text-sm text-zinc-500">Searching…</div> : null}
              {searchError ? <div className="p-3 text-sm text-red-600">{searchError}</div> : null}
              {!searchLoading && !searchError && userResults.length === 0 ? (
                <div className="p-3 text-sm text-zinc-500">No matching users.</div>
              ) : null}
              {!searchLoading && !searchError && userResults.length > 0 ? (
                <ul className="max-h-64 overflow-y-auto p-1">
                  {userResults.map((u) => {
                    const active = u.id === activeUserId;
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectUserFromSearch(u)}
                          className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                            active ? "bg-[#FFF2EB]" : "hover:bg-zinc-50"
                          }`}
                        >
                          <UserAvatar
                            id={u.id}
                            name={u.name}
                            photoDataUrl={u.photoDataUrl}
                            size="xs"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-zinc-900">{u.name}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
          </div>
        </div>

        <div className="h-0 min-h-0 flex-1 overflow-y-scroll overscroll-contain px-2 pb-4 lg:px-4 [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="space-y-0 lg:space-y-3">
            {filteredConversations.map((c) => {
              const active = c.otherUserId === activeUserId;
              const isMenuOpen = menuOpenId === c.otherUserId;
              const listTime = formatChatListTime(c.lastTimestamp || undefined);
              return (
                <div key={c.otherUserId} className="relative">
                  <div
                    onClick={() => handleSelectConversationFromSidebar(c)}
                    className={`w-full rounded-xl border border-transparent px-2 py-3 text-left transition cursor-pointer lg:py-2 ${
                      active ? "bg-[#FFF2EB]" : "hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        id={c.otherUserId}
                        name={c.otherName}
                        photoDataUrl={c.otherPhotoDataUrl}
                        size="md"
                        className="shrink-0 lg:hidden"
                      />
                      <UserAvatar
                        id={c.otherUserId}
                        name={c.otherName}
                        photoDataUrl={c.otherPhotoDataUrl}
                        size="sm"
                        className="hidden shrink-0 lg:inline-flex"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`truncate text-sm ${
                              c.hasUnread ? "font-bold" : "font-semibold"
                            } text-zinc-900 leading-tight`}
                          >
                            {c.otherName}
                          </p>
                          <div className="flex items-center gap-1">
                            <p className="text-[11px] font-medium leading-tight text-zinc-500 lg:hidden">
                              {listTime}
                            </p>
                            <p className="hidden text-[11px] font-medium leading-tight text-zinc-500 lg:block">
                              {formatTimeAgo(c.lastTimestamp || undefined)}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(isMenuOpen ? null : c.otherUserId);
                              }}
                              className="hidden rounded p-1 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-600 lg:inline-flex"
                              aria-label="Conversation options"
                              data-menu-id={c.otherUserId}
                            >
                              <MoreVertical className="h-4 w-4" strokeWidth={1.8} />
                            </button>
                          </div>
                        </div>
                        {c.lastMessagePreview && c.lastTimestamp ? (
                          <p
                            className={`mt-0.5 truncate text-xs lg:mt-1 ${
                              c.hasUnread ? "font-semibold text-zinc-900" : "text-zinc-500"
                            } leading-snug`}
                          >
                            <span className="lg:hidden">
                              {c.lastMessagePreview}
                              {listTime ? ` · ${listTime}` : ""}
                            </span>
                            <span className="hidden lg:inline">{c.lastMessagePreview}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  
                  {isMenuOpen && (
                    <div
                      className="absolute right-0 top-0 z-10 mt-1 w-40 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
                      data-menu-content
                    >
                      <button
                        type="button"
                        onClick={() => handleDeleteConversation(c.otherUserId)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                        Delete Conversation
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {conversations.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-3 text-sm text-zinc-500">
                No conversations yet. Search for someone and send the first message.
              </div>
            ) : null}
          </div>
        </div>

        <div className="hidden shrink-0 border-t border-zinc-200 bg-white p-4 lg:block">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex h-12 w-full items-center justify-start gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#FF6B35] transition hover:bg-[#FFF2EB] hover:text-[#e85f2c] border border-[#FF6B35]"
          >
            <span className="text-base leading-none">+</span>
            New Chat
          </button>
        </div>
        </div>
      </aside>

      {/* Main chat */}
      <main
        className={`h-full max-h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#E5F6F4] lg:flex lg:bg-[#F5F5F5] ${
          showMobileThread ? "flex" : "hidden"
        }`}
      >
        <ChatThread
          className="h-full max-lg:rounded-none"
          currentUserId={currentUserId}
          otherUserId={activeUserId}
          otherUserLabel={activeUserName}
          otherUserPhoto={activeUserPhoto}
          statusText={activeUserStatusText}
          allowUnsend={allowUnsend}
          onBack={handleBackFromThread}
          onConversationUpdated={(otherId, msgs: ChatMessagePayload[]) => {
            if (!otherId) return;
            if (!msgs || msgs.length === 0) return; // IMPORTANT: do not persist empty/temporary chats
            if (!messagesBelongToPeer(currentUserId, otherId, msgs)) return;

            const last = msgs[msgs.length - 1];
            if (!last) return;

            const prev = lastSidebarUpdateByUserIdRef.current[otherId];
            const candidate = { lastId: last.id, lastTimestamp: last.timestamp };
            if (prev?.lastId === candidate.lastId && prev?.lastTimestamp === candidate.lastTimestamp) return;
            lastSidebarUpdateByUserIdRef.current[otherId] = candidate;

            const name = userNameByIdRef.current[otherId] || activeUserName || "Unknown";

            setConversations((prevList) => {
              const existing = prevList.find((c) => c.otherUserId === otherId);
              const nextItem: Conversation = {
                otherUserId: otherId,
                otherName: name,
                otherPhotoDataUrl:
                  existing?.otherPhotoDataUrl ||
                  userPhotoByIdRef.current[otherId] ||
                  activeUserPhoto ||
                  "",
                lastMessagePreview: last.unsent ? "Deleted message" : last.message || "",
                lastTimestamp: last.timestamp || null,
              };

              const merged = existing
                ? prevList.map((c) => (c.otherUserId === otherId ? { ...c, ...nextItem } : c))
                : [nextItem, ...prevList];

              return merged.sort((a, b) => {
                const at = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
                const bt = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
                return bt - at;
              });
            });
          }}
        />
      </main>

      {mobileNav ? (
        <MobileDashboardMenu
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          items={mobileNav.items}
          isActive={mobileNav.isActive}
          onLogout={() => void mobileNav.onLogout()}
        />
      ) : null}
    </div>
  );
}

