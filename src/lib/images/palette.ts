/**
 * Browser-only dominant-color extraction from an image URL. Downscales the
 * image to a canvas, buckets pixels by reduced precision, and returns the most
 * common colors as hex. Pure canvas — no dependency. Resolves to an empty array
 * if the image can't be read (e.g. cross-origin without CORS).
 */

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/** Relative luminance (0–255-ish) of a hex color. */
function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return 0;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Choose a primary/accent pair from a palette for a website theme: darkest
 * color as primary, lightest as accent — gives the hero gradient good contrast.
 * Returns null if there aren't at least two colors.
 */
export function pickThemeColors(palette: string[]): { primary: string; accent: string } | null {
  if (palette.length < 2) return null;
  const sorted = [...palette].sort((a, b) => luminance(a) - luminance(b));
  return { primary: sorted[0], accent: sorted[sorted.length - 1] };
}

export async function extractPalette(url: string, count = 5): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const w = 80;
        const h = Math.max(1, Math.round((img.height / img.width) * w));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve([]);
        ctx.drawImage(img, 0, 0, w, h);

        const { data } = ctx.getImageData(0, 0, w, h);
        const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 125) continue; // skip transparent pixels
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // 16 levels per channel keeps similar shades together.
          const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
          const entry = buckets.get(key);
          if (entry) {
            entry.count++;
            entry.r += r;
            entry.g += g;
            entry.b += b;
          } else {
            buckets.set(key, { count: 1, r, g, b });
          }
        }

        const top = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, count);
        resolve(
          top.map((e) => rgbToHex(Math.round(e.r / e.count), Math.round(e.g / e.count), Math.round(e.b / e.count)))
        );
      } catch {
        // getImageData throws on a CORS-tainted canvas — degrade gracefully.
        resolve([]);
      }
    };

    img.onerror = () => resolve([]);
    img.src = url;
  });
}
