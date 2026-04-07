"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { PremiumButton } from "@/components/PremiumGate";
import { exportWeddingBinder } from "@/lib/export-binder";
import { Tooltip } from "@/components/Tooltip";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { trackExport } from "@/lib/analytics";

import { DayOfPlan, TimelineItem, Tab } from "./_components/types";
import { generateTimelineFromCeremony } from "./_components/timeline-utils";
import { TimelineTab } from "./_components/TimelineTab";
import { VendorsTab } from "./_components/VendorsTab";
import { PackingTab } from "./_components/PackingTab";
import { CeremonyTab } from "./_components/CeremonyTab";
import { MusicTab } from "./_components/MusicTab";
import { SpeechesTab } from "./_components/SpeechesTab";
import { SetupTasksTab } from "./_components/SetupTasksTab";
import { AttireTab } from "./_components/AttireTab";
import { exportDayOfPDF } from "./_components/export-pdf";

export default function DayOfPage() {
  const [plan, setPlan] = useState<DayOfPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [noWedding, setNoWedding] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("timeline");
  const [timelineFilter, setTimelineFilter] = useState("All");
  const [ceremonyTime, setCeremonyTime] = useState("");
  const [newPackingItem, setNewPackingItem] = useState("");
  const [binderLoading, setBinderLoading] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [weddingId, setWeddingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/day-of").then((r) => {
        if (r.status === 404) { setNoWedding(true); return null; }
        return r.ok ? r.json() : null;
      }),
      fetch("/api/weddings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([dayOfData, weddingData]) => {
        if (weddingData) {
          setWeddingId(weddingData.id);
        }
        if (!dayOfData?.content) return;
        const content = dayOfData.content as DayOfPlan;
        // Migrate old string[] packing checklist to PackingItem[]
        if (content.packingChecklist && content.packingChecklist.length > 0) {
          const first = content.packingChecklist[0];
          if (typeof first === "string") {
            content.packingChecklist = (content.packingChecklist as unknown as string[]).map(
              (item: string) => ({ item, notes: "" })
            );
          }
        }
        // Ensure new fields have defaults for plans generated before these fields existed
        if (!content.ceremonyScript) content.ceremonyScript = "";
        if (!content.processionalOrder) content.processionalOrder = [];
        if (!content.officiantNotes) content.officiantNotes = "";
        if (!content.music) content.music = [];
        if (!content.speeches) content.speeches = [];
        if (!content.setupTasks) content.setupTasks = [];
        if (!content.attire) content.attire = [];
        setPlan(content);
        // Canonical ceremony time: prefer weddings table, fall back to plan content
        const canonicalTime = weddingData?.ceremony_time || content.ceremonyTime || "";
        setCeremonyTime(canonicalTime);
      })
      .catch((err) => console.error("Failed to load day-of plan", err))
      .finally(() => setLoading(false));
  }, []);

  async function savePlan(updated: DayOfPlan) {
    setPlan(updated);
    await fetch("/api/day-of", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: updated }),
    }).catch(() => toast.error("Changes didn't save. Try again."));
  }

  function updateTimeline(index: number, field: keyof TimelineItem, value: string) {
    if (!plan) return;
    const updated = [...plan.timeline];
    updated[index] = { ...updated[index], [field]: value };
    savePlan({ ...plan, timeline: updated });
  }

  function addTimelineItem() {
    if (!plan) return;
    savePlan({ ...plan, timeline: [...plan.timeline, { time: "", event: "", notes: "" }] });
  }

  function removeTimelineItem(index: number) {
    if (!plan) return;
    savePlan({ ...plan, timeline: plan.timeline.filter((_, i) => i !== index) });
  }

  function handleCeremonyTimeSet() {
    if (!plan || !ceremonyTime) return;
    if (plan.timeline.length > 0 && plan.ceremonyTime !== ceremonyTime) {
      setConfirmRegenerate(true);
      return;
    }
    doRegenerateTimeline();
  }

  async function doRegenerateTimeline() {
    if (!plan || !ceremonyTime) return;
    const newTimeline = generateTimelineFromCeremony(ceremonyTime);
    if (newTimeline.length === 0) {
      toast.error("Enter a valid time like 4:30 PM");
      return;
    }
    savePlan({ ...plan, ceremonyTime, timeline: newTimeline });
    if (weddingId) {
      await fetch(`/api/weddings/${weddingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ceremony_time: ceremonyTime }),
      }).catch(() => { /* day-of save already succeeded */ });
    }
    toast.success("Timeline rebuilt — ceremony time synced across the app");
  }

  function updatePackingNote(index: number, notes: string) {
    if (!plan) return;
    const updated = [...plan.packingChecklist];
    updated[index] = { ...updated[index], notes };
    savePlan({ ...plan, packingChecklist: updated });
  }

  function addPackingItem() {
    if (!plan || !newPackingItem.trim()) return;
    savePlan({
      ...plan,
      packingChecklist: [...plan.packingChecklist, { item: newPackingItem.trim(), notes: "" }],
    });
    setNewPackingItem("");
  }

  function removePackingItem(index: number) {
    if (!plan) return;
    savePlan({ ...plan, packingChecklist: plan.packingChecklist.filter((_, i) => i !== index) });
  }

  function toggleCheckItem(item: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  if (loading) {
    return <SkeletonList count={5} />;
  }

  if (noWedding) return <NoWeddingState feature="Day-of Planner" />;

  if (!plan) {
    return (
      <div className="max-w-3xl">
        <h1>Day-of Planner</h1>
        <p className="mt-2 text-[15px] text-muted">
          Generate your day-of timeline, vendor contact sheet, and packing checklist.
        </p>
        <div className="mt-8 card p-4 sm:p-6 md:p-8 text-center space-y-5">
          <div>
            <p className="text-[17px] font-semibold text-plum">Set your ceremony time to generate your timeline</p>
            <p className="text-[13px] text-muted mt-1">Everything else — hair &amp; makeup, photos, dinner, dancing — is scheduled around this time.</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <input
              id="ceremony-time-initial"
              type="time"
              value={ceremonyTime}
              onChange={(e) => setCeremonyTime(e.target.value)}
              aria-label="Ceremony start time"
              className="rounded-[12px] border-2 border-violet/30 px-4 py-3 text-[20px] font-semibold text-plum w-44 text-center focus:border-violet focus:ring-2 focus:ring-violet/20 transition"
            />
          </div>
          <button
            onClick={async () => {
              let customTimeline: TimelineItem[] | null = null;
              if (ceremonyTime.trim()) {
                customTimeline = generateTimelineFromCeremony(ceremonyTime);
                if (customTimeline.length === 0) {
                  toast.error("Enter a valid time like 4:30 PM");
                  return;
                }
              }
              try {
                const res = await fetch("/api/day-of");
                if (!res.ok) throw new Error();
                const data = await res.json();
                const content = data.content as DayOfPlan;
                if (content.packingChecklist && content.packingChecklist.length > 0) {
                  const first = content.packingChecklist[0];
                  if (typeof first === "string") {
                    content.packingChecklist = (content.packingChecklist as unknown as string[]).map(
                      (item) => ({ item, notes: "" })
                    );
                  }
                }
                if (customTimeline && ceremonyTime.trim()) {
                  content.ceremonyTime = ceremonyTime;
                  content.timeline = customTimeline;
                  await fetch("/api/day-of", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content }),
                  });
                }
                setPlan(content);
                const finalTime = content.ceremonyTime || ceremonyTime;
                setCeremonyTime(finalTime);
                // Sync ceremony time to weddings table
                if (weddingId && finalTime) {
                  await fetch(`/api/weddings/${weddingId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ceremony_time: finalTime }),
                  }).catch(() => {});
                }
                toast.success("Day-of plan ready — ceremony time synced");
              } catch {
                toast.error("Couldn't generate the plan. Try again.");
              }
            }}
            disabled={!ceremonyTime.trim()}
            className="btn-primary text-[16px] px-8 py-3 disabled:opacity-40"
          >
            Generate Timeline
          </button>
          <p className="text-[12px] text-muted">
            We&apos;ll pull in your vendors and wedding party info automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1>Day-of Planner</h1>
        <div className="flex items-center gap-2">
          <PremiumButton onClick={() => exportDayOfPDF(plan)} className="btn-secondary btn-sm">
            Export PDF
          </PremiumButton>
          <Tooltip text="Downloads your timeline and vendor contacts as a printable PDF." />
          <PremiumButton
            onClick={async () => {
              setBinderLoading(true);
              try {
                await exportWeddingBinder();
                trackExport("binder");
                toast.success("Binder downloaded");
              } catch {
                toast.error("Binder didn't download. Try again.");
              } finally {
                setBinderLoading(false);
              }
            }}
            className="btn-primary btn-sm"
            disabled={binderLoading}
          >
            {binderLoading ? "Generating..." : "Export Full Binder"}
          </PremiumButton>
          <Tooltip text="The Full Binder includes your timeline, vendor contacts, wedding party jobs, packing checklist, seating chart, and ceremony layout — everything your coordinator needs." wide />
        </div>
      </div>
      <p className="mt-1 text-[15px] text-muted">
        Your complete wedding day plan. Click any field to edit.
      </p>

      {/* Ceremony time */}
      <div className="mt-4 card p-4 flex flex-wrap items-center gap-3">
        <label className="text-[15px] font-semibold text-plum whitespace-nowrap" htmlFor="ceremony-time-main">Ceremony at</label>
        <input
          id="ceremony-time-main"
          type="time"
          value={ceremonyTime}
          onChange={(e) => setCeremonyTime(e.target.value)}
          aria-label="Ceremony start time"
          className="rounded-[10px] border-2 border-violet/30 px-3 py-1.5 text-[17px] font-semibold text-plum w-36 text-center"
        />
        <button onClick={handleCeremonyTimeSet} className="btn-secondary btn-sm">
          Regenerate Timeline
        </button>
        <Tooltip text="Changing the ceremony time recalculates all events. Custom events you've added are preserved." wide />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-border overflow-x-auto">
        {(["timeline", "ceremony", "music", "speeches", "setup", "attire", "vendors", "packing"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[15px] font-semibold border-b-2 transition whitespace-nowrap ${
              tab === t
                ? "border-violet text-violet"
                : "border-transparent text-muted hover:text-plum"
            }`}
          >
            {
              {
                timeline: "Timeline",
                vendors: "Vendors & Party",
                packing: "Packing Checklist",
                ceremony: "Ceremony",
                music: "Music",
                speeches: "Speeches",
                setup: "Setup Tasks",
                attire: "Attire",
              }[t]
            }
          </button>
        ))}
      </div>

      {tab === "timeline" && (
        <TimelineTab
          plan={plan}
          timelineFilter={timelineFilter}
          setTimelineFilter={setTimelineFilter}
          updateTimeline={updateTimeline}
          addTimelineItem={addTimelineItem}
          removeTimelineItem={removeTimelineItem}
        />
      )}

      {tab === "vendors" && <VendorsTab plan={plan} />}

      {tab === "packing" && (
        <PackingTab
          plan={plan}
          checkedItems={checkedItems}
          toggleCheckItem={toggleCheckItem}
          updatePackingNote={updatePackingNote}
          removePackingItem={removePackingItem}
          newPackingItem={newPackingItem}
          setNewPackingItem={setNewPackingItem}
          addPackingItem={addPackingItem}
        />
      )}

      {tab === "ceremony" && <CeremonyTab plan={plan} savePlan={savePlan} />}
      {tab === "music" && <MusicTab plan={plan} savePlan={savePlan} />}
      {tab === "speeches" && <SpeechesTab plan={plan} savePlan={savePlan} />}
      {tab === "setup" && <SetupTasksTab plan={plan} savePlan={savePlan} />}
      {tab === "attire" && <AttireTab plan={plan} savePlan={savePlan} />}

      <ConfirmDialog
        open={confirmRegenerate}
        title="Regenerate timeline?"
        message="This will replace your current timeline with a new one based on the updated ceremony time. Any custom events or edits will be lost. The new ceremony time will be synced across the entire app — binder exports, AI assistant, and anywhere else it's referenced."
        confirmLabel="Regenerate"
        onConfirm={() => {
          setConfirmRegenerate(false);
          doRegenerateTimeline();
        }}
        onCancel={() => setConfirmRegenerate(false)}
      />
    </div>
  );
}
