import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export default async function SavedCalculatorPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = createSupabaseAdmin();

  const { data } = await supabase
    .from("calculator_saves")
    .select("name, budget, guests, state, month")
    .eq("short_code", code)
    .maybeSingle();

  if (!data) {
    redirect("/tools/wedding-budget-calculator");
  }

  const urlParams = new URLSearchParams({
    budget: String(data.budget),
    guests: String(data.guests),
    state: data.state as string,
    month: String(data.month),
  });
  if (data.name) urlParams.set("name", data.name as string);

  redirect(`/tools/wedding-budget-calculator?${urlParams.toString()}`);
}
