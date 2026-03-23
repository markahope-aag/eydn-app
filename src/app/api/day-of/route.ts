import { getWeddingForUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { safeParseJSON, isParseError, requireFields } from "@/lib/validation";

type Wedding = Database["public"]["Tables"]["weddings"]["Row"];

export async function GET() {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const { data } = await supabase
    .from("day_of_plans")
    .select()
    .eq("wedding_id", wedding.id)
    .single();

  if (data) {
    return NextResponse.json(data);
  }

  // Auto-generate if not exists
  const plan = await generateDayOfPlan(wedding as Wedding, supabase);
  return NextResponse.json(plan);
}

export async function PUT(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["content"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("day_of_plans")
    .upsert({
      wedding_id: wedding.id,
      content: body.content as Record<string, unknown>,
      edited_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[API]", error.message); return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

async function generateDayOfPlan(
  wedding: Wedding,
  supabase: ReturnType<typeof import("@/lib/supabase/server").createSupabaseAdmin>
) {
  // Fetch vendors and wedding party
  const [{ data: vendors }, { data: party }] = await Promise.all([
    supabase
      .from("vendors")
      .select("name, category, poc_name, poc_phone")
      .eq("wedding_id", wedding.id),
    supabase
      .from("wedding_party")
      .select("name, role, job_assignment, phone")
      .eq("wedding_id", wedding.id),
  ]);

  const content = {
    timeline: [
      { time: "8:00 AM", event: "Hair & makeup begins", notes: "" },
      { time: "10:00 AM", event: "Photographer arrives", notes: "" },
      { time: "11:00 AM", event: "Getting ready photos", notes: "" },
      { time: "12:00 PM", event: "Lunch for wedding party", notes: "" },
      { time: "2:00 PM", event: "First look (if applicable)", notes: "" },
      { time: "3:00 PM", event: "Wedding party photos", notes: "" },
      { time: "4:00 PM", event: "Guests arrive", notes: "" },
      { time: "4:30 PM", event: "Ceremony begins", notes: "" },
      { time: "5:00 PM", event: "Cocktail hour", notes: "" },
      { time: "6:00 PM", event: "Reception entrance", notes: "" },
      { time: "6:15 PM", event: "First dance", notes: "" },
      { time: "6:30 PM", event: "Dinner service", notes: "" },
      { time: "7:30 PM", event: "Speeches & toasts", notes: "" },
      { time: "8:00 PM", event: "Cake cutting", notes: "" },
      { time: "8:15 PM", event: "Parent dances", notes: "" },
      { time: "8:30 PM", event: "Open dancing", notes: "" },
      { time: "10:30 PM", event: "Last dance", notes: "" },
      { time: "10:45 PM", event: "Send-off", notes: "" },
    ],
    vendorContacts: (vendors || []).map((v: { name: string; category: string; poc_name: string | null; poc_phone: string | null }) => ({
      vendor: v.name,
      category: v.category,
      contact: v.poc_name || "",
      phone: v.poc_phone || "",
    })),
    partyAssignments: (party || []).map((p: { name: string; role: string; job_assignment: string | null; phone: string | null }) => ({
      name: p.name,
      role: p.role,
      job: p.job_assignment || "",
      phone: p.phone || "",
    })),
    packingChecklist: [
      "Wedding dress/suit",
      "Rings",
      "Vows (if written)",
      "Marriage license",
      "Emergency kit (sewing kit, stain remover, pain reliever)",
      "Phone charger",
      "Vendor tips (if applicable)",
      "Change of clothes for after",
      "Decor items",
      "Card box / gift table items",
      "Place cards",
      "Guestbook & pen",
      "Cake knife & server",
      "Toasting glasses",
    ],
    ceremonyScript: "",
    processionalOrder: [],
    officiantNotes: "",
    music: [],
    speeches: [],
    setupTasks: [],
    attire: [],
  };

  const { data } = await supabase
    .from("day_of_plans")
    .upsert({
      wedding_id: wedding.id,
      content,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single();

  return data || { content };
}
