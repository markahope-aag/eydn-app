// Skeleton shell for the public vision board. Matches the masonry grid
// layout of VisionBoardGrid so the page doesn't reflow when the real
// content swaps in.

const HEIGHTS = [180, 240, 200, 300, 160, 280, 220, 200, 260, 180, 240, 200];

export default function PublicVisionBoardLoading() {
  return (
    <div className="min-h-screen bg-whisper">
      {/* Header placeholder matching the real page's gradient banner */}
      <div className="relative py-16 px-6 bg-gradient-to-br from-[#2C3E2D] to-[#D4A5A5] animate-pulse">
        <div className="flex flex-col items-center gap-3">
          <div className="h-3 w-32 rounded bg-white/15" />
          <div className="h-12 w-72 max-w-full rounded bg-white/20" />
          <div className="h-4 w-56 rounded bg-white/10" />
        </div>
      </div>

      {/* Masonry grid placeholders */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex gap-2 flex-wrap justify-center mb-8">
          {[80, 110, 100, 90, 130].map((w, i) => (
            <div key={i} className="h-7 rounded-full bg-lavender animate-pulse" style={{ width: w }} />
          ))}
        </div>
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="break-inside-avoid rounded-[16px] bg-lavender animate-pulse"
              style={{ height: h }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
