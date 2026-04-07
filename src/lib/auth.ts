import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Wedding = Database["public"]["Tables"]["weddings"]["Row"];

type AuthSuccess = {
  wedding: Wedding;
  supabase: SupabaseClient<Database>;
  userId: string;
  role: "owner" | "partner" | "coordinator";
};

type AuthError = {
  error: NextResponse;
};

/** @deprecated No-op — in-memory cache removed (ineffective on serverless). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function invalidateWeddingCache(_userId: string) {
  // Intentionally empty — kept for API compatibility
}

export async function getWeddingForUser(): Promise<AuthSuccess | AuthError> {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabase = createSupabaseAdmin();

  // 1. Try direct ownership
  const { data: owned } = await supabase
    .from("weddings")
    .select()
    .eq("user_id", userId)
    .single();

  if (owned) {
    return { wedding: owned as Wedding, supabase, userId, role: "owner" };
  }

  // 2. Try accepted collaborator lookup
  const { data: collab } = await supabase
    .from("wedding_collaborators")
    .select("wedding_id, role")
    .eq("user_id", userId)
    .eq("invite_status", "accepted")
    .single();

  if (collab) {
    const { data: wedding } = await supabase
      .from("weddings")
      .select()
      .eq("id", collab.wedding_id)
      .single();

    if (wedding) {
      const role = collab.role as "partner" | "coordinator";
      return { wedding: wedding as Wedding, supabase, userId, role };
    }
  }

  // 3. Check for pending invite by email (auto-accept on first sign-in)
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;

    if (email) {
      const { data: pending } = await supabase
        .from("wedding_collaborators")
        .select("id, wedding_id, role")
        .eq("email", email.toLowerCase())
        .eq("invite_status", "pending")
        .single();

      if (pending) {
        // Auto-accept: fill in user_id and mark accepted
        await supabase
          .from("wedding_collaborators")
          .update({ user_id: userId, invite_status: "accepted" })
          .eq("id", pending.id);

        const { data: wedding } = await supabase
          .from("weddings")
          .select()
          .eq("id", pending.wedding_id)
          .single();

        if (wedding) {
          const role = pending.role as "partner" | "coordinator";
          return { wedding: wedding as Wedding, supabase, userId, role };
        }
      }
    }
  } catch {
    // Clerk lookup failed — fall through to 404
  }

  return { error: NextResponse.json({ error: "Wedding not found" }, { status: 404 }) };
}
