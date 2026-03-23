import type { GuideDefinition } from "@/lib/guides/types";

const colorsTheme: GuideDefinition = {
  slug: "colors-theme",
  title: "Wedding Colors & Theme",
  subtitle:
    "Before you start booking vendors or pinning inspiration, it helps to have a shared sense of the look and feel you're going for. This questionnaire helps eydn understand your aesthetic so it can surface the right inspiration, guide vendor conversations, and keep your whole wedding visually consistent.",
  icon: "palette",
  integrations: ["mood-board", "chat-context"],
  outcome:
    "Your color palette and style profile are saved and used across all other questionnaires — florist, decor, dress, and hair and makeup all pull from this so you don't have to repeat yourself.",
  sections: [
    {
      title: "The Vibe",
      questions: [
        {
          id: "q1",
          label: "How do you want your wedding to feel?",
          field: {
            kind: "multi-select",
            max: 3,
            options: [
              { value: "romantic", label: "Romantic" },
              { value: "moody-atmospheric", label: "Moody and atmospheric" },
              { value: "bright-joyful", label: "Bright and joyful" },
              { value: "elegant-formal", label: "Elegant and formal" },
              { value: "relaxed-casual", label: "Relaxed and casual" },
              { value: "whimsical", label: "Whimsical" },
              { value: "minimalist", label: "Minimalist" },
              { value: "bohemian", label: "Bohemian" },
              { value: "classic-timeless", label: "Classic and timeless" },
              { value: "bold-dramatic", label: "Bold and dramatic" },
            ],
          },
          required: true,
        },
        {
          id: "q2",
          label: "Which setting feels most like you?",
          field: {
            kind: "select",
            options: [
              { value: "garden-outdoor", label: "Garden or outdoor" },
              { value: "barn-countryside", label: "Barn or countryside" },
              { value: "ballroom-grand", label: "Ballroom or grand venue" },
              { value: "beach-coastal", label: "Beach or coastal" },
              { value: "industrial-urban", label: "Industrial or urban" },
              { value: "forest-woodland", label: "Forest or woodland" },
              { value: "historic-estate", label: "Historic building or estate" },
              { value: "rooftop-city", label: "Rooftop or city views" },
              { value: "destination-abroad", label: "Destination abroad" },
            ],
          },
        },
        {
          id: "q3",
          label:
            "Pick a season — real or imaginary — that matches the feeling you want.",
          field: {
            kind: "select",
            options: [
              { value: "early-spring", label: "Early spring (soft, fresh, pastel)" },
              { value: "late-spring", label: "Late spring (lush, floral, warm)" },
              { value: "summer", label: "Summer (bright, sun-drenched, relaxed)" },
              { value: "autumn", label: "Autumn (rich, warm, moody)" },
              { value: "winter", label: "Winter (dramatic, cosy, candlelit)" },
              { value: "no-preference", label: "No preference" },
            ],
          },
        },
      ],
    },
    {
      title: "Colors",
      questions: [
        {
          id: "q4",
          label: "Are you drawn to light or dark tones overall?",
          field: {
            kind: "select",
            options: [
              { value: "light-airy", label: "Light and airy" },
              { value: "dark-moody", label: "Dark and moody" },
              { value: "mix", label: "Mix of both" },
              { value: "no-preference", label: "No preference" },
            ],
          },
        },
        {
          id: "q5",
          label: "Pick your instinct color family.",
          field: {
            kind: "multi-select",
            max: 2,
            options: [
              { value: "whites-creams", label: "Whites and creams" },
              { value: "blush-pinks", label: "Blush and pinks" },
              { value: "reds-burgundy", label: "Reds and burgundy" },
              { value: "oranges-terracotta", label: "Oranges and terracotta" },
              { value: "yellows-gold", label: "Yellows and gold" },
              { value: "greens-sage", label: "Greens and sage" },
              { value: "blues-navy", label: "Blues and navy" },
              { value: "purples-lavender", label: "Purples and lavender" },
              { value: "neutrals-earthy", label: "Neutrals and earthy tones" },
              { value: "black-charcoal", label: "Black and charcoal" },
            ],
          },
        },
        {
          id: "q6",
          label: "Is there a color you absolutely do not want?",
          field: { kind: "text", placeholder: "Color to avoid (optional)" },
        },
        {
          id: "q7",
          label: "Do you already have a color in mind?",
          field: {
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "roughly", label: "Roughly, yes" },
              { value: "not-yet", label: "Not yet" },
            ],
          },
        },
      ],
    },
    {
      title: "Style References",
      questions: [
        {
          id: "q8",
          label: "Which of these words best describe your style?",
          field: {
            kind: "multi-select",
            max: 3,
            options: [
              { value: "lush-overflowing", label: "Lush and overflowing" },
              { value: "clean-structured", label: "Clean and structured" },
              { value: "wild-natural", label: "Wild and natural" },
              { value: "soft-dreamy", label: "Soft and dreamy" },
              { value: "rich-maximalist", label: "Rich and maximalist" },
              { value: "simple-understated", label: "Simple and understated" },
              { value: "vintage-nostalgic", label: "Vintage and nostalgic" },
              { value: "modern-geometric", label: "Modern and geometric" },
            ],
          },
        },
        {
          id: "q9",
          label:
            "Is there a specific decade or era you're drawn to aesthetically?",
          field: { kind: "text", placeholder: "e.g. 1920s, 1970s (optional)" },
        },
        {
          id: "q10",
          label:
            "Are there any weddings — real or fictional — that felt close to what you want?",
          field: {
            kind: "textarea",
            placeholder: "References or descriptions (optional)",
            rows: 3,
          },
        },
      ],
    },
    {
      title: "Texture & Detail",
      questions: [
        {
          id: "q11",
          label: "What materials or textures feel right to you?",
          field: {
            kind: "multi-select",
            options: [
              { value: "silk-satin", label: "Silk or satin" },
              { value: "linen-cotton", label: "Linen or cotton" },
              { value: "velvet", label: "Velvet" },
              { value: "rattan-wicker", label: "Rattan or wicker" },
              { value: "raw-wood", label: "Raw wood" },
              { value: "marble-stone", label: "Marble or stone" },
              { value: "gold-brass", label: "Gold or brass metal" },
              { value: "silver-chrome", label: "Silver or chrome metal" },
              { value: "dried-pampas", label: "Dried or pampas grass" },
              { value: "no-preference", label: "No strong preference" },
            ],
          },
        },
        {
          id: "q12",
          label:
            "How do you feel about maximalism vs. minimalism on a scale of 1–5?",
          field: {
            kind: "scale",
            min: 1,
            max: 5,
            minLabel: "Very minimal and clean",
            maxLabel: "Lush and layered",
          },
        },
        {
          id: "q13",
          label: "Are candles or open flames a feature you want?",
          field: {
            kind: "select",
            options: [
              { value: "lots", label: "Yes — lots of them" },
              { value: "a-few", label: "A few" },
              { value: "no", label: "No" },
              { value: "venue-restrictions", label: "Subject to venue restrictions" },
            ],
          },
        },
        {
          id: "q14",
          label:
            "Is there a specific flower, plant, or natural element you associate with your vision?",
          field: {
            kind: "text",
            placeholder: "e.g. olive branches, peonies (optional)",
          },
        },
      ],
    },
    {
      title: "Inspiration Images",
      description:
        "Based on your answers, eydn surfaces a curated board of inspiration images tagged by vibe, color palette, and style. No input needed — just react.",
      questions: [
        {
          id: "q15",
          label:
            "From the images eydn shows you, which ones feel right?",
          field: {
            kind: "select",
            options: [
              { value: "save", label: "Save" },
              { value: "skip", label: "Skip" },
            ],
          },
        },
        {
          id: "q16",
          label: "Is there anything missing from what you're seeing?",
          field: {
            kind: "textarea",
            placeholder: "Describe what's missing (optional)",
            rows: 3,
          },
        },
      ],
    },
  ],
};

export default colorsTheme;
