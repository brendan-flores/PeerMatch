"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import { apiPostJson, ApiError } from "../lib/api";

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
    "https://api.dicebear.com/7.x/avataaars/svg?seed=ClientDetails"
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!photoFile) return;

    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handleChoosePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      setPhotoFile(file);
    }
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () =>
        reject(new Error("Failed to read file"));

      reader.onload = () =>
        resolve(String(reader.result || ""));

      reader.readAsDataURL(file);
    });

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (isSubmitting) return;

    void (async () => {
      setIsSubmitting(true);
      setStatusMessage("");

      try {
        const photoDataUrl = photoFile
          ? await fileToDataUrl(photoFile)
          : undefined;

        await apiPostJson("/api/auth/profile", {
          course,
          yearLevel,
          firstName,
          lastName,
          aboutMe,
          ...(photoDataUrl ? { photoDataUrl } : {}),
        });

        setShowConfirmation(true);

        window.setTimeout(() => {
          router.push("/client-home");
        }, 1600);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Could not save profile. Please try again.";

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
          <div className="w-full rounded-b-[2rem] border-b border-slate-200/70 bg-white/95 px-6 py-4 shadow-sm shadow-slate-200 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[1120px] items-center justify-center">
              <Image
                src="/peermatch-logo.png"
                alt="PeerMatch"
                width={240}
                height={48}
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-start justify-center px-4 py-12">
          <div className="w-full max-w-[1120px]">
            <div className="text-center">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                Complete Your Client Profile
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Set up your client profile to connect with
                freelancers and peers
              </p>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    <img
                      src={photoPreview}
                      alt="Client profile preview"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleChoosePhoto}
                    className="rounded-full bg-[#FA642C] px-6 py-2.5 text-sm font-semibold text-white"
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
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <form
                  onSubmit={handleSubmit}
                  className="space-y-8"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Academic Information
                    </p>

                    <div className="mt-5 grid gap-4">
                      <label className="block">
                        <span className="text-xs font-medium text-slate-700">
                          Course
                        </span>

                        <select
                          value={course}
                          onChange={(e) =>
                            setCourse(e.target.value)
                          }
                          required
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                        >
                          <option value="" disabled>
                            Select a course
                          </option>

                          {courseOptions.map((option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-xs font-medium text-slate-700">
                          Academic Year
                        </span>

                        <select
                          value={yearLevel}
                          onChange={(e) =>
                            setYearLevel(e.target.value)
                          }
                          required
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                        >
                          {yearLevels.map((level) => (
                            <option
                              key={level}
                              value={level}
                            >
                              {level}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="h-px w-full bg-slate-200" />

                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Client Information
                    </p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-medium text-slate-700">
                          First Name
                        </span>

                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) =>
                            setFirstName(e.target.value)
                          }
                          placeholder="First Name"
                          required
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-medium text-slate-700">
                          Last Name
                        </span>

                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) =>
                            setLastName(e.target.value)
                          }
                          placeholder="Last Name"
                          required
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                        />
                      </label>
                    </div>

                    <div className="mt-4">
                      <label className="block">
                        <span className="text-xs font-medium text-slate-700">
                          Project Details
                        </span>

                        <textarea
                          value={aboutMe}
                          onChange={(e) =>
                            setAboutMe(e.target.value)
                          }
                          placeholder="Tell freelancers about your project..."
                          required
                          rows={5}
                          className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3"
                        />
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-[#FA642C] py-3.5 text-sm font-semibold text-white"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : "Continue"}
                  </Button>

                  {statusMessage ? (
                    <p className="text-center text-sm text-red-600">
                      {statusMessage}
                    </p>
                  ) : null}
                </form>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
