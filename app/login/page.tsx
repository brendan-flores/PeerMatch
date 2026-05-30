"use client";

import { FormEvent, useEffect, useState } from "react";
import AuthPageHeader from "../components/AuthPageHeader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPostJson, ApiError, getErrorMessage, isApiError } from "../lib/api";
import { getApiBaseUrl } from "../lib/siteUrls";
import { connectSocket } from "../lib/socket";
import {
  normalizeAuthUser,
  persistFreelancerFromMe,
  recordFreelancerLoginForGreeting,
} from "../lib/freelancerStorage";

type LoginResponse = {
  user: { id: string; name: string; email: string; role: string; accountType?: string };
};

function isClientAccount(user: LoginResponse["user"]) {
  const role = String(user?.role || "").toLowerCase();
  const accountType = String(user?.accountType || "").toLowerCase();
  return accountType === "client" || role === "client";
}

function redirectAfterLogin(path: string) {
  window.location.replace(path);
}

async function postLoginWithRetry(body: { email: string; password: string }) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await apiPostJson<LoginResponse>("/api/auth/login", body);
    } catch (err) {
      lastErr = err;
      const retryable =
        isApiError(err) && (err.status === 502 || err.status === 503 || err.status === 504);
      if (!retryable || attempt === 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  throw lastErr;
}

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const base = getApiBaseUrl();
    const healthUrl = `${base}/api/health`;
    void fetch(healthUrl, { credentials: "include" }).catch(() => {});
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loginId || !password) {
      setStatusMessage("Please enter your email or username and password.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Signing in...");

    try {
      const data = await postLoginWithRetry({
        email: loginId.trim(),
        password,
      });

      const rawUser = data?.user;
      if (!rawUser || (!rawUser.id && !(rawUser as { _id?: string })._id)) {
        throw new ApiError(
          "Login response was incomplete. Check API_PROXY_URL / NEXT_PUBLIC_API_BASE_URL on Vercel and CORS_ORIGINS on Render, then redeploy.",
          500,
          data,
        );
      }

      const user = normalizeAuthUser(rawUser);
      persistFreelancerFromMe(user);

      try {
        if (user.id) {
          connectSocket(user.id);
        }
      } catch {
        // Login should succeed even if Socket.IO is unavailable.
      }

      if (typeof window !== "undefined" && rawUser.role) {
        window.sessionStorage.setItem("peermatch_role", String(rawUser.role));
      }

      if (isClientAccount(rawUser)) {
        redirectAfterLogin("/client-home");
        return;
      }

      recordFreelancerLoginForGreeting(user.id);
      redirectAfterLogin("/freelancer-dashboard");
    } catch (err) {
      const message = getErrorMessage(err, "Login failed. Please try again.");
      setStatusMessage(message);
      if (isApiError(err) && err.status === 403 && message.toLowerCase().includes("verify")) {
        const payload = err.payload as { email?: string } | undefined;
        const verifyEmail = typeof payload?.email === "string" ? payload.email : loginId.trim();
        router.push(`/verify?email=${encodeURIComponent(verifyEmail)}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthPageHeader />

      <main className="grid min-h-0 flex-1 grid-rows-1 place-items-center px-4 py-4 max-lg:overflow-hidden max-lg:pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:py-10 lg:py-12">
        <div className="ui-page-enter w-full max-w-md rounded-[2rem] bg-white px-6 py-8 shadow-[0_30px_90px_rgba(0,0,0,0.12)] sm:px-8 sm:py-10 max-lg:max-w-[min(100%,19.5rem)] max-lg:px-5 max-lg:py-6">
          <h1 className="text-center text-xl font-semibold text-[#0F172A] max-lg:text-[1.35rem] sm:text-3xl">
            Log in to PeerMatch
          </h1>
          <p className="mt-2 text-center text-sm text-zinc-600 max-lg:text-[13px]">
            Sign in with your institutional email or username.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5 sm:mt-8 sm:space-y-5 max-lg:mt-4">
            <div>
              <label htmlFor="loginId" className="mb-1.5 block text-sm font-medium text-zinc-700 max-lg:text-[13px]">
                Email or Username
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 5H20C20.5523 5 21 5.44772 21 6V18C21 18.5523 20.5523 19 20 19H4C3.44772 19 3 18.5523 3 18V6C3 5.44772 3.44772 5 4 5Z" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 7.5L12 13L21 7.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <input
                  id="loginId"
                  name="loginId"
                  type="text"
                  autoComplete="username"
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                  placeholder="Email or username"
                  required
                  className="ui-input w-full rounded-3xl border border-zinc-200 bg-[#F8FAFC] py-3 pl-14 pr-4 text-sm text-[#0F172A] outline-none focus:border-[#0069A8] focus:ring-2 focus:ring-[#66A5CC]/30 max-lg:py-2.5 sm:py-4"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-700 max-lg:text-[13px]">
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  required
                  className="ui-input w-full rounded-3xl border border-zinc-200 bg-[#F8FAFC] py-3 pl-14 pr-4 text-sm text-[#0F172A] outline-none focus:border-[#0069A8] focus:ring-2 focus:ring-[#66A5CC]/30 max-lg:py-2.5 sm:py-4"
                />
              </div>
            </div>

            {statusMessage ? (
              <p className="text-center text-sm text-red-600">{statusMessage}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="ui-interactive flex w-full items-center justify-center rounded-3xl bg-[#FA642C] py-3 text-sm font-semibold text-white hover:bg-[#df531f] disabled:cursor-not-allowed disabled:bg-zinc-300 max-lg:py-2.5 sm:py-4"
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

          <p className="mt-4 text-center text-sm text-zinc-600 max-lg:mt-3 max-lg:text-[13px] sm:mt-6">
            Don&apos;t have PeerMatch account?{" "}
            <Link href="/register" className="font-semibold text-[#0069A8] hover:text-[#004f7d]">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
