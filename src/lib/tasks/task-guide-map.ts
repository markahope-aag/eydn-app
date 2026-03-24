/**
 * Maps task titles to their related planning guide slugs.
 * Used to show "We have a guide for this" links on tasks.
 */
export const TASK_GUIDE_MAP: Record<string, { slug: string; label: string }> = {
  "Create Guest List Draft": { slug: "guest-list", label: "Guest List Guide" },
  "Choose Wedding Colors/Theme": { slug: "colors-theme", label: "Colors & Theme Guide" },
  "Book Florist": { slug: "florist", label: "Florist Guide" },
  "Plan Flowers and Centerpieces": { slug: "florist", label: "Florist Guide" },
  "Book Rentals": { slug: "rentals", label: "Rentals Guide" },
  "Buy Wedding Dress": { slug: "wedding-dress", label: "Wedding Dress Guide" },
  "Schedule Dress Fittings": { slug: "wedding-dress", label: "Wedding Dress Guide" },
  "Final Dress Fitting": { slug: "wedding-dress", label: "Wedding Dress Guide" },
  "Book Hair Stylist": { slug: "hair-makeup", label: "Hair & Makeup Guide" },
  "Book Makeup Artist": { slug: "hair-makeup", label: "Hair & Makeup Guide" },
  "Schedule Hair and Makeup Trial": { slug: "hair-makeup", label: "Hair & Makeup Guide" },
  "Start Decor Planning": { slug: "decor", label: "Decor Guide" },
  "Finalize Decor Details": { slug: "decor", label: "Decor Guide" },
  "Book DJ or Band": { slug: "music", label: "Music Guide" },
  "Choose Ceremony Music": { slug: "music", label: "Music Guide" },
  "Plan Speeches": { slug: "speeches", label: "Speeches Guide" },
  "Get Wedding Insurance": { slug: "insurance", label: "Insurance Guide" },
};
