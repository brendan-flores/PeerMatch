import PeerMatchBrandLogo from "./PeerMatchBrandLogo";

export default function AuthPageHeader() {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="w-full rounded-b-[2rem] border-b border-slate-200/70 bg-white/95 px-6 py-4 shadow-sm shadow-slate-200 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-center bg-white">
          <PeerMatchBrandLogo variant="compact" surface="header" />
        </div>
      </div>
    </header>
  );
}
