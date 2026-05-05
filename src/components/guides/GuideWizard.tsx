"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import type { GuideDefinition } from "@/lib/guides/types";
import { FieldRenderer } from "./FieldRenderer";
import { trackGuideComplete, trackVendorBriefGenerated } from "@/lib/analytics";

type SavedGuide = {
  section_index: number;
  responses: Record<string, unknown>;
  completed: boolean;
  vendor_brief: Record<string, unknown> | null;
};

type ColorPalette = {
  name: string;
  description: string;
  colors: { hex: string; name: string }[];
};

type InspirationImage = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
  photographer_url: string;
  unsplash_url: string;
  track_url: string;
  query: string;
};

type Props = {
  guide: GuideDefinition;
};

export function GuideWizard({ guide }: Props) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendorBrief, setVendorBrief] = useState<Record<string, unknown> | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [palettesLoading, setPalettesLoading] = useState(false);
  const [inspirationImages, setInspirationImages] = useState<InspirationImage[]>([]);
  const [inspirationLoading, setInspirationLoading] = useState(false);
  const [inspirationLoaded, setInspirationLoaded] = useState(false);
  const [savedImageIds, setSavedImageIds] = useState<Set<string>>(new Set());
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Load saved progress
  useEffect(() => {
    fetch(`/api/guides/${guide.slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SavedGuide | null) => {
        if (data) {
          setResponses(data.responses || {});
          setSectionIndex(data.completed ? guide.sections.length : data.section_index);
          setCompleted(data.completed);
          setVendorBrief(data.vendor_brief);

          // Load palettes for completed colors-theme guide
          if (data.completed && guide.slug === "colors-theme") {
            fetch("/api/guides/colors-theme/generate", { method: "POST" })
              .then((r) => r.ok ? r.json() : null)
              .then((d) => { if (d?.palettes) setPalettes(d.palettes); })
              .catch(() => {});
          }
        }
      })
      .catch((e) => console.error("[fetch] guide progress", e))
      .finally(() => setLoading(false));
  }, [guide.slug, guide.sections.length]);

  // Auto-save with debounce
  const saveProgress = useCallback(
    (newResponses: Record<string, unknown>, newSectionIndex: number, isCompleted: boolean) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await fetch(`/api/guides/${guide.slug}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              responses: newResponses,
              section_index: newSectionIndex,
              completed: isCompleted,
            }),
          });
        } catch {
          // Silent fail — will retry on next save
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [guide.slug]
  );

  function updateResponse(questionId: string, value: unknown) {
    const updated = { ...responses, [questionId]: value };
    setResponses(updated);
    saveProgress(updated, sectionIndex, false);
  }

  // For the Colors & Theme guide, fetch inspiration images when the user
  // reaches the "Inspiration Images" section. Lazy so we only hit Unsplash
  // (and use a search quota slot) when the user actually needs them.
  useEffect(() => {
    if (guide.slug !== "colors-theme") return;
    const currentSection = guide.sections[sectionIndex];
    if (!currentSection || currentSection.title !== "Inspiration Images") return;
    if (inspirationLoaded || inspirationLoading) return;

    setInspirationLoading(true);
    fetch("/api/guides/colors-theme/inspiration", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { images: InspirationImage[] } | null) => {
        if (data?.images) setInspirationImages(data.images);
        setInspirationLoaded(true);
      })
      .catch(() => setInspirationLoaded(true))
      .finally(() => setInspirationLoading(false));
  }, [guide.slug, guide.sections, sectionIndex, inspirationLoaded, inspirationLoading]);

  async function saveInspirationImage(image: InspirationImage) {
    if (savedImageIds.has(image.id)) return;
    setSavedImageIds((prev) => new Set(prev).add(image.id));

    // Fire the Unsplash download tracking ping in parallel with the save —
    // both are best-effort, neither blocks the user.
    fetch("/api/unsplash/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_url: image.track_url }),
    }).catch(() => {});

    try {
      const res = await fetch("/api/mood-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: image.url,
          caption: image.alt,
          category: "Colors & Palette",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Saved to mood board");
    } catch {
      toast.error("Couldn't save that image. Try again.");
      setSavedImageIds((prev) => {
        const next = new Set(prev);
        next.delete(image.id);
        return next;
      });
    }
  }

  async function goNext() {
    const next = sectionIndex + 1;
    if (next >= guide.sections.length) {
      // Complete

      // Auto-calculate guest total for guest-list guide
      let finalResponses = responses;
      if (guide.slug === "guest-list") {
        const textFields = ["q8", "q9", "q10", "q11"];
        let estimatedTotal = 0;
        for (const key of textFields) {
          const text = responses[key] as string;
          if (text?.trim()) {
            const names = text.split(/[\n,]+/).flatMap((n) => n.trim().split(/\s+and\s+/i)).filter((n) => n.trim().length > 1);
            estimatedTotal += names.length;
          }
        }
        if (estimatedTotal > 0 && !responses.q13) {
          finalResponses = { ...responses, q13: estimatedTotal };
          setResponses(finalResponses);
        }
      }

      setCompleted(true);
      setSectionIndex(next);
      saveProgress(finalResponses, next, true);
      trackGuideComplete(guide.slug);
      toast.success(`${guide.title} complete`);

      // Run integrations for all guide types
      try {
        const res = await fetch(`/api/guides/${guide.slug}/integrate`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          const results = (data as { results: string[] }).results;
          for (const msg of results) {
            toast.success(msg);
          }
        }
      } catch {
        // Integration failed silently — guide data is still saved
      }

      // Auto-generate vendor brief if applicable
      if (guide.integrations.includes("vendor-brief")) {
        setBriefLoading(true);
        try {
          const res = await fetch(`/api/guides/${guide.slug}/brief`, { method: "POST" });
          if (res.ok) {
            const brief = await res.json();
            setVendorBrief(brief);
            toast.success("Vendor brief generated — ready to send");
          }
        } catch {
          // Brief generation failed — user can retry manually
        } finally {
          setBriefLoading(false);
        }
      }

      // Generate color palettes for colors-theme guide
      if (guide.slug === "colors-theme") {
        setPalettesLoading(true);
        try {
          const res = await fetch("/api/guides/colors-theme/generate", { method: "POST" });
          if (res.ok) {
            const data = await res.json();
            setPalettes((data as { palettes: ColorPalette[] }).palettes || []);
          }
        } catch {
          // Palette generation failed — not critical
        } finally {
          setPalettesLoading(false);
        }
      }
    } else {
      setSectionIndex(next);
      saveProgress(responses, next, false);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (sectionIndex > 0) {
      setSectionIndex(sectionIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function restart() {
    setCompleted(false);
    setSectionIndex(0);
    saveProgress(responses, 0, false);
  }

  async function generateBrief() {
    setBriefLoading(true);
    try {
      const res = await fetch(`/api/guides/${guide.slug}/brief`, { method: "POST" });
      if (!res.ok) throw new Error();
      const brief = await res.json();
      setVendorBrief(brief);
      trackVendorBriefGenerated(guide.slug);
      toast.success("Vendor brief ready");
    } catch {
      toast.error("Couldn't generate the brief. Try again.");
    } finally {
      setBriefLoading(false);
    }
  }

  if (loading) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  const section = guide.sections[sectionIndex];
  const totalSections = guide.sections.length;
  const isLastSection = sectionIndex === totalSections - 1;
  const hasVendorBrief = guide.integrations.includes("vendor-brief");

  // Build personalized brief message from guide responses + colors-theme cross-data
  function buildBriefMessage(): string | null {
    if (!vendorBrief) return null;

    const vendorNames: Record<string, string> = {
      florist: "florist",
      rentals: "rental company",
      "hair-makeup": "hair and makeup artist",
      music: "DJ",
      decor: "decorator",
    };
    const vendorName = vendorNames[guide.slug];
    if (!vendorName) return null;

    // Try to pull style context from the responses
    const vibeKeys = ["q1", "q7", "q12"]; // vibe, reception vibe, style words
    const vibeValues: string[] = [];
    for (const key of vibeKeys) {
      const v = responses[key];
      if (Array.isArray(v) && v.length > 0) {
        vibeValues.push(...v.map((s: string) => s.replace(/-/g, " ")));
      } else if (typeof v === "string" && v.trim()) {
        vibeValues.push(v.replace(/-/g, " "));
      }
    }

    const vibeStr = vibeValues.length > 0
      ? ` Eydn wrote it based on your ${vibeValues.slice(0, 3).join(", ")} vibe.`
      : " Eydn wrote it from your answers — ready to personalize and send.";

    return `Your ${vendorName} brief is ready to send.${vibeStr}`;
  }

  // Per-guide celebration copy
  function getCelebrationCopy(): { headline: string; subtext: string } {
    const guideMessages: Record<string, { headline: string; subtext: string }> = {
      "guest-list": {
        headline: "Your guest list is taking shape",
        subtext: "The people who matter most, all in one place. Eydn will keep track of every RSVP, meal choice, and plus-one from here.",
      },
      "colors-theme": {
        headline: "Your vision is locked in",
        subtext: "Every guide from here — florist, decor, dress, hair — pulls from the aesthetic you just defined. No repeating yourself.",
      },
      florist: {
        headline: "Your floral vision is on paper",
        subtext: "From ceremony arch to centerpieces, your florist will know exactly what you're after. One less conversation to stress about.",
      },
      rentals: {
        headline: "Tables, chairs, linens — sorted",
        subtext: "The logistics nobody thinks about until it's too late. You just handled them. Your rental company will thank you.",
      },
      "wedding-dress": {
        headline: "You know what you want",
        subtext: "Walking into a bridal boutique with this kind of clarity is rare. You're going to make the most of every appointment.",
      },
      "hair-makeup": {
        headline: "Your beauty plan is set",
        subtext: "Trial dates, inspiration, skin concerns — all captured. Your artist can skip the guesswork and focus on making you feel incredible.",
      },
      decor: {
        headline: "Your spaces are going to be beautiful",
        subtext: "Ceremony, reception, every corner — you've thought it through. Your decorator is going to love working with this brief.",
      },
      music: {
        headline: "The soundtrack is planned",
        subtext: "First dance, do-not-play list, ceremony moments — all decided. The only thing left is to dance to it.",
      },
      speeches: {
        headline: "The words will be perfect",
        subtext: "Speakers chosen, timing planned, tone set. The toasts are going to be one of the best parts of the night.",
      },
      registry: {
        headline: "Your registry is ready to share",
        subtext: "Guests will know exactly how to celebrate you. Links saved and ready for your wedding website.",
      },
    };
    return guideMessages[guide.slug] || {
      headline: `${guide.title} — done`,
      subtext: "Your answers are saved and ready to use across your planning.",
    };
  }

  // Completion screen
  if (completed || sectionIndex >= totalSections) {
    const briefMessage = buildBriefMessage();
    const celebration = getCelebrationCopy();

    return (
      <div>
        <div className="text-center py-12 max-w-lg mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-violet/10 mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-[28px] font-semibold text-plum leading-tight">{celebration.headline}</h2>
          <p className="mt-3 text-[15px] text-muted leading-relaxed">{celebration.subtext}</p>
          {briefMessage && (
            <div className="mt-6 rounded-2xl bg-lavender/40 border border-violet/15 px-6 py-4">
              <p className="text-[15px] text-plum leading-relaxed">{briefMessage}</p>
            </div>
          )}
          <p className="mt-6 text-[14px] text-muted/70">{guide.outcome}</p>
          <div className="mt-8 flex justify-center gap-3">
            <button onClick={restart} className="btn-secondary">
              Review Answers
            </button>
            {hasVendorBrief && (
              <button
                onClick={generateBrief}
                disabled={briefLoading}
                className="btn-primary"
              >
                {briefLoading ? "Generating..." : vendorBrief ? "Regenerate Vendor Brief" : "Generate Vendor Brief"}
              </button>
            )}
            <Link href="/dashboard/guides" className="btn-ghost">
              Back to Guides
            </Link>
          </div>
        </div>

        {/* Color palettes */}
        {palettesLoading && (
          <div className="mt-8 text-center">
            <p className="text-[15px] text-muted animate-pulse">Generating your color palettes...</p>
          </div>
        )}
        {palettes.length > 0 && (
          <div className="mt-8 space-y-6">
            <h2 className="text-[18px] font-semibold text-plum">Your Color Palettes</h2>
            {palettes.map((palette, pi) => (
              <div key={pi} className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-[15px] font-semibold text-plum">{palette.name}</h3>
                    <p className="text-[12px] text-muted">{palette.description}</p>
                  </div>
                  <button
                    onClick={async () => {
                      // Save palette as a mood board item
                      try {
                        // Create an SVG palette image as a data URL
                        const svgWidth = 500;
                        const swatchWidth = svgWidth / palette.colors.length;
                        const rects = palette.colors.map((c, i) =>
                          `<rect x="${i * swatchWidth}" y="0" width="${swatchWidth}" height="100" fill="${c.hex}"/>` +
                          `<text x="${i * swatchWidth + swatchWidth / 2}" y="130" text-anchor="middle" font-size="11" font-family="sans-serif" fill="#333">${c.name}</text>`
                        ).join("");
                        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="150">${rects}</svg>`;
                        const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;

                        const res = await fetch("/api/mood-board", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            image_url: dataUrl,
                            caption: `${palette.name}: ${palette.colors.map((c) => c.name).join(", ")}`,
                            category: "Colors & Palette",
                          }),
                        });
                        if (res.ok) {
                          toast.success(`${palette.name} saved to mood board`);
                        } else {
                          throw new Error();
                        }
                      } catch {
                        toast.error("Palette didn't save. Try again.");
                      }
                    }}
                    className="btn-secondary btn-sm flex-shrink-0"
                  >
                    Save to Mood Board
                  </button>
                </div>
                <div className="flex gap-1 mt-3">
                  {palette.colors.map((color, ci) => (
                    <div key={ci} className="flex-1 text-center">
                      <div
                        className="w-full h-16 rounded-[10px] border border-border"
                        style={{ backgroundColor: color.hex }}
                      />
                      <p className="mt-1 text-[11px] text-muted">{color.name}</p>
                      <p className="text-[10px] text-muted/60 font-mono">{color.hex}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={async () => {
                setPalettesLoading(true);
                try {
                  const res = await fetch("/api/guides/colors-theme/generate", { method: "POST" });
                  if (res.ok) {
                    const data = await res.json();
                    setPalettes((data as { palettes: ColorPalette[] }).palettes || []);
                    toast.success("New palettes generated");
                  }
                } catch {
                  toast.error("Couldn't regenerate. Try again.");
                } finally {
                  setPalettesLoading(false);
                }
              }}
              disabled={palettesLoading}
              className="btn-ghost btn-sm"
            >
              {palettesLoading ? "Generating..." : "Regenerate Palettes"}
            </button>
          </div>
        )}

        {/* Vendor brief display */}
        {vendorBrief && (
          <div className="mt-8 card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-plum">Vendor Brief</h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    (vendorBrief as { text?: string }).text || JSON.stringify(vendorBrief, null, 2)
                  );
                  toast.success("Copied to clipboard");
                }}
                className="btn-secondary btn-sm"
              >
                Copy
              </button>
            </div>
            <div className="prose prose-sm text-[14px] text-plum whitespace-pre-wrap leading-relaxed">
              {(vendorBrief as { text?: string }).text || JSON.stringify(vendorBrief, null, 2)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="flex gap-1 mb-6">
        {guide.sections.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition ${
              i < sectionIndex
                ? "bg-violet"
                : i === sectionIndex
                ? "bg-violet/50"
                : "bg-lavender"
            }`}
          />
        ))}
      </div>

      {/* Section header */}
      <p className="text-[12px] font-semibold text-violet">
        Section {sectionIndex + 1} of {totalSections}
      </p>
      <h2 className="mt-1 text-[20px] font-semibold text-plum">{section.title}</h2>
      {section.description && (
        <p className="mt-2 text-[14px] text-muted leading-relaxed">{section.description}</p>
      )}

      {/* Inspiration Images gallery — only on the colors-theme guide's
          Inspiration Images section. Replaces the q15 Save/Skip dropdown
          with a real grid of Unsplash picks the user can save individually. */}
      {guide.slug === "colors-theme" && section.title === "Inspiration Images" && (
        <div className="mt-6">
          {inspirationLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-[12px] bg-lavender/40 animate-pulse" />
              ))}
            </div>
          )}
          {!inspirationLoading && inspirationImages.length === 0 && inspirationLoaded && (
            <p className="text-[14px] text-muted py-6 text-center">
              We couldn&apos;t pull a board this time. Skip ahead — your saved answers will still
              shape your other guides.
            </p>
          )}
          {inspirationImages.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {inspirationImages.map((img) => {
                  const saved = savedImageIds.has(img.id);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => saveInspirationImage(img)}
                      disabled={saved}
                      aria-label={saved ? "Saved to mood board" : `Save ${img.alt}`}
                      className={`group relative aspect-[3/4] rounded-[12px] overflow-hidden border transition ${
                        saved ? "border-violet ring-2 ring-violet/30" : "border-border hover:border-violet/50"
                      }`}
                    >
                      <Image
                        src={img.thumb}
                        alt={img.alt}
                        fill
                        sizes="(min-width: 640px) 220px, 50vw"
                        className="object-cover"
                        unoptimized
                      />
                      <div className={`absolute inset-0 transition ${saved ? "bg-violet/30" : "bg-black/0 group-hover:bg-black/15"}`} />
                      <span
                        className={`absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-semibold transition ${
                          saved
                            ? "bg-violet text-white"
                            : "bg-white/90 text-plum opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {saved ? "✓" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[12px] text-muted/80">
                Tap an image to save it to your mood board. Photos from{" "}
                <a
                  href="https://unsplash.com/?utm_source=eydn-app&utm_medium=referral"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-violet underline"
                >
                  Unsplash
                </a>
                .
              </p>
            </>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="mt-6 space-y-6">
        {section.questions.map((q) => {
          // Hide the redundant q15 Save/Skip select when the inspiration
          // gallery is in play — saving is now per-image.
          if (guide.slug === "colors-theme" && section.title === "Inspiration Images" && q.id === "q15") {
            return null;
          }
          return (
            <div key={q.id}>
              <label className="text-[14px] font-semibold text-plum block mb-2">
                {q.label}
                {q.required && <span className="text-error ml-1">*</span>}
              </label>
              <FieldRenderer
                field={q.field}
                value={responses[q.id]}
                onChange={(v) => updateResponse(q.id, v)}
              />
              {q.tip && (
                <p className="mt-1.5 text-[12px] text-violet italic">{q.tip}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={sectionIndex === 0}
          className="btn-secondary disabled:opacity-30"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          {saving && (
            <span className="text-[12px] text-muted">Saving...</span>
          )}
          <button onClick={goNext} className="btn-primary">
            {isLastSection ? "Complete" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
