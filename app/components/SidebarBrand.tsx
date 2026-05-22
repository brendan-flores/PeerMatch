import PeerMatchBrandLogo from "./PeerMatchBrandLogo";

export default function SidebarBrand() {
  return (
    <div className="flex items-center justify-center rounded-xl border border-zinc-100 bg-white px-3 py-3 shadow-sm">
      <PeerMatchBrandLogo variant="compact" surface="header" />
    </div>
  );
}
