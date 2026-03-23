import type { GuideDefinition } from "@/lib/guides/types";

export const hairMakeupGuide: GuideDefinition = {
  slug: "hair-makeup",
  title: "Hair & Makeup",
  subtitle:
    "Hair and makeup takes longer than most couples expect. This questionnaire helps Eydn build an accurate getting-ready schedule, brief your artist, and make sure nothing falls through the cracks on the morning of your wedding.",
  icon: "scissors",
  integrations: ["vendor-brief", "day-of-timeline", "chat-context"],
  sections: [
    {
      title: "Basics",
      questions: [
        {
          id: "q1",
          label: "What is your wedding date and location?",
          field: { kind: "text", placeholder: "Date and location" },
          required: true,
        },
        {
          id: "q2",
          label: "What time does your ceremony start?",
          field: { kind: "time" },
          required: true,
          tip: "Eydn works backwards from this to suggest a getting-ready schedule.",
        },
        {
          id: "q3",
          label: "How many people need hair and makeup on the day?",
          field: {
            kind: "number",
            min: 1,
            placeholder: "Specify if any need hair only or makeup only",
          },
          required: true,
        },
        {
          id: "q4",
          label: "What is your budget?",
          field: {
            kind: "number",
            min: 0,
            placeholder: "Combined, or split: hair / makeup",
            unit: "$",
          },
        },
        {
          id: "q5",
          label: "Have you booked anyone yet?",
          field: {
            kind: "select",
            options: [
              { value: "hair-yes-makeup-yes", label: "Hair — Yes / Makeup — Yes" },
              { value: "hair-yes-makeup-no", label: "Hair — Yes / Makeup — No" },
              { value: "hair-no-makeup-yes", label: "Hair — No / Makeup — Yes" },
              { value: "hair-no-makeup-no", label: "Hair — No / Makeup — No" },
            ],
          },
        },
      ],
    },
    {
      title: "Trials",
      questions: [
        {
          id: "q6",
          label: "Do you want to book a hair trial before the wedding day?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not-sure", label: "Not sure — what's the point?" },
            ],
          },
          tip: "A trial is strongly recommended, especially if you have a specific look in mind. Most artists offer trials 1–3 months before the wedding.",
        },
        {
          id: "q7",
          label: "Do you want to book a makeup trial before the wedding day?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not-sure", label: "Not sure" },
            ],
          },
        },
        {
          id: "q8",
          label: "When are you thinking of booking trials?",
          field: { kind: "text", placeholder: "Date or timeframe" },
          tip: "Eydn will add reminders.",
        },
      ],
    },
    {
      title: "Your Hair",
      questions: [
        {
          id: "q9",
          label: "What is your hair type?",
          field: {
            kind: "select",
            options: [
              { value: "straight", label: "Straight" },
              { value: "wavy", label: "Wavy" },
              { value: "curly", label: "Curly" },
              { value: "coily", label: "Coily" },
            ],
          },
        },
        {
          id: "q10",
          label: "What is your hair length?",
          field: {
            kind: "select",
            options: [
              { value: "short", label: "Short" },
              { value: "medium", label: "Medium" },
              { value: "long", label: "Long" },
              { value: "extra-long", label: "Extra long" },
            ],
          },
        },
        {
          id: "q11",
          label: "Up or down?",
          field: {
            kind: "select",
            options: [
              { value: "up", label: "Up" },
              { value: "down", label: "Down" },
              { value: "half-up", label: "Half up" },
              { value: "not-sure", label: "Not sure" },
            ],
          },
        },
        {
          id: "q12",
          label:
            "Will you be wearing a veil, headpiece, or hair accessories?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not-sure", label: "Not sure yet" },
            ],
          },
        },
        {
          id: "q13",
          label: "Any styles you love or want to avoid?",
          field: { kind: "textarea", placeholder: "Describe or skip", rows: 3 },
        },
      ],
    },
    {
      title: "Your Makeup",
      questions: [
        {
          id: "q14",
          label: "What is your skin tone?",
          field: {
            kind: "select",
            options: [
              { value: "fair", label: "Fair" },
              { value: "light", label: "Light" },
              { value: "medium", label: "Medium" },
              { value: "tan", label: "Tan" },
              { value: "deep", label: "Deep" },
            ],
          },
        },
        {
          id: "q15",
          label: "What is your skin type?",
          field: {
            kind: "select",
            options: [
              { value: "dry", label: "Dry" },
              { value: "oily", label: "Oily" },
              { value: "combination", label: "Combination" },
              { value: "normal", label: "Normal" },
              { value: "sensitive", label: "Sensitive" },
            ],
          },
        },
        {
          id: "q16",
          label: "How do you want your makeup to feel on the day?",
          field: {
            kind: "select",
            options: [
              { value: "natural", label: "Natural" },
              { value: "soft-romantic", label: "Soft and romantic" },
              { value: "polished", label: "Polished" },
              { value: "full-glam", label: "Full glam" },
              { value: "bold", label: "Bold" },
            ],
          },
        },
        {
          id: "q17",
          label: "Are there any features you want to emphasise?",
          field: {
            kind: "multi-select",
            options: [
              { value: "eyes", label: "Eyes" },
              { value: "lips", label: "Lips" },
              { value: "skin", label: "Skin" },
              { value: "brows", label: "Brows" },
              { value: "no-preference", label: "No preference" },
            ],
          },
        },
        {
          id: "q18",
          label: "Do you have any allergies or product sensitivities?",
          field: { kind: "textarea", placeholder: "Describe or skip", rows: 3 },
        },
        {
          id: "q19",
          label: "Any looks you love or want to avoid?",
          field: { kind: "textarea", placeholder: "Describe or skip", rows: 3 },
        },
      ],
    },
    {
      title: "Inspiration",
      description:
        "Eydn surfaces a curated hair and makeup inspiration board based on your answers. Save what feels right, skip what doesn't.",
      questions: [],
    },
  ],
  outcome:
    "Builds a getting-ready schedule working back from your ceremony start time, and compiles a ready-to-send artist brief covering the full party, your look preferences, any sensitivities, and your inspo images.",
};
