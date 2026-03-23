import type { GuideDefinition } from "@/lib/guides/types";

const rentals: GuideDefinition = {
  slug: "rentals",
  title: "Rentals",
  subtitle:
    "Tables, chairs, linens, glassware, dance floors — rental logistics can get complicated fast. This questionnaire helps eydn build a complete rentals list with quantities so you can get accurate quotes and avoid the stress of forgotten items.",
  icon: "chair",
  integrations: ["vendor-brief", "chat-context"],
  outcome:
    "Builds a detailed rentals checklist with quantities based on your guest count and selections. Flags any items your venue already provides so you don't accidentally pay for them twice.",
  sections: [
    {
      title: "Basics",
      questions: [
        {
          id: "q1",
          label: "Does your venue provide tables and chairs?",
          field: {
            kind: "select",
            options: [
              { value: "yes-all", label: "Yes — all of them" },
              { value: "some", label: "Some" },
              { value: "no", label: "No" },
            ],
          },
        },
        {
          id: "q2",
          label: "What is your total rentals budget?",
          field: { kind: "number", min: 0, placeholder: "Budget", unit: "$" },
          required: true,
        },
        {
          id: "q3",
          label: "How many guests are you expecting?",
          field: {
            kind: "number",
            min: 0,
            placeholder: "Guest count",
          },
          tip: "Pulls from guest list if completed.",
          pullFrom: { guide: "guest-list", questionId: "q13" },
        },
        {
          id: "q4",
          label: "Do you have a rental company in mind already?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "getting-quotes", label: "Getting quotes" },
            ],
          },
        },
      ],
    },
    {
      title: "Seating",
      questions: [
        {
          id: "q5",
          label: "How many guest tables do you need?",
          field: { kind: "number", min: 0, placeholder: "Number of tables" },
        },
        {
          id: "q6",
          label: "What table shape do you prefer?",
          field: {
            kind: "select",
            options: [
              { value: "round", label: "Round" },
              { value: "long", label: "Long" },
              { value: "mix", label: "Mix" },
              { value: "venue-decides", label: "Venue decides" },
            ],
          },
        },
        {
          id: "q7",
          label: "How many chairs do you need?",
          field: { kind: "number", min: 0, placeholder: "Number of chairs" },
          tip: "Auto-calculated from guest count — editable.",
        },
        {
          id: "q8",
          label: "What chair style are you drawn to?",
          field: {
            kind: "select",
            options: [
              { value: "chiavari", label: "Chiavari" },
              { value: "cross-back", label: "Cross-back" },
              { value: "folding", label: "Folding" },
              { value: "ghost", label: "Ghost" },
              { value: "venue-standard", label: "Venue standard" },
              { value: "not-sure", label: "Not sure" },
            ],
          },
        },
      ],
    },
    {
      title: "Linens",
      questions: [
        {
          id: "q9",
          label: "Do you need tablecloths?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "venue-provides", label: "Venue provides" },
            ],
          },
        },
        {
          id: "q10",
          label: "Do you need napkins?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "venue-provides", label: "Venue provides" },
            ],
          },
        },
        {
          id: "q11",
          label: "Any other linens?",
          field: {
            kind: "textarea",
            placeholder: "Runners, overlays, charger cloths (optional)",
            rows: 2,
          },
        },
      ],
    },
    {
      title: "Tabletop",
      questions: [
        {
          id: "q12",
          label: "Do you need place settings — plates, cutlery?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "venue-provides", label: "Venue provides" },
            ],
          },
        },
        {
          id: "q13",
          label: "Do you need glassware?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "venue-provides", label: "Venue provides" },
            ],
          },
        },
        {
          id: "q14",
          label: "Any specialty tabletop items?",
          field: {
            kind: "multi-select",
            options: [
              { value: "charger-plates", label: "Charger plates" },
              {
                value: "candlesticks-holders",
                label: "Candlesticks or candle holders",
              },
              { value: "bud-vases", label: "Bud vases" },
              { value: "cake-stand", label: "Cake stand" },
              { value: "menu-card-holders", label: "Menu card holders" },
              { value: "none", label: "None" },
            ],
          },
        },
      ],
    },
    {
      title: "Extras",
      questions: [
        {
          id: "q15",
          label:
            "Do you need any furniture beyond dining tables and chairs?",
          field: {
            kind: "multi-select",
            options: [
              { value: "lounge-seating", label: "Lounge seating" },
              { value: "bar-tables-high-tops", label: "Bar tables or high tops" },
              { value: "cake-table", label: "Cake table" },
              { value: "gift-table", label: "Gift table" },
              { value: "welcome-table", label: "Welcome table" },
              { value: "dj-band-table", label: "DJ or band table" },
              { value: "none", label: "None" },
            ],
          },
        },
        {
          id: "q16",
          label: "Do you need a dance floor?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "venue-has-one", label: "Venue has one" },
            ],
          },
        },
        {
          id: "q17",
          label: "Do you need a tent or canopy?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not-sure", label: "Not sure — depends on weather plan" },
            ],
          },
        },
        {
          id: "q18",
          label: "Any lighting rentals?",
          field: {
            kind: "multi-select",
            options: [
              { value: "string-lights", label: "String lights" },
              { value: "uplighting", label: "Uplighting" },
              { value: "lanterns", label: "Lanterns" },
              { value: "chandeliers-pendants", label: "Chandeliers or pendants" },
              { value: "pin-spotting", label: "Pin spotting" },
              { value: "none", label: "None" },
            ],
          },
        },
      ],
    },
  ],
};

export default rentals;
