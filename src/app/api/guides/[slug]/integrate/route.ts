import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Process completed guide responses and integrate with the app.
 * Called after a guide is completed to sync data into relevant features.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;
  const { slug } = await ctx.params;

  // Fetch the completed guide responses
  const { data: guide } = await supabase
    .from("guide_responses")
    .select("responses, completed")
    .eq("wedding_id", wedding.id)
    .eq("guide_slug", slug)
    .single();

  if (!guide || !(guide as { completed: boolean }).completed) {
    return NextResponse.json({ error: "Guide not completed" }, { status: 400 });
  }

  const responses = (guide as { responses: Record<string, unknown> }).responses;
  const results: string[] = [];

  if (slug === "guest-list") {
    // Parse free-text guest names from q8 (non-negotiables), q9 (close friends),
    // q10 (obligation), q11 (maybe list) and add to guest list
    const nameFields = [
      { key: "q8", role: "family", group: "Non-negotiables" },
      { key: "q9", role: "friend", group: "Close Friends" },
      { key: "q10", role: "other", group: "Obligation" },
      { key: "q11", role: "other", group: "Maybe List" },
    ];

    let totalParsed = 0;

    for (const { key, role, group } of nameFields) {
      const text = responses[key] as string;
      if (!text?.trim()) continue;

      // Parse names: split by newlines, commas, or "and"
      const names = text
        .split(/[\n,]+/)
        .map((n) => n.trim())
        .flatMap((n) => n.split(/\s+and\s+/i))
        .map((n) => n.replace(/^[-•*]\s*/, "").trim())
        .filter((n) => n.length > 1 && n.length < 100);

      for (const name of names) {
        // Check if already exists
        const { data: existing } = await supabase
          .from("guests")
          .select("id")
          .eq("wedding_id", wedding.id)
          .eq("name", name)
          .is("deleted_at", null)
          .limit(1);

        if (existing && existing.length > 0) continue;

        await supabase.from("guests").insert({
          wedding_id: wedding.id,
          name,
          role,
          group_name: group,
          rsvp_status: "not_invited",
        });
        totalParsed++;
      }
    }

    if (totalParsed > 0) {
      results.push(`Added ${totalParsed} guests to your guest list`);
    }

    // Update capacity on the guide response if venue capacity was provided
    const venueCapacity = responses.q1 as number;
    const guestEstimate = responses.q13 as number;
    if (venueCapacity && guestEstimate) {
      // Auto-flag capacity status
      let capacityStatus = "under";
      if (guestEstimate > venueCapacity) capacityStatus = "over";
      else if (guestEstimate === venueCapacity) capacityStatus = "at";

      await supabase
        .from("guide_responses")
        .update({
          responses: { ...responses, q14: capacityStatus },
          updated_at: new Date().toISOString(),
        })
        .eq("wedding_id", wedding.id)
        .eq("guide_slug", slug);

      results.push(`Capacity: ${guestEstimate} guests vs ${venueCapacity} venue capacity (${capacityStatus})`);
    }

    // Update wedding guest_count_estimate if provided
    if (guestEstimate) {
      await supabase
        .from("weddings")
        .update({ guest_count_estimate: guestEstimate, updated_at: new Date().toISOString() })
        .eq("id", wedding.id);
      results.push(`Updated guest count estimate to ${guestEstimate}`);
    }
  }

  if (slug === "speeches") {
    // Get existing day-of plan
    const { data: planRow } = await supabase
      .from("day_of_plans")
      .select("content")
      .eq("wedding_id", wedding.id)
      .single();

    // Build speaker list from responses
    const speakerLabels: Record<string, string> = {
      "partner-1": "Partner 1",
      "partner-2": "Partner 2",
      "best-man": "Best Man",
      "maid-of-honour": "Maid of Honour",
      "father-partner-1": "Father of Partner 1",
      "father-partner-2": "Father of Partner 2",
      "mother-partner-1": "Mother of Partner 1",
      "mother-partner-2": "Mother of Partner 2",
    };

    const selectedSpeakers = (responses.q4 as string[]) || [];
    const otherSpeakers = ((responses.q4b as string) || "").trim();
    const tone = (responses.q7 as string[]) || [];
    const totalTime = responses.q2 as number;
    const speechCount = responses.q3 as number;
    const timePerSpeaker = totalTime && speechCount ? Math.floor(totalTime / speechCount) : 5;

    // Build speeches array
    const speeches: { speaker: string; role: string; topic: string }[] = [];

    for (const key of selectedSpeakers) {
      if (key === "other") continue;
      speeches.push({
        speaker: speakerLabels[key] || key,
        role: speakerLabels[key] || key,
        topic: tone.length > 0 ? tone.join(", ") : "",
      });
    }

    // Parse "other" speakers from free text
    if (otherSpeakers) {
      const others = otherSpeakers.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      for (const other of others) {
        const parts = other.split(/\s*[—–-]\s*/);
        speeches.push({
          speaker: parts[0] || other,
          role: parts[1] || "Guest",
          topic: tone.length > 0 ? tone.join(", ") : "",
        });
      }
    }

    if (speeches.length > 0 && planRow) {
      const content = (planRow as { content: Record<string, unknown> }).content || {};
      const existingSpeeches = (content.speeches as Array<{ speaker: string }>) || [];

      // Only add new speakers not already in the plan
      const existingNames = new Set(existingSpeeches.map((s) => s.speaker.toLowerCase()));
      const newSpeeches = speeches.filter((s) => !existingNames.has(s.speaker.toLowerCase()));

      if (newSpeeches.length > 0) {
        const updatedSpeeches = [...existingSpeeches, ...newSpeeches];
        await supabase
          .from("day_of_plans")
          .update({
            content: { ...content, speeches: updatedSpeeches },
            edited_at: new Date().toISOString(),
          })
          .eq("wedding_id", wedding.id);

        results.push(`Added ${newSpeeches.length} speaker${newSpeeches.length > 1 ? "s" : ""} to your day-of timeline${timePerSpeaker ? ` (~${timePerSpeaker} min each)` : ""}`);
      }
    } else if (speeches.length > 0) {
      results.push(`${speeches.length} speakers identified — visit the Day-of Planner to set up your timeline first`);
    }
  }

  return NextResponse.json({ results });
}
