import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Generate color palette suggestions based on Colors & Theme guide answers.
 * Returns 3 curated palettes (5 colors each) based on vibe, tone, and color family selections.
 */

type ColorPalette = {
  name: string;
  description: string;
  colors: { hex: string; name: string }[];
};

// Color families mapped to harmonious hex palettes
const COLOR_FAMILIES: Record<string, { hex: string; name: string }[]> = {
  "whites-creams": [
    { hex: "#FFFDF7", name: "Ivory" }, { hex: "#F5F0E8", name: "Cream" }, { hex: "#EDE7D9", name: "Linen" },
    { hex: "#FAF6F1", name: "Whisper" }, { hex: "#E8DDD0", name: "Pearl" }, { hex: "#D4C9B8", name: "Almond" },
  ],
  "blush-pinks": [
    { hex: "#F4C7C3", name: "Rose Quartz" }, { hex: "#E8B4B8", name: "Blush" }, { hex: "#D4A5A5", name: "Dusty Rose" },
    { hex: "#C08080", name: "Mauve" }, { hex: "#F2D7D5", name: "Petal" }, { hex: "#FADBD8", name: "Ballet" },
  ],
  "reds-burgundy": [
    { hex: "#8B0000", name: "Burgundy" }, { hex: "#722F37", name: "Wine" }, { hex: "#A0304E", name: "Cranberry" },
    { hex: "#C0392B", name: "Crimson" }, { hex: "#943543", name: "Marsala" }, { hex: "#7B3F3F", name: "Garnet" },
  ],
  "oranges-terracotta": [
    { hex: "#C2714A", name: "Terracotta" }, { hex: "#D4845A", name: "Sienna" }, { hex: "#E6A87C", name: "Peach" },
    { hex: "#CC7351", name: "Rust" }, { hex: "#D9A084", name: "Clay" }, { hex: "#B5651D", name: "Copper" },
  ],
  "yellows-gold": [
    { hex: "#C9A84C", name: "Gold" }, { hex: "#D4AF37", name: "Mustard" }, { hex: "#F0D58C", name: "Honey" },
    { hex: "#E8C97A", name: "Champagne Gold" }, { hex: "#DAA520", name: "Goldenrod" }, { hex: "#F5DEB3", name: "Wheat" },
  ],
  "greens-sage": [
    { hex: "#87A878", name: "Sage" }, { hex: "#6B8E6B", name: "Fern" }, { hex: "#4A6B4D", name: "Forest" },
    { hex: "#8FBC8F", name: "Eucalyptus" }, { hex: "#9CAF88", name: "Moss" }, { hex: "#ACB78E", name: "Olive" },
  ],
  "blues-navy": [
    { hex: "#2C3E50", name: "Navy" }, { hex: "#5B7FA5", name: "Slate Blue" }, { hex: "#87CEEB", name: "Sky" },
    { hex: "#6E8898", name: "Storm" }, { hex: "#34495E", name: "Charcoal Blue" }, { hex: "#A9CCE3", name: "Powder" },
  ],
  "purples-lavender": [
    { hex: "#9B72AA", name: "Lavender" }, { hex: "#7D5BA6", name: "Amethyst" }, { hex: "#D7BDE2", name: "Lilac" },
    { hex: "#6C3483", name: "Plum" }, { hex: "#BB8FCE", name: "Wisteria" }, { hex: "#A569BD", name: "Orchid" },
  ],
  "neutrals-earthy": [
    { hex: "#A38D6D", name: "Camel" }, { hex: "#8B7355", name: "Taupe" }, { hex: "#C2B280", name: "Sand" },
    { hex: "#DCC9A3", name: "Latte" }, { hex: "#B8A88A", name: "Khaki" }, { hex: "#9C8B6E", name: "Driftwood" },
  ],
  "black-charcoal": [
    { hex: "#1A1A2E", name: "Midnight" }, { hex: "#2C2C2C", name: "Charcoal" }, { hex: "#3D3D3D", name: "Graphite" },
    { hex: "#555555", name: "Pewter" }, { hex: "#2E2E38", name: "Onyx" }, { hex: "#4A4A4A", name: "Iron" },
  ],
};

