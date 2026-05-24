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
    <div className="shell narrow">
      <h1>PeerMatch Admin</h1>
      <p className="muted">Sign in with a seeded or promoted admin account.</p>

      <form className="form" onSubmit={(e) => void handleSubmit(e)}>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </div>
  );
}
