"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Button from "../components/Button";
import { useRouter } from "next/navigation";
import { apiPostJson, ApiError } from "../lib/api";

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

export default function FreelancerDetailsPage() {
  const router = useRouter();
  const [course, setCourse] = useState("");
  const [yearLevel, setYearLevel] = useState(yearLevels[0]);
  const [skills, setSkills] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(
    "https://api.dicebear.com/7.x/avataaars/svg?seed=FreelancerDetails"
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

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    void (async () => {
      setIsSubmitting(true);
      setStatusMessage("");
      try {
        const photoDataUrl = photoFile ? await fileToDataUrl(photoFile) : undefined;
        await apiPostJson("/api/auth/profile", {
          course,
          yearLevel,
          skills,
          aboutMe,
          ...(photoDataUrl ? { photoDataUrl } : {}),
        });
        setShowConfirmation(true);
        window.setTimeout(() => {
          router.push("/freelancer-dashboard");
        }, 1600);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Could not save profile. Please try again.";
        setStatusMessage(message);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <div className="min-h-screen bg-[#E5F6F4]">
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 z-50 w-full">
          <div className="w-full rounded-b-[2rem] border-b border-slate-200/70 bg-white/95 px-6 py-4 shadow-sm shadow-slate-200 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <div className="mx-auto flex w-full max-w-[1120px] items-center justify-center">
              <div className="px-1 py-1">
                <Image
                  src="/peermatch-logo.png"
                  alt="PeerMatch — Student Collaboration"
                  width={240}
                  height={48}
                  className="h-12 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-start justify-center px-4 py-12">
          <div className="w-full max-w-[1120px]">
            <div className="text-center">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Complete Your Freelancer Profile</h1>
              <p className="mt-2 text-sm text-slate-600">
                Set up your freelancer profile to connect with clients and peers
              </p>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr] lg:items-start">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    <img src={photoPreview} alt="Freelancer profile preview" className="h-full w-full object-cover" />
                  </div>

                  <button
                    type="button"
                    onClick={handleChoosePhoto}
                    className="rounded-full bg-[#FA642C] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#e05b26]"
                  >
                    Change Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="h-px w-full bg-slate-200" />

                  <div className="w-full rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold text-slate-900">Tip</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-600">
                      A complete freelancer profile helps you attract better opportunities and build trust faster.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div
                  aria-live="polite"
                  className={`mb-5 overflow-hidden rounded-xl border transition-all duration-500 ease-out ${
                    showConfirmation
                      ? "max-h-40 border-emerald-200 bg-emerald-50 opacity-100"
                      : "max-h-0 border-transparent bg-transparent opacity-0"
                  }`}
                >
                  <div
                    className={`px-4 py-3 text-emerald-900 transition-transform duration-500 ease-out ${
                      showConfirmation ? "translate-y-0 scale-100" : "-translate-y-2 scale-[0.98]"
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

                    <div className="mt-5 grid gap-4">
                      <label className="block">
                        <span className="text-xs font-medium text-slate-700">Course</span>
                        <select
                          value={course}
                          onChange={(e) => setCourse(e.target.value)}
                          required
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#66A5CC] focus:ring-2 focus:ring-[#66A5CC]/25"
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
                      </label>

                      <label className="block">
                        <span className="text-xs font-medium text-slate-700">Academic Year</span>
                        <select
                          value={yearLevel}
                          onChange={(e) => setYearLevel(e.target.value)}
                          required
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#66A5CC] focus:ring-2 focus:ring-[#66A5CC]/25"
                        >
                          {yearLevels.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="h-px w-full bg-slate-200" />

                  <div>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0069A8] text-xs font-semibold text-white">
                        2
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Freelancer Profile</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Highlight your skills and share what you can offer
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4">
                      <label className="block">
                        <span className="text-xs font-medium text-slate-700">Skills</span>
                        <input
                          type="text"
                          value={skills}
                          onChange={(e) => setSkills(e.target.value)}
                          placeholder="e.g. UI Design, Research, Programming"
                          required
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#66A5CC] focus:ring-2 focus:ring-[#66A5CC]/25"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-medium text-slate-700">About Me</span>
                        <textarea
                          value={aboutMe}
                          onChange={(e) => setAboutMe(e.target.value)}
                          placeholder="Tell clients and peers about your strengths, interests, and the projects you'd like to work on..."
                          required
                          rows={5}
                          className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-[#66A5CC] focus:ring-2 focus:ring-[#66A5CC]/25"
                        />
                      </label>
                      <p className="text-[11px] text-slate-500">{aboutMe.length}/500 characters</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-xl bg-[#FA642C] py-3.5 text-sm font-semibold text-white hover:bg-[#e05b26] disabled:cursor-not-allowed disabled:bg-zinc-300"
                    >
                      {isSubmitting ? "Saving..." : "Continue"}
                    </Button>
                    {statusMessage ? (
                      <p className="mt-3 text-center text-sm text-red-600" role="alert">
                        {statusMessage}
                      </p>
                    ) : null}
                    <p className="mt-3 text-center text-[11px] text-slate-500">
                      You can update your freelancer profile anytime in your settings
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
