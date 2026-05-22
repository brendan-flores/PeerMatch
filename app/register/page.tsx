"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

type RoleType = "client" | "freelancer";

const clientIcon = (
  <Image
    src="/client-logo.svg"
    alt="Client logo"
    width={28}
    height={28}
    className="h-7 w-7"
  />
);

const roleOptions: Array<{
  key: RoleType;
  title: string;
  subtitle: string;
  icon: ReactNode;
}> = [
  {
    key: "client",
    title: "Client",
    subtitle: "I’m a client, hiring for a task",
    icon: clientIcon,
  },
  {
    key: "freelancer",
    title: "Freelancer",
    subtitle: "I’m a freelancer, looking for work",
    icon: (
      <Image
        src="/freelancer-logo.svg"
        alt="Freelancer logo"
        width={28}
        height={28}
        className="h-7 w-7"
      />
    ),
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleType | "">("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleContinue = () => {
    if (selectedRole) {
      router.push(`/register/${selectedRole}`);
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
            <>
              <h1 className="text-3xl font-semibold text-[#0F172A]">Join as a client or freelancer</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Choose the role that best fits your needs before continuing with registration.
              </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {roleOptions.map((role) => {
                const isSelected = selectedRole === role.key;
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => {
                      setSelectedRole((current) => (current === role.key ? "" : role.key));
                      setStatusMessage("");
                    }}
                    className={`ui-interactive group cursor-pointer flex flex-col justify-between rounded-[2rem] border p-6 text-left motion-safe:transform motion-safe:hover:-translate-y-0.5 ${
                      isSelected
                        ? "border-[#0069A8] bg-[#EBF8FF] shadow-[0_18px_55px_rgba(0,105,168,0.16)] ring-2 ring-[#B8E3FF]"
                        : "border-zinc-200 bg-[#F8FAFC] hover:border-[#0069A8] hover:bg-white hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E5F6F4] text-[#0069A8]">
                        {role.icon}
                      </span>
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                        isSelected
                          ? "border-[#0069A8] bg-[#0069A8] text-white"
                          : "border-zinc-300 text-zinc-500"
                      }`}>
                        {isSelected ? "✓" : ""}
                      </span>
                    </div>
                    <div className="mt-6">
                      <p className="text-xl font-semibold text-[#0F172A]">{role.title}</p>
                      <p className="mt-2 text-sm text-zinc-600">{role.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/login" className="cursor-pointer text-sm font-semibold text-[#0069A8] hover:text-[#004f7d]">
                Already have an account? Login
              </Link>
              <button
                type="button"
                onClick={handleContinue}
                disabled={!selectedRole}
                className="ui-interactive inline-flex cursor-pointer items-center justify-center rounded-3xl bg-[#FA642C] px-6 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300 hover:bg-[#e05625] motion-safe:hover:-translate-y-0.5"
              >
                Continue
              </button>
            </div>
            </>
          </div>
        </main>
      </div>
    </div>
  );
}
