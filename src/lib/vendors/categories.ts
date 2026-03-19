export const VENDOR_CATEGORIES = [
  "Venue",
  "Caterer",
  "Photographer",
  "Videographer",
  "DJ or Band",
  "Officiant",
  "Florist",
  "Cake/Dessert Baker",
  "Hair Stylist",
  "Makeup Artist",
  "Rentals",
  "Wedding Planner / Day-of Coordinator",
  "Transportation",
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export const VENDOR_STATUSES = [
  { value: "searching", label: "Searching" },
  { value: "contacted", label: "Contacted" },
  { value: "quote_received", label: "Quote Received" },
  { value: "booked", label: "Booked" },
  { value: "deposit_paid", label: "Deposit Paid" },
  { value: "paid_in_full", label: "Paid in Full" },
] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number]["value"];
