"use client";

type NavUnreadBadgeProps = {
  count: number;
  active?: boolean;
  /** Defaults to "item(s)" — use "offer" for the Offers nav. */
  label?: string;
};

export function NavUnreadBadge({ count, active = false, label = "item" }: NavUnreadBadgeProps) {
  if (count <= 0) return null;

  const labelWord = count === 1 ? label : `${label}s`;

  return (
    <span
      className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
        active ? "bg-white text-[#FF6B35]" : "bg-[#FF6B35] text-white"
      }`}
      aria-label={`${count} pending ${labelWord}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
