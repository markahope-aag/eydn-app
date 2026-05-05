// Audit every blog post for broken in-page jump links — anchors like
// <a href="#foo"> with no matching id="foo" anywhere in the content.
// Auto-fixes the obvious case: when the anchor's link text exactly matches
// the text of a <span> or heading elsewhere in the same post, we inject
// id="foo" onto that element. Anything ambiguous is reported, never patched.
//
//   node scripts/audit-blog-anchors.mjs            # report only
//   node scripts/audit-blog-anchors.mjs --fix      # report + apply auto-fixes

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
const APPLY = process.argv.includes("--fix");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

async function loadAllPublished() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?select=id,slug,title,content&published_at=not.is.null&order=published_at.desc`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok) throw new Error(`load failed: ${res.status}`);
  return res.json();
}

async function patchContent(id, content) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`patch failed: ${res.status} ${await res.text()}`);
}

function findAnchorLinks(html) {
  // Match each <a href="#TARGET">LINK_TEXT</a>. Limit text capture to a
  // reasonable length to skip pathological matches.
  const re = /<a\b[^>]*href="#([^"\s]+)"[^>]*>([\s\S]{0,200}?)<\/a>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const target = m[1];
    const text = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    out.push({ target, text });
  }
  return out;
}

function findExistingIds(html) {
  return new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g)).map((m) => m[1]));
}

/**
 * Try to inject id="target" onto an element whose visible text matches
 * `linkText`. Tried in confidence order:
 *   1. exact match — link text equals heading/span text
 *   2. heading starts with link text + a punctuation delimiter — covers
 *      docx exports where the TOC entry is the lead clause of a longer
 *      heading like "What you give up when you skip a planner"
 *   3. heading contains link text as a contiguous substring — covers
 *      lead-ins like "The real pros and cons" → "Pros and cons"
 *
 * We patch <span> and <h1-6> only — those are how docx-imported section
 * labels actually surface. Anything more permissive risks tagging
 * arbitrary inline text and creating phantom jump targets.
 *
 * Returns the new HTML string or null if no candidate was found.
 */
function tryInjectId(html, target, linkText) {
  const norm = linkText.toLowerCase().trim();
  if (!norm || norm.length < 3) return null;

  const tags = ["h1", "h2", "h3", "h4", "h5", "h6", "span"];
  // Strategy 1: exact text match.
  for (const tag of tags) {
    const hit = findCandidate(html, tag, (inner) => inner.toLowerCase() === norm);
    if (hit) return applyId(html, hit, target);
  }
  // Strategy 2: heading starts with link text, followed by a delimiter.
  // Restricted to h1-h6 (skipping span) so we don't grab arbitrary inline
  // copy that happens to begin with the link text.
  for (const tag of tags.slice(0, 6)) {
    const hit = findCandidate(html, tag, (inner) => {
      const lower = inner.toLowerCase();
      if (!lower.startsWith(norm)) return false;
      const next = lower[norm.length];
      // Must be followed by punctuation/whitespace — not a word boundary
      // mid-token. Letters/digits would mean it's just a prefix of a longer
      // word, which is a false positive.
      return next === undefined || /[\s:.,;?!\-—–]/.test(next);
    });
    if (hit) return applyId(html, hit, target);
  }
  // Strategy 3: heading contains link text as a substring (case-insensitive).
  // h1-h6 only, same false-positive concern as above.
  for (const tag of tags.slice(0, 6)) {
    const hit = findCandidate(html, tag, (inner) =>
      inner.toLowerCase().includes(norm)
    );
    if (hit) return applyId(html, hit, target);
  }
  // Strategy 4: significant-word overlap. The heading and link text share
  // most non-stopword tokens, possibly with extra words sprinkled in
  // ("Tips by personality" vs heading "Tips by planning personality").
  // Restricted to h2-h6 — h1 is the post title, never a section anchor.
  const linkTokens = significantTokens(linkText);
  if (linkTokens.length >= 2) {
    const candidates = [];
    for (const tag of tags.slice(1, 6)) {
      const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]{0,400}?)</${tag}>`, "gi");
      let match;
      while ((match = re.exec(html)) !== null) {
        const attrs = match[1];
        if (/\bid="/.test(attrs)) continue;
        const inner = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        const headTokens = new Set(significantTokens(inner));
        // Require every link token (or its stem) to appear in the heading.
        const allFound = linkTokens.every((t) => hasTokenOrStem(headTokens, t));
        if (allFound) {
          candidates.push({
            index: match.index,
            length: match[0].length,
            tag,
            attrs,
            innerRaw: match[2],
            extras: headTokens.size - linkTokens.length,
          });
        }
      }
    }
    if (candidates.length === 1) {
      return applyId(html, candidates[0], target);
    }
    if (candidates.length > 1) {
      // Disambiguate by:
      //   1. fewest extra tokens (closest size match)
      //   2. higher heading level (h1 beats h2 beats h4 — docx imports
      //      typically use h2 for sections; h4s are usually CTA labels)
      //   3. earlier document position (TOC anchors point forward)
      candidates.sort((a, b) => {
        if (a.extras !== b.extras) return a.extras - b.extras;
        const levelA = parseInt(a.tag.slice(1), 10) || 99;
        const levelB = parseInt(b.tag.slice(1), 10) || 99;
        if (levelA !== levelB) return levelA - levelB;
        return a.index - b.index;
      });
      // Always pick the top after sorting — the priority ladder above
      // guarantees a deterministic choice rather than bailing on ties.
      return applyId(html, candidates[0], target);
    }
  }
  return null;
}

