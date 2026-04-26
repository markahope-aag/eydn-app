export const VENDOR_CATEGORIES = [
  "Venue",
  "Caterer",
  "Bar Service",
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
  "Attire",
  "Stationery",
  "Jewelry",
  "Photo Booth",
  "Lighting & A/V",
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

/** Display-friendly labels for categories that are awkward in the DB form. */
export const CATEGORY_DISPLAY: Partial<Record<VendorCategory, string>> = {
  "Cake/Dessert Baker": "Cake & Desserts",
  "DJ or Band": "DJ / Band",
  "Wedding Planner / Day-of Coordinator": "Planner / Coordinator",
  "Lighting & A/V": "Lighting / A-V",
};

/** Get the display label for a category, falling back to the raw value. */
export function categoryLabel(cat: string): string {
  return (CATEGORY_DISPLAY as Record<string, string>)[cat] || cat;
}
