"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ChevronDown,
  MessageSquareQuote,
  Star,
  Upload,
  UserCircle,
} from "lucide-react";
import {
  dashboardCenterPanelFixedClass,
  dashboardProfileFormCardClass,
  dashboardProfileFormStackClass,
  dashboardProfileScrollClass,
  dashboardProfileScrollPaneClass,
  dashboardProfileSummaryCardClass,
  mobileDashboardWhitePanelClass,
} from "@/app/components/dashboard/dashboardShellClasses";
import { ApiError, apiGetJson, apiPutJson } from "@/app/lib/api";
import { UserAvatar } from "@/app/components/UserAvatar";
import { useCurrentUserProfile } from "@/app/lib/CurrentUserProfileContext";
import { persistProfilePhotoFromFile } from "@/app/lib/profilePhoto";

type LanguageItem = { name: string; proficiency: string };
type PortfolioItem = { title: string; description: string };
type ReviewItem = { reviewer: string; text: string; rating: number };

type ProfileData = {
  name: string;
  email: string;
  course: string;
  yearLevel: string;
  headline: string;
  location: string;
  bio: string;
  featuredWork: string;
  availabilityLabel: string;
  availabilityHours: string;
  sessions: number;
  successRate: number;
  responseTime: string;
  skills: string[];
  languages: LanguageItem[];
  portfolio: PortfolioItem[];
  reviews: ReviewItem[];
  photoDataUrl: string;
};

type ProfileResponse = {
  user?: { id?: string; name?: string; email?: string; photoDataUrl?: string };
  profile: Partial<ProfileData>;
};

const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const courseOptions = [
  "BS Architecture",
  "BS Chemical Engineering",
  "BS Civil Engineering",
  "BS Computer Engineering",
  "BS Electrical Engineering",
  "BS Electronics Engineering",
  "BS Industrial Engineering",
  "BS Mechanical Engineering",
  "BS Mining Engineering",
  "BS Accountancy",
  "BS Accounting Information Systems",
  "BS Management Accounting",
  "BS Business Administration",
  "BS Hospitality Management",
  "BS Tourism Management",
  "BS Office Administration",
  "Bachelor in Public Administration",
  "AB Communication",
  "AB English with Applied Linguistics",
  "Bachelor of Elementary Education",
  "Bachelor of Secondary Education",
  "Bachelor of Multimedia Arts",
  "BS Biology",
  "BS Math with Applied Industrial Mathematics",
  "BS Psychology",
  "BS Computer Science",
  "BS Information Technology",
  "BS Nursing",
  "BS Pharmacy",
  "BS Medical Technology",
  "BS Criminology",
] as const;

const defaultProfile: ProfileData = {
  name: "",
  email: "",
  course: "BS Tourism Management",
  yearLevel: "2nd Year",
  headline: "Computer Science Student",
  location: "San Francisco, CA",
  bio: "Passionate about web development and helping peers master DSA. I love mentoring first-year students through their coding journey.",
  featuredWork: "",
  availabilityLabel: "Active Now",
  availabilityHours: "Mon - Fri, 5:00 PM - 9:00 PM",
  sessions: 24,
  successRate: 98,
  responseTime: "2 hrs",
  skills: ["JavaScript", "React", "Data Structures", "Problem Solving"],
  languages: [
    { name: "English", proficiency: "Fluent" },
    { name: "Spanish", proficiency: "Fluent" },
    { name: "Tagalog", proficiency: "Fluent" },
  ],
  portfolio: [
    { title: "Weather App", description: "Real-time weather application built with React and OpenWeather API." },
    { title: "Task Manager", description: "Full-stack task management system with user authentication." },
  ],
  reviews: [
    { reviewer: "Alex Chen", text: "Jordan helped me understand recursive algorithms. Great teacher!", rating: 5 },
    { reviewer: "Sam Rodriguez", text: "Very patient and explains concepts clearly. Highly recommend!", rating: 5 },
  ],
  photoDataUrl: "",
};

