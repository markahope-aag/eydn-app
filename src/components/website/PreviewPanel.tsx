"use client";

import { useState, useEffect, useRef } from "react";

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<Device, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

export function PreviewPanel({
  slug,
  enabled,
  lastSavedAt,
}: {
  slug: string;
  enabled: boolean;
  lastSavedAt: number; // timestamp — changes trigger iframe reload
}) {
  const [device, setDevice] = useState<Device>("mobile");
  const [collapsed, setCollapsed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reload iframe when save completes
  useEffect(() => {
    if (lastSavedAt && iframeRef.current && slug) {
      iframeRef.current.src = `/w/${slug}?_preview=1&_t=${lastSavedAt}`;
    }
  }, [lastSavedAt, slug]);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed right-4 top-20 z-30 rounded-[12px] bg-violet text-white px-3 py-2 text-[13px] font-semibold shadow-lg hover:opacity-90 transition"
      >
        Show Preview
      </button>
    );
  }

  if (!slug || !enabled) {
    return (
      <div className="w-[400px] flex-shrink-0 sticky top-4 self-start hidden xl:block">
        <div className="rounded-[16px] border border-border bg-white p-8 text-center">
          <p className="text-[15px] text-muted">
            {!slug ? "Set your website URL to see a preview" : "Enable your website to see a preview"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] flex-shrink-0 sticky top-4 self-start hidden xl:flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["mobile", "tablet", "desktop"] as Device[]).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-[8px] transition ${
                device === d
                  ? "bg-violet text-white"
                  : "bg-lavender text-violet hover:bg-violet hover:text-white"
              }`}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/w/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted hover:text-violet transition"
          >
            Open in new tab
          </a>
          <button
            onClick={() => setCollapsed(true)}
            className="text-[11px] text-muted hover:text-violet transition"
          >
            Hide
          </button>
        </div>
      </div>

      {/* Preview frame */}
      <div
        className="rounded-[16px] border border-border bg-white overflow-hidden shadow-sm"
        style={{ height: "calc(100vh - 8rem)" }}
      >
        <div
          className="origin-top-left overflow-hidden"
          style={{
            width: DEVICE_WIDTHS[device],
            height: "100%",
            transform: `scale(${Math.min(392 / DEVICE_WIDTHS[device], 1)})`,
            transformOrigin: "top left",
          }}
        >
          <iframe
            ref={iframeRef}
            src={`/w/${slug}?_preview=1`}
            title="Website preview"
            className="w-full h-full border-0"
            style={{
              width: DEVICE_WIDTHS[device],
              height: `${Math.ceil((100 / Math.min(392 / DEVICE_WIDTHS[device], 1)))}vh`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
