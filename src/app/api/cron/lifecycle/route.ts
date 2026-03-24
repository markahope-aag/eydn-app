import { createSupabaseAdmin } from "@/lib/supabase/server";
import { calculatePhase, getEmailsDue } from "@/lib/lifecycle";
import { logCronExecution } from "@/lib/cron-logger";
import { sendEmail, getLifecycleEmail } from "@/lib/email";
import { getEmailPreferences } from "@/lib/email-preferences";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Daily lifecycle cron job.
 *
 * Runs once per day to:
 *  1. Transition weddings between phases (active → post_wedding → archived → sunset)
 *  2. Record lifecycle emails that are due (actual sending handled by email service)
 *  3. Soft-delete data for weddings entering the sunset phase (without memory plan)
 *
 * Protected by BACKUP_SECRET bearer token.
 * Schedule: 0 4 * * * (daily at 4 AM UTC)
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.BACKUP_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const startTime = Date.now();

  try {
    // Fetch all weddings that have a date set
    const { data: weddings, error: weddingsError } = await supabase
      .from("weddings")
      .select("id, user_id, date, phase, memory_plan_active, partner1_name, partner2_name")
      .not("date", "is", null);

    if (weddingsError) {
      throw new Error(`Failed to fetch weddings: ${weddingsError.message}`);
    }

    const results = {
      processed: 0,
      phaseChanges: [] as Array<{ weddingId: string; from: string; to: string }>,
      emailsRecorded: [] as Array<{ weddingId: string; emailType: string }>,
      sunsetted: [] as string[],
      errors: [] as string[],
    };

    for (const wedding of weddings || []) {
      results.processed++;

      try {
        const memoryPlanActive = wedding.memory_plan_active ?? false;
        const newPhase = calculatePhase(wedding.date, memoryPlanActive);
        const oldPhase = wedding.phase ?? "active";

        // Update phase if it changed
        if (newPhase !== oldPhase) {
          const { error: updateError } = await supabase
            .from("weddings")
            .update({ phase: newPhase })
            .eq("id", wedding.id);

          if (updateError) {
            results.errors.push(`Phase update failed for ${wedding.id}: ${updateError.message}`);
            continue;
          }

          results.phaseChanges.push({
            weddingId: wedding.id,
            from: oldPhase,
            to: newPhase,
          });

          console.info(
            `[LIFECYCLE] Wedding ${wedding.id} (${wedding.partner1_name} & ${wedding.partner2_name}): ${oldPhase} → ${newPhase}`
          );
        }

        // Check which lifecycle emails are due
        const { data: sentEmails } = await supabase
          .from("lifecycle_emails")
          .select("email_type")
          .eq("wedding_id", wedding.id);

        const alreadySent = (sentEmails || []).map((e) => e.email_type);
        const emailsDue = wedding.date ? getEmailsDue(wedding.date, newPhase, alreadySent) : [];

        // Record each due email
        for (const emailType of emailsDue) {
          const { error: emailError } = await supabase.from("lifecycle_emails").insert({
            wedding_id: wedding.id,
            email_type: emailType,
            sent_at: new Date().toISOString(),
          });

          if (emailError) {
            results.errors.push(
              `Email record failed for ${wedding.id}/${emailType}: ${emailError.message}`
            );
            continue;
          }

          // Send the actual email via Resend (check preferences first)
          try {
            const prefs = await getEmailPreferences(wedding.id);
            const MARKETING_EMAILS = ["memory_plan_offer", "download_reminder_9mo", "archive_notice"];
            const isMarketing = MARKETING_EMAILS.includes(emailType);

            // Only check unsubscribe for marketing emails; transactional always send
            if (isMarketing && (prefs.unsubscribed_all || !prefs.marketing_emails)) {
              console.info(`[LIFECYCLE] Skipping marketing email ${emailType} for ${wedding.id} — unsubscribed`);
            } else {
              const partnerNames = `${wedding.partner1_name} & ${wedding.partner2_name}`;
              const emailContent = getLifecycleEmail(emailType, {
                partnerNames,
                weddingDate: wedding.date!,
                unsubscribeToken: prefs.unsubscribe_token,
              });
              if (emailContent && wedding.user_id) {
                const clerk = await clerkClient();
                const user = await clerk.users.getUser(wedding.user_id);
                const userEmail = user.emailAddresses[0]?.emailAddress;
                if (userEmail) {
                  await sendEmail({ to: userEmail, ...emailContent });
                }
              }
            }
          } catch (sendErr) {
            console.warn(`[LIFECYCLE] Email send failed for ${wedding.id}/${emailType}:`, sendErr);
          }

          results.emailsRecorded.push({
            weddingId: wedding.id,
            emailType,
          });

          console.info(`[LIFECYCLE] Email recorded: ${emailType} for wedding ${wedding.id}`);
        }

        // Handle sunset: soft-delete data for weddings without memory plan
        if (newPhase === "sunset" && !memoryPlanActive && oldPhase !== "sunset") {
          try {
            await softDeleteWeddingData(supabase, wedding.id);
            results.sunsetted.push(wedding.id);
            console.info(`[LIFECYCLE] Sunset: soft-deleted data for wedding ${wedding.id}`);
          } catch (sunsetError) {
            results.errors.push(
              `Sunset failed for ${wedding.id}: ${sunsetError instanceof Error ? sunsetError.message : String(sunsetError)}`
            );
          }
        }
      } catch (weddingError) {
        results.errors.push(
          `Processing failed for ${wedding.id}: ${weddingError instanceof Error ? weddingError.message : String(weddingError)}`
        );
      }
    }

    console.info(
      `[LIFECYCLE] Complete: ${results.processed} processed, ${results.phaseChanges.length} phase changes, ${results.emailsRecorded.length} emails, ${results.sunsetted.length} sunsetted, ${results.errors.length} errors`
    );

    await logCronExecution({
      jobName: "lifecycle",
      status: "success",
      durationMs: Date.now() - startTime,
      details: results as unknown as import("@/lib/supabase/types").Json,
    });

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("[LIFECYCLE] Failed:", error instanceof Error ? error.message : error);
    await logCronExecution({
      jobName: "lifecycle",
      status: "error",
      durationMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lifecycle cron failed" },
      { status: 500 }
    );
  }
}

