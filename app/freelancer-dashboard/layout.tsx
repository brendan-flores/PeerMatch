import { FreelancerDashboardShell } from "@/app/components/freelancer/FreelancerDashboardShell";

export default function FreelancerDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <FreelancerDashboardShell>{children}</FreelancerDashboardShell>;
}