// Accent colors based on vibe
const VIBE_ACCENTS: Record<string, { hex: string; name: string }[]> = {
  romantic: [{ hex: "#D4A5A5", name: "Dusty Rose" }, { hex: "#F4C7C3", name: "Rose Quartz" }],
  "moody-atmospheric": [{ hex: "#722F37", name: "Wine" }, { hex: "#2C3E50", name: "Navy" }],
  "bright-joyful": [{ hex: "#F0D58C", name: "Honey" }, { hex: "#E6A87C", name: "Peach" }],
  "elegant-formal": [{ hex: "#C9A84C", name: "Gold" }, { hex: "#FFFDF7", name: "Ivory" }],
  "relaxed-casual": [{ hex: "#87A878", name: "Sage" }, { hex: "#C2B280", name: "Sand" }],
  whimsical: [{ hex: "#D7BDE2", name: "Lilac" }, { hex: "#F2D7D5", name: "Petal" }],
  minimalist: [{ hex: "#FFFDF7", name: "Ivory" }, { hex: "#E8DDD0", name: "Linen" }],
  bohemian: [{ hex: "#C2714A", name: "Terracotta" }, { hex: "#9CAF88", name: "Moss" }],
  "classic-timeless": [{ hex: "#2C3E50", name: "Navy" }, { hex: "#C9A84C", name: "Gold" }],
  "bold-dramatic": [{ hex: "#8B0000", name: "Burgundy" }, { hex: "#1A1A2E", name: "Midnight" }],
};

function pick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export async function POST() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  // Get the colors guide responses
  const { data: guide } = await supabase
    .from("guide_responses")
    .select("responses")
    .eq("wedding_id", wedding.id)
    .eq("guide_slug", "colors-theme")
    .single();

  if (!guide) {
    return NextResponse.json({ error: "Complete the Colors & Theme guide first" }, { status: 400 });
  }

  const r = (guide as { responses: Record<string, unknown> }).responses;
  const vibes = (r.q1 as string[]) || [];
  const tone = (r.q4 as string) || "mix";
  const families = (r.q5 as string[]) || [];
  const excludeColor = ((r.q6 as string) || "").toLowerCase();

  // Build 3 palettes
  const palettes: ColorPalette[] = [];

  // Palette 1: Primary — based on selected color families
  const primaryColors: { hex: string; name: string }[] = [];
  for (const family of families) {
    const familyColors = COLOR_FAMILIES[family] || [];
    const filtered = familyColors.filter((c) => !excludeColor || !c.name.toLowerCase().includes(excludeColor));
    primaryColors.push(...pick(filtered, 2));
  }
  // Fill from neutral/accent if not enough
  if (primaryColors.length < 4) {
    const neutrals = COLOR_FAMILIES["whites-creams"] || [];
    primaryColors.push(...pick(neutrals, 4 - primaryColors.length));
  }
  // Add vibe accent
  const vibeAccent = vibes.length > 0 ? VIBE_ACCENTS[vibes[0]] : undefined;
  if (vibeAccent) primaryColors.push(pick(vibeAccent, 1)[0]);

  palettes.push({
    name: "Your Palette",
    description: `Based on your ${families.length > 0 ? families.join(" & ").replace(/-/g, " ") : "selections"} with ${tone} tones`,
    colors: primaryColors.slice(0, 5),
  });

  // Palette 2: Complementary — adjacent color families
  const compColors: { hex: string; name: string }[] = [];
  const allFamilies = Object.keys(COLOR_FAMILIES);
  const adjacentFamilies = allFamilies.filter((f) => !families.includes(f));
  const compFamilies = pick(adjacentFamilies, 2);
  for (const family of compFamilies) {
    compColors.push(...pick(COLOR_FAMILIES[family], 2));
  }
  compColors.push(...pick(COLOR_FAMILIES["whites-creams"], 1));

  palettes.push({
    name: "Alternative",
    description: "A complementary option that pairs well with your style",
    colors: compColors.slice(0, 5),
  });

  // Palette 3: Muted/soft version
  const softColors: { hex: string; name: string }[] = [];
  const softFamilies = tone === "dark-moody"
    ? ["neutrals-earthy", "black-charcoal", ...families.slice(0, 1)]
    : ["whites-creams", "neutrals-earthy", ...families.slice(0, 1)];
  for (const family of softFamilies) {
    const fam = COLOR_FAMILIES[family] || [];
    softColors.push(...pick(fam, 2));
  }

  palettes.push({
    name: "Soft & Subtle",
    description: "A toned-down version for a more understated feel",
    colors: softColors.slice(0, 5),
  });

  return NextResponse.json({ palettes });
}
