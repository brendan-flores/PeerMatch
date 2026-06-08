"use client";

import { useEffect, useRef, useState } from "react";
import Button from "../components/Button";
import AuthPageHeader from "../components/AuthPageHeader";
import { BubbleDropdown } from "../components/BubbleDropdown";
import { useRouter } from "next/navigation";
import { apiPostJson, ApiError } from "@/app/lib/api";
import {
  bubbleInputClass,
  bubbleTextareaClass,
  profileCardClass,
  profileFormCardClass,
} from "@/app/lib/profile";
import {
  applySavedProfilePhoto,
  readImageFileAsDataUrl,
  type ProfileSaveResponse,
} from "@/app/lib/profile";

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

export default function ClientDetailsPage() {
  const router = useRouter();

  const [course, setCourse] = useState("");
  const [yearLevel, setYearLevel] = useState(yearLevels[0]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [aboutMe, setAboutMe] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [photoPreview, setPhotoPreview] = useState(
    "https://api.dicebear.com/7.x/avataaars/svg?seed=ClientDetails",
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!photoFile) return;

    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      setPhotoFile(file);
    }
  };

  const handleChoosePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    void (async () => {
      setIsSubmitting(true);
      setStatusMessage("");

      try {
        const photoDataUrl = photoFile ? await readImageFileAsDataUrl(photoFile) : undefined;
        const fullName = `${firstName} ${lastName}`.trim();

        const saved = await apiPostJson<ProfileSaveResponse>("/api/auth/profile", {
          name: fullName,
          firstName,
          lastName,
          course,
          yearLevel,
          aboutMe,
          ...(photoDataUrl ? { photoDataUrl } : {}),
        });

        applySavedProfilePhoto(saved, photoDataUrl || "");

        setShowConfirmation(true);

        window.setTimeout(() => {
          router.push("/client-home");
        }, 1600);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not save profile. Please try again.";

        setStatusMessage(message);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <div className="min-h-screen bg-[#E5F6F4]">
      <div className="flex min-h-screen w-full flex-col">
        <AuthPageHeader />

        <main className="flex flex-1 items-start justify-center overflow-x-hidden px-4 py-8 sm:py-12">
          <div className="w-full min-w-0 max-w-[1120px]">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Complete Your Client Profile
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Set up your client profile to connect with freelancers and peers
              </p>
            </div>

            <div className="mt-8 grid min-w-0 gap-6 sm:mt-10 sm:gap-8 lg:grid-cols-[320px_1fr] lg:items-start">
              <section className={profileCardClass}>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
                    <img
                      src={photoPreview}
                      alt="Client profile preview"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleChoosePhoto}
                    className="ui-interactive rounded-full bg-[#FA642C] px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(250,100,44,0.28)] hover:bg-[#e05625] motion-safe:hover:-translate-y-0.5"
                  >
                    Change Photo
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif,.avif,.bmp,.tif,.tiff,.svg"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="h-px w-full bg-slate-200" />

                  <div className="w-full rounded-[1.75rem] bg-[#F8FAFC] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <p className="text-xs font-semibold text-[#0F172A]">Tip</p>

                    <p className="mt-1 text-[11px] leading-5 text-zinc-600">
                      A complete client profile helps you attract better freelancers and build trust
                      faster.
                    </p>
                  </div>
                </div>
              </section>

              <section className={profileFormCardClass}>
                <div
                  aria-live="polite"
                  className={`mb-5 overflow-hidden rounded-[1.75rem] border transition-all duration-500 ease-out ${
                    showConfirmation
                      ? "max-h-40 border-emerald-200 bg-emerald-50 opacity-100"
                      : "max-h-0 border-transparent bg-transparent opacity-0"
                  }`}
                >
                  <div
                    className={`px-4 py-3 text-emerald-900 transition-transform duration-500 ease-out ${
                      showConfirmation
                        ? "translate-y-0 scale-100"
                        : "-translate-y-2 scale-[0.98]"
                    }`}
                  >
                    <p className="text-sm font-semibold">Profile saved successfully.</p>

                    <p className="mt-1 text-xs text-emerald-800/80">Taking you to your home page…</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0069A8] text-xs font-semibold text-white">
                        1
                      </span>

                      <div>
                        <p className="text-sm font-semibold text-slate-950">Academic Information</p>

                        <p className="mt-1 text-xs text-slate-500">Tell us about your current studies</p>
                      </div>
                    </div>

                    <div className="mt-5 grid min-w-0 gap-4">
                      <div className="block min-w-0">
                        <span className="text-xs font-medium text-slate-700">Course</span>

                        <div className="mt-2">
                          <BubbleDropdown
                            id="client-course"
                            name="course"
                            value={course}
                            onChange={setCourse}
                            options={courseOptions}
                            placeholder="Select a course"
                            required
                          />
                        </div>
                      </div>

                      <div className="block min-w-0">
                        <span className="text-xs font-medium text-slate-700">Academic Year</span>

                        <div className="mt-2">
                          <BubbleDropdown
                            id="client-year-level"
                            name="yearLevel"
                            value={yearLevel}
                            onChange={setYearLevel}
                            options={yearLevels}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-slate-200" />

                  <div>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0069A8] text-xs font-semibold text-white">
                        2
                      </span>

                      <div>
                        <p className="text-sm font-semibold text-slate-950">Client Profile</p>

                        <p className="mt-1 text-xs text-slate-500">
                          Share what you need help with and connect with the right peers
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid min-w-0 gap-4">
                      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <label className="block min-w-0">
                          <span className="text-xs font-medium text-slate-700">First Name</span>

                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First Name"
                            required
                            className={bubbleInputClass}
                          />
                        </label>

                        <label className="block min-w-0">
                          <span className="text-xs font-medium text-slate-700">Last Name</span>

                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last Name"
                            required
                            className={bubbleInputClass}
                          />
                        </label>
                      </div>

                      <label className="block min-w-0">
                        <span className="text-xs font-medium text-slate-700">About Me</span>

                        <textarea
                          value={aboutMe}
                          onChange={(e) => setAboutMe(e.target.value)}
                          placeholder="Tell them more about yourself..."
                          required
                          rows={5}
                          className={bubbleTextareaClass}
                        />
                      </label>

                      <p className="text-[11px] text-slate-500">{aboutMe.length}/500 characters</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="ui-interactive w-full rounded-full bg-[#FA642C] py-4 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(250,100,44,0.22)] hover:bg-[#e05625] disabled:cursor-not-allowed disabled:bg-zinc-300 motion-safe:hover:-translate-y-0.5"
                    >
                      {isSubmitting ? "Saving..." : "Continue"}
                    </Button>

                    {statusMessage ? (
                      <p className="mt-3 text-center text-sm text-red-600" role="alert">
                        {statusMessage}
                      </p>
                    ) : null}

                    <p className="mt-3 text-center text-[11px] text-slate-500">
                      You can update your client profile anytime in your settings
                    </p>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
