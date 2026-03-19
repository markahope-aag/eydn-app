import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Wedding = Database["public"]["Tables"]["weddings"]["Row"];

type AuthSuccess = {
  wedding: Wedding;
  supabase: SupabaseClient<Database>;
  userId: string;
};

type AuthError = {
  error: NextResponse;
};

export async function getWeddingForUser(): Promise<AuthSuccess | AuthError> {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("weddings")
    .select()
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return { error: NextResponse.json({ error: "Wedding not found" }, { status: 404 }) };
  }

  return { wedding: data as Wedding, supabase, userId };
}
