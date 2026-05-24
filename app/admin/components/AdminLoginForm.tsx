"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/app/lib/api";
import { useAdminAuth } from "../context/AdminAuthContext";

function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/admin/dashboard";
  if (!raw.startsWith("/admin")) return "/admin/dashboard";
  return raw;
}

export default function AdminLoginForm() {
  const { status, user, role, login } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "checking") return;
    if (status === "authenticated" && user && role === "admin") {
      router.replace(redirectTo);
    }
    if (status === "authenticated" && user && role !== "admin") {
      router.replace("/admin/unauthorized");
    }
  }, [status, user, role, router, redirectTo]);

  if (status === "checking") {
    return (
      <div className="shell narrow">
        <p className="muted">Checking session…</p>
      </div>
    );
  }

  if (status === "authenticated" && user && role === "admin") {
    return (
      <div className="shell narrow">
        <p className="muted">Redirecting…</p>
      </div>
    );
  }

  if (status === "authenticated" && user && role !== "admin") {
    return (
      <div className="shell narrow">
        <p className="muted">Redirecting…</p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Enter email and password.");
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E5F6F4]">
      <div className="flex min-h-screen w-full flex-col">
        <main className="flex flex-1 items-start justify-center px-4 py-10">
          <div className="ui-page-enter ui-surface w-full max-w-md rounded-[2rem] bg-white px-10 py-10 shadow-[0_30px_90px_rgba(0,0,0,0.12)]">
            <h1 className="text-3xl font-semibold text-[#0F172A]">Log in to PeerMatch Admin</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Sign in with a seeded or promoted admin account.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-700">
                  Email
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
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email"
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

              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="ui-interactive flex w-full items-center justify-center rounded-3xl bg-[#FA642C] py-4 text-sm font-semibold text-white hover:bg-[#df531f] motion-safe:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {isSubmitting ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
