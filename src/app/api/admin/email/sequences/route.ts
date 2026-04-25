import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/email/sequences — list all sequences with their steps inlined.
 * Used by the admin page to render the sequence overview.
 */
export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { supabase } = result;

  const { data: sequences, error: seqErr } = await supabase
    .from("email_sequences")
    .select("slug, description, trigger_event, audience_filter, enabled, updated_at")
    .order("slug", { ascending: true });

  if (seqErr) return NextResponse.json({ error: seqErr.message }, { status: 500 });

  const { data: steps, error: stepErr } = await supabase
    .from("email_sequence_steps")
    .select("sequence_slug, step_order, template_slug, offset_days, audience_filter, enabled")
    .order("sequence_slug", { ascending: true })
    .order("step_order", { ascending: true });

  if (stepErr) return NextResponse.json({ error: stepErr.message }, { status: 500 });

  // Recent send counts per sequence (rough activity indicator).
  const { data: recentSends } = await supabase
    .from("sequence_send_log")
    .select("sequence_slug")
    .gte("sent_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const sendCounts: Record<string, number> = {};
  for (const r of recentSends || []) {
    sendCounts[r.sequence_slug] = (sendCounts[r.sequence_slug] || 0) + 1;
  }

  const stepsBySequence: Record<string, typeof steps> = {};
  for (const s of steps || []) {
    if (!stepsBySequence[s.sequence_slug]) stepsBySequence[s.sequence_slug] = [];
    stepsBySequence[s.sequence_slug]!.push(s);
  }

  const enriched = (sequences || []).map((seq) => ({
    ...seq,
    steps: stepsBySequence[seq.slug] || [],
    sentLast30d: sendCounts[seq.slug] || 0,
  }));

  return NextResponse.json({ sequences: enriched });
}
