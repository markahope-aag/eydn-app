// Skeleton shell for the shared-by-vendor mood board page.

const HEIGHTS = [200, 260, 180, 240, 220, 300];

export default function SharedBoardLoading() {
  return (
    <div className="min-h-screen bg-whisper px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 space-y-3">
          <div className="h-3 w-40 mx-auto rounded bg-lavender animate-pulse" />
          <div className="h-9 w-72 max-w-full mx-auto rounded bg-lavender animate-pulse" />
          <div className="h-4 w-56 mx-auto rounded bg-lavender/60 animate-pulse" />
        </div>
        <div className="columns-2 md:columns-3 gap-4 space-y-4">
          {HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="break-inside-avoid rounded-[16px] bg-lavender animate-pulse"
              style={{ height: h }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
