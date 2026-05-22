export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  verified?: boolean;
};

export type AdminStats = {
  totalTasks: number;
  pendingReview: number;
  completedTasks: number;
  activeUsers: number;
  totalUsers: number;
  verifiedUsers: number;
  suspendedUsers: number;
  flaggedPending: number;
  verificationRate: number;
};

export type ActivityItem = {
  id: string;
  title: string;
  sub: string;
  at: string;
  badge: "pending" | "completed" | "warning";
  kind?: "default" | "task_approved";
  approvedByName?: string;
  clientName?: string;
  taskTitle?: string;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  joinedAt: string | null;
  accountType: "client" | "freelancer" | null;
  role: string;
  verified: boolean;
  suspended: boolean;
  tasksPosted: number;
  rating: number | null;
};

export type AdminTaskRow = {
  id: string;
  title: string;
  createdAt: string | null;
  updatedAt: string | null;
  flagged: boolean;
  clientName: string;
  budget: number;
  category: "academic" | "non-academic";
  status: "pending" | "approved" | "rejected";
};

export type AdminOutletContext = {
  stats: AdminStats | null;
  statsLoading: boolean;
  statsError: string | null;
  reloadStats: () => Promise<void>;
};