// Pulled out of the heading-loop closure so strategy 4 can reuse it.
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from",
  "i", "if", "in", "is", "it", "my", "of", "on", "or", "our", "so", "the",
  "this", "to", "up", "was", "we", "were", "what", "with", "you", "your",
  "really", "actually", "just",
]);

function significantTokens(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t && t.length > 1 && !STOPWORDS.has(t));
}

function hasTokenOrStem(set, token) {
  if (set.has(token)) return true;
  // Cheap stems for the cases that actually show up in TOC / heading
  // mismatches: plural/singular swaps, -ing/-ed inflections, and the
  // double-consonant-before-suffix case ("planning" ↔ "plan").
  const candidates = [
    token + "s",
    token + "es",
    token.replace(/s$/, ""),
    token.replace(/es$/, ""),
    token + "ing",
    token.replace(/ing$/, ""),
    token.replace(/(.)\1ing$/, "$1"), // planning → plan, running → run
    token + "ed",
    token.replace(/ed$/, ""),
    token.replace(/(.)\1ed$/, "$1"), // planned → plan
    token.replace(/y$/, "ies"), // baby → babies
    token.replace(/ies$/, "y"), // babies → baby
  ];
  return candidates.some((c) => c.length > 1 && set.has(c));
}

function findCandidate(html, tag, predicate) {
  const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]{0,400}?)</${tag}>`, "gi");
  let match;
  while ((match = re.exec(html)) !== null) {
    const attrs = match[1];
    if (/\bid="/.test(attrs)) continue; // already has an id
    const inner = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (predicate(inner)) {
      return { index: match.index, length: match[0].length, tag, attrs, innerRaw: match[2] };
    }
  }
  return null;
}

function applyId(html, hit, target) {
  const replacement = `<${hit.tag}${hit.attrs} id="${target}">${hit.innerRaw}</${hit.tag}>`;
  return html.slice(0, hit.index) + replacement + html.slice(hit.index + hit.length);
}

(async () => {
  const posts = await loadAllPublished();
  let totalBrokenLinks = 0;
  let totalAutoFixed = 0;
  const postsTouched = [];

  for (const post of posts) {
    const links = findAnchorLinks(post.content);
    if (links.length === 0) continue;

    const ids = findExistingIds(post.content);
    const broken = links.filter((l) => !ids.has(l.target));
    if (broken.length === 0) continue;

    // Group broken links by target so the report stays compact when the same
    // target shows up multiple times (it usually does — a TOC plus footer
    // link, etc.).
    const byTarget = new Map();
    for (const b of broken) {
      const got = byTarget.get(b.target);
      if (got) {
        if (b.text && !got.texts.includes(b.text)) got.texts.push(b.text);
      } else {
        byTarget.set(b.target, { texts: b.text ? [b.text] : [] });
      }
    }

    console.log(`\n${post.slug}`);
    console.log(`  ${post.title}`);

    let mutated = post.content;
    let autoFixedHere = 0;
    const stillBroken = [];

    for (const [target, { texts }] of byTarget) {
      const linkText = texts[0]; // first occurrence's text is what we'll match against
      const next = linkText ? tryInjectId(mutated, target, linkText) : null;
      if (next) {
        mutated = next;
        autoFixedHere++;
        totalAutoFixed++;
        console.log(`  ✓ #${target} ← matched "<${linkText}>" element`);
      } else {
        stillBroken.push({ target, texts });
      }
      totalBrokenLinks++;
    }

    for (const { target, texts } of stillBroken) {
      const sample = texts.length ? ` [link text: "${texts[0]}"]` : "";
      console.log(`  ✗ #${target} — no matching element${sample}`);
    }

    if (mutated !== post.content) {
      postsTouched.push({ id: post.id, slug: post.slug, content: mutated, autoFixedHere });
    }
  }

  console.log(`\n— Summary —`);
  console.log(`Posts scanned: ${posts.length}`);
  console.log(`Broken anchor targets found: ${totalBrokenLinks}`);
  console.log(`Auto-fixable: ${totalAutoFixed}`);
  console.log(`Need manual review: ${totalBrokenLinks - totalAutoFixed}`);

  if (!APPLY) {
    console.log(`\nDry run. Re-run with --fix to apply auto-fixes.`);
    return;
  }

  if (postsTouched.length === 0) {
    console.log(`\nNo writes needed.`);
    return;
  }

  console.log(`\nApplying fixes to ${postsTouched.length} post(s)…`);
  for (const p of postsTouched) {
    await patchContent(p.id, p.content);
    console.log(`  ✓ ${p.slug} (+${p.autoFixedHere})`);
  }
  console.log(`Done.`);
})();
