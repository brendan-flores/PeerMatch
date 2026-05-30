import type { ReactNode } from "react";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-1 flex-col overflow-hidden bg-[#E5F6F4] max-lg:h-[100dvh] max-lg:min-h-0 lg:min-h-[100dvh]">
      {children}
    </div>
  );
}
