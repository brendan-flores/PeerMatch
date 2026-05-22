"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { MessageSquareQuote, Star, UserCircle } from "lucide-react";
import { ApiError } from "@/app/lib/api";
import {
  fetchPublicFreelancerProfile,
  type PublicFreelancerProfile,
} from "@/app/lib/freelancerProfileApi";

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 text-[#FF6B35]" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${index < rating ? "fill-current" : ""}`}
          strokeWidth={1.5}
          aria-hidden
        />
      ))}
    </div>
  );
}

export default function FreelancerPublicProfilePage() {
  const params = useParams<{ freelancerId: string }>();
  const freelancerId = String(params?.freelancerId || "").trim();
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [profile, setProfile] = useState<PublicFreelancerProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!freelancerId) {
      setErrorText("Freelancer profile not found.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const loaded = await fetchPublicFreelancerProfile(freelancerId);
        if (cancelled) return;
        setProfile(loaded);
        setErrorText("");
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof ApiError ? error.message : "Could not load freelancer profile.";
        setErrorText(message);
        setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [freelancerId]);

  const displayName = profile?.name.trim() || "Freelancer";
  const initials = useMemo(
    () =>
      displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "FL",
    [displayName],
  );

  return (
    <div className="min-h-screen bg-[#E8EFEC] px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Freelancer Profile</h1>
        <p className="mt-1 text-sm text-zinc-600">Review this freelancer&apos;s profile and client feedback.</p>

        {loading ? <p className="mt-8 text-sm text-zinc-500">Loading profile...</p> : null}
        {!loading && errorText ? <p className="mt-8 text-sm text-red-600">{errorText}</p> : null}

        {!loading && profile ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
            <article className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm">
              <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border border-zinc-200 bg-white">
                {profile.photoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photoDataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-zinc-800">
                    {initials}
                  </div>
                )}
              </div>
              <h2 className="mt-3 text-center text-xl font-bold text-zinc-900">{displayName}</h2>
              {profile.headline ? (
                <p className="mt-1 text-center text-xs text-zinc-600">{profile.headline}</p>
              ) : null}
              <div className="mt-3 rounded-xl bg-white px-3 py-2 text-center">
                <p className="text-xs font-semibold text-[#FF6B35]">Verified Peer Match Account</p>
              </div>
            </article>

            <div className="space-y-4">
              <article className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                  <UserCircle className="h-5 w-5 shrink-0 text-[#FF6B35]" strokeWidth={1.75} aria-hidden />
                  About
                </h3>
                <dl className="mt-3 space-y-3 text-sm text-zinc-800">
                  {profile.course ? (
                    <div>
                      <dt className="text-xs font-semibold text-zinc-600">Course</dt>
                      <dd className="mt-0.5">{profile.course}</dd>
                    </div>
                  ) : null}
                  {profile.yearLevel ? (
                    <div>
                      <dt className="text-xs font-semibold text-zinc-600">Year Level</dt>
                      <dd className="mt-0.5">{profile.yearLevel}</dd>
                    </div>
                  ) : null}
                  {profile.bio ? (
                    <div>
                      <dt className="text-xs font-semibold text-zinc-600">About Me</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap leading-6 text-zinc-700">{profile.bio}</dd>
                    </div>
                  ) : null}
                  {!profile.course && !profile.yearLevel && !profile.bio ? (
                    <p className="text-sm text-zinc-500">No profile details yet.</p>
                  ) : null}
                </dl>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-4 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                  <MessageSquareQuote className="h-5 w-5 shrink-0 text-[#FF6B35]" strokeWidth={1.75} aria-hidden />
                  Reviews
                </h3>
                {profile.reviews.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {profile.reviews.map((review, index) => (
                      <div
                        key={`${review.reviewer}-${index}`}
                        className="rounded-xl border border-zinc-200 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-zinc-900">{review.reviewer || "Client"}</p>
                          <ReviewStars rating={review.rating} />
                        </div>
                        {review.text ? (
                          <p className="mt-2 text-xs leading-relaxed text-zinc-600">{review.text}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-sm text-zinc-500">
                    No reviews yet.
                  </p>
                )}
              </article>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
