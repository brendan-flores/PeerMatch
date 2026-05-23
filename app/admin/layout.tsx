import type { Metadata } from "next";
import "./admin.css";
import { AdminAuthProvider } from "./context/AdminAuthContext";

export const metadata: Metadata = {
  title: "PeerMatch Admin",
};

export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
