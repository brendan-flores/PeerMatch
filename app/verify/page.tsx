"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPostJson, ApiError } from "../lib/api";

const OTP_LENGTH = 8;
const OTP_PART_LENGTH = 4;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidOtpCode(value: string) {
  return /^\d{8}$/.test(value);
}

function splitOtpParts(code: string): [string, string] {
  const digits = onlyDigits(code).slice(0, OTP_LENGTH);
  return [digits.slice(0, OTP_PART_LENGTH), digits.slice(OTP_PART_LENGTH)];
}

export default function VerifyPage() {
  const router = useRouter();
  const [emailFromQuery, setEmailFromQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return (params.get("email") || "").trim();
  });
  const [role, setRole] = useState<"client" | "freelancer">(() => {
    if (typeof window === "undefined") return "client";
    const params = new URLSearchParams(window.location.search);
    const queryRole = params.get("role");
    if (queryRole === "freelancer" || queryRole === "client") return queryRole;
    const storedRole = window.localStorage.getItem("peerMatchRole");
    if (storedRole === "freelancer" || storedRole === "client") return storedRole;
    return "client";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setEmailFromQuery((params.get("email") || "").trim());
    const queryRole = params.get("role");
    if (queryRole === "freelancer" || queryRole === "client") {
      setRole(queryRole);
      window.localStorage.setItem("peerMatchRole", queryRole);
    }
  }, []);

  const [firstPart, setFirstPart] = useState("");
  const [secondPart, setSecondPart] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "error" | "success"; message: string }>({
    kind: "idle",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const secondInputRef = useRef<HTMLInputElement | null>(null);

  const code = useMemo(() => `${firstPart}${secondPart}`, [firstPart, secondPart]);
  const canSubmit = isValidOtpCode(code) && !isSubmitting;
  const canResend = !isResending && resendCooldown === 0;

  const clearStatus = () => {
    if (status.kind !== "idle") setStatus({ kind: "idle", message: "" });
  };

  const handlePartChange = (part: "first" | "second", raw: string) => {
    clearStatus();
    const cleaned = onlyDigits(raw);

    if (cleaned.length > OTP_PART_LENGTH) {
      const [nextFirst, nextSecond] = splitOtpParts(cleaned);
      setFirstPart(nextFirst);
      setSecondPart(nextSecond);
      if (nextSecond.length === OTP_PART_LENGTH) {
        secondInputRef.current?.focus();
      } else if (nextFirst.length === OTP_PART_LENGTH) {
        secondInputRef.current?.focus();
      }
      return;
    }

    if (part === "first") {
      setFirstPart(cleaned);
      if (cleaned.length === OTP_PART_LENGTH) {
        secondInputRef.current?.focus();
      }
      return;
    }

    setSecondPart(cleaned);
  };

  const handlePartKeyDown = (
    part: "first" | "second",
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && part === "second" && !secondPart) {
      firstInputRef.current?.focus();
      return;
    }

    if (event.key === "Enter" && canSubmit) {
      void handleSubmit();
    }
  };

  const resetCodeInputs = () => {
    setFirstPart("");
    setSecondPart("");
    firstInputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!isValidOtpCode(code)) {
      setStatus({ kind: "error", message: "Please enter the full verification code." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ kind: "idle", message: "" });

    try {
      await apiPostJson("/api/auth/verify-otp", {
        email: emailFromQuery,
        token: code,
      });
      setStatus({ kind: "success", message: "Email verified successfully." });
      const destination = role === "freelancer" ? "/freelancer-details" : "/client-details";
      router.push(destination);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Verification failed. Please try again.";
      setStatus({ kind: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setIsResending(true);
    setStatus({ kind: "idle", message: "" });

    if (!emailFromQuery.trim()) {
      setStatus({ kind: "error", message: "Email address is missing. Please register again." });
      setIsResending(false);
      return;
    }

    try {
      await apiPostJson("/api/auth/send-otp", { email: emailFromQuery });
      resetCodeInputs();
      setStatus({ kind: "success", message: "A new verification code was sent." });
      setResendCooldown(30);
      setTimeout(() => setResendCooldown(0), 30000);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not resend the code. Please try again.";
      setStatus({ kind: "error", message });
    } finally {
      setIsResending(false);
    }
  };

  const partInputClass = (hasError: boolean) =>
    `ui-input h-16 w-full rounded-xl border bg-white px-4 text-center text-2xl font-semibold tracking-[0.35em] text-[#0F172A] shadow-[0_10px_20px_rgba(0,0,0,0.08)] outline-none focus:border-[#0069A8] focus:ring-2 focus:ring-[#66A5CC]/30 ${
      hasError ? "border-red-400" : "border-zinc-200"
    }`;

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
          <div className="ui-page-enter ui-surface w-full max-w-xl rounded-[2.5rem] bg-white px-10 py-12 shadow-[0_30px_90px_rgba(0,0,0,0.14)]">
            <h1 className="text-center text-3xl font-semibold text-[#0F172A]">Please Verify Account</h1>
            <p className="mt-4 text-center text-sm leading-6 text-zinc-600">
              Enter the verification code
            </p>

            <div className="mt-8 flex w-full items-center justify-center gap-3">
              <input
                ref={firstInputRef}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={OTP_PART_LENGTH}
                value={firstPart}
                onChange={(e) => handlePartChange("first", e.target.value)}
                onKeyDown={(e) => handlePartKeyDown("first", e)}
                aria-label="Verification code first half"
                placeholder="0000"
                className={partInputClass(status.kind === "error")}
              />
              <span className="text-xl font-semibold text-zinc-400" aria-hidden>
                —
              </span>
              <input
                ref={secondInputRef}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={OTP_PART_LENGTH}
                value={secondPart}
                onChange={(e) => handlePartChange("second", e.target.value)}
                onKeyDown={(e) => handlePartKeyDown("second", e)}
                aria-label="Verification code second half"
                placeholder="0000"
                className={partInputClass(status.kind === "error")}
              />
            </div>

            {status.kind !== "idle" ? (
              <p
                className={`mt-6 text-center text-sm ${
                  status.kind === "success" ? "text-emerald-700" : "text-red-600"
                }`}
                role={status.kind === "error" ? "alert" : undefined}
              >
                {status.message}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="ui-interactive mt-10 w-full rounded-2xl bg-[#FA642C] py-4 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(250,100,44,0.22)] hover:bg-[#e05625] motion-safe:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isSubmitting ? "Verifying..." : "Verify & Continue"}
            </button>

            <div className="mt-4 text-center text-sm text-zinc-600">
              <span>Didn&apos;t receive the code? </span>
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={!canResend}
                className="text-[#0069A8] underline hover:text-[#004f7d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResending
                  ? "Resending..."
                  : resendCooldown > 0
                    ? `Resend code (in ${resendCooldown}s)`
                    : "Resend code"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
