"use client";

import { useState } from "react";

type Item = {
  id: string;
  image_url: string;
  caption: string | null;
  category: string;
  size?: string | null;
};

interface Props {
  items: Item[];
}

// Mirrors the dashboard board's tile spans so the public board matches the
// couple's chosen sizes.
const SIZE_SPAN: Record<string, string> = {
  small: "col-span-1 row-span-1",
  medium: "col-span-2 row-span-1",
  large: "col-span-2 row-span-2",
};

/**
 * Public-facing masonry grid for the wedding vision board. Read-only — no
 * editing, no vendor info, no locations (those are kept private on the
 * couple's dashboard). Categories drive a filter pill row at the top so a
 * florist can jump straight to "Florals & Bouquets" without scrolling past
 * cake and stationery inspiration.
 */
export function VisionBoardGrid({ items }: Props) {
  const [filter, setFilter] = useState("All");
  const [lightbox, setLightbox] = useState<Item | null>(null);

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = filter === "All" ? items : items.filter((i) => i.category === filter);

  return (
    <>
      {/* Category filter */}
      {categories.length > 2 && (
        <div className="flex gap-2 flex-wrap justify-center mb-8">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition border ${
                filter === c
                  ? "text-white border-transparent"
                  : "text-plum/80 border-border bg-white hover:border-plum/40"
              }`}
              style={filter === c ? { backgroundColor: "var(--theme-primary)" } : undefined}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Resizable grid — mirrors the couple's chosen order and tile sizes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[170px] gap-3 grid-flow-row-dense">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setLightbox(item)}
            className={`${SIZE_SPAN[item.size || "small"] || SIZE_SPAN.small} group relative rounded-[16px] overflow-hidden bg-white border border-border hover:shadow-lg transition-shadow text-left`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt={item.caption || "Wedding inspiration"}
              className="w-full h-full object-cover block"
              loading="lazy"
            />
            {item.caption && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <p className="text-[12px] text-white font-medium leading-snug">
                  {item.caption}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Vision board image viewer"
        >
          <div
            className="bg-white rounded-[20px] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.image_url}
                alt={lightbox.caption || "Wedding inspiration"}
                className="w-full max-h-[70vh] object-contain bg-black/5"
              />
              <button
                type="button"
                onClick={() => setLightbox(null)}
                aria-label="Close preview"
                className="absolute top-3 right-3 w-9 h-9 bg-white/95 hover:bg-white text-plum rounded-full text-[20px] flex items-center justify-center shadow"
              >
                ×
              </button>
            </div>
            {(lightbox.caption || lightbox.category) && (
              <div className="px-5 py-4 border-t border-border">
                {lightbox.category && (
                  <p className="text-[11px] uppercase tracking-widest text-muted">
                    {lightbox.category}
                  </p>
                )}
                {lightbox.caption && (
                  <p className="mt-1 text-[15px] text-plum">{lightbox.caption}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
