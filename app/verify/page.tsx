"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPostJson, ApiError } from "../lib/api";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isSixDigits(value: string) {
  return /^\d{6}$/.test(value);
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

  const [digits, setDigits] = useState<string[]>(Array.from({ length: 6 }, () => ""));
  const [status, setStatus] = useState<{ kind: "idle" | "error" | "success"; message: string }>({
    kind: "idle",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const code = useMemo(() => digits.join(""), [digits]);
  const canSubmit = isSixDigits(code) && !isSubmitting;
  const canResend = !isResending && resendCooldown === 0;

  const setDigitAt = (index: number, next: string) => {
    setDigits((prev) => {
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
  };

  const focusIndex = (index: number) => {
    const el = inputRefs.current[index];
    if (el) el.focus();
  };

  const handleChange = (index: number, raw: string) => {
    if (status.kind !== "idle") setStatus({ kind: "idle", message: "" });

    const cleaned = onlyDigits(raw);
    if (cleaned.length === 0) {
      setDigitAt(index, "");
      return;
    }

    const chars = cleaned.slice(0, 6).split("");
    if (chars.length > 1) {
      setDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < 6; i++) next[i] = chars[i] || "";
        return next;
      });
      focusIndex(Math.min(chars.length, 6) - 1);
      return;
    }

    setDigitAt(index, cleaned);
    if (index < 5) focusIndex(index + 1);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (digits[index]) {
        setDigitAt(index, "");
        return;
      }
      if (index > 0) {
        focusIndex(index - 1);
        setDigitAt(index - 1, "");
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusIndex(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      focusIndex(index + 1);
      return;
    }

    if (event.key === "Enter" && canSubmit) {
      void handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!isSixDigits(code)) {
      setStatus({ kind: "error", message: "Please enter the 6-digit code." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ kind: "idle", message: "" });

    try {
      await apiPostJson("/api/auth/verify", {
        email: emailFromQuery,
        code,
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

    try {
      await apiPostJson("/api/auth/resend", { email: emailFromQuery });
      setDigits(Array.from({ length: 6 }, () => ""));
      setStatus({ kind: "success", message: "A new verification code was sent." });
      setResendCooldown(30);
      setTimeout(() => setResendCooldown(0), 30000);
      focusIndex(0);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not resend the code. Please try again.";
      setStatus({ kind: "error", message });
    } finally {
      setIsResending(false);
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
          <div className="ui-page-enter ui-surface w-full max-w-xl rounded-[2.5rem] bg-white px-10 py-12 shadow-[0_30px_90px_rgba(0,0,0,0.14)]">
            <h1 className="text-center text-3xl font-semibold text-[#0F172A]">Please Verify Account</h1>
            <p className="mt-4 text-center text-sm leading-6 text-zinc-600">Enter the 6-digit we sent to your email address</p>

          <div className="mt-10 flex w-full justify-center gap-3">
            {digits.map((value, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={value}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                aria-label={`Digit ${index + 1}`}
                className={`ui-input h-16 w-14 rounded-lg border bg-white text-center text-2xl font-semibold text-[#0F172A] shadow-[0_10px_20px_rgba(0,0,0,0.08)] outline-none focus:border-[#0069A8] focus:ring-2 focus:ring-[#66A5CC]/30 ${
                  status.kind === "error" ? "border-red-400" : "border-zinc-200"
                }`}
              />
            ))}
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
            <span>Didn't receive the code? </span>
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={!canResend}
              className={`underline text-[#0069A8] hover:text-[#004f7d] disabled:cursor-not-allowed disabled:opacity-60`}
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