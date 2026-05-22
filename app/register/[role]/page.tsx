"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiPostJson, ApiError } from "../../lib/api";

type RoleType = "client" | "freelancer";

const roleDisplayNames: Record<RoleType, string> = {
  client: "Client",
  freelancer: "Freelancer",
};

const USERNAME_HINT =
  "3–30 characters. Letters, numbers, and underscores only.";

function getUsernameValidationError(value: string): string | null {
  const normalized = value.trim().toLowerCase();

  if (!normalized) return null;
  if (normalized.length < 3 || normalized.length > 30)
    return USERNAME_HINT;
  if (!/^[a-z0-9_]+$/.test(normalized))
    return USERNAME_HINT;

  return null;
}

export default function RegisterRolePage() {
  const router = useRouter();
  const params = useParams();

  const role = (params.role as RoleType) || "client";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usernameError = getUsernameValidationError(username);
  const showUsernameHint = usernameError !== null;

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!username || !email || !password) {
      setStatusMessage("Please fill in every field.");
      return;
    }

    if (!agreeTerms) {
      setStatusMessage(
        "You must agree to the Terms of Services."
      );
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    const validationError =
      getUsernameValidationError(trimmedUsername);

    if (!trimmedUsername || validationError) {
      setStatusMessage(
        validationError || "Please fill in every field."
      );
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");

    try {
      await apiPostJson<{
        message: string;
        email: string;
      }>("/api/auth/register", {
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        role,
      });

      router.push(
        `/verify?email=${encodeURIComponent(
          trimmedEmail
        )}&role=${role}`
      );
    } catch (err) {
      setIsSubmitting(false);

      const message =
        err instanceof ApiError
          ? err.message
          : "Registration failed. Please try again.";

      setStatusMessage(message);
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
          <div className="ui-page-enter ui-surface w-full max-w-xl rounded-[2.5rem] bg-white px-10 py-10 shadow-[0_30px_90px_rgba(0,0,0,0.14)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-[#0F172A]">
                  Sign up as a {roleDisplayNames[role]}
                </h1>

                <p className="mt-2 text-sm text-zinc-600">
                  Complete your account details to get started.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/register")}
                className="ui-interactive cursor-pointer text-sm font-semibold text-[#0069A8] hover:text-[#004f7d] motion-safe:hover:-translate-y-0.5"
              >
                Change role
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >
              {/* USERNAME */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Username
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="#94A3B8"
                        strokeWidth="1.5"
                      />

                      <circle
                        cx="12"
                        cy="10"
                        r="2.5"
                        stroke="#94A3B8"
                        strokeWidth="1.5"
                      />

                      <path
                        d="M7 18.5C7.8 15.9 9.7 14.5 12 14.5C14.3 14.5 16.2 15.9 17 18.5"
                        stroke="#94A3B8"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                    placeholder="Username"
                    aria-invalid={showUsernameHint}
                    className={`ui-input w-full rounded-3xl border bg-[#F8FAFC] py-4 pl-14 pr-4 text-sm text-[#0F172A] outline-none focus:ring-2 ${
                      showUsernameHint
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200/50"
                        : "border-zinc-200 focus:border-[#0069A8] focus:ring-[#66A5CC]/30"
                    }`}
                  />
                </div>

                {showUsernameHint ? (
                  <p className="mt-2 text-xs text-red-600">
                    {usernameError}
                  </p>
                ) : null}
              </div>

              {/* EMAIL */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Institutional Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Institutional Email"
                  className="ui-input w-full rounded-3xl border border-zinc-200 bg-[#F8FAFC] py-4 px-4 text-sm text-[#0F172A] outline-none focus:border-[#0069A8] focus:ring-2 focus:ring-[#66A5CC]/30"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Password"
                  className="ui-input w-full rounded-3xl border border-zinc-200 bg-[#F8FAFC] py-4 px-4 text-sm text-[#0F172A] outline-none focus:border-[#0069A8] focus:ring-2 focus:ring-[#66A5CC]/30"
                />
              </div>

              {statusMessage ? (
                <p className="text-sm font-medium text-red-600">
                  {statusMessage}
                </p>
              ) : null}

              <div className="flex items-start gap-3 rounded-3xl border border-zinc-200 bg-[#F8FAFC] p-4">
                <label className="flex items-center gap-3 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(event) =>
                      setAgreeTerms(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-zinc-300 text-[#FA642C] focus:ring-[#FA642C]"
                  />

                  <span>
                    Yes, I understand and agree to the{" "}
                    <a
                      href="#"
                      className="cursor-pointer font-semibold text-[#0069A8] hover:text-[#004f7d]"
                    >
                      Terms of Services
                    </a>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="ui-interactive cursor-pointer w-full rounded-3xl bg-[#FA642C] py-4 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(250,100,44,0.22)] hover:bg-[#e05625] disabled:cursor-not-allowed disabled:bg-zinc-300 motion-safe:hover:-translate-y-0.5"
              >
                {isSubmitting
                  ? "Creating..."
                  : "Create account"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-[#0069A8]">
              <Link
                href="/login"
                className="ui-interactive font-semibold hover:text-[#004f7d] motion-safe:hover:-translate-y-0.5"
              >
                Already have an account? Login here
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
