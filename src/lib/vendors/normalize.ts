import { VENDOR_CATEGORIES } from "./categories";

// ─── Category Normalization ──────────────────────────────────────────────────

/** Map of common variations → canonical category name */
const CATEGORY_ALIASES: Record<string, string> = {
  // Photographer
  "photography": "Photographer",
  "photographer": "Photographer",
  "photographers": "Photographer",
  "photo": "Photographer",
  "wedding photographer": "Photographer",
  "wedding photography": "Photographer",
  "photo/video": "Photographer",

  // Videographer
  "videography": "Videographer",
  "videographer": "Videographer",
  "videographers": "Videographer",
  "video": "Videographer",
  "wedding videographer": "Videographer",
  "wedding videography": "Videographer",
  "cinematographer": "Videographer",
  "cinematography": "Videographer",

  // Venue
  "venue": "Venue",
  "venues": "Venue",
  "wedding venue": "Venue",
  "reception venue": "Venue",
  "ceremony venue": "Venue",
  "event venue": "Venue",
  "event space": "Venue",
  "banquet hall": "Venue",

  // Caterer
  "catering": "Caterer",
  "caterer": "Caterer",
  "caterers": "Caterer",
  "wedding caterer": "Caterer",
  "wedding catering": "Caterer",
  "food": "Caterer",
  "food & beverage": "Caterer",
  "food and beverage": "Caterer",

  // DJ or Band
  "dj": "DJ or Band",
  "band": "DJ or Band",
  "dj or band": "DJ or Band",
  "music": "DJ or Band",
  "entertainment": "DJ or Band",
  "live music": "DJ or Band",
  "wedding dj": "DJ or Band",
  "wedding band": "DJ or Band",
  "musician": "DJ or Band",
  "musicians": "DJ or Band",

  // Officiant
  "officiant": "Officiant",
  "officiants": "Officiant",
  "wedding officiant": "Officiant",
  "minister": "Officiant",
  "celebrant": "Officiant",

  // Florist
  "florist": "Florist",
  "florists": "Florist",
  "flowers": "Florist",
  "floral": "Florist",
  "florals": "Florist",
  "wedding florist": "Florist",
  "floral design": "Florist",
  "floral designer": "Florist",

  // Cake/Dessert Baker
  "baker": "Cake/Dessert Baker",
  "bakery": "Cake/Dessert Baker",
  "cake": "Cake/Dessert Baker",
  "cakes": "Cake/Dessert Baker",
  "dessert": "Cake/Dessert Baker",
  "desserts": "Cake/Dessert Baker",
  "cake/dessert baker": "Cake/Dessert Baker",
  "cake baker": "Cake/Dessert Baker",
  "wedding cake": "Cake/Dessert Baker",
  "wedding cake bakery": "Cake/Dessert Baker",
  "wedding bakery": "Cake/Dessert Baker",

  // Hair Stylist
  "hair": "Hair Stylist",
  "hair stylist": "Hair Stylist",
  "hairstylist": "Hair Stylist",
  "hair stylists": "Hair Stylist",
  "wedding hair": "Hair Stylist",
  "hair salon": "Hair Stylist",
  "hair salon wedding": "Hair Stylist",
  "wedding hair salon": "Hair Stylist",
  "salon": "Hair Stylist",

  // Makeup Artist
  "makeup": "Makeup Artist",
  "makeup artist": "Makeup Artist",
  "mua": "Makeup Artist",
  "makeup artists": "Makeup Artist",
  "wedding makeup": "Makeup Artist",
  "beauty": "Makeup Artist",

  // Rentals
  "rentals": "Rentals",
  "rental": "Rentals",
  "event rentals": "Rentals",
  "party rentals": "Rentals",
  "wedding rentals": "Rentals",
  "equipment": "Rentals",
  "furniture rental": "Rentals",
  "tent rental": "Rentals",

  // Wedding Planner / Day-of Coordinator
  "planner": "Wedding Planner / Day-of Coordinator",
  "coordinator": "Wedding Planner / Day-of Coordinator",
  "wedding planner": "Wedding Planner / Day-of Coordinator",
  "wedding coordinator": "Wedding Planner / Day-of Coordinator",
  "day-of coordinator": "Wedding Planner / Day-of Coordinator",
  "day of coordinator": "Wedding Planner / Day-of Coordinator",
  "event planner": "Wedding Planner / Day-of Coordinator",
  "planning": "Wedding Planner / Day-of Coordinator",
  "wedding planner / day-of coordinator": "Wedding Planner / Day-of Coordinator",

  // Transportation
  "transportation": "Transportation",
  "transport": "Transportation",
  "limo": "Transportation",
  "shuttle": "Transportation",
  "car service": "Transportation",
  "wedding transportation": "Transportation",
};

