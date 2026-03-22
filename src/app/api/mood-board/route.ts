import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isValidUrl } from "@/lib/validation";

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data, error } = await supabase
    .from("mood_board_items")
    .select("*")
    .eq("wedding_id", wedding.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const body = await request.json();

  // Support both image upload URL and direct URL
  const { image_url, caption, category } = body;

  if (!image_url || !isValidUrl(image_url) || !image_url.startsWith("https://")) {
    return NextResponse.json({ error: "Valid HTTPS URL required" }, { status: 400 });
  }

  // If the URL is not a direct image, try to extract og:image from the page
  let finalImageUrl = image_url as string;
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"];
  const isDirectImage = imageExtensions.some((ext) => (image_url as string).toLowerCase().split("?")[0].endsWith(ext));

  if (!isDirectImage) {
    try {
      const pageRes = await fetch(image_url as string, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; eydn/1.0)" },
        signal: AbortSignal.timeout(5000),
      });
      const html = await pageRes.text();
      // Extract og:image meta tag
      const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
        || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
      if (ogMatch?.[1]) {
        finalImageUrl = ogMatch[1];
      } else {
        return NextResponse.json(
          { error: "Could not find an image at this URL. Try pasting a direct image URL instead (right-click an image → Copy image address)." },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Could not load this URL. Try pasting a direct image URL instead." },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("mood_board_items")
    .insert({
      wedding_id: wedding.id,
      image_url: finalImageUrl,
      caption: caption || null,
      category: category || "General",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
