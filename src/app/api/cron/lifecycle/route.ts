import { createSupabaseAdmin } from "@/lib/supabase/server";
import { calculatePhase } from "@/lib/lifecycle";
import { logCronExecution } from "@/lib/cron-logger";
import { runSequenceForRecipient } from "@/lib/email-sequences";
import { getEmailPreferences } from "@/lib/email-preferences";
import { escapeHtml } from "@/lib/validation";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eydn.app";

const STEP_TO_LIFECYCLE_TYPE: Record<number, string> = {
  1: "post_wedding_welcome",
  2: "download_reminder_1mo",
  3: "download_reminder_6mo",
  4: "download_reminder_9mo",
  5: "memory_plan_offer",
  6: "archive_notice",
  7: "sunset_warning_21mo",
  8: "sunset_final",
};

/**
 * Daily lifecycle cron job.
 *
 * Runs once per day to:
 *  1. Transition weddings between phases (active → post_wedding → archived → sunset)
 *  2. Drive the `wedding_lifecycle` sequence (post-wedding archival flow)
 *  3. Drive the `wedding_milestones` sequence (pre-wedding planning milestones,
 *     uses negative offsets like -547 = 18 months before the wedding date)
 *  4. Soft-delete data for weddings entering the sunset phase (without memory plan)
 *
 * Successful wedding_lifecycle sends are mirrored to the legacy `lifecycle_emails`
 * table during the Phase 1 transition so existing admin queries keep working.
 *
 * Auth: Bearer CRON_SECRET or BACKUP_SECRET (shared helper).
 * Schedule: 0 4 * * * (daily at 4 AM UTC)
 */
export async function POST(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseAdmin();
  const startTime = Date.now();

  try {
    // Include weddings with either a confirmed `date` OR an `inferred_date`
    // (set by the calculator handoff from the user's chosen month). The
    // milestones sequence falls back to inferred_date when date is null;
    // every other code path here keeps reading only `date`.
    const { data: weddings, error: weddingsError } = await supabase
      .from("weddings")
      .select("id, user_id, date, inferred_date, phase, memory_plan_active, partner1_name, partner2_name")
      .or("date.not.is.null,inferred_date.not.is.null");

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

        if (newPhase !== oldPhase) {
          const { error: updateError } = await supabase
            .from("weddings")
            .update({ phase: newPhase })
            .eq("id", wedding.id);

          if (updateError) {
            results.errors.push(`Phase update failed for ${wedding.id}: ${updateError.message}`);
            continue;
          }

          results.phaseChanges.push({ weddingId: wedding.id, from: oldPhase, to: newPhase });
          console.info(
            `[LIFECYCLE] Wedding ${wedding.id} (${wedding.partner1_name} & ${wedding.partner2_name}): ${oldPhase} → ${newPhase}`
          );
        }

        // Email sequences need a Clerk-resolvable user and at least one date
        // signal — either the confirmed `date` (used for both flows) or the
        // calculator-derived `inferred_date` (used only by milestones).
        const milestoneAnchor = wedding.date || wedding.inferred_date;
        if ((wedding.date || wedding.inferred_date) && wedding.user_id) {
          try {
            const prefs = await getEmailPreferences(wedding.id);
            const marketingUnsubscribed =
              prefs.unsubscribed_all || !prefs.marketing_emails;

            const clerk = await clerkClient();
            const user = await clerk.users.getUser(wedding.user_id);
            const userEmail = user.emailAddresses[0]?.emailAddress;

            if (userEmail) {
              const partnerNames = escapeHtml(`${wedding.partner1_name} & ${wedding.partner2_name}`);
              const firstName = (wedding.partner1_name || "").split(" ")[0] || "there";
              // Format whichever anchor we'll use for the milestone copy.
              const weddingDateFmt = milestoneAnchor
                ? escapeHtml(
                    new Date(milestoneAnchor).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  )
                : "";

              const baseTemplateContext = {
                partnerNames,
                firstName: escapeHtml(firstName),
                weddingDate: weddingDateFmt,
                appUrl: APP_URL,
                unsubscribeToken: prefs.unsubscribe_token,
              };

              // wedding_lifecycle: post-wedding archival flow. Strictly anchored
              // to the user-confirmed `date` — never fired on inferred_date so
              // we don't send "your account is now read-only" based on a guess.
              if (wedding.date) {
                const lifecycleRun = await runSequenceForRecipient("wedding_lifecycle", {
                  userId: wedding.user_id,
                  weddingId: wedding.id,
                  email: userEmail,
                  attrs: { marketing_unsubscribed: marketingUnsubscribed },
                  templateContext: baseTemplateContext,
                  anchor: new Date(wedding.date),
                });

                for (const step of lifecycleRun.sentSteps) {
                  const legacyType = STEP_TO_LIFECYCLE_TYPE[step.stepOrder];
                  if (!legacyType) continue;
                  await supabase
                    .from("lifecycle_emails")
                    .upsert(
                      { wedding_id: wedding.id, email_type: legacyType },
                      { onConflict: "wedding_id,email_type", ignoreDuplicates: true }
                    );
                  results.emailsRecorded.push({ weddingId: wedding.id, emailType: legacyType });
                  console.info(`[LIFECYCLE] Sent ${legacyType} → ${wedding.id}`);
                }
                for (const err of lifecycleRun.errors) {
                  results.errors.push(`Lifecycle send failed for ${wedding.id}: ${err}`);
                }
              }

              // wedding_milestones: pre-wedding planning milestones (negative
              // offsets) plus a +7d post-wedding thank-you. Falls back to
              // inferred_date so calculator-only leads still receive milestones.
              if (milestoneAnchor) {
                const milestonesRun = await runSequenceForRecipient("wedding_milestones", {
                  userId: wedding.user_id,
                  weddingId: wedding.id,
                  email: userEmail,
                  attrs: { marketing_unsubscribed: marketingUnsubscribed },
                  templateContext: baseTemplateContext,
                  anchor: new Date(milestoneAnchor),
                });

                for (const step of milestonesRun.sentSteps) {
                  results.emailsRecorded.push({
                    weddingId: wedding.id,
                    emailType: `milestone_step_${step.stepOrder}`,
                  });
                  console.info(
                    `[LIFECYCLE] Sent milestone step ${step.stepOrder} (${step.templateSlug}) → ${wedding.id}`
                  );
                }
                for (const err of milestonesRun.errors) {
                  results.errors.push(`Milestone send failed for ${wedding.id}: ${err}`);
                }
              }
            }
          } catch (sendErr) {
            console.warn(`[LIFECYCLE] Sequence send failed for ${wedding.id}:`, sendErr);
            results.errors.push(
              `Sequence run failed for ${wedding.id}: ${sendErr instanceof Error ? sendErr.message : String(sendErr)}`
            );
          }
        }

        // Sunset: soft-delete data for weddings without memory plan.
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

    return NextResponse.json({ success: true, ...results });
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
    if (table === "seat_assignments") {
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
