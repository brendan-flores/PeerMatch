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

export default function RegisterRolePage() {
  const router = useRouter();
  const params = useParams();
  const role = (params.role as RoleType) || "client";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!firstName || !lastName || !email || !password) {
      setStatusMessage("Please fill in every field.");
      return;
    }

    if (!agreeTerms) {
      setStatusMessage("You must agree to the Terms of Services.");
      return;
    }

    const trimmedEmail = email.trim();
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();

    setIsSubmitting(true);
    setStatusMessage("");

    try {
      await apiPostJson<{ message: string; email: string }>("/api/auth/register", {
        name,
        email: trimmedEmail,
        password,
        role,
      });

      router.push(`/verify?email=${encodeURIComponent(trimmedEmail)}&role=${role}`);
    } catch (err) {
      setIsSubmitting(false);
      const message = err instanceof ApiError ? err.message : "Registration failed. Please try again.";
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
                <h1 className="text-3xl font-semibold text-[#0F172A]">Sign up as a {roleDisplayNames[role]}</h1>
                <p className="mt-2 text-sm text-zinc-600">Complete your account details to get started.</p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="ui-interactive cursor-pointer text-sm font-semibold text-[#0069A8] hover:text-[#004f7d] motion-safe:hover:-translate-y-0.5"
              >
                Change role
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-zinc-700">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="First Name"
                    className="ui-input w-full rounded-3xl border border-zinc-200 bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0069A8] focus:ring-2 focus:ring-[#66A5CC]/30"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-zinc-700">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Last Name"
                    className="ui-input w-full rounded-3xl border border-zinc-200 bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#0069A8] focus:ring-2 focus:ring-[#66A5CC]/30"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-700">
                  Institutional Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 5H20C20.5523 5 21 5.44772 21 6V18C21 18.5523 20.5523 19 20 19H4C3.44772 19 3 18.5523 3 18V6C3 5.44772 3.44772 5 4 5Z" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M3 7.5L12 13L21 7.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Institutional Email"
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
                      <path d="M17 11V8C17 5.23858 14.7614 3 12 3C9.23858 3 7 5.23858 7 8V11" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 11H19C20.1046 11 21 11.8954 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C3 11.8954 3.89543 11 5 11Z" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="ui-input w-full rounded-3xl border border-zinc-200 bg-[#F8FAFC] py-4 pl-14 pr-4 text-sm text-[#0F172A] outline-none focus:border-[#0069A8] focus:ring-2 focus:ring-[#66A5CC]/30"
                  />
                </div>
              </div>

              {statusMessage ? <p className="text-sm text-red-600 font-medium">{statusMessage}</p> : null}

              <div className="flex items-start gap-3 rounded-3xl border border-zinc-200 bg-[#F8FAFC] p-4">
                <label className="flex items-center gap-3 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(event) => setAgreeTerms(event.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-[#FA642C] focus:ring-[#FA642C]"
                  />
                  <span>
                    Yes, I understand and agree to the{' '}
                    <a href="#" className="cursor-pointer font-semibold text-[#0069A8] hover:text-[#004f7d]">
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
                {isSubmitting ? "Creating..." : "Create account"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-[#0069A8]">
              <Link href="/login" className="ui-interactive font-semibold hover:text-[#004f7d] motion-safe:hover:-translate-y-0.5">
                Already have an account? Login here
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
