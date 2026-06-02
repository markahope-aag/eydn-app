/**
 * Slice a tall screenshot into readable vertical segments and trim trailing
 * blank space, so each section of a long landing page can be read at full
 * fidelity for design comparison.
 *
 *   node scripts/slice.mjs .screenshots/home/desktop-full.png [segmentHeight]
 *
 * Output → <dir>/<name>-seg-00.png, -01.png, …  alongside the source.
 */
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

const SEG_DEFAULT = 1300;
const NEAR_WHITE = 250; // rows brighter than this (mean) count as blank

async function main() {
  const src = process.argv[2];
  if (!src) throw new Error("usage: node scripts/slice.mjs <image> [segHeight]");
  const segH = Number(process.argv[3] ?? SEG_DEFAULT);

  const img = sharp(src);
  const meta = await img.metadata();
  const { width, height } = meta;

  // Detect real content height: find the last row that isn't near-blank by
  // scanning a downscaled grayscale column-mean.
  const raw = await sharp(src).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = raw;
  let contentBottom = info.height;
  for (let y = info.height - 1; y >= 0; y--) {
    let sum = 0;
    for (let x = 0; x < info.width; x++) sum += data[y * info.width + x];
    const mean = sum / info.width;
    if (mean < NEAR_WHITE) {
      contentBottom = Math.min(height, Math.round((y / info.height) * height) + 8);
      break;
    }
  }

  const dir = path.dirname(src);
  const base = path.basename(src).replace(/\.png$/i, "");
  // Clear old segments
  for (const f of await fs.readdir(dir)) {
    if (f.startsWith(`${base}-seg-`)) await fs.unlink(path.join(dir, f));
  }

  let i = 0;
  for (let top = 0; top < contentBottom; top += segH, i++) {
    const h = Math.min(segH, contentBottom - top);
    const out = path.join(dir, `${base}-seg-${String(i).padStart(2, "0")}.png`);
    await sharp(src).extract({ left: 0, top, width, height: h }).toFile(out);
    console.log(`  ${path.basename(out)}  ${width}x${h}  (y ${top}-${top + h})`);
  }
  console.log(`\ncontent height: ${contentBottom}px  →  ${i} segments`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
