import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isValidUrl, isSafeExternalUrl, safeParseJSON, isParseError } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";

const SIGNED_URL_TTL = 3600;

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

  const err = supabaseError(error, "mood-board");
  if (err) return err;

  // Uploaded images are stored as private storage paths — sign them for
  // display. External links (http...) are returned as-is.
  const signed = await Promise.all(
    ((data || []) as Array<{ image_url: string; [k: string]: unknown }>).map(
      async (item) => {
        if (!item.image_url || item.image_url.startsWith("http")) return item;
        const { data: s } = await supabase.storage
          .from("attachments")
          .createSignedUrl(item.image_url, SIGNED_URL_TTL);
        return { ...item, image_url: s?.signedUrl || item.image_url };
      }
    )
  );

  return NextResponse.json(signed);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const image_url = body.image_url as string | undefined;
  const caption = body.caption as string | undefined;
  const category = body.category as string | undefined;
  const location = body.location as string | undefined;
  const vendor_id = body.vendor_id as string | undefined;

  if (!image_url) {
    return NextResponse.json({ error: "An image URL or upload is required" }, { status: 400 });
  }

  // An uploaded image arrives as a Supabase Storage path inside this
  // wedding's own folder (produced by /api/attachments). Store it as-is —
  // GET signs it on read. External links go through URL validation below.
  const isUploadedImage =
    !image_url.startsWith("http") && image_url.startsWith(`${wedding.id}/`);

  let finalImageUrl = image_url;

  if (!isUploadedImage) {
    // Only allow HTTPS URLs — reject data:, javascript:, and other schemes
    if (!isValidUrl(image_url) || !image_url.startsWith("https://") || !isSafeExternalUrl(image_url)) {
      return NextResponse.json({ error: "Valid HTTPS URL required" }, { status: 400 });
    }

    // Determine if the URL points directly to an image
    const urlPath = image_url.toLowerCase().split("?")[0].split("#")[0];
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif", ".bmp", ".tiff", ".heic"];
    const isDirectImage = imageExtensions.some((ext) => urlPath.endsWith(ext));

    // Known image CDN hostnames that serve images without file extensions
    const imageHosts = ["images.unsplash.com", "i.pinimg.com", "img.clerk.com", "lh3.googleusercontent.com"];
    const urlHost = new URL(image_url).hostname;
    const isImageHost = imageHosts.some((h) => urlHost === h || urlHost.endsWith("." + h));

    if (!isDirectImage && !isImageHost) {
      // Try Content-Type first (faster, works with CDNs)
      let resolvedViaContentType = false;
      try {
        const headRes = await fetch(image_url, {
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
        }
      } catch {
        // HEAD failed — fall through to og:image extraction
      }

      if (!resolvedViaContentType) {
        // Try to extract og:image from the page HTML
        try {
          const pageRes = await fetch(image_url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml",
            },
            signal: AbortSignal.timeout(5000),
            redirect: "follow",
          });

          if (!pageRes.ok) {
            return NextResponse.json(
              { error: "That site (Pinterest blocks this often) wouldn't let us load the image. Open the image, right-click it, choose 'Copy image address', and paste that link instead." },
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
              { error: "We couldn't find an image at that link. Right-click the image, choose 'Copy image address', and paste that direct link instead." },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: "We couldn't load that link. Right-click the image, choose 'Copy image address', and paste that direct link instead." },
            { status: 400 }
          );
        }
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
      vendor_id: vendor_id || null,
    })
    .select()
    .single();

  const err = supabaseError(error, "mood-board");
  if (err) return err;

  // Sign the stored path so the client can render the new item immediately.
  let responseImageUrl = (data as { image_url: string }).image_url;
  if (responseImageUrl && !responseImageUrl.startsWith("http")) {
    const { data: s } = await supabase.storage
      .from("attachments")
      .createSignedUrl(responseImageUrl, SIGNED_URL_TTL);
    if (s?.signedUrl) responseImageUrl = s.signedUrl;
  }

  return NextResponse.json({ ...data, image_url: responseImageUrl }, { status: 201 });
}
