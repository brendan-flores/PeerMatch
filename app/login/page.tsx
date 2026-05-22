"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGetJson, apiPostJson, ApiError } from "../lib/api";
import { connectSocket } from "../lib/socket";
import {
  normalizeAuthUser,
  persistFreelancerFromMe,
  recordFreelancerLoginForGreeting,
} from "../lib/freelancerStorage";

type LoginResponse = {
  user: { id: string; name: string; email: string; role: string; accountType?: string };
};

type MeResponse = {
  user: { id: string; name: string; email: string; role: string; accountType?: string };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setStatusMessage("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Signing in...");

    try {
      const data = await apiPostJson<LoginResponse>("/api/auth/login", {
        email: email.trim(),
        password,
      });
      if (data.user?.id) {
        connectSocket(String(data.user.id));
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("peermatch_role", data.user.role);
      }
      persistFreelancerFromMe(normalizeAuthUser(data.user));
      const roleFromLogin = String(data.user?.role || "").toLowerCase();
      const accountTypeFromLogin = String(data.user?.accountType || "").toLowerCase();
      if (accountTypeFromLogin === "client" || roleFromLogin === "client") {
        router.push("/client-home");
        return;
      }

      let freelancerId = normalizeAuthUser(data.user).id;
      // Confirm role when the login payload omits accountType (older API responses).
      try {
        const me = await apiGetJson<MeResponse>("/api/auth/me");
        const meUser = normalizeAuthUser(me.user);
        persistFreelancerFromMe(meUser);
        freelancerId = meUser.id || freelancerId;
        const role = String(me.user?.role || "").toLowerCase();
        const accountType = String(me.user?.accountType || "").toLowerCase();
        if (accountType === "client" || role === "client") {
          router.push("/client-home");
          return;
        }
      } catch {
        // Session may still be valid from login; dashboard will re-fetch /api/auth/me.
      }
      recordFreelancerLoginForGreeting(freelancerId);
      router.push("/freelancer-dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      setStatusMessage(message);
      if (err instanceof ApiError && err.status === 403 && message.toLowerCase().includes("verify")) {
        router.push(`/verify?email=${encodeURIComponent(email.trim())}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E5F6F4]">
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 z-50 w-full">
          <div className="w-full rounded-b-[2rem] border-b border-slate-200/70 bg-white/95 px-6 py-4 shadow-sm shadow-slate-200 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <div className="mx-auto flex w-full max-w-[1120px] items-center justify-center">
              <div className="px-1 py-1">
                <Image
                  src="/logo.png"
                  alt="PeerMatch — Student Collaboration"
                  width={240}
                  height={48}
                  className="h-12 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-start justify-center px-4 py-10">
          <div className="ui-page-enter ui-surface w-full max-w-md rounded-[2rem] bg-white px-10 py-10 shadow-[0_30px_90px_rgba(0,0,0,0.12)]">
            <h1 className="text-3xl font-semibold text-[#0F172A]">Log in to PeerMatch</h1>
            <p className="mt-3 text-sm text-zinc-600">Use your institutional email to access your account.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-700">
                  Institutional Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 5H20C20.5523 5 21 5.44772 21 6V18C21 18.5523 20.5523 19 20 19H4C3.44772 19 3 18.5523 3 18V6C3 5.44772 3.44772 5 4 5Z" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 7.5L12 13L21 7.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Institutional Email"
                    required
                    className="ui-input w-full rounded-3xl border border-zinc-200 bg-[#F8FAFC] py-4 pl-14 pr-4 text-sm text-[#0F172A] outline-none focus:border-[#0069A8] focus:ring-2 focus:ring-[#66A5CC]/30"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-700">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 11V8C17 5.23858 14.7614 3 12 3C9.23858 3 7 5.23858 7 8V11" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 11H19C20.1046 11 21 11.8954 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C3 11.8954 3.89543 11 5 11Z" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    required
                    className="ui-input w-full rounded-3xl border border-zinc-200 bg-[#F8FAFC] py-4 pl-14 pr-4 text-sm text-[#0F172A] outline-none focus:border-[#0069A8] focus:ring-2 focus:ring-[#66A5CC]/30"
                  />
                </div>
              </div>

              {statusMessage ? (
                <p className="text-sm text-red-600">{statusMessage}</p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="ui-interactive w-full rounded-3xl bg-[#FA642C] py-4 text-sm font-semibold text-white hover:bg-[#df531f] motion-safe:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Continue
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-600">
              Don&apos;t have PeerMatch account?{' '}
              <Link href="/register" className="ui-interactive font-semibold text-[#0069A8] hover:text-[#004f7d] motion-safe:hover:-translate-y-0.5">
                Sign up
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
