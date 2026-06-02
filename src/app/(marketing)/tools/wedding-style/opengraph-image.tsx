import { ImageResponse } from "next/og";

export const alt = "What's your wedding style? — a free 2-minute quiz from Eydn";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social share image so this quiz looks distinct when shared, instead
// of falling back to the generic site OG image.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #2C3E2D, #8B7A30)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: 2 }}>
          eydn
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 28, opacity: 0.85, marginBottom: 16 }}>
            Free 2-minute quiz
          </div>
          <div style={{ display: "flex", fontSize: 80, fontWeight: 700, lineHeight: 1.05, maxWidth: 920 }}>
            What&apos;s your wedding style?
          </div>
          <div style={{ display: "flex", fontSize: 30, opacity: 0.85, marginTop: 28, maxWidth: 900 }}>
            Classic · Modern · Rustic · Boho · Romantic · Glam
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, opacity: 0.8 }}>eydn.app</div>
      </div>
    ),
    { ...size }
  );
}
