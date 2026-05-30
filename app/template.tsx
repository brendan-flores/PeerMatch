import type { ReactNode } from "react";

export default function Template({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="ui-route-enter flex min-h-full flex-1 flex-col">{children}</div>
  );
}

