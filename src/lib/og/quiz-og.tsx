import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Shared branded social share image for the quiz lead-magnet pages, so each
 * quiz looks distinct when shared instead of using the generic site OG image.
 */
export function quizOgImage(opts: { eyebrow: string; title: string; subline: string }) {
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
            {opts.eyebrow}
          </div>
          <div style={{ display: "flex", fontSize: 70, fontWeight: 700, lineHeight: 1.05, maxWidth: 980 }}>
            {opts.title}
          </div>
          <div style={{ display: "flex", fontSize: 30, opacity: 0.85, marginTop: 28, maxWidth: 940 }}>
            {opts.subline}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, opacity: 0.8 }}>eydn.app</div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
