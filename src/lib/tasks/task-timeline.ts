export type TimelinePhase =
  | "12 Months Before"
  | "9-12 Months Before"
  | "6-9 Months Before"
  | "4-6 Months Before"
  | "3-4 Months Before"
  | "1-2 Months Before"
  | "1 Week Before"
  | "After the Wedding";

export type TaskDefinition = {
  title: string;
  category: string;
  phase: TimelinePhase;
  monthsBefore: number; // used to calculate due_date
  edynMessage: string;
  notes?: string;
  subTasks?: { title: string; monthsBefore: number; edynMessage?: string }[];
  conditional?: "has_honeymoon" | "has_pre_wedding_events" | "has_wedding_party";
  /** Link to a planning guide that helps with this task */
  guideSlug?: string;
};

export const TASK_TIMELINE: TaskDefinition[] = [
  // === 12 Months Before ===
  {
    title: "Set Budget",
    category: "Budget",
    phase: "12 Months Before",
    monthsBefore: 12,
    edynMessage: "Let's start with the not-so-fun stuff…! Before anything is booked, we need a budget. Breaking out your total wedding budget into categories helps us keep track and stay in control without any stress!",
  },
  {
    title: "Choose Wedding Date",
    category: "Planning",
    phase: "12 Months Before",
    monthsBefore: 12,
    edynMessage: "Pick the big day! Keep in mind the date may change if you fall in love with a venue that might not have it available.",
  },
  {
    title: "Create Guest List Draft",
    category: "Guests",
    phase: "12 Months Before",
    monthsBefore: 12,
    edynMessage: "Time to think about your VIPs! Start with a draft guest list—family, friends, plus-ones. You can always tweak it later.",
    guideSlug: "guest-list",
  },
  {
    title: "Choose Wedding Party",
    category: "Wedding Party",
    phase: "12 Months Before",
    monthsBefore: 12,
    edynMessage: "Who's going to stand by your side and cheer you on? Make a list of your bridesmaids, groomsmen, maid of honor, best man, ring bearer, and flower girl.",
    conditional: "has_wedding_party",
  },
  {
    title: "Create Wedding Website",
    category: "Planning",
    phase: "12 Months Before",
    monthsBefore: 12,
    edynMessage: "Let's go digital! Share your wedding date, location, and schedule. Add RSVP options and your registry so guests have everything at their fingertips.",
    subTasks: [
      { title: "Add travel info, registry, schedule", monthsBefore: 9, edynMessage: "Make life easy for your guests! Include hotel info, shuttle options, and the wedding day itinerary." },
      { title: "Build registry", monthsBefore: 10, edynMessage: "Pick your dream gifts! Include a mix of price points and online options." },
    ],
  },
  {
    title: "Book Venue",
    category: "Venue",
    phase: "12 Months Before",
    monthsBefore: 12,
    edynMessage: "Time to find your perfect backdrop! Visit venues, compare what's included, and lock it down with a deposit.",
  },
  {
    title: "Book Photographer",
    category: "Photography",
    phase: "12 Months Before",
    monthsBefore: 12,
    edynMessage: "Capture every kiss and dance move! Pick someone whose style you love, and consider an engagement session.",
  },
  {
    title: "Book Videographer",
    category: "Photography",
    phase: "12 Months Before",
    monthsBefore: 12,
    edynMessage: "Capture every moment on film! Pick someone whose style you love.",
  },
  {
    title: "Book Caterer",
    category: "Catering",
    phase: "12 Months Before",
    monthsBefore: 12,
    edynMessage: "Food = happiness! Taste test menus, discuss dietary needs, and pick your service style: buffet, plated, or family-style.",
  },
  {
    title: "Book DJ or Band",
    category: "Music",
    phase: "12 Months Before",
    monthsBefore: 12,
    edynMessage: "Time to get grooving! Choose music you love and chat about the vibe you want all night.",
    guideSlug: "music",
  },
  {
    title: "Book Officiant",
    category: "Officiant",
    phase: "12 Months Before",
    monthsBefore: 12,
    edynMessage: "Who's going to make it official? Meet, chat about the ceremony, and confirm the legal stuff.",
  },

  // === 9-12 Months Before ===
  {
    title: "Decide on Honeymoon Destination",
    category: "Honeymoon",
    phase: "9-12 Months Before",
    monthsBefore: 10,
    edynMessage: "Time to dream about your getaway! Start researching destinations and book early for the best deals.",
    conditional: "has_honeymoon",
    subTasks: [
      { title: "Book flights, hotels, and activities", monthsBefore: 9 },
      { title: "Pack and finalize itinerary", monthsBefore: 2 },
    ],
  },
  {
    title: "Choose Wedding Colors/Theme",
    category: "Planning",
    phase: "9-12 Months Before",
    monthsBefore: 10,
    edynMessage: "Tie everything together with colors and theme—attire, flowers, invitations, and decor.",
    guideSlug: "colors-theme",
  },
  {
    title: "Book Florist",
    category: "Flowers",
    phase: "9-12 Months Before",
    monthsBefore: 10,
    edynMessage: "Flowers make everything magical. Pick bouquets, centerpieces, and ceremony decor that match your style.",
    guideSlug: "florist",
    subTasks: [
      { title: "Confirm quantity, style, and placement", monthsBefore: 4 },
    ],
  },
  {
    title: "Book Rentals",
    category: "Rentals",
    phase: "9-12 Months Before",
    monthsBefore: 10,
    edynMessage: "Tables, chairs, linens, lighting…oh my! Make sure everything is reserved before it's gone.",
    guideSlug: "rentals",
  },
  {
    title: "Buy Wedding Dress",
    category: "Attire",
    phase: "9-12 Months Before",
    monthsBefore: 10,
    edynMessage: "Time to find the one! Shop early, try lots of styles, and schedule fittings so your dress is perfect.",
    guideSlug: "wedding-dress",
  },
  {
    title: "Book Hair Stylist",
    category: "Beauty",
    phase: "9-12 Months Before",
    monthsBefore: 10,
    edynMessage: "Time to glam up! Book your stylist and show them your inspo pics.",
    guideSlug: "hair-makeup",
  },
  {
    title: "Book Makeup Artist",
    category: "Beauty",
    phase: "9-12 Months Before",
    monthsBefore: 10,
    edynMessage: "Time to glam up! Book your makeup artist and show them your inspo pics.",
    guideSlug: "hair-makeup",
  },
  {
    title: "Book Transportation",
    category: "Transportation",
    phase: "9-12 Months Before",
    monthsBefore: 9,
    edynMessage: "Need a limo, shuttle, or party bus? Schedule rides for you and your guests so everyone arrives in style.",
  },
  {
    title: "Book Cake/Dessert Baker",
    category: "Catering",
    phase: "9-12 Months Before",
    monthsBefore: 9,
    edynMessage: "Sweet treats incoming! Taste, pick your design, and confirm delivery day and servings.",
  },
  {
    title: "Take Engagement Photos",
    category: "Photography",
    phase: "9-12 Months Before",
    monthsBefore: 9,
    edynMessage: "Smile! Engagement photos are a great way to practice and create memories.",
  },

  // === 6-9 Months Before ===
  {
    title: "Order Bridesmaid Dresses",
    category: "Attire",
    phase: "6-9 Months Before",
    monthsBefore: 8,
    edynMessage: "Coordinate your crew! Pick colors and sizes, and schedule fittings if needed.",
    conditional: "has_wedding_party",
  },
  {
    title: "Order Groomsmen Suits/Tuxes",
    category: "Attire",
    phase: "6-9 Months Before",
    monthsBefore: 8,
    edynMessage: "Get the groomsmen suited up! Order early so there's time for alterations.",
    conditional: "has_wedding_party",
  },
  {
    title: "Plan Ceremony Outline",
    category: "Planning",
    phase: "6-9 Months Before",
    monthsBefore: 7,
    edynMessage: "Map out your ceremony—processional, readings, vows, unity moments, and recessional.",
  },
  {
    title: "Plan Reception Timeline",
    category: "Planning",
    phase: "6-9 Months Before",
    monthsBefore: 7,
    edynMessage: "Keep the party flowing! Outline entrances, speeches, first dance, dinner, cake cutting, and dancing.",
  },
  {
    title: "Start Decor Planning",
    category: "Decorations",
    phase: "6-9 Months Before",
    monthsBefore: 7,
    edynMessage: "Lighting, signage, tables, and fun touches. Make it your dream aesthetic!",
    guideSlug: "decor",
  },
  {
    title: "Plan Flowers and Centerpieces",
    category: "Flowers",
    phase: "6-9 Months Before",
    monthsBefore: 7,
    edynMessage: "Work with your florist to finalize bouquets, boutonnieres, and centerpiece designs.",
    guideSlug: "florist",
  },
  {
    title: "Send Save-the-Dates",
    category: "Invitations",
    phase: "6-9 Months Before",
    monthsBefore: 7,
    edynMessage: "Give your guests plenty of notice! Track RSVPs to keep everything organized.",
    subTasks: [
      { title: "Design save-the-dates", monthsBefore: 8 },
      { title: "Order save-the-dates", monthsBefore: 7, edynMessage: "Time to spread the news!" },
      { title: "Address & mail save-the-dates", monthsBefore: 7, edynMessage: "Let's get these ready to send!" },
    ],
  },

  // === 4-6 Months Before ===
  {
    title: "Buy Wedding Rings",
    category: "Attire",
    phase: "4-6 Months Before",
    monthsBefore: 5,
    edynMessage: "Forever starts here. Time to pick the rings you'll wear every day.",
  },
  {
    title: "Schedule Dress Fittings",
    category: "Attire",
    phase: "4-6 Months Before",
    monthsBefore: 5,
    edynMessage: "Check hem, bust, and sleeves. Don't forget shoes and accessories!",
  },
  {
    title: "Choose Ceremony Music",
    category: "Music",
    phase: "4-6 Months Before",
    monthsBefore: 5,
    edynMessage: "Pick meaningful songs for processional, recessional, and your first dance!",
    guideSlug: "music",
  },
  {
    title: "Book Rehearsal Dinner Location",
    category: "Venue",
    phase: "4-6 Months Before",
    monthsBefore: 5,
    edynMessage: "Plan a fun night with close friends and family. Pick a spot and get those invites out!",
  },
  {
    title: "Get Wedding Insurance",
    category: "Planning",
    phase: "4-6 Months Before",
    monthsBefore: 5,
    edynMessage: "Quick but important: Ensure wedding insurance for peace of mind.",
    guideSlug: "insurance",
  },
  {
    title: "Order Invitations",
    category: "Invitations",
    phase: "4-6 Months Before",
    monthsBefore: 5,
    edynMessage: "It's invitation time! Choose a design and get them ordered.",
  },

  // === 3-4 Months Before ===
  {
    title: "Mail Invitations",
    category: "Invitations",
    phase: "3-4 Months Before",
    monthsBefore: 3,
    edynMessage: "Let the invites fly! Mail your wedding invitations to guests.",
  },
  {
    title: "Schedule Hair and Makeup Trial",
    category: "Beauty",
    phase: "3-4 Months Before",
    monthsBefore: 3,
    edynMessage: "Book your beauty trial. Test your wedding-day hair and makeup look.",
    guideSlug: "hair-makeup",
  },
  {
    title: "Plan Seating Chart Draft",
    category: "Guests",
    phase: "3-4 Months Before",
    monthsBefore: 3,
    edynMessage: "Start your seating chart draft. It'll make the final version much easier.",
  },
  {
    title: "Plan Speeches",
    category: "Planning",
    phase: "3-4 Months Before",
    monthsBefore: 3,
    edynMessage: "Who's dropping the mic? Coordinate speeches with your wedding party.",
    guideSlug: "speeches",
  },
  {
    title: "Plan Favors",
    category: "Decorations",
    phase: "3-4 Months Before",
    monthsBefore: 3,
    edynMessage: "Any special guest favors? Keep it fun and memorable.",
  },
  {
    title: "Finalize Menu with Caterer",
    category: "Catering",
    phase: "3-4 Months Before",
    monthsBefore: 3,
    edynMessage: "Lock in food and drink with a finalized menu. Don't forget dietary restrictions.",
  },
  {
    title: "Finalize Decor Details",
    category: "Decorations",
    phase: "3-4 Months Before",
    monthsBefore: 3,
    edynMessage: "Double-check flowers, signage, and all decor details.",
  },

  // === 1-2 Months Before ===
  {
    title: "Have Bachelor/Bachelorette Party",
    category: "Events",
    phase: "1-2 Months Before",
    monthsBefore: 2,
    edynMessage: "One last celebration before 'I do'! Time for the bachelor/bachelorette party.",
    conditional: "has_pre_wedding_events",
  },
  {
    title: "Final Dress Fitting",
    category: "Attire",
    phase: "1-2 Months Before",
    monthsBefore: 2,
    edynMessage: "Final dress fitting time. Make sure everything fits perfectly.",
  },
  {
    title: "Finalize Seating Chart",
    category: "Guests",
    phase: "1-2 Months Before",
    monthsBefore: 1,
    edynMessage: "Finalize the seating chart. Everyone needs their perfect spot.",
  },
  {
    title: "Create Day-of Timeline",
    category: "Planning",
    phase: "1-2 Months Before",
    monthsBefore: 1,
    edynMessage: "Plan your wedding day timeline. Keep everything running smoothly. I have the draft, just need your guidance for some final touches.",
  },
  {
    title: "Create Place Cards",
    category: "Decorations",
    phase: "1-2 Months Before",
    monthsBefore: 1,
    edynMessage: "Create place cards so guests can easily find their seats.",
  },
  {
    title: "Final Guest Count",
    category: "Guests",
    phase: "1-2 Months Before",
    monthsBefore: 1,
    edynMessage: "Confirm numbers for catering, rentals, and venue. Easy peasy!",
  },
  {
    title: "Confirm All Vendors",
    category: "Vendors",
    phase: "1-2 Months Before",
    monthsBefore: 1,
    edynMessage: "Quick vendor check. Confirm everyone is ready for the big day.",
  },
  {
    title: "Pay Remaining Vendor Balances",
    category: "Budget",
    phase: "1-2 Months Before",
    monthsBefore: 1,
    edynMessage: "Time to wrap up vendor payments. Check off remaining balances.",
  },
  {
    title: "Apply for Marriage License",
    category: "Planning",
    phase: "1-2 Months Before",
    monthsBefore: 1,
    edynMessage: "Don't forget the paperwork! Apply for your marriage license (rules vary by state).",
  },

  // === 1 Week Before ===
  {
    title: "Compile Cash Tips for Vendors",
    category: "Budget",
    phase: "1 Week Before",
    monthsBefore: 0.25,
    edynMessage: "Preparing vendor tips? Gather any cash tips if you plan to give them.",
  },
  {
    title: "Pack Decor and Items for Venue",
    category: "Decorations",
    phase: "1 Week Before",
    monthsBefore: 0.25,
    edynMessage: "Pack up decor and important items. Ready for the venue!",
  },
  {
    title: "Pick Up Attire",
    category: "Attire",
    phase: "1 Week Before",
    monthsBefore: 0.25,
    edynMessage: "Pick up wedding attire. Make sure everything is ready.",
  },
  {
    title: "Rehearsal",
    category: "Events",
    phase: "1 Week Before",
    monthsBefore: 0.25,
    edynMessage: "Wedding rehearsal time. Practice makes perfect!",
  },
  {
    title: "Rehearsal Dinner",
    category: "Events",
    phase: "1 Week Before",
    monthsBefore: 0.25,
    edynMessage: "Celebrate with your closest people. It's rehearsal dinner night!",
  },
  {
    title: "Send Timeline to Vendors and Wedding Party",
    category: "Planning",
    phase: "1 Week Before",
    monthsBefore: 0.25,
    edynMessage: "Share the day-of timeline. Make sure everyone knows the plan.",
  },

  // === After the Wedding ===
  {
    title: "Send Thank You Cards",
    category: "Planning",
    phase: "After the Wedding",
    monthsBefore: -0.25,
    edynMessage: "Show the love. Send thank-you cards to your guests.",
  },
  {
    title: "Name Change",
    category: "Planning",
    phase: "After the Wedding",
    monthsBefore: -1,
    edynMessage: "Ready for the next chapter? Start your name change process.",
  },
];
