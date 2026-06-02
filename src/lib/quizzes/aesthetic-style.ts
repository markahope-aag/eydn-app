import type { ArchetypeQuiz } from "./types";

/**
 * Aesthetic wedding-style quiz. Eight questions sort a couple into one of six
 * visual styles. Each option maps to a style code: CL classic, MD modern,
 * RU rustic, BO boho, RO romantic, GL glam. Codes are distributed so every
 * style is reachable; ties resolve to Classic.
 */
export const aestheticStyleQuiz: ArchetypeQuiz = {
  id: "aesthetic_style",
  slug: "wedding-style",
  title: "What's your wedding style?",
  subtitle:
    "Eight questions. Two minutes. We'll send you your wedding aesthetic, plus a starting palette and the details that bring it to life.",
  questions: [
    {
      id: 1,
      prompt: "Picture the venue you keep coming back to.",
      options: [
        { label: "A grand ballroom with chandeliers and polished floors.", value: "CL" },
        { label: "A sleek gallery or a rooftop over the city.", value: "MD" },
        { label: "A barn or vineyard with string lights and open fields.", value: "RU" },
        { label: "A garden in full bloom, or a courtyard at golden hour.", value: "RO" },
      ],
    },
    {
      id: 2,
      prompt: "Which palette feels most like you?",
      options: [
        { label: "Terracotta, rust, and warm earthy neutrals.", value: "BO" },
        { label: "Black, gold, and deep jewel tones.", value: "GL" },
        { label: "Ivory, champagne, and soft grey.", value: "CL" },
        { label: "Sage, cream, and natural wood.", value: "RU" },
      ],
    },
    {
      id: 3,
      prompt: "The flowers should feel…",
      options: [
        { label: "Lush garden roses and peonies, soft and abundant.", value: "RO" },
        { label: "Pampas grass, dried stems, and wildflowers.", value: "BO" },
        { label: "A few architectural stems — clean and sculptural.", value: "MD" },
        { label: "Dramatic, oversized arrangements that make a statement.", value: "GL" },
      ],
    },
    {
      id: 4,
      prompt: "How should the day feel to a guest walking in?",
      options: [
        { label: "Elegant and timeless — like it could be any era.", value: "CL" },
        { label: "Warm and relaxed, like a celebration at home.", value: "RU" },
        { label: "Free-spirited and a little unexpected.", value: "BO" },
        { label: "Soft, dreamy, and full of candlelight.", value: "RO" },
      ],
    },
    {
      id: 5,
      prompt: "Pick the detail you'd splurge on.",
      options: [
        { label: "Clean modern signage and minimalist place settings.", value: "MD" },
        { label: "Crystal, mirrors, and plenty of metallic shine.", value: "GL" },
        { label: "Long wooden tables, greenery runners, and candles.", value: "RU" },
        { label: "A macramé backdrop or a mix of vintage rugs.", value: "BO" },
      ],
    },
    {
      id: 6,
      prompt: "Your attire vision leans…",
      options: [
        { label: "Classic and structured — clean lines, timeless silhouette.", value: "CL" },
        { label: "Flowing and romantic, with delicate lace or florals.", value: "RO" },
        { label: "Show-stopping — sequins, a bold color, or serious sparkle.", value: "GL" },
        { label: "Sharp and contemporary, maybe an unexpected cut.", value: "MD" },
      ],
    },
    {
      id: 7,
      prompt: "If you could pick the setting and season…",
      options: [
        { label: "A crisp autumn day somewhere with rolling countryside.", value: "RU" },
        { label: "A warm desert or coast, barefoot and golden.", value: "BO" },
        { label: "A formal evening — black-tie, indoors, candlelit.", value: "CL" },
        { label: "Late spring, surrounded by blossoms and soft light.", value: "RO" },
      ],
    },
    {
      id: 8,
      prompt: "What do you most want guests to remember?",
      options: [
        { label: "That it felt luxurious — every detail dialed up.", value: "GL" },
        { label: "How effortless and design-forward it all looked.", value: "MD" },
        { label: "How personal and uniquely you it felt.", value: "BO" },
        { label: "How beautiful and emotional the whole thing was.", value: "RO" },
      ],
    },
  ],
  tieBreaker: "CL",
  results: {
    CL: {
      key: "CL",
      label: "Classic & Timeless",
      headline: "Your style is Classic & Timeless",
      body: "You're drawn to elegance that never dates — ivory and champagne tones, structured silhouettes, candlelight, and a sense of occasion. Think ballrooms, garden roses, fine details, and a day that will look just as beautiful in your photos in forty years as it does now.\n\nYour instinct is restraint done well: nothing trendy for trend's sake, everything intentional.",
      eydnAngle:
        "Eydn can help you keep that timeless thread consistent — from your color palette and stationery to vendor briefs — so every choice reinforces the same elegant tone. Save your favorite references to your vision board and Eydn keeps them in view as you book.",
    },
    MD: {
      key: "MD",
      label: "Modern & Minimal",
      headline: "Your style is Modern & Minimal",
      body: "Clean lines, negative space, and a confident, design-forward palette. You'd rather have a few perfect details than a room full of decor — sculptural florals, sharp typography, monochrome or tonal color, and venues with real architecture.\n\nLess, but better, is the whole philosophy.",
      eydnAngle:
        "Eydn helps you resist the clutter — a focused vendor list, a tight palette, and decor that earns its place. Pin the looks you love to your vision board and pull a starting color scheme straight onto your wedding website.",
    },
    RU: {
      key: "RU",
      label: "Rustic & Natural",
      headline: "Your style is Rustic & Natural",
      body: "Warm, relaxed, and rooted in nature — barns and vineyards, long wooden tables, greenery, candlelight, and sage-and-cream tones. You want the day to feel like a generous celebration with the people you love, not a formal production.\n\nEffortless on the surface, thoughtfully planned underneath.",
      eydnAngle:
        "Eydn helps with the parts that make 'relaxed' actually work — outdoor backups, rentals, lighting, and a realistic timeline — so the easygoing feel is real, not stressful. Your vision board keeps the whole natural palette in one place.",
    },
    BO: {
      key: "BO",
      label: "Boho & Free-Spirited",
      headline: "Your style is Boho & Free-Spirited",
      body: "Earthy and eclectic — terracotta and rust tones, pampas and dried florals, macramé, mixed vintage textures, and settings like the desert or the coast. You want a day that feels personal and a little unexpected, never off-the-shelf.\n\nThe magic is in the mix.",
      eydnAngle:
        "Eydn helps you blend the eclectic without it feeling chaotic — coordinating textures, colors, and vendors around one cohesive vibe. Collect your inspiration on the vision board and Eydn can pull your palette onto your website.",
    },
    RO: {
      key: "RO",
      label: "Romantic & Garden",
      headline: "Your style is Romantic & Garden",
      body: "Soft, dreamy, and full of feeling — blush and pastel tones, abundant garden florals, flowing fabrics, blossoms, and endless candlelight. You want beauty and emotion above all: a day that feels like a love story.\n\nLush, tender, and a little fairytale.",
      eydnAngle:
        "Eydn helps you build that romance intentionally — florals, lighting, and a palette that all sing together — and keeps your budget honest while you do. Save your dreamiest references to the vision board to share with your florist.",
    },
    GL: {
      key: "GL",
      label: "Glam & Luxe",
      headline: "Your style is Glam & Luxe",
      body: "Bold, opulent, and unapologetic — black and gold, jewel tones, crystal and metallic shine, dramatic florals, and serious sparkle. You want a day that feels like an event: rich, elevated, and impossible to forget.\n\nMore is more, and you wear it well.",
      eydnAngle:
        "Eydn helps you put the drama where it counts and keep the budget in check — prioritizing the statement moments and coordinating vendors to deliver them. Pin your boldest looks and pull a rich palette onto your wedding website.",
    },
  },
};