function mergeProfile(input?: Partial<ProfileData>): ProfileData {
  return {
    ...defaultProfile,
    ...input,
    skills: Array.isArray(input?.skills) ? input.skills.filter(Boolean) : defaultProfile.skills,
    languages: Array.isArray(input?.languages) ? input.languages : defaultProfile.languages,
    portfolio: Array.isArray(input?.portfolio) ? input.portfolio : defaultProfile.portfolio,
    reviews: Array.isArray(input?.reviews) ? input.reviews : defaultProfile.reviews,
  };
}

export default function FreelancerProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [savedSnapshot, setSavedSnapshot] = useState<ProfileData>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [meUserId, setMeUserId] = useState("");
  const { photoDataUrl: globalPhotoDataUrl, syncProfile } = useCurrentUserProfile();
  const [newSkill, setNewSkill] = useState("");
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

  const isDirty = useMemo(() => JSON.stringify(profile) !== JSON.stringify(savedSnapshot), [profile, savedSnapshot]);

  const profileDisplayName = profile.name.trim() || "Freelancer";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGetJson<ProfileResponse>("/api/auth/profile");
        if (cancelled) return;
        const userId = String(res.user?.id || "").trim();
        if (userId) setMeUserId(userId);
        const merged = mergeProfile({
          ...res.profile,
          name: res.profile?.name || res.user?.name || "",
          email: res.profile?.email || res.user?.email || "",
          photoDataUrl: res.profile?.photoDataUrl || res.user?.photoDataUrl || "",
        });
        setProfile(merged);
        setSavedSnapshot(merged);
        if (userId) syncProfile(userId, merged.photoDataUrl);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof ApiError ? error.message : "Unable to load profile.";
        setErrorText(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncProfile]);

  const displayProfilePhoto = globalPhotoDataUrl || profile.photoDataUrl;

  const updateField = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    if (errorText) setErrorText("");
    if (successText) setSuccessText("");
  };

  const handleProfilePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void (async () => {
      setPhotoSaving(true);
      setErrorText("");
      setSuccessText("");
      try {
        const { photoDataUrl: photo, userId } = await persistProfilePhotoFromFile(file, meUserId);
        if (userId) {
          setMeUserId(userId);
          syncProfile(userId, photo);
        }
        setProfile((prev) => {
          const next = { ...prev, photoDataUrl: photo };
          setSavedSnapshot(next);
          return next;
        });
        setSuccessText("Profile photo saved");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save profile photo.";
        setErrorText(message);
      } finally {
        setPhotoSaving(false);
        event.target.value = "";
      }
    })();
  };

  const handleSave = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    setErrorText("");
    setSuccessText("");
    try {
      const payload = {
        name: profile.name,
        photoDataUrl: profile.photoDataUrl,
        profile: {
          course: profile.course,
          yearLevel: profile.yearLevel,
          headline: profile.headline,
          location: profile.location,
          bio: profile.bio,
          featuredWork: profile.featuredWork,
          availabilityLabel: profile.availabilityLabel,
          availabilityHours: profile.availabilityHours,
          sessions: profile.sessions,
          successRate: profile.successRate,
          responseTime: profile.responseTime,
          skills: profile.skills,
          languages: profile.languages,
          portfolio: profile.portfolio,
        },
      };
      await apiPutJson("/api/auth/profile", payload);
      setSavedSnapshot(profile);
      setSuccessText("Profile saved");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unable to save profile.";
      setErrorText(message);
    } finally {
      setSaving(false);
    }
  };

  const canSave = isDirty && !saving;

  if (loading) {
    return (
      <main className="flex h-full min-h-[320px] items-center justify-center max-lg:bg-transparent lg:rounded-2xl lg:border lg:border-zinc-100/80 lg:bg-white lg:p-6 lg:shadow-[0_4px_32px_rgba(15,23,42,0.04)]">
        <p className="text-sm text-zinc-500">Loading profile...</p>
      </main>
    );
  }

  return (
    <section
      aria-labelledby="profile-heading"
      className={`${dashboardCenterPanelFixedClass} flex h-full min-h-0 flex-1 flex-col overflow-hidden max-lg:bg-transparent lg:rounded-2xl lg:border lg:border-zinc-100/80 lg:bg-white lg:p-6 lg:shadow-[0_4px_32px_rgba(15,23,42,0.04)]`}
    >
      <div className={`h-full min-h-0 ${mobileDashboardWhitePanelClass}`}>
        <div className={dashboardProfileScrollPaneClass}>
          <article className={`${dashboardProfileSummaryCardClass} mx-auto max-w-md xl:mx-0 xl:max-w-[260px]`}>
          <div className="mx-auto flex justify-center">
            <UserAvatar
              id={meUserId}
              name={profileDisplayName}
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
            disabled={photoSaving}
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Upload className="h-3.5 w-3.5" />
            {photoSaving ? "Saving photo..." : "Change photo"}
          </button>
          <h1 id="profile-heading" className="mt-3 text-center text-2xl font-bold tracking-tight text-zinc-900">
            {profileDisplayName}
          </h1>
          <p className="mt-1 text-center text-xs text-zinc-500">{profile.email || "No email on file"}</p>
          <div className="mt-3 rounded-xl bg-white px-3 py-2 text-center">
            <p className="text-xs font-semibold text-[#FF6B35]">Verified Peer Match Account</p>
          </div>
        </article>

        <div className={`${dashboardProfileFormStackClass} ${dashboardProfileScrollClass}`}>
          <article className={dashboardProfileFormCardClass}>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
              <UserCircle className="h-5 w-5 shrink-0 text-[#FF6B35]" strokeWidth={1.75} aria-hidden />
              About
            </h2>
            <label className="mt-3 block text-xs font-semibold text-zinc-700">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700">Course</label>
                <div className="relative mt-1">
                  <select
                    value={profile.course}
                    onChange={(e) => updateField("course", e.target.value)}
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
                    value={profile.yearLevel}
                    onChange={(e) => updateField("yearLevel", e.target.value)}
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
              value={profile.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              placeholder="Write a short introduction..."
              rows={4}
              className="mt-1 w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
            />
          </article>

          <article className={dashboardProfileFormCardClass}>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
              <MessageSquareQuote className="h-5 w-5 shrink-0 text-[#FF6B35]" strokeWidth={1.75} aria-hidden />
              Reviews
            </h2>
            <div className="mt-3 space-y-3">
              {profile.reviews.length > 0 ? (
                profile.reviews.map((review, index) => (
                  <div key={`review-${index}`} className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900">{review.reviewer || "Client"}</p>
                      <div className="flex shrink-0 items-center gap-0.5 text-[#FF6B35]" aria-hidden>
                        {Array.from({ length: 5 }).map((_, sIndex) => (
                          <Star
                            key={`${index}-star-${sIndex}`}
                            className={`h-3.5 w-3.5 ${sIndex < review.rating ? "fill-current" : ""}`}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                    </div>
                    {review.text ? (
                      <p className="mt-2 text-xs leading-relaxed text-zinc-600">{review.text}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-sm text-zinc-500">
                  Reviews from clients will appear here after completed tasks.
                </p>
              )}
            </div>
          </article>

          <div className="flex items-center justify-between gap-3">
            <p className={`text-xs ${errorText ? "text-red-600" : "text-zinc-500"}`}>
              {saving ? "Saving profile..." : errorText || successText || "Make changes then click Save Updates."}
            </p>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave}
              className={`inline-flex h-9 items-center justify-center rounded-xl px-3.5 text-xs font-semibold transition ${
                canSave
                  ? "cursor-pointer bg-[#FF6B35] text-white hover:brightness-95 active:brightness-90"
                  : "cursor-not-allowed bg-zinc-500 text-zinc-100 opacity-85"
              }`}
            >
              {saving ? "Saving..." : "Save Updates"}
            </button>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
