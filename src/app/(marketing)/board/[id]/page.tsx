import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";

// Signed image URLs are generated per request — never statically cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wedding inspiration board · Eydn",
  robots: { index: false },
};

type Params = { params: Promise<{ id: string }> };

type BoardItem = {
  id: string;
  image_url: string;
  caption: string | null;
  category: string;
  location: string | null;
};

async function loadBoard(id: string) {
  const supabase = createSupabaseAdmin();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, name, category, wedding_id")
    .eq("id", id)
    .maybeSingle();
  if (!vendor) return null;

  const v = vendor as { name: string; category: string | null; wedding_id: string };

  const [{ data: items }, { data: wedding }] = await Promise.all([
    supabase
      .from("mood_board_items")
      .select("id, image_url, caption, category, location")
      .eq("wedding_id", v.wedding_id)
      .eq("vendor_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("weddings")
      .select("partner1_name, partner2_name")
      .eq("id", v.wedding_id)
      .maybeSingle(),
  ]);

  // Uploaded images are private storage paths — sign them for display.
  const signed = await Promise.all(
    ((items || []) as BoardItem[]).map(async (it) => {
      if (!it.image_url || it.image_url.startsWith("http")) return it;
      const { data: s } = await supabase.storage
        .from("attachments")
        .createSignedUrl(it.image_url, 3600);
      return { ...it, image_url: s?.signedUrl || it.image_url };
    })
  );

  const w = wedding as { partner1_name: string; partner2_name: string } | null;

  return {
    vendorName: v.name,
    vendorCategory: v.category,
    couple: w ? `${w.partner1_name} & ${w.partner2_name}` : null,
    items: signed,
  };
}

export default async function VendorBoardPage({ params }: Params) {
  const { id } = await params;
  const board = await loadBoard(id);
  if (!board) notFound();

  return (
    <main className="min-h-screen bg-whisper">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="text-center mb-10">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-violet">
            Wedding inspiration
          </p>
          <h1 className="mt-2 text-[28px] sm:text-[34px] font-semibold text-plum">
            Saved for {board.vendorName}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {board.couple ? `${board.couple} have` : "A couple has"} shared{" "}
            {board.items.length} {board.items.length === 1 ? "image" : "images"} of
            inspiration
            {board.vendorCategory ? ` for ${board.vendorCategory.toLowerCase()}` : ""}.
          </p>
        </header>

        {board.items.length === 0 ? (
          <p className="text-center text-[15px] text-muted py-16">
            No inspiration has been shared here yet.
          </p>
        ) : (
          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {board.items.map((item) => (
              <div
                key={item.id}
                className="break-inside-avoid rounded-[16px] overflow-hidden bg-white border border-border"
              >
                <Image
                  src={item.image_url}
                  alt={item.caption || "Inspiration"}
                  width={500}
                  height={500}
                  unoptimized
                  className="w-full object-cover"
                />
                {(item.caption || item.location) && (
                  <div className="p-3">
                    {item.caption && (
                      <p className="text-[13px] text-plum leading-snug">{item.caption}</p>
                    )}
                    {item.location && (
                      <p className="text-[11px] text-muted mt-1">{item.location}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <footer className="mt-14 text-center">
          <p className="text-[12px] text-muted">
            Shared via{" "}
            <a href="https://eydn.app" className="text-violet font-semibold">
              Eydn
            </a>{" "}
            — wedding planning, organized.
          </p>
        </footer>
      </div>
    </main>
  );
}
