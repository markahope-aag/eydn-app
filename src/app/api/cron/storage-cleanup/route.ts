import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logCronExecution } from "@/lib/cron-logger";
import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";

const BUCKET = "attachments";

/**
 * Weekly storage cleanup cron.
 * Finds orphaned files in Supabase Storage that no longer have matching
 * records in the attachments table, and removes them.
 *
 * Only deletes files older than 24 hours to avoid racing with in-progress uploads.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdmin();
  const startTime = Date.now();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. Get all file_url paths stored in the attachments DB table
    const { data: dbRecords, error: dbError } = await supabase
      .from("attachments")
      .select("file_url");

    if (dbError) throw new Error(`DB query failed: ${dbError.message}`);

    // Build a set of known paths (both storage paths and legacy full URLs)
    const knownPaths = new Set<string>();
    for (const r of dbRecords || []) {
      const url = (r as { file_url: string }).file_url;
      knownPaths.add(url);
      // For legacy full URLs, extract the storage path portion
      const match = url.match(/\/storage\/v1\/object\/public\/attachments\/(.+)/);
      if (match) knownPaths.add(match[1]);
    }

    // Also collect file_url references from mood_board_items and wedding photos
    const [{ data: moodBoardUrls }, { data: photoUrls }] = await Promise.all([
      supabase.from("mood_board_items").select("image_url"),
      supabase.from("wedding_photos").select("file_url"),
    ]);

    for (const r of moodBoardUrls || []) {
      const url = (r as { image_url: string }).image_url;
      knownPaths.add(url);
      const match = url.match(/\/storage\/v1\/object\/public\/attachments\/(.+)/);
      if (match) knownPaths.add(match[1]);
    }

    for (const r of photoUrls || []) {
      const url = (r as { file_url: string }).file_url;
      knownPaths.add(url);
      const match = url.match(/\/storage\/v1\/object\/public\/attachments\/(.+)/);
      if (match) knownPaths.add(match[1]);
    }

    // 2. List all files in storage bucket by iterating top-level wedding folders
    const { data: topFolders, error: listError } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 1000 });

    if (listError) throw new Error(`Storage list failed: ${listError.message}`);

    let orphansDeleted = 0;
    let filesScanned = 0;
    const errors: string[] = [];

    // Each top-level item is a wedding ID folder
    for (const folder of topFolders || []) {
      if (!folder.id) continue; // skip non-folder items

      // List all files recursively within this wedding folder
      const files = await listAllFiles(supabase, BUCKET, folder.name);

      for (const file of files) {
        filesScanned++;
        const filePath = file.path;

        // Skip files less than 24 hours old (avoid racing with in-progress uploads)
        if (file.created_at && file.created_at > oneDayAgo) continue;

        // Check if this file has a matching DB record
        if (!knownPaths.has(filePath)) {
          // Orphaned file — delete it
          const { error: delError } = await supabase.storage
            .from(BUCKET)
            .remove([filePath]);

          if (delError) {
            errors.push(`Failed to delete ${filePath}: ${delError.message}`);
          } else {
            orphansDeleted++;
            console.info(`[STORAGE-CLEANUP] Deleted orphan: ${filePath}`);
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;

    await logCronExecution({
      jobName: "storage-cleanup",
      status: errors.length > 0 ? "error" : "success",
      durationMs,
      details: { filesScanned, orphansDeleted, errors: errors.length },
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
    });

    return NextResponse.json({
      success: true,
      filesScanned,
      orphansDeleted,
      errors: errors.length,
      durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[STORAGE-CLEANUP] Failed:", message);

    await logCronExecution({
      jobName: "storage-cleanup",
      status: "error",
      durationMs,
      errorMessage: message,
    });

    return NextResponse.json({ error: "Storage cleanup failed" }, { status: 500 });
  }
}

/**
 * Recursively list all files under a path in a Supabase storage bucket.
 */
async function listAllFiles(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  bucket: string,
  prefix: string
): Promise<Array<{ path: string; created_at: string | null }>> {
  const results: Array<{ path: string; created_at: string | null }> = [];

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 1000 });

  if (error || !data) return results;

  for (const item of data) {
    const fullPath = `${prefix}/${item.name}`;
    if (item.id) {
      // It's a file
      results.push({ path: fullPath, created_at: item.created_at || null });
    } else {
      // It's a folder — recurse
      const nested = await listAllFiles(supabase, bucket, fullPath);
      results.push(...nested);
    }
  }

  return results;
}

// Vercel cron always sends GET; admin manual-trigger UI POSTs internally.
// Re-export so both work.
export const POST = GET;
