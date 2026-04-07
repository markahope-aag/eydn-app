# Wedding Budget Calculator

## What it is

A free, publicly accessible wedding budget calculator at `/tools/wedding-budget-calculator`. No auth required. Designed to rank for "wedding budget calculator" (~40K monthly searches) and capture email leads from couples actively planning their wedding budget.

## Where it lives

- **Main page:** `/tools/wedding-budget-calculator` (static, prerendered)
- **Embed version:** `/tools/wedding-budget-calculator/embed` (frameless, noindex)
- **Saved links:** `/tools/wedding-budget-calculator/s/[code]` (server-side redirect)
- **API:** `/api/tools/calculator-save` (POST to save, GET to load)
- **Database:** `calculator_saves` table in Supabase

## How the calculator works

The calculator is entirely client-side. No API calls are made while the user adjusts inputs. All calculations run in the browser using industry benchmark data synthesized from public wedding cost surveys.

### Inputs

- **Budget slider** ($5K-$75K, $500 steps, default $25K)
- **Guest count slider** (10-300, steps of 5, default 120)
- **State selector** (grouped by region, 44 states + DC)
- **Month selector** (January-December with peak/shoulder/off-season tags)

### Outputs

- **10-category breakdown** with dollar amounts and color-coded progress bars
  - Venue (23.8%), Catering & bar (19.2%), Photography & video (12%), Florals & decor (9%), Attire & beauty (6.5%), Music & entertainment (6%), Rehearsal dinner (4%), Stationery & gifts (2.5%), Transportation (2%), Ceremony & officiant (1.5%)
- **Summary cards:** per-guest cost, state average, and comparison to average
- **Hidden cost buffer:** 9% of total budget reserved (shown as a callout)
- **Season tips:** contextual messages for peak vs off-season pricing

### State multipliers

Each state has a cost multiplier relative to the national average. Examples:
- New Jersey: 1.50x ($54,400 avg)
- California: 1.40x ($44,000 avg)
- Wisconsin: 0.82x ($24,500 avg)
- Utah: 0.75x ($19,500 avg)
- Alaska: 0.60x ($16,200 avg)

These multipliers are baked into the client-side data. They don't affect the category percentages — they're used for the "vs. average" comparison card.

## URL state sync

The URL updates in real-time as the user adjusts inputs via `history.replaceState`. This means:

- Bookmarking the page preserves the exact calculator state
- Sharing the URL gives someone the same inputs
- The "Copy shareable link" button copies the current URL
- Example: `/tools/wedding-budget-calculator?budget=32000&guests=150&state=Texas&month=5`

## Save & email capture

### User flow

1. User interacts with the calculator freely (no gate)
2. Clicks "Save my breakdown"
3. Modal asks for email with the promise: "No spam, ever. Just your saved calculator link."
4. On submit, a POST to `/api/tools/calculator-save` stores their data and returns a 7-character short code
5. Confirmation screen shows `eydn.app/tools/wedding-budget-calculator/s/a7x9k2` with a copy button
6. When they visit that link later, a server-side redirect restores their exact inputs

### What gets stored

`calculator_saves` table:
- `id` (UUID, primary key)
- `short_code` (text, unique, indexed) — 7-character base64url code
- `email` (text, indexed)
- `budget` (integer)
- `guests` (integer)
- `state` (text)
- `month` (integer, 0-11)
- `created_at` (timestamptz)

### Deduplication

If the same email saves again, the existing record is updated with the new calculator values. The short code stays the same. This prevents a single person from creating multiple records.

### Lead value

Each captured lead includes:
- Email address
- Budget (reveals their spending tier — $15K vs $50K is very different messaging)
- Guest count (wedding size)
- State (location for local vendor relevance)
- Wedding month (timing for urgency-based follow-ups)

This data is enough to segment and personalize a nurture email sequence.

## Embed version

The embed page at `/tools/wedding-budget-calculator/embed` renders the calculator without the site header, footer, or navigation. It's designed for wedding bloggers to embed via iframe:

```html
<iframe
  src="https://eydn.app/tools/wedding-budget-calculator/embed"
  width="100%"
  height="780"
  frameborder="0"
  style="border-radius: 16px; border: 1px solid #f1f0eb;"
  title="Wedding Budget Calculator — Eydn"
  loading="lazy">
</iframe>
```

The embed version has `robots: noindex` to avoid duplicate content. It includes a "Powered by Eydn" attribution link at the bottom.

## SEO

- **Target keywords:** "wedding budget calculator", "wedding budget breakdown", "how much does a wedding cost", "average wedding cost by state"
- **Title tag:** "Wedding Budget Calculator 2026 — Free Tool | Eydn"
- **JSON-LD:** WebApplication schema (type: FinanceApplication, price: 0)
- **Canonical:** `/tools/wedding-budget-calculator`
- **Sitemap:** included at priority 0.8
- **Internal links:** footer link on homepage under "Product"
- **Below-the-fold SEO content:** 3 paragraphs explaining methodology, state adjustments, and hidden cost data

## CTA

Every calculator page includes a bottom CTA card:

> **Ready to track your real budget?**
> Eydn pre-loads 36 line items across 13 categories with real vendor quotes, deposits, payment dates, and an AI that takes action.
> [Start free — $79 one-time]

Links to `/sign-up`.

## Phase 2 (not yet built)

- **Email delivery:** Send the saved link to the user's email via SES/Resend with a branded template
- **Nurture sequence:** 3-email drip triggered by calculator save (welcome → budget tips → Eydn pitch)
- **Email capture modal:** Auto-trigger after 3+ input interactions for users who haven't saved yet
- **Admin visibility:** Show calculator leads in the admin dashboard with budget/state/month data
- **A/B title testing:** Test different page titles for CTR from search results

## Files

- `src/app/tools/wedding-budget-calculator/page.tsx` — main route with SEO metadata and JSON-LD
- `src/app/tools/wedding-budget-calculator/embed/page.tsx` — frameless embed version
- `src/app/tools/wedding-budget-calculator/embed/layout.tsx` — strips chrome for embed
- `src/app/tools/wedding-budget-calculator/s/[code]/page.tsx` — saved link redirect
- `src/components/tools/WeddingBudgetCalculator.tsx` — main interactive component
- `src/components/tools/BudgetBreakdownBar.tsx` — category bar row
- `src/components/tools/SummaryCard.tsx` — summary metric card
- `src/app/api/tools/calculator-save/route.ts` — save/load API
- `supabase/migrations/20260407100000_calculator_saves.sql` — database migration
