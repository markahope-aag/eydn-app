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

  if (slug === "music") {
    // Add music entries to day-of planner
    const { data: planRow } = await supabase
      .from("day_of_plans")
      .select("content")
      .eq("wedding_id", wedding.id)
      .single();

    if (planRow) {
      const content = (planRow as { content: Record<string, unknown> }).content || {};
      const existingMusic = (content.music as Array<{ moment: string; song: string }>) || [];

      // Build music entries from specific songs mentioned
      const newMusic: { moment: string; song: string; artist: string }[] = [];
      const firstDance = responses.q8 as string;
      const otherSongs = responses.q9 as string;

      if (firstDance && firstDance !== "no" && firstDance !== "still-deciding") {
        if (!existingMusic.some((m) => m.moment === "First Dance")) {
          newMusic.push({ moment: "First Dance", song: firstDance, artist: "" });
        }
      }

      if (otherSongs) {
        const songs = otherSongs.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
        for (const song of songs) {
          const parts = song.split(/\s*[—–-]\s*/);
          const moment = parts[0] || "Reception";
          const songName = parts[1] || parts[0] || "";
          if (!existingMusic.some((m) => m.song === songName)) {
            newMusic.push({ moment, song: songName, artist: "" });
          }
        }
      }

      if (newMusic.length > 0) {
        await supabase
          .from("day_of_plans")
          .update({
            content: { ...content, music: [...existingMusic, ...newMusic] },
            edited_at: new Date().toISOString(),
          })
          .eq("wedding_id", wedding.id);
        results.push(`Added ${newMusic.length} song${newMusic.length > 1 ? "s" : ""} to your day-of music list`);
      }
    }
  }

  if (slug === "hair-makeup") {
    // Update day-of planner with getting-ready schedule info
    const ceremonyTime = responses.q2 as string;
    const peopleCount = responses.q3 as number;

    if (ceremonyTime && peopleCount) {
      results.push(`Getting-ready schedule: ${peopleCount} people need hair & makeup before ${ceremonyTime} ceremony`);
    }

    // Add trial reminders
    const hairTrial = responses.q6 as string;
    const makeupTrial = responses.q7 as string;
    if (hairTrial === "yes" || makeupTrial === "yes") {
      results.push("Trial appointments noted — check your task timeline for reminders");
    }
  }

  if (slug === "colors-theme") {
    // Save style description to wedding if not already set
    const vibes = (responses.q1 as string[]) || [];
    const colors = (responses.q5 as string[]) || [];

    if (vibes.length > 0 || colors.length > 0) {
      const styleDesc = [
        vibes.length > 0 ? vibes.join(", ") : "",
        colors.length > 0 ? `Colors: ${colors.join(", ")}` : "",
      ].filter(Boolean).join(" | ");

      const { data: currentWedding } = await supabase
        .from("weddings")
        .select("style_description")
        .eq("id", wedding.id)
        .single();

      if (currentWedding && !(currentWedding as { style_description: string | null }).style_description) {
        await supabase
          .from("weddings")
          .update({ style_description: styleDesc, updated_at: new Date().toISOString() })
          .eq("id", wedding.id);
        results.push("Saved your style profile to your wedding details");
      }
    }
  }

  if (slug === "florist" || slug === "rentals" || slug === "decor" || slug === "hair-makeup" || slug === "music") {
    results.push("Vendor brief generated — copy it from below and send to vendors");
  }

  if (slug === "registry") {
    // Save registry links from the guide responses
    const linkPairs = [
      { urlKey: "q12", nameKey: "q12_name" },
      { urlKey: "q13", nameKey: "q13_name" },
      { urlKey: "q14", nameKey: "q14_name" },
    ];

    // Also check q6 (Amazon URL from setup section)
    const amazonUrl = (responses.q6 as string)?.trim();
    if (amazonUrl && amazonUrl.startsWith("http")) {
      const { data: existing } = await supabase
        .from("registry_links")
        .select("id")
        .eq("wedding_id", wedding.id)
        .eq("url", amazonUrl)
        .limit(1);

      if (!existing || existing.length === 0) {
        const { count } = await supabase
          .from("registry_links")
          .select("*", { count: "exact", head: true })
          .eq("wedding_id", wedding.id);

        await supabase.from("registry_links").insert({
          wedding_id: wedding.id,
          name: "Amazon Registry",
          url: amazonUrl,
          sort_order: (count ?? 0) + 1,
        });
        results.push("Added Amazon registry link to your wedding website");
      }
    }

    let linksAdded = 0;
    for (const { urlKey, nameKey } of linkPairs) {
      const url = (responses[urlKey] as string)?.trim();
      const name = (responses[nameKey] as string)?.trim();
      if (!url || !url.startsWith("http")) continue;

      // Skip if already exists
      const { data: existing } = await supabase
        .from("registry_links")
        .select("id")
        .eq("wedding_id", wedding.id)
        .eq("url", url)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const { count } = await supabase
        .from("registry_links")
        .select("*", { count: "exact", head: true })
        .eq("wedding_id", wedding.id);

      await supabase.from("registry_links").insert({
        wedding_id: wedding.id,
        name: name || "Registry",
        url,
        sort_order: (count ?? 0) + 1,
      });
      linksAdded++;
    }

    if (linksAdded > 0) {
      results.push(`Added ${linksAdded} registry link${linksAdded > 1 ? "s" : ""} to your wedding website`);
    }
  }

  if (slug === "wedding-dress") {
    const budget = responses.q1 as number;
    const needBy = responses.q3 as string;
    if (budget) {
      results.push(`Dress budget: $${budget.toLocaleString()}`);
    }
    if (needBy) {
      results.push(`Dress needed by: ${new Date(needBy + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`);
    }
  }

  return NextResponse.json({ results });
}
