/**
 * Browser-only image resizing. Draws the source image to a canvas at a target
 * width (aspect ratio preserved) and re-encodes it, which both shrinks the
 * pixel dimensions and compresses the file — keeping email payloads small.
 *
 * Animated formats (GIF) are flattened by canvas, so callers should skip the
 * resize for those and upload the original to preserve animation.
 */

export type MeasuredImage = {
  blob: Blob;
  width: number;
  height: number;
  contentType: string;
};

/** Read an image's natural dimensions without modifying it. */
async function measure(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close?.();
  return dims;
}

/**
 * Resize `file` so its width is at most `maxWidth` (never upscales). Pass
 * `maxWidth = 0` to keep the original dimensions. PNG/WebP transparency is
 * preserved; other formats are re-encoded as JPEG for smaller files.
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  quality = 0.85
): Promise<MeasuredImage> {
  // Animated GIFs lose their animation when redrawn to a canvas, so keep them
  // untouched and just measure the dimensions.
  if (file.type === "image/gif" || maxWidth <= 0) {
    const { width, height } = await measure(file);
    return { blob: file, width, height, contentType: file.type };
  }

  const bitmap = await createImageBitmap(file);
  const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Your browser does not support image resizing.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const contentType =
    file.type === "image/png" || file.type === "image/webp"
      ? file.type
      : "image/jpeg";

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, contentType, quality)
  );
  if (!blob) throw new Error("Failed to process the image.");

  return { blob, width, height, contentType };
}
