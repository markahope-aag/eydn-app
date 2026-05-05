import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Build a curated Unsplash inspiration board from the Colors & Theme guide
 * answers. Reads the user's saved responses and runs a small set of Unsplash
 * searches to surface ~12 images that match their vibe, color palette, and
 * style choices.
 *
 * Each image includes the photographer credit + Unsplash referral link per
 * the API guidelines, plus a `track_url` the client should call when the
 * user actually saves the image (Unsplash requires the download_location
 * ping at the moment of "use").
 */

const UTM_SOURCE = "eydn-app";

const VIBE_TERMS: Record<string, string> = {
  romantic: "romantic",
  "moody-atmospheric": "moody",
  "bright-joyful": "bright joyful",
  "elegant-formal": "elegant",
  "relaxed-casual": "relaxed",
  whimsical: "whimsical",
  minimalist: "minimalist",
  bohemian: "bohemian",
  "classic-timeless": "classic",
  "bold-dramatic": "dramatic",
};

const SETTING_TERMS: Record<string, string> = {
  "garden-outdoor": "garden",
  "barn-countryside": "barn countryside",
  "ballroom-grand": "ballroom",
  "beach-coastal": "beach coastal",
  "industrial-urban": "industrial",
  "forest-woodland": "forest",
  "historic-estate": "estate",
  "rooftop-city": "rooftop",
  "destination-abroad": "destination",
};

const COLOR_TERMS: Record<string, string> = {
  "whites-creams": "white cream",
  "blush-pinks": "blush pink",
  "reds-burgundy": "burgundy red",
  "oranges-terracotta": "terracotta",
  "yellows-gold": "gold",
  "greens-sage": "sage green",
  "blues-navy": "navy blue",
  "purples-lavender": "lavender purple",
  "neutrals-earthy": "earthy neutral",
  "black-charcoal": "black",
};

const STYLE_TERMS: Record<string, string> = {
  "lush-overflowing": "lush",
  "clean-structured": "clean",
  "wild-natural": "wildflower",
  "soft-dreamy": "dreamy",
  "rich-maximalist": "maximalist",
  "simple-understated": "minimal",
  "vintage-nostalgic": "vintage",
  "modern-geometric": "modern geometric",
};

type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  urls: { small: string; regular: string };
  links: { download_location: string };
  user: { name: string; links: { html: string } };
};

type InspirationImage = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
  photographer_url: string;
  unsplash_url: string;
  track_url: string;
  query: string;
};

async function searchUnsplash(query: string, perPage: number, key: string): Promise<UnsplashPhoto[]> {
  const u = new URL("https://api.unsplash.com/search/photos");
  u.searchParams.set("query", `${query} wedding`);
  u.searchParams.set("orientation", "portrait");
  u.searchParams.set("content_filter", "high");
  u.searchParams.set("per_page", String(perPage));
  const res = await fetch(u, { headers: { Authorization: `Client-ID ${key}` } });
  if (!res.ok) return [];
  const data = (await res.json()) as { results: UnsplashPhoto[] };
  return data.results || [];
}

function toImage(p: UnsplashPhoto, query: string): InspirationImage {
  return {
    id: p.id,
    url: p.urls.regular,
    thumb: p.urls.small,
    alt: p.alt_description || query,
    photographer: p.user.name,
    photographer_url: `${p.user.links.html}?utm_source=${UTM_SOURCE}&utm_medium=referral`,
    unsplash_url: `https://unsplash.com/?utm_source=${UTM_SOURCE}&utm_medium=referral`,
    track_url: p.links.download_location,
    query,
  };
}

export async function POST() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return NextResponse.json({ error: "Inspiration board is not configured" }, { status: 500 });
  }

  const { data: guide } = await supabase
    .from("guide_responses")
    .select("responses")
    .eq("wedding_id", wedding.id)
    .eq("guide_slug", "colors-theme")
    .maybeSingle();

  const r = (guide?.responses ?? {}) as Record<string, unknown>;
  const vibes = (r.q1 as string[]) || [];
  const setting = (r.q2 as string) || "";
  const colors = (r.q5 as string[]) || [];
  const styles = (r.q8 as string[]) || [];
  const flower = ((r.q14 as string) || "").trim();

  // Build 3–4 distinct queries so the gallery covers vibe, palette, setting,
  // and a personal touch. Each query returns ~3 images, deduped at the end.
  const queries: string[] = [];

  const vibeTerm = vibes.length ? VIBE_TERMS[vibes[0]] : "";
  const settingTerm = setting ? SETTING_TERMS[setting] : "";
  const colorTerm = colors.length ? COLOR_TERMS[colors[0]] : "";
  const styleTerm = styles.length ? STYLE_TERMS[styles[0]] : "";

  if (vibeTerm && colorTerm) queries.push(`${vibeTerm} ${colorTerm}`);
  if (settingTerm && colorTerm) queries.push(`${settingTerm} ${colorTerm}`);
  if (styleTerm) queries.push(`${styleTerm} florals`);
  if (flower) queries.push(flower);

  // Always include at least one fallback so users with sparse answers still
  // get a board.
  if (queries.length === 0) queries.push("elegant florals");
  if (queries.length < 3) queries.push("table setting");

  const perPage = Math.max(3, Math.ceil(12 / queries.length));
  const all: InspirationImage[] = [];
  const seen = new Set<string>();

  await Promise.all(
    queries.map(async (q) => {
      const results = await searchUnsplash(q, perPage, key);
      for (const p of results) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        all.push(toImage(p, q));
      }
    })
  );

  return NextResponse.json({ images: all.slice(0, 12) });
}
