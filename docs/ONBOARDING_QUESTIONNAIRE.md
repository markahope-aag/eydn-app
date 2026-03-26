# Onboarding Questionnaire

Route: `/dashboard/onboarding`

A 7-screen wizard that collects wedding details and seeds the user's planning data. All fields are stored in React state during the flow and written to Supabase in a single transaction on completion.

---

## Screen 1 -- Welcome

- **Headline:** "Wedding planning without the chaos."
- **Subhead:** About Eydn keeping everything in one place.
- **CTA:** "Let's get started"
- No progress bar on this screen.

---

## Screen 2 -- Partner Names

Comes first so all subsequent screens can personalize copy.

- **Headline:** "Who's getting married?"
- **Subhead:** "Just first names is fine. We'll use these throughout the app."
- **Inputs:**
  - "Your name" (text, required)
  - "Partner's name" (text, required)
- **CTA:** "Nice to meet you both"

---

## Screen 3 -- Wedding Date

- **Headline:** "When's the wedding, [name]?" (personalized with name from Screen 2)
- **Subhead:** About the task timeline being built around this date.
- **Input:** Date picker (required, must be a future date)
- **Helper text:** "Don't have an exact date yet? Put in your target month and we'll work from there."
- **CTA:** "That's the date"

---

## Screen 4 -- Budget and Guest Count

Combined screen. Both fields are skippable.

- **Headline:** "Budget and guest count"
- **Subhead:** About these driving planning decisions.
- **Inputs:**
  - Dollar amount for budget, with helper text about $25K-$35K average
  - Number input for guest count, with helper text about adjusting later
- **CTA:** "Continue"
- **Skip:** "I'll add these later"

---

## Screen 5 -- Venue Status

- **Headline:** "Have you booked a venue yet?"
- **Options** (card-style, select one):
  - "Yes -- we have a venue"
  - "We're still looking"
  - "We're doing something non-traditional"
- If "Yes" is selected, two additional inputs appear:
  - Venue name (text, required)
  - City (text, optional)
- **CTA:** "Continue"

---

## Screen 6 -- Booked Vendors

- **Headline:** "Have you booked any vendors yet?"
- **Subhead:** About the task list being built around what's already done.
- **Input:** Multi-select grid of 12 vendor categories:
  - Photographer
  - Videographer
  - Caterer
  - DJ or Band
  - Florist
  - Officiant
  - Cake/Dessert Baker
  - Hair Stylist
  - Makeup Artist
  - Rentals
  - Wedding Planner / Coordinator
  - Transportation
- **CTA:** Shows count -- "Continue with 3 booked" or "None yet -- continue"
- Selections feed into the task generator to skip already-booked vendor tasks.

---

## Screen 7 -- AI Screen

Intro, greeting, and input combined on one screen.

- **Headline:** "One more thing before you dive in."
- Brief intro paragraph about Eydn's planning assistant.
- Dynamic AI greeting displayed in a chat bubble, built from partner names and wedding date. Generated client-side from a template (no LLM call). Includes a timeframe-based variant line:
  - More than 12 months out
  - 6-12 months out
  - 3-6 months out
  - 1-3 months out
  - Less than 30 days out
- **Input:** Text field for an optional first message.
- **CTA:** "Go to my dashboard" (always visible, does not require a message)

---

## Navigation

| Element      | Shown on                              |
|--------------|---------------------------------------|
| Progress bar | Screens 2-7 (not on Welcome)         |
| Back button  | Screens 3-6 (not on Names or AI)     |

---

## Database Writes on Completion

All writes happen in a single transaction when the user finishes the flow.

**weddings table**
- names, date, venue, venue_city, budget, guest_count_estimate

**questionnaire_responses table**
- Full form data stored as JSONB

**expenses table**
- Seeded from BUDGET_TEMPLATE using percentage-based allocations (Venue 30%, Catering 25%, Photo/Video 12%, remaining categories split across the balance)

**tasks table**
- Generated from the wedding date
- Conditional: tasks for booked vendor categories are skipped

---

## Review Mode

Accessed via `?review=true` query parameter. Pre-fills existing data from the Settings page so the user can walk through the flow again without losing current values.

---

## Voice Rules

- No exclamation points
- No emoji
- No "Amazing!", "Perfect!", "Great!", "Congratulations"
- Direct, warm, honest
