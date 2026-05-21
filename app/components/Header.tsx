import PeerMatchBrandLogo from "./PeerMatchBrandLogo";

export default function Header() {
  return (
    <div className="w-full rounded-[30px] bg-white px-8 py-8 shadow-sm shadow-slate-200 backdrop-blur-xl" style={{ minHeight: 179 }}>
      <div className="mx-auto flex h-full w-full max-w-[1120px] items-center justify-center">
        <PeerMatchBrandLogo variant="featured" />
      </div>
    </div>
  );
}
