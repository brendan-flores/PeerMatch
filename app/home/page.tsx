import Link from "next/link";
import AuthPageHeader from "../components/AuthPageHeader";

export const metadata = {
  title: "PeerMatch Home",
};

export default function PeerMatchHome() {
  return (
    <div className="min-h-screen bg-[#E5F6F4]">
      <AuthPageHeader />
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
      <div className="ui-page-enter ui-surface w-full max-w-5xl rounded-[2.25rem] border border-zinc-200 bg-white p-10 shadow-xl shadow-zinc-200/40">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:justify-items-center">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Request help.
              <br />
              Offer assistance.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600">
              A structured platform exclusively for CIT-U students to request and offer assistance for academic
              and non-academic tasks. Choose your role as a Client to post tasks and set compensation in Philippine
              Peso (PHP), or as a freelancer to offer your services.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="ui-interactive inline-flex items-center justify-center rounded-2xl bg-[#FA642C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#df531f] motion-safe:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="ui-interactive inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-950 hover:border-zinc-400 hover:bg-zinc-50 motion-safe:hover:-translate-y-0.5"
              >
                Register
              </Link>
            </div>
          </div>

          <aside className="rounded-[1.75rem] bg-[#0069A8] p-7 text-white shadow-xl shadow-blue-900/10">
            <h2 className="text-xl font-semibold">Get started today</h2>
            <ul className="mt-5 space-y-3 pl-5 text-sm leading-6 text-white/95 list-disc">
              <li>Post tasks or offer your services</li>
              <li>Build accountability with verified peers</li>
              <li>Earn or get support transparently</li>
            </ul>
          </aside>
        </div>
      </div>
      </div>
    </div>
  );
}

