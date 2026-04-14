export type Guest = {
  id: string;
  name: string;
  email: string | null;
  rsvp_status: "not_invited" | "invite_sent" | "pending" | "accepted" | "declined";
  meal_preference: string | null;
  role: string | null;
  plus_one: boolean;
  plus_one_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  group_name: string | null;
};

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ROLES = ["family", "friend", "wedding_party", "coworker", "plus_one", "other"] as const;

export const ROLE_LABELS: Record<string, string> = {
  family: "Family",
  friend: "Friend",
  wedding_party: "Wedding Party",
  coworker: "Coworker",
  plus_one: "Plus One",
  other: "Other",
};

export const STATUS_LABELS: Record<string, string> = {
  not_invited: "Save for Later",
  invite_sent: "Invite Sent",
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

export const STATUS_BADGE: Record<string, string> = {
  not_invited: "bg-lavender text-muted",
  invite_sent: "badge-pending",
  pending: "badge-pending",
  accepted: "badge-confirmed",
  declined: "badge-declined",
};
