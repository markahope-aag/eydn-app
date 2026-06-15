import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import type { Database } from "@/lib/supabase/types";
import { VisionBoardGrid } from "./VisionBoardGrid";

type Wedding = Database["public"]["Tables"]["weddings"]["Row"];
type MoodItem = Database["public"]["Tables"]["mood_board_items"]["Row"];

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-serif",
});

const SIGNED_URL_TTL = 3600;

// Refresh public vision boards every 60s so new pins show up reasonably fast
// without re-rendering on every request.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSupabaseAdmin();
  const { data: w } = await supabase
    .from("weddings")
    .select("partner1_name, partner2_name")
    .eq("website_slug", slug)
    .eq("website_enabled", true)
    .maybeSingle();

  if (!w) return { title: "Vision Board Not Found" };

  const coupleNames = `${w.partner1_name} & ${w.partner2_name}`;
  return {
    title: `${coupleNames} — Vision Board`,
    description: `Wedding inspiration and vision board for ${coupleNames}.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicVisionBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createSupabaseAdmin();

  const { data: weddingRaw } = await supabase
    .from("weddings")
    .select("id, partner1_name, partner2_name, website_slug, website_theme")
    .eq("website_slug", slug)
    .eq("website_enabled", true)
    .maybeSingle();

  const wedding = weddingRaw as Pick<
    Wedding,
    "id" | "partner1_name" | "partner2_name" | "website_slug"
  > & { website_theme: Record<string, unknown> | null } | null;

  if (!wedding) notFound();

  const { data: itemsRaw } = await supabase
    .from("mood_board_items")
    .select("id, image_url, caption, category, sort_order, size, created_at")
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const rawItems = (itemsRaw ?? []) as Array<
    Pick<MoodItem, "id" | "image_url" | "caption" | "category" | "sort_order" | "size" | "created_at">
  >;

  // Sign storage-path images; pass external URLs through unchanged.
  const items = await Promise.all(
    rawItems.map(async (item) => {
      if (!item.image_url || item.image_url.startsWith("http")) return item;
      const { data: s } = await supabase.storage
        .from("attachments")
        .createSignedUrl(item.image_url, SIGNED_URL_TTL);
      return { ...item, image_url: s?.signedUrl || item.image_url };
    })
  );

  const coupleNames = `${wedding.partner1_name} & ${wedding.partner2_name}`;
  const theme = (wedding.website_theme as { primaryColor?: string; accentColor?: string } | null) ?? {};
  const primaryColor = theme.primaryColor || "#2C3E2D";
  const accentColor = theme.accentColor || "#D4A5A5";

  return (
    <div
      className={`min-h-screen bg-whisper ${playfair.variable}`}
      style={
        {
          "--theme-primary": primaryColor,
          "--theme-accent": accentColor,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header
        className="relative text-center py-16 px-6"
        style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-accent))` }}
      >
        {/* Prominent, always-visible back control. A translucent white pill
            reads clearly on any theme gradient, light or dark — unlike the
            previous faint underlined text at the foot of the header. */}
        <Link
          href={`/w/${wedding.website_slug}`}
          className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-[13px] font-semibold text-white backdrop-blur-sm hover:bg-white/30 transition"
        >
          <span aria-hidden="true">&larr;</span>
          Back to website
        </Link>
        <p className="text-[13px] uppercase tracking-[0.25em] text-white/70 font-semibold">
          Vision Board
        </p>
        <h1 className="mt-3 text-[44px] md:text-[56px] font-[family-name:var(--font-serif)] font-normal text-white leading-tight">
          {coupleNames}
        </h1>
        <p className="mt-3 text-[15px] text-white/80 max-w-md mx-auto">
          Inspiration we&apos;re drawing from for our wedding day.
        </p>
      </header>

      {/* Grid */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {items.length === 0 ? (
          <p className="text-[15px] text-muted text-center py-16">
            No inspiration pinned yet — check back soon.
          </p>
        ) : (
          <VisionBoardGrid items={items} />
        )}
      </main>

      <footer className="text-center py-8 text-[11px] text-muted/70 uppercase tracking-widest">
        Built with Eydn
      </footer>
    </div>
  );
}
