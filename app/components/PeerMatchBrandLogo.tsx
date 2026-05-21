import Image from "next/image";

type PeerMatchBrandLogoProps = {
  variant?: "compact" | "featured";
  /** header = white surface (auth bars); page = transparent for #E5F6F4 */
  surface?: "header" | "page";
  className?: string;
};

const LOGO_ASPECT = 760 / 160;
const LOGO_VERSION = "v=2";

const sizes = {
  compact: { height: 36, className: "h-9 w-auto" },
  featured: { height: 56, className: "h-14 w-auto" },
} as const;

export default function PeerMatchBrandLogo({
  variant = "compact",
  surface = "header",
  className = "",
}: PeerMatchBrandLogoProps) {
  const { height, className: sizeClass } = sizes[variant];
  const width = Math.round(height * LOGO_ASPECT);
  const src =
    surface === "header"
      ? `/peermatch-brand-logo-header.png?${LOGO_VERSION}`
      : `/peermatch-brand-logo.png?${LOGO_VERSION}`;

  return (
    <Image
      src={src}
      alt="PeerMatch Student Collaboration"
      width={width}
      height={height}
      className={`object-contain ${sizeClass} ${className}`.trim()}
      priority
      unoptimized
    />
  );
}
