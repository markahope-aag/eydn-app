import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isValidUrl, isSafeExternalUrl, safeParseJSON, isParseError } from "@/lib/validation";

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
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  // Support both image upload URL and direct URL
  const image_url = body.image_url as string | undefined;
  const caption = body.caption as string | undefined;
  const category = body.category as string | undefined;
  const location = body.location as string | undefined;

  if (!image_url || !isValidUrl(image_url) || !image_url.startsWith("https://") || !isSafeExternalUrl(image_url)) {
    return NextResponse.json({ error: "Valid HTTPS URL required" }, { status: 400 });
  }

  // Determine if URL points directly to an image
  let finalImageUrl = image_url as string;
  const urlPath = (image_url as string).toLowerCase().split("?")[0].split("#")[0];
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif", ".bmp", ".tiff", ".heic"];
  const isDirectImage = imageExtensions.some((ext) => urlPath.endsWith(ext));

  // Known image CDN hostnames that serve images without file extensions
  const imageHosts = ["images.unsplash.com", "i.pinimg.com", "img.clerk.com", "lh3.googleusercontent.com"];
  const urlHost = new URL(image_url as string).hostname;
  const isImageHost = imageHosts.some((h) => urlHost === h || urlHost.endsWith("." + h));

  if (!isDirectImage && !isImageHost) {
    // Try to check Content-Type first (faster, works with CDNs)
    let resolvedViaContentType = false;
    try {
      const headRes = await fetch(image_url as string, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(5000),
        redirect: "follow",
      });
      const contentType = headRes.headers.get("content-type") || "";
      if (contentType.startsWith("image/")) {
        resolvedViaContentType = true;
        // URL serves an image directly — use as-is
      }
    } catch {
      // HEAD failed — fall through to og:image extraction
    }

    if (!resolvedViaContentType) {
      // Try to extract og:image from the page HTML
      try {
        const pageRes = await fetch(image_url as string, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
          },
          signal: AbortSignal.timeout(5000),
          redirect: "follow",
        });

        if (!pageRes.ok) {
          // Site blocked our request — tell user to use direct image URL
          return NextResponse.json(
            { error: "That site blocked our request. Try right-clicking the image and choosing 'Copy image address' to get a direct URL." },
            { status: 400 }
          );
        }

        const html = await pageRes.text();
        const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
          || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
        if (ogMatch?.[1]) {
          finalImageUrl = ogMatch[1];
        } else {
          return NextResponse.json(
            { error: "Could not find an image at this URL. Try right-clicking the image and choosing 'Copy image address' to get a direct URL." },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Could not load this URL. Try right-clicking the image and choosing 'Copy image address' to get a direct URL." },
          { status: 400 }
        );
      }
    }
  }

  const { data, error } = await supabase
    .from("mood_board_items")
    .insert({
      wedding_id: wedding.id,
      image_url: finalImageUrl,
      caption: caption || null,
      category: category || "General",
      location: location || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
