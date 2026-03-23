import type { GuideDefinition } from "@/lib/guides/types";

const weddingDress: GuideDefinition = {
  slug: "wedding-dress",
  title: "Wedding Dress",
  subtitle:
    "Finding your dress is one of the most personal parts of wedding planning. This questionnaire helps eydn understand your style, narrow the options, and surface inspiration so that when you walk into a boutique, you already have a clear sense of what you're looking for.",
  icon: "sparkles",
  integrations: ["mood-board", "chat-context"],
  outcome:
    "Saves your style profile and uses it to suggest boutiques, flag timeline risks, and build a brief you can share with consultants before your appointment.",
  sections: [
    {
      title: "Basics",
      questions: [
        {
          id: "q1",
          label: "What is your dress budget?",
          field: { kind: "number", min: 0, placeholder: "Budget", unit: "$" },
          required: true,
          tip: "Include alterations if possible, typically $300–$800 extra.",
        },
        {
          id: "q2",
          label: "Where are you in the process?",
          field: {
            kind: "select",
            options: [
              { value: "not-started", label: "Not started" },
              { value: "browsing", label: "Browsing online" },
              { value: "appointments-booked", label: "Have appointments booked" },
              { value: "purchased", label: "Already purchased" },
            ],
          },
        },
        {
          id: "q3",
          label: "When do you need the dress by?",
          field: { kind: "date" },
          tip: "eydn will flag if your timeline is tight, most dresses take 4–6 months to order and alter.",
        },
      ],
    },
    {
      title: "The Vibe",
      questions: [
        {
          id: "q4",
          label: "How do you want to feel in your dress?",
          field: {
            kind: "multi-select",
            max: 3,
            options: [
              { value: "romantic", label: "Romantic" },
              { value: "elegant-formal", label: "Elegant and formal" },
              { value: "relaxed-effortless", label: "Relaxed and effortless" },
              { value: "bold-dramatic", label: "Bold and dramatic" },
              { value: "soft-dreamy", label: "Soft and dreamy" },
              { value: "classic-timeless", label: "Classic and timeless" },
              { value: "edgy-modern", label: "Edgy and modern" },
              { value: "playful-fun", label: "Playful and fun" },
            ],
          },
        },
        {
          id: "q5",
          label: "What silhouette are you drawn to?",
          field: {
            kind: "multi-select",
            options: [
              { value: "ballgown", label: "Ballgown" },
              { value: "a-line", label: "A-line" },
              { value: "fitted-column", label: "Fitted or column" },
              { value: "mermaid-trumpet", label: "Mermaid or trumpet" },
              { value: "tea-length", label: "Tea length" },
              { value: "jumpsuit-separates", label: "Jumpsuit or separates" },
              { value: "not-sure", label: "Not sure yet" },
            ],
          },
        },
        {
          id: "q6",
          label: "Neckline preference?",
          field: {
            kind: "select",
            options: [
              { value: "v-neck", label: "V-neck" },
              { value: "sweetheart", label: "Sweetheart" },
              { value: "square", label: "Square" },
              { value: "high-neck", label: "High neck" },
              { value: "off-shoulder", label: "Off shoulder" },
              { value: "no-preference", label: "No preference" },
            ],
          },
        },
        {
          id: "q7",
          label: "Sleeve preference?",
          field: {
            kind: "select",
            options: [
              { value: "sleeveless", label: "Sleeveless" },
              { value: "cap-sleeve", label: "Cap sleeve" },
              { value: "long-sleeve", label: "Long sleeve" },
              { value: "detachable", label: "Detachable" },
              { value: "no-preference", label: "No preference" },
            ],
          },
        },
      ],
    },
    {
      title: "Details",
      questions: [
        {
          id: "q8",
          label: "Any details you love?",
          field: {
            kind: "multi-select",
            options: [
              { value: "lace", label: "Lace" },
              { value: "beading-embellishment", label: "Beading or embellishment" },
              { value: "bow-statement-back", label: "Bow or statement back" },
              { value: "cape-overskirt", label: "Cape or overskirt" },
              { value: "pockets", label: "Pockets" },
              { value: "minimalist-clean", label: "Minimalist and clean" },
              { value: "floral-applique", label: "Floral appliqué" },
              { value: "corset-construction", label: "Corset construction" },
              { value: "open-back", label: "Open back" },
            ],
          },
        },
        {
          id: "q9",
          label: "Train length?",
          field: {
            kind: "select",
            options: [
              { value: "no-train", label: "No train" },
              { value: "subtle-sweep", label: "Subtle sweep" },
              { value: "chapel", label: "Chapel" },
              { value: "cathedral", label: "Cathedral" },
              { value: "not-sure", label: "Not sure" },
            ],
          },
        },
        {
          id: "q10",
          label: "Color preference?",
          field: {
            kind: "select",
            options: [
              { value: "white", label: "White" },
              { value: "ivory", label: "Ivory" },
              { value: "champagne", label: "Champagne" },
              { value: "blush", label: "Blush" },
              { value: "non-traditional", label: "Non-traditional" },
              { value: "open", label: "Open to anything" },
            ],
          },
        },
      ],
    },
    {
      title: "Practicalities",
      questions: [
        {
          id: "q11",
          label:
            "Are you open to a sample dress, secondhand, or pre-loved gown?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "maybe", label: "Maybe — depends on the dress" },
            ],
          },
        },
        {
          id: "q12",
          label:
            "Do you need to move freely — dancing, outdoor terrain, stairs?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes — important" },
              { value: "somewhat", label: "Somewhat" },
              { value: "not-priority", label: "Not a priority" },
            ],
          },
        },
        {
          id: "q13",
          label: "Are you planning a dress change or reception outfit?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "considering", label: "Considering it" },
            ],
          },
        },
        {
          id: "q14",
          label:
            "Any fit considerations or preferences you'd like a stylist to know upfront?",
          field: {
            kind: "textarea",
            placeholder: "Notes for your stylist (optional)",
            rows: 3,
          },
        },
      ],
    },
  ],
};

export default weddingDress;
