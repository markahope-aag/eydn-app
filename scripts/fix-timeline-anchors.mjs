// One-shot: the "wedding-planning-timeline-a-month-by-month-guide" post has
// 17 jump-to links (#m12plus, #m12, …, #after) but no matching IDs in the
// rendered HTML — the docx import preserved the link refs but stripped the
// section anchors. This injects id="..." onto the section-label spans so the
// in-page jumps actually scroll.
//
// Idempotent: re-running is a no-op once the IDs are in place.
//
//   node scripts/fix-timeline-anchors.mjs

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SLUG = "wedding-planning-timeline-a-month-by-month-guide";

// Map of jump-target id → exact section-label text in the post.
// Order matters: longer/more-specific labels first so we don't accidentally
// match "1 month out" inside "11 months out".
const ANCHORS = [
  ["m12plus", "12+ months out"],
  ["m12", "12 months out"],
  ["m11", "11 months out"],
  ["m10", "10 months out"],
  ["m9", "9 months out"],
  ["m8", "8 months out"],
  ["m7", "7 months out"],
  ["m6", "6 months out"],
  ["m5", "5 months out"],
  ["m4", "4 months out"],
  ["m3", "3 months out"],
  ["m2", "2 months out"],
  ["m2weeks", "2 weeks out"],
  ["m1week", "1 week out"],
  ["m1", "1 month out"],
  ["dayof", "Wedding day"],
  ["after", "After the wedding"],
];

async function loadPost() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?select=id,content&slug=eq.${SLUG}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok) throw new Error(`load failed: ${res.status}`);
  const rows = await res.json();
  if (rows.length === 0) throw new Error(`post ${SLUG} not found`);
  return rows[0];
}

function injectAnchors(html) {
  let out = html;
  let injected = 0;
  let alreadyHad = 0;

  for (const [id, label] of ANCHORS) {
    // Already present? (idempotency check)
    if (out.includes(`id="${id}"`)) {
      alreadyHad++;
      continue;
    }

    // Match the FIRST <span> whose text exactly matches the label and that
    // doesn't already have an id. Targeting the span keeps the patch tight
    // and avoids touching any nearby inline text. Anchored inside the
    // section label only, so we can't accidentally tag jump-list items
    // (those are wrapped in <a>, not bare <span>).
    const pattern = new RegExp(
      `<span([^>]*?)>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</span>`
    );
    const before = out;
    out = out.replace(pattern, (match, attrs) => {
      // Skip if the matched span is *inside* an <a href="#..."> — that's a
      // jump-list item, not a section label.
      // (regex without lookbehind, so we do a small post-check via string
      // index instead.)
      if (attrs.includes("id=")) return match;
      return `<span${attrs} id="${id}">${label}</span>`;
    });

    if (out !== before) {
      injected++;
      console.log(`  + ${id} → "${label}"`);
    } else {
      console.log(`  ? ${id} → "${label}" (no matching <span>)`);
    }
  }

  return { out, injected, alreadyHad };
}

async function patchContent(id, content) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`patch failed: ${res.status} ${await res.text()}`);
}

(async () => {
  const post = await loadPost();
  const { out, injected, alreadyHad } = injectAnchors(post.content);
  console.log(`\nInjected ${injected} new anchors (${alreadyHad} already present).`);
  if (injected === 0) {
    console.log("Nothing to write — content already has all anchors.");
    return;
  }
  await patchContent(post.id, out);
  console.log("✓ Post updated.");
})();
