"use client";

type NavUnreadBadgeProps = {
  count: number;
  active?: boolean;
};

export function NavUnreadBadge({ count, active = false }: NavUnreadBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
        active ? "bg-white text-[#FF6B35]" : "bg-[#FF6B35] text-white"
      }`}
      aria-label={`${count} unread message${count === 1 ? "" : "s"}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
