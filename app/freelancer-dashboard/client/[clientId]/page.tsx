"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MapPin, MessageCircle, UserCircle } from "lucide-react";
import {
  dashboardCenterPanelClass,
  dashboardCenterPanelFixedClass,
  dashboardPanelScrollClass,
  dashboardPanelScrollInsetClass,
} from "@/app/components/dashboard/dashboardShellClasses";
import { UserAvatar } from "@/app/components/UserAvatar";
import { ApiError, apiGetJson } from "@/app/lib/api";

type ResolvedUser = {
  id: string;
  name: string;
  email: string;
  accountType?: string | null;
  photoDataUrl?: string;
};

type ResolveResponse = {
  user: ResolvedUser | null;
};

export default function FreelancerClientProfilePage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const clientId = String(params?.clientId || "").trim();
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [client, setClient] = useState<ResolvedUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!clientId) {
      setErrorText("Client profile not found.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await apiGetJson<ResolveResponse>(`/api/users/resolve?q=${encodeURIComponent(clientId)}`);
        if (cancelled) return;
        if (!res.user || String(res.user.accountType || "").toLowerCase() !== "client") {
          setClient(null);
          setErrorText("Client profile not found.");
          return;
        }
        setClient(res.user);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof ApiError ? error.message : "Could not load client profile.";
        setErrorText(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <main className={`${dashboardCenterPanelClass} ${dashboardCenterPanelFixedClass}`}>
      <div className={`${dashboardPanelScrollClass} ${dashboardPanelScrollInsetClass} max-w-2xl`}>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Client Profile</h1>
        <p className="mt-2 text-sm text-zinc-500">Review details about the client before starting a conversation.</p>

        {loading ? <p className="mt-6 text-sm text-zinc-500">Loading profile...</p> : null}

        {!loading && errorText ? <p className="mt-6 text-sm text-red-600">{errorText}</p> : null}

        {!loading && client ? (
          <section className="mt-6 rounded-2xl border border-zinc-200 bg-[#F3F6F5] p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-4">
              <UserAvatar
                id={client.id}
                name={client.name}
                photoDataUrl={client.photoDataUrl}
                size="xl"
                initialsClassName="bg-[#E8EFEC] text-zinc-800"
              />
              <div>
                <p className="text-xl font-semibold text-zinc-900">{client.name}</p>
                <p className="text-sm text-zinc-500">{client.email}</p>
              </div>
            </div>
            <div className="mt-5 space-y-2 text-sm text-zinc-700">
              <p className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-[#FF6B35]" strokeWidth={1.75} />
                Client account
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#FF6B35]" strokeWidth={1.75} />
                Location is private
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/freelancer-dashboard/messages?with=${encodeURIComponent(client.id)}`)}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.9} />
              Message Client
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
