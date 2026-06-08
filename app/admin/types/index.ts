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
  badge: "pending" | "approved" | "rejected";
  kind?: "default" | "task_approved" | "task_rejected";
  moderatorName?: string;
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
  /** Present only for freelancer accounts */
  rating?: number | null;
};

export type AdminTaskRow = {
  id: string;
  title: string;
  description?: string;
  subjectCategory?: string;
  urgency?: string;
  createdAt: string | null;
  updatedAt: string | null;
  flagged: boolean;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientAccountType?: string | null;
  clientCourse?: string;
  clientYearLevel?: string;
  budget: number;
  category: "academic" | "non-academic";
  status: "pending" | "approved" | "rejected";
  hireStatus?: string;
  assignedFreelancerName?: string;
  assignedFreelancerEmail?: string;
  approvedByName?: string;
  rejectedByName?: string;
  completedAt?: string | null;
  reviewSubmittedAt?: string | null;
  reviewRating?: number | null;
};

export type AdminOutletContext = {
  stats: AdminStats | null;
  statsLoading: boolean;
  statsError: string | null;
  reloadStats: () => Promise<void>;
};
