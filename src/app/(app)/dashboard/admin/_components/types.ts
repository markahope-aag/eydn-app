export type Stats = {
  total_subscribers: number;
  new_signups_7d: number;
  active_users_7d: number;
  total_events: number;
  onboarding_completed: number;
  conversion_rate: number;
  total_ai_chats: number;
  trials_active: number;
  trials_expired_unconverted: number;
  paid_subscriptions: number;
  paid_conversion_rate: number;
  memory_plan_active: number;
  post_wedding_expired: number;
  post_wedding_total: number;
};

export type User = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  has_event: boolean;
  joined: number;
  last_sign_in: number | null;
};

export type AppSettings = {
  registration: { enabled: boolean; invite_only: boolean };
  features: {
    ai_chat: boolean;
    seating_chart: boolean;
    day_of_planner: boolean;
    file_uploads: boolean;
  };
  limits: {
    max_guests: number;
    max_chat_messages_per_hour: number;
    max_file_size_mb: number;
  };
};

export const DEFAULT_SETTINGS: AppSettings = {
  registration: { enabled: true, invite_only: false },
  features: { ai_chat: true, seating_chart: true, day_of_planner: true, file_uploads: true },
  limits: { max_guests: 500, max_chat_messages_per_hour: 30, max_file_size_mb: 10 },
};

export type CronJobInfo = {
  name: string;
  schedule: string;
  description: string;
  stats: {
    lastRun: string | null;
    lastStatus: string | null;
    lastDuration: number | null;
    successCount: number;
    errorCount: number;
  };
};

export type CronExecution = {
  id: string;
  job_name: string;
  status: "success" | "error";
  duration_ms: number | null;
  details: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string;
};

export type CronData = {
  jobs: CronJobInfo[];
  recentExecutions: CronExecution[];
};

export type BackupInfo = {
  dataStats: Record<string, number>;
  softDeleted: Record<string, number>;
  security: {
    rlsEnabled: boolean;
    protectedTables: string[];
    rateLimiting: boolean;
    securityHeaders: boolean;
    inputValidation: boolean;
    softDeletes: boolean;
    auditLogging: boolean;
    activityLogEntries: number;
  };
  backup: {
    sftpConfigured: boolean;
    sftpHost: string | null;
    sftpPath: string;
    cronSchedule: string;
    supabasePlan: string;
    supabasePITR: boolean;
    supabaseRetention: string;
  };
  recentActivity: Array<{
    action: string;
    entity_type: string;
    entity_name: string | null;
    user_id: string;
    created_at: string;
  }>;
};

export type EmailData = {
  config: { resendConfigured: boolean; fromEmail: string };
  emailTypes: Array<{ type: string; label: string; trigger: string; sent: number }>;
  recentEmails: Array<{ email_type: string; wedding_id: string; sent_at: string }>;
  totalSent: number;
  pushConfig: { configured: boolean; subscriptionCount: number };
  smsConfig: { configured: boolean; fromNumber: string | null };
  trackingConfig: { configured: boolean; totalEvents: number };
  notificationStats: { total: number; unread: number; byType: Record<string, number> };
};

export type AnalyticsData = {
  dailySignups: { date: string; count: number }[];
  weeklyActive: { week: string; count: number }[];
  funnel: { signedUp: number; startedOnboarding: number; completedOnboarding: number; addedFirstVendor: number; addedFirstGuest: number };
  featureAdoption: { feature: string; count: number }[];
};

export type Tab = "overview" | "subscribers" | "settings" | "data-security" | "cron-jobs" | "email";
