export type BudgetLineItem = {
  category: string;
  description: string;
};

export const BUDGET_TEMPLATE: BudgetLineItem[] = [
  // Ceremony & Venue
  { category: "Ceremony & Venue", description: "Venue Rentals" },
  { category: "Ceremony & Venue", description: "Officiant Fee" },
  { category: "Ceremony & Venue", description: "Marriage License" },
  { category: "Ceremony & Venue", description: "Wedding Insurance" },

  // Music & Entertainment
  { category: "Music & Entertainment", description: "Wedding DJ" },
  { category: "Music & Entertainment", description: "Musician" },
  { category: "Music & Entertainment", description: "Artist / Performer" },

  // Food & Beverage
  { category: "Food & Beverage", description: "Caterer" },
  { category: "Food & Beverage", description: "Bar" },
  { category: "Food & Beverage", description: "Dessert" },
  { category: "Food & Beverage", description: "Cake Cutting Fee" },

  // Florals & Decor
  { category: "Florals & Decor", description: "Flowers" },

  // Photography & Video
  { category: "Photography & Video", description: "Photographer" },
  { category: "Photography & Video", description: "Videographer" },
  { category: "Photography & Video", description: "Engagement Pictures" },

  // Attire & Beauty
  { category: "Attire & Beauty", description: "Dress" },
  { category: "Attire & Beauty", description: "Alterations" },
  { category: "Attire & Beauty", description: "Hair" },
  { category: "Attire & Beauty", description: "Makeup" },

  // Jewelry
  { category: "Jewelry", description: "Ring" },

  // Stationery & Postage
  { category: "Stationery & Postage", description: "Invites" },
  { category: "Stationery & Postage", description: "Postage" },

  // Gifts & Favors
  { category: "Gifts & Favors", description: "Guest Favors" },
  { category: "Gifts & Favors", description: "Wedding Party Gifts" },
  { category: "Gifts & Favors", description: "Transportation / Shuttle" },
  { category: "Gifts & Favors", description: "Guest Hotel Room Block" },

  // Coordinator
  { category: "Coordinator", description: "Coordinator" },

  // Rehearsal
  { category: "Rehearsal", description: "Rehearsal" },
  { category: "Rehearsal", description: "Rehearsal Dinner" },
  { category: "Rehearsal", description: "Rehearsal Bar" },

  // Honeymoon
  { category: "Honeymoon", description: "Flights" },
  { category: "Honeymoon", description: "Car Rental" },
  { category: "Honeymoon", description: "Hotels" },
  { category: "Honeymoon", description: "Food" },
  { category: "Honeymoon", description: "Excursions" },

  // Miscellaneous
  { category: "Miscellaneous", description: "Tips" },
];

export const BUDGET_CATEGORIES = [
  ...new Set(BUDGET_TEMPLATE.map((item) => item.category)),
];

/**
 * Recommended budget allocation percentages by category.
 * Based on standard wedding industry guidelines — percentages sum to 100.
 */
export const BUDGET_ALLOCATIONS: Record<string, number> = {
  "Ceremony & Venue": 30,
  "Food & Beverage": 25,
  "Photography & Video": 10,
  "Music & Entertainment": 7,
  "Florals & Decor": 8,
  "Attire & Beauty": 5,
  "Coordinator": 3,
  "Stationery & Postage": 2,
  "Gifts & Favors": 3,
  "Jewelry": 1,
  "Rehearsal": 3,
  "Honeymoon": 2,
  "Miscellaneous": 1,
};
