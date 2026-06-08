import Link from "next/link";
import AuthPageHeader from "./AuthPageHeader";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#E5F6F4]">
      <AuthPageHeader />
      <div className="flex items-center justify-center px-4 py-10">
        <div className="ui-page-enter ui-surface w-full max-w-lg rounded-[2.25rem] border border-zinc-200 bg-white p-10 text-center shadow-xl shadow-zinc-200/40">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#FA642C]">404</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            Page not found
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            The page you are looking for does not exist or is not available on this site.
          </p>
          <Link
            href="/home"
            className="ui-interactive mt-8 inline-flex items-center justify-center rounded-2xl bg-[#FA642C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#df531f] motion-safe:hover:-translate-y-0.5"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
