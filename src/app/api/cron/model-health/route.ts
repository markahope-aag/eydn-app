import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { logCronExecution } from "@/lib/cron-logger";
import { alertOps } from "@/lib/ops-alert";
import { escapeHtml } from "@/lib/validation";
import { MODELS_IN_USE, MODEL_RETIREMENT_DATES } from "@/lib/ai/model-registry";

/**
 * Early-warning for Claude model retirements. The models API exposes no
 * retirement date — a model simply 404s the day it's retired, which silently
 * breaks every feature using it. This daily job pings each in-use model so we
 * hear about a break within hours from a health check rather than days later
 * from a user report, and warns ~30 days ahead of any date in the hand-kept
 * retirement map. Schedule: 0 17 * * * (17:00 UTC).
 */
const RETIREMENT_WARN_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

async function checkModel(id: string, apiKey: string): Promise<string | null> {
  // 1. Live availability — the authoritative "is it broken right now" signal.
  try {
    const res = await fetch(
      `https://api.anthropic.com/v1/models/${encodeURIComponent(id)}`,
      { headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" } }
    );
    if (res.status === 404) {
      return `${id} is no longer available (404) — every feature using it is broken. Update to a current model now.`;
    }
    if (!res.ok) {
      return `Could not verify ${id} (HTTP ${res.status}).`;
    }
  } catch (e) {
    return `Could not reach the Anthropic models API to verify ${id}: ${e instanceof Error ? e.message : "unknown error"}.`;
  }

  // 2. Advance warning from the maintained retirement-date map.
  const retireOn = MODEL_RETIREMENT_DATES[id];
  if (retireOn) {
    const ms = new Date(retireOn).getTime() - Date.now();
    if (!Number.isNaN(ms)) {
      const days = Math.ceil(ms / DAY_MS);
      if (days <= 0) {
        return `${id} reached its retirement date (${retireOn}). Migrate immediately.`;
      }
      if (days <= RETIREMENT_WARN_DAYS) {
        return `${id} retires on ${retireOn} (${days} day${days === 1 ? "" : "s"} left). Plan the migration.`;
      }
    }
  }

  return null;
}

export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const startedAt = Date.now();
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const ids = Array.from(new Set(MODELS_IN_USE));
    const results = await Promise.all(ids.map((id) => checkModel(id, apiKey)));
    const issues = results.filter((r): r is string => r !== null);

    if (issues.length > 0) {
      await alertOps(
        `${issues.length} model issue${issues.length === 1 ? "" : "s"} detected`,
        `<p>The daily model-health check found:</p>
         <ul>${issues.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
         <p>Models checked: ${ids.map((id) => escapeHtml(id)).join(", ")}.</p>
         <p>Update the model IDs in <code>src/lib/config.ts</code> / <code>src/lib/ai/model-registry.ts</code>, then redeploy.</p>`
      );
    }

    await logCronExecution({
      jobName: "model-health",
      status: "success",
      durationMs: Date.now() - startedAt,
      details: { checked: ids.length, issues: issues.length },
    });

    return NextResponse.json({ ok: true, checked: ids.length, issues });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    await logCronExecution({
      jobName: "model-health",
      status: "error",
      durationMs: Date.now() - startedAt,
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
