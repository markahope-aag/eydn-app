import { getWeddingForUser } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { safeParseJSON, isParseError, requireFields } from "@/lib/validation";
import { supabaseError } from "@/lib/api-error";
import { getWeddingMembers } from "@/lib/wedding-members";

export async function GET(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase } = result;

  const url = new URL(request.url);
  const entityType = url.searchParams.get("entity_type");
  const entityId = url.searchParams.get("entity_id");

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entity_type and entity_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("wedding_id", wedding.id)
    .eq("entity_type", entityType as "task" | "vendor" | "guest" | "expense" | "general")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });

  const err = supabaseError(error, "comments");
  if (err) return err;

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const result = await getWeddingForUser();
  if ("error" in result) return result.error;
  const { wedding, supabase, userId } = result;

  const parsed = await safeParseJSON(request);
  if (isParseError(parsed)) return parsed;
  const body = parsed;

  const missing = requireFields(body, ["entity_type", "entity_id", "content"]);
  if (missing) {
    return NextResponse.json({ error: `${missing} is required` }, { status: 400 });
  }

  // Get user name from Clerk
  let userName = "Unknown";
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    userName = user.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : user.emailAddresses[0]?.emailAddress || "Unknown";
  } catch {
    // Fall back to "Unknown"
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      wedding_id: wedding.id,
      entity_type: body.entity_type as "task" | "vendor" | "guest" | "expense" | "general",
      entity_id: body.entity_id as string,
      user_id: userId,
      user_name: userName,
      content: (body.content as string).trim(),
    })
    .select()
    .single();

  const err = supabaseError(error, "comments");
  if (err) return err;

  // Notify the wedding when someone is @mentioned in the comment.
  const content = (body.content as string).trim();
  if (content.includes("@")) {
    try {
      const members = await getWeddingMembers(wedding.user_id, wedding.id, supabase);
      const mentioned = members.filter(
        (m) => m.user_id !== userId && content.includes(`@${m.name}`)
      );
      if (mentioned.length > 0) {
        const names = mentioned.map((m) => m.name).join(", ");
        const snippet = content.length > 100 ? `${content.slice(0, 100)}…` : content;
        await supabase.from("notifications").insert({
          wedding_id: wedding.id,
          type: "comment_mention",
          title: `${userName} mentioned ${names} in a comment`,
          body: snippet,
          task_id: body.entity_type === "task" ? (body.entity_id as string) : null,
          vendor_id: body.entity_type === "vendor" ? (body.entity_id as string) : null,
        });
      }
    } catch (e) {
      console.error("[comments] mention notification failed", e);
    }
  }

  return NextResponse.json(data, { status: 201 });
}
