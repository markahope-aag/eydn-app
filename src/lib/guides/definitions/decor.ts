import type { GuideDefinition } from "@/lib/guides/types";

export const decorGuide: GuideDefinition = {
  slug: "decor",
  title: "Decor Planning",
  subtitle:
    "Decor is how your wedding becomes unmistakably yours. This questionnaire helps eydn understand the look you're going for, identify what you need, and flag anything that might be restricted by your venue before you get too attached to a vision.",
  icon: "lamp",
  integrations: ["mood-board", "vendor-brief", "chat-context"],
  sections: [
    {
      title: "Basics",
      questions: [
        {
          id: "q1",
          label: "What is your total decor budget?",
          field: { kind: "number", min: 0, unit: "$" },
          required: true,
        },
        {
          id: "q2",
          label: "Are you DIYing any elements?",
          field: {
            kind: "select",
            options: [
              { value: "all", label: "Yes — all of it" },
              { value: "some", label: "Yes — some" },
              { value: "no", label: "No" },
            ],
          },
        },
        {
          id: "q3",
          label: "Are you hiring a decorator, stylist, or event designer?",
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
          id: "q4",
          label: "Is your wedding indoors, outdoors, or a mix?",
          field: {
            kind: "select",
            options: [
              { value: "indoors", label: "Indoors" },
              { value: "outdoors", label: "Outdoors" },
              { value: "mix", label: "Mix — specify which parts" },
            ],
          },
        },
        {
          id: "q5",
          label:
            "Does your venue have any decor restrictions — candles, confetti, hanging items, artificial flowers?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not-sure", label: "Not sure — need to check" },
            ],
          },
        },
      ],
    },
    {
      title: "Ceremony",
      questions: [
        {
          id: "q6",
          label: "What ceremony decor do you need?",
          field: {
            kind: "multi-select",
            options: [
              { value: "arch-arbor", label: "Arch or arbor" },
              { value: "aisle-decor", label: "Aisle decor" },
              { value: "signage", label: "Signage" },
              { value: "candles", label: "Candles" },
              { value: "petal-leaf-scatter", label: "Petal or leaf scatter" },
              { value: "fabric-draping", label: "Fabric draping" },
              { value: "none", label: "None" },
            ],
          },
        },
        {
          id: "q7",
          label:
            "If your ceremony is outdoors, do you have a weather contingency plan for decor?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No — need to think about this" },
              { value: "indoors", label: "Ceremony is indoors" },
            ],
          },
        },
      ],
    },
    {
      title: "Reception",
      questions: [
        {
          id: "q8",
          label: "What is your tablescape vision?",
          field: {
            kind: "select",
            options: [
              { value: "lush-maximalist", label: "Lush and maximalist" },
              { value: "clean-minimal", label: "Clean and minimal" },
              { value: "rustic-natural", label: "Rustic and natural" },
              { value: "eclectic-mixed", label: "Eclectic and mixed" },
              { value: "not-sure", label: "Not sure" },
            ],
          },
        },
        {
          id: "q9",
          label: "What lighting are you thinking?",
          field: {
            kind: "multi-select",
            options: [
              { value: "string-lights", label: "String lights" },
              { value: "uplighting", label: "Uplighting" },
              { value: "candles", label: "Candles" },
              { value: "chandeliers-pendants", label: "Chandeliers or pendants" },
              { value: "venue-lighting", label: "Venue lighting only" },
              { value: "not-sure", label: "Not sure" },
            ],
          },
        },
        {
          id: "q10",
          label:
            "Do you want a backdrop — for the sweetheart table, cake, or photos?",
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
          id: "q11",
          label: "What signage do you need?",
          field: {
            kind: "multi-select",
            options: [
              { value: "welcome-sign", label: "Welcome sign" },
              { value: "seating-chart", label: "Seating chart display" },
              { value: "menu-cards", label: "Menu cards" },
              { value: "table-numbers", label: "Table numbers" },
              { value: "bar-menu", label: "Bar menu" },
              { value: "order-of-events", label: "Order of events board" },
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
          id: "q12",
          label: "Describe the look you want in three words.",
          field: { kind: "text", placeholder: "Three words", maxLength: 100 },
        },
        {
          id: "q13",
          label: "What colors and palette are you working with?",
          field: { kind: "textarea", placeholder: "Describe your palette", rows: 3 },
          pullFrom: { guide: "colors-theme", questionId: "q13" },
        },
        {
          id: "q14",
          label: "Is there anything you definitely do not want?",
          field: { kind: "textarea", placeholder: "Describe or skip", rows: 3 },
        },
      ],
    },
    {
      title: "Inspiration",
      description:
        "eydn surfaces a curated decor inspiration board based on your answers. Save what feels right, skip what doesn't, and eydn refines as it learns your taste.",
      questions: [],
    },
  ],
  outcome:
    "Saves your decor profile and flags any potential venue conflicts. If you have a decorator booked, eydn generates a style brief they can work from. If you're DIYing, eydn adds relevant tasks and timelines to your planning checklist.",
};
