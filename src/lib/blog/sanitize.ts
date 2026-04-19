import sanitizeHtml from "sanitize-html";

// Defense-in-depth: we sanitize on BOTH write (in /api/blog POST/PATCH) and
// read (when rendering the post HTML). If admin credentials are ever
// compromised or a code path bypasses the render-side sanitizer, the DB
// itself still only contains safe HTML.

const SANITIZE_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, "iframe", "img"],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: [...(sanitizeHtml.defaults.allowedAttributes["a"] || []), "target", "rel"],
    iframe: ["src", "width", "height", "frameborder", "allowfullscreen", "allow", "title"],
    img: ["src", "alt", "width", "height", "loading", "decoding", "class", "style"],
  },
  allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"],
};

export function sanitizeBlogContent(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, SANITIZE_CONFIG);
}
