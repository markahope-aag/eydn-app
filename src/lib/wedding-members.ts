import { clerkClient } from "@clerk/nextjs/server";
import type { createSupabaseAdmin } from "@/lib/supabase/server";

export type WeddingMember = { user_id: string; name: string };

/**
 * People with app accounts on a wedding — the owner plus accepted
 * collaborators — resolved to display names via Clerk. Powers @mentions
 * in comments: both the picker and server-side mention detection.
 */
export async function getWeddingMembers(
  ownerUserId: string,
  weddingId: string,
  supabase: ReturnType<typeof createSupabaseAdmin>
): Promise<WeddingMember[]> {
  const { data: collabs } = await supabase
    .from("wedding_collaborators")
    .select("user_id")
    .eq("wedding_id", weddingId)
    .eq("invite_status", "accepted");

  const ids = [
    ...new Set(
      [
        ownerUserId,
        ...((collabs || []) as { user_id: string | null }[])
          .map((c) => c.user_id)
          .filter((id): id is string => !!id),
      ].filter(Boolean)
    ),
  ];

  if (ids.length === 0) return [];

  try {
    const clerk = await clerkClient();
    const list = await clerk.users.getUserList({ userId: ids, limit: 100 });
    return list.data.map((u) => ({
      user_id: u.id,
      name: u.firstName
        ? `${u.firstName}${u.lastName ? ` ${u.lastName}` : ""}`
        : u.emailAddresses[0]?.emailAddress || "Member",
    }));
  } catch {
    return [];
  }
}