/** Normalize a category string to a canonical VENDOR_CATEGORIES value, or null if unrecognized */
export function normalizeCategory(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Exact match against canonical list (case-insensitive)
  const exactMatch = VENDOR_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // Check alias map
  const alias = CATEGORY_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  // Partial match — if the input contains a canonical category name
  const partialMatch = VENDOR_CATEGORIES.find(
    (c) => trimmed.toLowerCase().includes(c.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  // No match — return the original trimmed value so the admin can review
  return trimmed;
}

// ─── State Normalization ─────────────────────────────────────────────────────

const STATE_NAMES_TO_ABBR: Record<string, string> = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
  "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
  "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
  "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
  "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
  "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
  "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
  "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
  "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC",
};

const VALID_ABBRS = new Set(Object.values(STATE_NAMES_TO_ABBR));

/** Normalize state to 2-letter abbreviation. Returns null if unrecognized. */
export function normalizeState(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Already a valid 2-letter abbreviation
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && VALID_ABBRS.has(upper)) return upper;

  // Full state name
  const fromName = STATE_NAMES_TO_ABBR[trimmed.toLowerCase()];
  if (fromName) return fromName;

  return null;
}

// ─── City Normalization ──────────────────────────────────────────────────────

/** Title-case a city name. Handles "new york" → "New York", "SAN FRANCISCO" → "San Francisco" */
export function normalizeCity(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  return trimmed
    .toLowerCase()
    .replace(/(?:^|\s|-)\S/g, (match) => match.toUpperCase());
}

// ─── Phone Normalization ─────────────────────────────────────────────────────

/** Normalize US phone number to (XXX) XXX-XXXX format. Returns original if not a 10-digit US number. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  // Strip everything except digits
  const digits = trimmed.replace(/\D/g, "");

  // Handle +1 prefix
  const normalized = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;

  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }

  // Not a standard US number — return trimmed original
  return trimmed;
}

// ─── Website Normalization ───────────────────────────────────────────────────

/** Ensure website has a protocol. Lowercases the domain. */
export function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  // Already has protocol
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Add https://
  return `https://${trimmed}`;
}

// ─── Price Range Normalization ───────────────────────────────────────────────

const PRICE_RANGE_ALIASES: Record<string, string> = {
  "1": "$", "budget": "$", "low": "$", "affordable": "$",
  "2": "$$", "moderate": "$$", "mid": "$$", "medium": "$$", "mid-range": "$$",
  "3": "$$$", "high": "$$$", "premium": "$$$", "high-end": "$$$",
  "4": "$$$$", "luxury": "$$$$", "ultra": "$$$$",
  "$": "$", "$$": "$$", "$$$": "$$$", "$$$$": "$$$$",
};

/** Normalize price range to $/$$/$$$/$$$$. Returns null if unrecognized. */
export function normalizePriceRange(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  return PRICE_RANGE_ALIASES[trimmed] || null;
}

// ─── Email Normalization ─────────────────────────────────────────────────────

/** Lowercase and trim email. Returns null if obviously invalid. */
export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  // Basic check — has @ and a dot after @
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}
