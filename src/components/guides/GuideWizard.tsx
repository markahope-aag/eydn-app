"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
        }
      })
      .catch(() => {})
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
      toast.success(`${guide.title} complete!`);

      // Run integrations (add guests to guest list, etc.)
      if (guide.integrations.includes("guest-list")) {
        try {
          const res = await fetch(`/api/guides/${guide.slug}/integrate`, { method: "POST" });
          if (res.ok) {
            const data = await res.json();
            const results = (data as { results: string[] }).results;
            if (results.length > 0) {
              toast.success(results[0]);
            }
          }
        } catch {
          // Integration failed silently — guide data is still saved
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
      toast.success("Vendor brief generated!");
    } catch {
      toast.error("Failed to generate brief");
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

  // Completion screen
  if (completed || sectionIndex >= totalSections) {
    return (
      <div>
        <div className="text-center py-12">
          <p className="text-[24px] font-semibold text-plum">{guide.title}</p>
          <p className="mt-2 text-[15px] text-violet font-semibold">Complete</p>
          <p className="mt-4 text-[15px] text-muted max-w-md mx-auto">{guide.outcome}</p>
          <div className="mt-6 flex justify-center gap-3">
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
          </div>
        </div>

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
                  toast.success("Copied to clipboard!");
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

      {/* Questions */}
      <div className="mt-6 space-y-6">
        {section.questions.map((q) => (
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
        ))}
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
