# Eydn — QA Testing Program

A structured plan for systematically testing the Eydn app. Pair this
with [QA_PRODUCT_GUIDE.md](QA_PRODUCT_GUIDE.md) which gives you product
context.

## How to use this document

1. Read the product guide first.
2. Set up your test accounts (see "Test environment" below).
3. **Import [`QA_TEST_TRACKING.csv`](QA_TEST_TRACKING.csv) into a
   Google Sheet** — that's your active tracker, one row per test step,
   ready for status / notes / bug-link columns. (See "Setting up your
   tracker" below.)
4. Work through the test passes in order — **Smoke** first to confirm
   nothing's catastrophically broken, then deeper passes.
5. For each test, mark **Pass / Fail / Blocked / N/A** in the sheet
   and log any failures using the bug report template at the bottom.
6. When you finish a pass, share the sheet or write a summary so we
   can prioritize fixes.

## Setting up your tracker

The `QA_TEST_TRACKING.csv` file in this folder has every test step
from this document as a row (~270 rows total), with empty columns
ready for tracking.

**To import into Google Sheets:**

1. Open Google Sheets → File → Import → Upload → drop the CSV.
2. Choose "Replace spreadsheet" → Import data.
3. Optionally: select the `Status` column → Data → Data validation →
   Dropdown with values: `Not Started, Pass, Fail, Blocked, N/A`.
4. Optionally: add conditional formatting so Fail rows turn red.
5. Share the sheet back with Mark so he can see progress.

The columns are: `Pass | Pass Name | Section | Test ID | Test Step |
Status | Notes | Bug Link | Tester | Date`.

## Test environment

| Item | What you need |
|---|---|
| Test couple — fresh | A brand-new email to test the full signup → onboarding flow |
| Test couple — trial expired | A 14+ day old account still on trial (we'll set the date back if needed) |
| Test couple — Pro Monthly | A paid Pro Monthly subscriber |
| Test couple — Lifetime | A paid Lifetime purchaser |
| Test couple — admin | An account with admin role (for testing admin panel) |
| Real RSVP email | A guest email you can use to receive RSVP invitations and respond |
| Phone with browser | iOS Safari + Android Chrome, for mobile testing |
| Desktop browsers | Chrome, Safari, Firefox (minimum) |
| Stripe test cards | `4242 4242 4242 4242` succeeds; `4000 0000 0000 0002` declines; expiration any future date, CVC any 3 digits |

## Test passes (run in order)

### Pass 1 — Smoke (60 minutes)

The fastest way to know if a build is shippable. Do these before
anything else.

| ID | Step | Pass / Fail |
|---|---|---|
| S1 | Visit the marketing home page (`/`) — loads, no console errors | |
| S2 | Click Sign Up — Clerk modal/page opens | |
| S3 | Sign up a new account with a fresh email | |
| S4 | Complete onboarding — all 7 screens, end with celebration snapshot | |
| S5 | Land on dashboard — greeting + cards render with your data | |
| S6 | Click Tasks — list of 50+ tasks renders | |
| S7 | Click any vendor category to add a vendor — form opens | |
| S8 | Click Guests — empty list + Add buttons render | |
| S9 | Click Wedding Website → Setup — checklist + URL field render | |
| S10 | Click Day-of Planner — timeline renders | |
| S11 | Click Vision Board → open the upload modal — it doesn't auto-save before you click Add | |
| S12 | Open AI chat — type "Hello" — get a response | |
| S13 | Sign out → sign back in — your data is still there | |
| S14 | Trigger a Stripe upgrade flow (test card) — checkout opens | |

---

### Pass 2 — Onboarding & first-run (90 minutes)

The first impression. Most couples will bounce if this is broken.

**Happy path**
- [ ] Sign up with a brand-new email
- [ ] Partner Names step: both names accept typical input, autoFocus is on first name
- [ ] Wedding Date step: a date in the future is accepted; a date in the past is rejected with a clear message
- [ ] Budget step: budget and guest count both work; "Not sure yet" option clears guest count
- [ ] Venue Status step: each of the three radio options work (Booked / Looking / Non-traditional)
- [ ] If Booked: venue search autocomplete works, you can also type a venue not in the directory
- [ ] If Looking or Non-traditional: city input accepts text
- [ ] Booked Vendors step: clicking each vendor toggle works
- [ ] Invite Partner step: you can enter an email OR skip
- [ ] AI Intro step: greeting includes your partner names AND your wedding date
- [ ] Type a question in the AI input and press Enter — lands on `/dashboard/chat` with your message + an answer
- [ ] Or click "Go to my dashboard" without a question — lands on `/dashboard`
- [ ] After onboarding, the post-survey walkthrough modal should NOT appear (fresh signups skip it)

**Edge cases**
- [ ] Refresh the page mid-onboarding — does it pick up where you left off?
- [ ] Try clicking Back — does the form preserve what you've typed?
- [ ] Change your wedding date in onboarding review mode — do you see the amber warning about appointment tasks?
- [ ] Try a name with diacritics (José, Zoë) — saves and displays correctly?
- [ ] Try an extremely long name (50+ characters) — handled gracefully?
- [ ] Try budget with comma or no comma (30000 vs 30,000)
- [ ] Skip every optional field — does completion still work?

**Accessibility**
- [ ] Tab through every form field — focus is visible, order makes sense
- [ ] Use a screen reader to navigate one screen — labels are announced
- [ ] Submit forms by pressing Enter (not just clicking buttons)

---

### Pass 3 — Tasks (45 minutes)

- [ ] Initial task list has ~50 entries grouped by phase (12 months out, 6 months out, etc.)
- [ ] Task descriptions reference YOUR wedding (partner names, venue, budget where relevant)
- [ ] Mark a task complete — disappears or moves to "Done"
- [ ] Add a custom task — appears at the right place in the timeline
- [ ] Edit a task title — saves
- [ ] Edit a task due date — saves
- [ ] Add a note to a task — saves and displays
- [ ] Delete a task — confirms, then removes
- [ ] Restore from Settings → Recently Deleted — task returns
- [ ] **Date cascade test**: change wedding date back 3 months. Milestone tasks shift; appointment tasks show the amber banner with "I understand — I will update affected appointments"; banner stays until clicked
- [ ] Filter / sort / search if those exist
- [ ] Task counts on the dashboard home match the task list

---

### Pass 4 — Budget (30 minutes)

- [ ] 36 line items appear in the right categories on first visit
- [ ] Setting an estimated amount updates the category total
- [ ] Setting "Actual" amount updates the category total and the overall remaining card
- [ ] Mark a line item as paid — updates totals
- [ ] Color band changes: healthy / tight / over budget
- [ ] Recommended % vs your actual % visible per category
- [ ] Add a custom line item — saves
- [ ] Delete a line item — confirms, removes
- [ ] Adjust total budget — recommended amounts recalculate

---

### Pass 5 — Guest list (90 minutes)

**Adding guests**
- [ ] Single add with name only — works
- [ ] Single add with full details — works
- [ ] CSV import with the provided template — works, count matches
- [ ] CSV import with malformed rows — fails gracefully with a helpful message
- [ ] Phone contacts import (Chrome on Android only) — works or shows "not supported" on iOS
- [ ] Imported guests default to "Save for Later" status (NOT "Pending")

**Kids and plus-ones**
- [ ] Click "+ Child / +1" on any guest row — row expands and cursor focuses the input
- [ ] Type a name, hit Enter — companion added as a full guest row
- [ ] Companion has its own RSVP, meal, seat assignment
- [ ] Head guest shows a "+1 guest" badge
- [ ] "+ Child / +1" button does NOT appear on companion rows themselves
- [ ] Delete the head guest — companions also deleted (or surfaced as needing reassignment)

**RSVP management**
- [ ] Change RSVP status from the row — saves
- [ ] All 5 statuses available (Save for Later, Invite Sent, Pending, Accepted, Declined)
- [ ] Awaiting count in header matches Invite Sent + Pending totals
- [ ] Capacity warning appears if guests > venue capacity

**Bulk operations**
- [ ] Select multiple guests via checkboxes — bulk action menu appears
- [ ] Bulk status update — applies to selection
- [ ] Bulk delete — confirms, removes
- [ ] Bulk delete a head guest — companions also handled

**Search and sort**
- [ ] Search by name — filters in real time
- [ ] Sort by name, status, role — works
- [ ] Filter by role / group — works

**Export**
- [ ] CSV export — downloads file with all current guests
- [ ] PDF export — looks reasonable

---

### Pass 6 — Vendors (90 minutes)

**Directory**
- [ ] Browse the directory — at least some vendors load
- [ ] Filter by category — works
- [ ] Filter by distance from your venue — works
- [ ] Filter by price range — works
- [ ] Click a vendor's "Add to my vendors" — succeeds
- [ ] Open the newly-added vendor's detail page — Google Business Profile shows (rating, photos, contact) — should NOT say "could not find their business profile"

**Google Places fallback** (Pro feature)
- [ ] Search the directory for a vendor we don't have (e.g., your actual local florist)
- [ ] "Found on Google" card appears with photo, rating, address
- [ ] Pick a category, click Add to my vendors — succeeds
- [ ] Detail page renders the full profile from the cached Google data
- [ ] Free-tier users see the upgrade CTA instead of the result

**Manual add**
- [ ] Click "Add Your Own" — form opens
- [ ] Type a name and click Search Google Places — finds a match (or surfaces "no match")
- [ ] Add manually with name + category — succeeds

**Vendor detail page**
- [ ] All 6 status stages clickable (Searching → Paid in Full)
- [ ] Contact name / email / phone editable, save on blur
- [ ] Amount and amount paid editable
- [ ] Arrival time and vendor meal count editable
- [ ] Email Template button opens a pre-filled email
- [ ] Contract upload works — file appears in attachments
- [ ] Notes section accepts text and saves

**Vendor meal totals**
- [ ] Set meal_count on 2+ vendors
- [ ] Vendors tab shows "X vendor meals across N vendors" summary line
- [ ] Day-of planner → Vendors & Party shows the "Final meal count for catering" card
- [ ] Numbers add up: accepted guests + plus-ones coming + vendor meals

---

### Pass 7 — Seating chart (60 minutes)

**Reception tab**
- [ ] Add a table — appears on the canvas
- [ ] Drag a table — repositions and saves
- [ ] Click Edit on a table — popover stays open, can change name / shape / capacity / per-seat assignment
- [ ] Click outside the popover — closes
- [ ] Drag a guest from the sidebar to a table — assignment saves
- [ ] Use the dropdown to assign — assignment saves
- [ ] Unseat a guest — removes from table
- [ ] Plus-ones from RSVPs appear in the unassigned sidebar
- [ ] Zoom in / out — works
- [ ] Undo last assignment — works
- [ ] Search unassigned — filters
- [ ] Empty state: "Everyone has a seat" message when all assigned

**Ceremony tab**
- [ ] Partner names appear at center / altar
- [ ] Add to Left Side via inline form — appears with role
- [ ] Add to Right Side — same
- [ ] Add Officiant — appears at center
- [ ] Reorder with up/down arrows
- [ ] Remove an entry — confirms, removes
- [ ] Print — printer-friendly layout opens

---

### Pass 8 — Vision board (60 minutes)

**Uploading**
- [ ] Drag a single image onto the upload area — file queues (does NOT save yet)
- [ ] Drag multiple images — N images queued
- [ ] Click to browse instead of dragging — same behavior
- [ ] Set caption / category / vendor / location before clicking Add to Board
- [ ] Click Add to Board — saves with all chosen options

**Paste URL**
- [ ] Paste a Pinterest image URL — extracts the image, saves
- [ ] Paste a tall portrait image URL — displays at its natural aspect (NOT cropped to a square)
- [ ] Paste a wide landscape URL — same
- [ ] Paste a page URL (not direct image) — extracts og:image
- [ ] Paste a non-image URL — fails with helpful message

**Grid behavior**
- [ ] Masonry layout shows varied heights
- [ ] Click an image — lightbox opens with full image
- [ ] Lightbox close button + click-outside-to-close both work
- [ ] Filter by category — works
- [ ] Edit caption / category / vendor on a saved item — saves
- [ ] Delete an item — confirms, removes

**Sharing**
- [ ] Click Share — copies a link
- [ ] If website published: link is `eydn.app/w/{slug}/vision`
- [ ] If website NOT published: tooltip explains, only a summary is copied
- [ ] Open the public vision link in incognito — themed page, no edit controls, no vendor tags visible

---

### Pass 9 — Day-of planner (90 minutes)

**Timeline tab**
- [ ] Existing events display with times, names, durations
- [ ] Click "Add Event" — new row appears at the bottom with empty time
- [ ] Type a time (e.g., 6:30 PM) and tab away — row jumps to chronological position
- [ ] Type event name, duration, notes — saves on blur
- [ ] Empty-time rows stay at the bottom
- [ ] Change ceremony time and click "Regenerate Timeline" — confirms, then all times update to the new schedule
- [ ] Group filter chips (Partner 1, Attendants, etc.) — filter the list

**Ceremony tab**
- [ ] Script field saves
- [ ] Processional order list editable
- [ ] Officiant notes save

**Music / Speeches / Setup / Attire tabs**
- [ ] Each tab loads, saves changes
- [ ] Add / edit / remove items

**Vendors & Party tab**
- [ ] Vendor contact table shows all current vendors with arrival times
- [ ] Wedding party jobs table shows assignments
- [ ] **Final meal count for catering** card shows: total + breakdown (accepted guests, plus-ones coming, vendor meals)
- [ ] Counts match other surfaces (the actual guest list, the vendors tab)

**Packing checklist**
- [ ] All items display
- [ ] Check off an item — saves
- [ ] Add a custom packing item — saves

**Binder export**
- [ ] Click Export Full Binder — PDF generates
- [ ] PDF includes: cover, timeline, vendor contacts, wedding party jobs, packing checklist, seating chart, ceremony layout
- [ ] All numbers match the dashboard (guest count, vendor count, etc.)
- [ ] No truncated text, no overlapping elements, no missing sections

---

### Pass 10 — Wedding website (couple side) (90 minutes)

**Setup tab**
- [ ] Choose a URL slug — uniqueness check works (try one that's taken)
- [ ] Publish toggle — site goes live at `eydn.app/w/{slug}`
- [ ] Live preview updates as you edit
- [ ] Progress checklist shows completed items checked off (green)
- [ ] Cover image upload — saves and shows in preview
- [ ] Couple photo upload — saves and shows in preview
- [ ] Headline, story, theme colors — all save

**Schedule tab**
- [ ] Add schedule events — save
- [ ] Travel info, accommodations textareas save
- [ ] FAQ entries save

**Registry tab**
- [ ] Quick-add chips (Amazon, Zola, etc.) prefill the name
- [ ] Manual add with name + URL works
- [ ] Reorder, edit, remove — all work

**RSVP tab**
- [ ] Set RSVP deadline — saves
- [ ] Add meal options — save
- [ ] Generate RSVP Links — creates one per guest, counter increments
- [ ] **Wedding QR Code** section: PNG downloads, link in description points to `/w/{slug}`
- [ ] **Per-Guest QR Codes**: Generate creates one per guest, downloadable individually or as ZIP
- [ ] QR codes don't regenerate unnecessarily (clicking again should reuse existing)

**Gallery tab**
- [ ] Photo approval toggle saves
- [ ] Uploaded guest photos appear (test by uploading from the public site)
- [ ] Approve / reject works

---

### Pass 11 — Wedding website (guest side / public) (90 minutes)

Open `eydn.app/w/{slug}` in an incognito browser to test as a guest.

**Page loads**
- [ ] Hero shows correct couple names + date + venue
- [ ] Cover photo displays cleanly (no missing alt text, no broken layout)
- [ ] Sticky nav at top scrolls to each section
- [ ] All filled-in sections render: Story, Couple Photo, Schedule, Travel, Stay, FAQ, Registry, Photos, RSVP
- [ ] Empty sections don't show at all (no "no content" placeholders)
- [ ] Loading state appears briefly (themed skeleton) on slow connections

**RSVP — via QR / direct link**
- [ ] Scan a per-guest QR (or open `/w/{slug}?rsvp={token}`) — name pre-filled
- [ ] Click Accept → meal dropdown + plus-one field appear
- [ ] Submit RSVP — success message ("Thank you, {name}.")
- [ ] Open the same link again — "Your RSVP has already been recorded"
- [ ] Click Decline — submits, success message
- [ ] Plus-one name typed → after submit, check guest list: companion guest row created

**RSVP — via name lookup (shared QR)**
- [ ] Open `/w/{slug}` directly
- [ ] Find "Find your name to RSVP"
- [ ] Type your name — finds you
- [ ] Type a name not on the list — friendly "we couldn't find that name" message
- [ ] Case-insensitive: SARAH should match Sarah
- [ ] Type with extra whitespace — still matches

**Photo upload**
- [ ] Click the upload area in the Photos section — keyboard accessible (Tab + Enter to activate)
- [ ] Upload a JPG / PNG / WebP — succeeds, "uploaded" message
- [ ] Upload a non-image file — rejected with clear message
- [ ] If approval required, photo doesn't appear publicly until approved in dashboard

**Vision board public page** (`/w/{slug}/vision`)
- [ ] Loads if the wedding website is published
- [ ] 404 if not published
- [ ] Pinterest grid renders, lightbox works
- [ ] Categories filter works
- [ ] No vendor tags visible
- [ ] No locations visible
- [ ] "Back to website" link works

---

### Pass 12 — AI chat (45 minutes)

- [ ] Open `/dashboard/chat` — input is focused, history loaded
- [ ] Send a question about your wedding ("What's my budget?") — references your actual data
- [ ] Ask Eydn to add a guest ("Add Jane Doe") — guest appears in guest list
- [ ] Ask to mark a task complete — task is marked complete
- [ ] Ask for vendor recommendations ("Find me photographers in Austin under $3K") — uses web search, returns specific options
- [ ] Send a question on free tier — tool-call meter decrements; on Pro, no meter visible
- [ ] Hit the free-tier tool cap — get a friendly "monthly cap reached" message with upgrade CTA
- [ ] Long conversation (10+ messages) — context preserved
- [ ] Reload the page — chat history reloads from server

---

### Pass 13 — Collaboration (45 minutes)

- [ ] Settings → Collaborators → invite an email as Partner
- [ ] Recipient gets an email
- [ ] Recipient signs up / signs in and accepts — appears in collaborators list
- [ ] Recipient lands on the same wedding's dashboard
- [ ] Both users edit a guest simultaneously — both see updates without conflicts
- [ ] Remove a collaborator — they lose access on next page load
- [ ] Invite a Coordinator — they can edit tasks/vendors/guests but NOT the wedding date
- [ ] Invite a Parent — read-only, attempts to edit fail gracefully
- [ ] Try the same email twice — handled gracefully

---

### Pass 14 — Payments & billing (60 minutes)

⚠️ Use **Stripe test cards** only. Real cards will charge real money.

**Pro Monthly**
- [ ] Click upgrade → Pro Monthly → Stripe Checkout opens
- [ ] Pay with `4242 4242 4242 4242` → redirected back to app, success state
- [ ] Account immediately shows Pro Monthly tier
- [ ] Within ~10 seconds of webhook, dashboard reflects Pro features unlocked
- [ ] Decline test card (`4000 0000 0000 0002`) → graceful error, no charge

**Lifetime**
- [ ] Click upgrade → Lifetime → Stripe Checkout opens
- [ ] Pay with test card → success
- [ ] Account shows Lifetime tier, no expiry banner

**Trial expiry**
- [ ] On a day-15 trial account (or one set to past trial end): editing fails gracefully
- [ ] Read access still works (can view dashboard, export data)
- [ ] Upgrade flow available from the read-only banner

**Pro Monthly cancellation**
- [ ] Settings → Billing → cancel subscription → confirms via Stripe portal
- [ ] Account keeps Pro access until current period end, then drops to free

---

### Pass 15 — Cross-cutting tests (90 minutes)

**Mobile**
- [ ] Test the full smoke pass on Chrome on Android
- [ ] Test the full smoke pass on Safari on iOS
- [ ] No horizontal scrolling on any page at 320px (iPhone SE) or 375px (typical mobile)
- [ ] Touch targets at least 44px tall
- [ ] Forms work on mobile (no double-tap-to-zoom on inputs)
- [ ] Modals don't get stuck off-screen

**Accessibility**
- [ ] Keyboard-only navigation through the entire dashboard works
- [ ] Visible focus indicator on every interactive element
- [ ] Screen reader (VoiceOver / NVDA) announces form labels correctly
- [ ] Color contrast hits AA on every text element (run Lighthouse / Axe)
- [ ] All images have alt text
- [ ] Sidebar collapse / expand announces state to screen readers
- [ ] Wedding website hero text readable over the gradient/photo (AA)

**Performance**
- [ ] Dashboard initial load < 3 seconds on a fast connection
- [ ] No layout shift (CLS) on initial render
- [ ] Heavy pages (vendors directory with many results, guest list with hundreds) stay responsive

**Browser compatibility**
- [ ] Latest Chrome, Safari, Firefox on desktop
- [ ] Edge if convenient
- [ ] Mobile Safari, mobile Chrome

**Error states**
- [ ] Disconnect network mid-action — friendly error, retry option
- [ ] Submit form with server returning 500 — toast appears, no crash
- [ ] Visit a non-existent wedding URL — 404 page, not a crash
- [ ] Visit a wedding URL for an unpublished site — 404
- [ ] An auth-required page when signed out — redirects to sign-in, comes back after

**Data integrity**
- [ ] Change wedding date — task milestones shift, rehearsal dinner date moves, banner appears
- [ ] Delete then restore from Recently Deleted — all fields preserved
- [ ] Export data — all sections present in the JSON, can be opened
- [ ] Add a guest, refresh, guest still there

---

### Pass 16 — Exploratory / "try to break it" (open-ended)

The structured passes catch known cases. This pass catches the
unknown. Spend ~2 hours doing things a real couple might do that we
didn't think of:

- Try to add 500 guests via CSV — does the UI stay responsive?
- Add a vendor with a website URL that 404s — what happens when you
  click it?
- Upload a 50MB image — clear "too large" error?
- Set wedding date to 10 years in the future — task timeline still
  generates sensibly?
- Set wedding date to yesterday — does the app handle a past wedding?
- Type emoji into every field — saves and displays without corruption?
- Try to create two guests with the exact same name — allowed?
  Differentiated?
- Submit RSVP from a token URL twice in a row — second submission
  rejected or graceful?
- Open the same vendor on two browser tabs and edit different fields
  simultaneously — saves both, doesn't overwrite?
- Long-press, right-click, drag-and-drop in unexpected places — any
  crashes?

Write up anything weird, even if it's not strictly a bug — surprising
behavior is often a UX bug.

---

## Bug report template

For each bug, log:

```
**Title** (one line, specific)

**Where**: URL or screen name
**Account**: which test account (tier matters)
**Browser / device**: Chrome 120 on macOS / Safari 17 on iPhone 12 / etc.

**Steps to reproduce**:
1. ...
2. ...
3. ...

**Expected**: what should have happened
**Actual**: what did happen
**Screenshot / video**: attached

**Reproducible?**: every time / sometimes / once
**Severity**: critical / high / medium / low
  - critical = data loss, can't sign in, can't pay
  - high = a core feature is broken
  - medium = a feature works but UX is bad
  - low = cosmetic / minor

**Console errors**: (paste any browser console errors)
**Notes**: anything else worth knowing
```

## Coverage tracking template

Suggested format for a tracking sheet:

| Pass | Owner | Started | Finished | Pass / Fail / Blocked | Bugs logged | Notes |
|---|---|---|---|---|---|---|
| 1 — Smoke | | | | | | |
| 2 — Onboarding | | | | | | |
| 3 — Tasks | | | | | | |
| ... | | | | | | |

## Cadence

- **Smoke pass**: run before every release / deploy to production.
- **Full regression** (passes 1–14): run before a major release.
- **Cross-cutting + exploratory**: monthly, or whenever a new feature
  area lands.
- **Pass on the area being changed**: every time that area's code
  changes.

## When you're done

Hand back:
1. The completed tracking sheet (pass/fail per item).
2. A list of all bugs logged, prioritized.
3. Any patterns you noticed (e.g., "mobile is consistently weaker than
   desktop").
4. Any UX observations that aren't strictly bugs but feel off.