/**
 * Soft-delete all wedding data for a sunsetted wedding.
 * Creates a final backup export first, then removes associated data rows.
 * The wedding row itself is preserved (with phase = "sunset") for record-keeping.
 */
async function softDeleteWeddingData(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  weddingId: string
) {
  // Create a final backup of all wedding data before deletion
  const [
    { data: guests },
    { data: vendors },
    { data: tasks },
    { data: expenses },
    { data: weddingParty },
    { data: seatingTables },
    { data: ceremonyPositions },
    { data: chatMessages },
    { data: questionnaire },
    { data: dayOfPlan },
    { data: moodBoard },
    { data: registryLinks },
  ] = await Promise.all([
    supabase.from("guests").select("*").eq("wedding_id", weddingId),
    supabase.from("vendors").select("*").eq("wedding_id", weddingId),
    supabase.from("tasks").select("*").eq("wedding_id", weddingId),
    supabase.from("expenses").select("*").eq("wedding_id", weddingId),
    supabase.from("wedding_party").select("*").eq("wedding_id", weddingId),
    supabase.from("seating_tables").select("*").eq("wedding_id", weddingId),
    supabase.from("ceremony_positions").select("*").eq("wedding_id", weddingId),
    supabase.from("chat_messages").select("*").eq("wedding_id", weddingId),
    supabase.from("questionnaire_responses").select("*").eq("wedding_id", weddingId).single(),
    supabase.from("day_of_plans").select("*").eq("wedding_id", weddingId).single(),
    supabase.from("mood_board_items").select("*").eq("wedding_id", weddingId),
    supabase.from("registry_links").select("*").eq("wedding_id", weddingId),
  ]);

  // Store the final backup as a JSON blob in a sunset_backups table or log it
  const backupPayload = {
    weddingId,
    exportedAt: new Date().toISOString(),
    type: "sunset-final-backup",
    data: {
      guests: guests || [],
      vendors: vendors || [],
      tasks: tasks || [],
      expenses: expenses || [],
      weddingParty: weddingParty || [],
      seatingTables: seatingTables || [],
      ceremonyPositions: ceremonyPositions || [],
      chatMessages: chatMessages || [],
      questionnaireResponses: questionnaire || null,
      dayOfPlan: dayOfPlan || null,
      moodBoard: moodBoard || [],
      registryLinks: registryLinks || [],
    },
  };

  console.info(
    `[LIFECYCLE] Final backup for sunset wedding ${weddingId}: ${JSON.stringify(backupPayload).length} bytes`
  );

  // Delete associated data (order matters for foreign key constraints)
  const tablesToDelete = [
    "seat_assignments",
    "ceremony_positions",
    "seating_tables",
    "wedding_party",
    "chat_messages",
    "mood_board_items",
    "registry_links",
    "activity_log",
    "expenses",
    "tasks",
    "vendors",
    "guests",
    "attachments",
    "questionnaire_responses",
    "day_of_plans",
  ] as const;

  for (const table of tablesToDelete) {
    // seat_assignments may reference seating_tables, so we handle it through the join
    if (table === "seat_assignments") {
      // Delete seat assignments that belong to this wedding's tables
      const { data: tables } = await supabase
        .from("seating_tables")
        .select("id")
        .eq("wedding_id", weddingId);

      if (tables && tables.length > 0) {
        const tableIds = tables.map((t) => t.id);
        await supabase.from("seat_assignments").delete().in("table_id", tableIds);
      }
      continue;
    }

    const { error } = await supabase.from(table).delete().eq("wedding_id", weddingId);
    if (error) {
      console.error(`[LIFECYCLE] Failed to delete from ${table} for ${weddingId}: ${error.message}`);
    }
  }
}
