import PeerMatchBrandLogo from "./PeerMatchBrandLogo";

export default function AuthPageHeader() {
  return (
    <header className="z-50 w-full shrink-0 max-lg:pt-[env(safe-area-inset-top,0px)]">
      <div className="w-full rounded-b-[1.75rem] border-b border-slate-200/70 bg-white px-4 py-2.5 shadow-sm max-lg:rounded-b-[1.25rem] sm:rounded-b-[2rem] sm:px-6 sm:py-4">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-center">
          <PeerMatchBrandLogo variant="compact" surface="header" />
        </div>
      </div>
    </header>
  );
}
