import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { submitToIndexNow } from "@/lib/indexnow";
import { logCronExecution } from "@/lib/cron-logger";
import { requireCronAuth } from "@/lib/cron-auth";

/**
 * Cron: Submit all indexable URLs to IndexNow.
 * Submits static pages + all published blog posts in a single batch.
 * Runs weekly to keep search engines aware of content freshness.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const start = Date.now();

  try {
    const staticUrls = [
      "/",
      "/blog",
      "/beta",
      "/privacy",
      "/terms",
      "/cookies",
      "/disclaimer",
      "/acceptable-use",
      "/accessibility",
      "/blog/category/planning",
      "/blog/category/budget",
      "/blog/category/vendors",
      "/blog/category/design",
      "/blog/category/day-of",
      "/blog/category/relationships",
      "/blog/category/real-weddings",
    ];

    const supabase = createSupabaseAdmin();
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("status", "published");

    const blogUrls = (posts || []).map((p) => `/blog/${(p as { slug: string }).slug}`);
    const allUrls = [...staticUrls, ...blogUrls];

    const result = await submitToIndexNow(allUrls);

    await logCronExecution({
      jobName: "indexnow",
      status: result.ok ? "success" : "error",
      durationMs: Date.now() - start,
      details: { urlCount: allUrls.length, httpStatus: result.status } as unknown as import("@/lib/supabase/types").Json,
      errorMessage: result.ok ? undefined : `IndexNow returned status ${result.status}`,
    });

    return NextResponse.json({ ok: result.ok, urlCount: allUrls.length, status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logCronExecution({
      jobName: "indexnow",
      status: "error",
      durationMs: Date.now() - start,
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
