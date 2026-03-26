import type { GuideDefinition } from "@/lib/guides/types";

const florist: GuideDefinition = {
  slug: "florist",
  title: "Florist Booking",
  subtitle:
    "Flowers touch almost every part of your day — ceremony, portraits, reception, and cake. This questionnaire helps Eydn build a complete florist brief so you can approach vendors with clarity and get accurate quotes from the start.",
  icon: "flower",
  integrations: ["vendor-brief", "chat-context"],
  outcome:
    "Generates a vendor brief you can copy or send directly. If you haven't completed the Colors & Theme questionnaire, Eydn will prompt you to do so for more accurate style matching.",
  sections: [
    {
      title: "Basics",
      questions: [
        {
          id: "q1",
          label: "What is your total florist budget?",
          field: { kind: "number", min: 0, placeholder: "Budget", unit: "$" },
          required: true,
        },
        {
          id: "q2",
          label: "Do you have a preferred florist already in mind?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "considering", label: "Considering a few" },
            ],
          },
        },
        {
          id: "q3",
          label: "Is your ceremony indoors or outdoors?",
          field: {
            kind: "select",
            options: [
              { value: "indoors", label: "Indoors" },
              { value: "outdoors", label: "Outdoors" },
              {
                value: "mix",
                label: "Mix — ceremony outdoors, reception indoors",
              },
              { value: "not-confirmed", label: "Not confirmed yet" },
            ],
          },
          tip: "Outdoor ceremonies affect flower choice — some blooms wilt quickly in heat or direct sun. Eydn will flag this when suggesting arrangements.",
        },
      ],
    },
    {
      title: "Ceremony",
      questions: [
        {
          id: "q4",
          label: "What ceremony florals do you need?",
          field: {
            kind: "multi-select",
            options: [
              { value: "arch-arbor", label: "Arch or arbor" },
              { value: "aisle-lining", label: "Aisle lining" },
              { value: "pew-chair-markers", label: "Pew or chair markers" },
              { value: "altar-arrangement", label: "Altar arrangement" },
              { value: "none", label: "None" },
            ],
          },
        },
        {
          id: "q5",
          label: "If you have an arch — how full do you want it?",
          field: {
            kind: "select",
            options: [
              { value: "minimal", label: "Minimal" },
              { value: "half-covered", label: "Half covered" },
              { value: "full", label: "Full" },
              { value: "no-arch", label: "No arch" },
            ],
          },
        },
      ],
    },
    {
      title: "Wedding Party",
      questions: [
        {
          id: "q6",
          label: "How many bouquets do you need?",
          field: {
            kind: "number",
            min: 0,
            placeholder: "Couple bouquet + attendants",
          },
        },
        {
          id: "q7",
          label: "How many boutonnieres do you need?",
          field: { kind: "number", min: 0, placeholder: "Number of boutonnieres" },
        },
        {
          id: "q8",
          label: "Do you need corsages?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ],
          },
        },
        {
          id: "q9",
          label: "What bouquet style are you drawn to?",
          field: {
            kind: "select",
            options: [
              { value: "tight-structured", label: "Tight and structured" },
              { value: "loose-wild", label: "Loose and wild" },
              { value: "minimal", label: "Minimal" },
              { value: "cascading", label: "Cascading" },
              { value: "florist-choice", label: "Florist's choice" },
            ],
          },
        },
      ],
    },
    {
      title: "Reception",
      questions: [
        {
          id: "q10",
          label: "How many guest tables do you have?",
          field: {
            kind: "number",
            min: 0,
            placeholder: "Number of guest tables",
          },
          tip: "Pulls from rentals questionnaire if completed.",
        },
        {
          id: "q11",
          label: "What centerpiece style do you want?",
          field: {
            kind: "select",
            options: [
              { value: "low-lush", label: "Low and lush" },
              { value: "tall-statement", label: "Tall statement" },
              { value: "bud-vases", label: "Bud vases" },
              { value: "candles-minimal", label: "Candles with minimal florals" },
              { value: "not-sure", label: "Not sure" },
            ],
          },
        },
        {
          id: "q12",
          label: "Are there any other areas that need flowers?",
          field: {
            kind: "multi-select",
            options: [
              { value: "welcome-sign", label: "Welcome sign" },
              { value: "cake", label: "Cake" },
              { value: "bar", label: "Bar" },
              { value: "cocktail-tables", label: "Cocktail tables" },
              { value: "place-card-table", label: "Place card table" },
              { value: "sweetheart-head-table", label: "Sweetheart or head table" },
              { value: "none", label: "None" },
            ],
          },
        },
      ],
    },
    {
      title: "Style",
      questions: [
        {
          id: "q13",
          label: "What colors or palette are you working with?",
          field: {
            kind: "textarea",
            placeholder: "Describe your palette or colors",
            rows: 3,
          },
          pullFrom: { guide: "colors-theme", questionId: "q13" },
        },
        {
          id: "q14",
          label: "Are there any flowers you love?",
          field: {
            kind: "textarea",
            placeholder: "Flower names (optional)",
            rows: 2,
          },
        },
        {
          id: "q15",
          label: "Are there any flowers you dislike or are allergic to?",
          field: {
            kind: "textarea",
            placeholder: "Flower names (optional)",
            rows: 2,
          },
        },
        {
          id: "q16",
          label:
            "Are there any restrictions at your venue — open flames, confetti, specific flower bans?",
          field: {
            kind: "textarea",
            placeholder: "Venue restrictions (optional)",
            rows: 2,
          },
        },
      ],
    },
  ],
};

export default florist;
