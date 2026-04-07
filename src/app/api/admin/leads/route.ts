import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;
  const { supabase } = admin;

  // Fetch all lead sources in parallel
  const [{ data: waitlist }, { data: calculator }] = await Promise.all([
    supabase
      .from("waitlist")
      .select("name, email, source, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("calculator_saves")
      .select("name, email, budget, guests, state, month, created_at")
      .order("created_at", { ascending: false }),
  ]);

  // Normalize into a unified lead format
  type Lead = {
    name: string | null;
    email: string;
    source: string;
    details: string | null;
    created_at: string;
  };

  const leads: Lead[] = [];

  for (const w of waitlist || []) {
    leads.push({
      name: (w as { name: string }).name || null,
      email: (w as { email: string }).email,
      source: (w as { source: string }).source || "waitlist",
      details: null,
      created_at: (w as { created_at: string }).created_at,
    });
  }

  for (const c of calculator || []) {
    const calc = c as { name: string | null; email: string; budget: number; guests: number; state: string; month: number; created_at: string };
    leads.push({
      name: calc.name,
      email: calc.email,
      source: "calculator",
      details: `$${calc.budget.toLocaleString()} · ${calc.guests} guests · ${calc.state}`,
      created_at: calc.created_at,
    });
  }

  // Sort by date descending
  leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Deduplicate by email — keep earliest source, merge details
  const seen = new Map<string, Lead>();
  const deduped: Lead[] = [];
  for (const lead of leads) {
    const existing = seen.get(lead.email);
    if (existing) {
      // Merge: keep existing, add source if different
      if (!existing.source.includes(lead.source)) {
        existing.source = `${existing.source}, ${lead.source}`;
      }
      if (lead.details && !existing.details) {
        existing.details = lead.details;
      }
      if (lead.name && !existing.name) {
        existing.name = lead.name;
      }
    } else {
      const entry = { ...lead };
      seen.set(lead.email, entry);
      deduped.push(entry);
    }
  }

  return NextResponse.json(deduped);
}
