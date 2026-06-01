/**
 * Shared types and helpers for the email image library. Used by both the admin
 * management UI and the template editor's "insert image" picker.
 */

export type EmailImage = {
  id: string;
  path: string;
  url: string;
  alt_text: string;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  content_type: string | null;
  created_at: string;
};

/** Escape a value for safe use inside a double-quoted HTML attribute. */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build an email-safe <img> snippet for pasting into a template body. Uses
 * inline styles only (email clients ignore <style> blocks) and caps the width
 * to the container so it never overflows on mobile.
 */
export function emailImageSnippet(img: {
  url: string;
  alt_text: string;
  width: number | null;
}): string {
  const alt = escapeAttr(img.alt_text || "");
  const src = escapeAttr(img.url);
  const widthAttr = img.width ? ` width="${img.width}"` : "";
  return `<img src="${src}" alt="${alt}"${widthAttr} style="max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 16px auto;" />`;
}

/** Human-readable file size, e.g. "245 KB". */
export function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
