# eydn Database Schema

**51 tables · 80 migrations · Supabase (PostgreSQL)**

---

## Core Wedding Data

### `weddings`
Main wedding record. One per user (or per collaborator group).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | text | Clerk user ID (owner) |
| partner1_name | text | |
| partner2_name | text | |
| date | text | YYYY-MM-DD |
| venue | text | |
| venue_city | text | |
| budget | numeric | |
| guest_count_estimate | integer | |
| style_description | text | |
| has_wedding_party | boolean | |
| wedding_party_count | integer | |
| has_pre_wedding_events | boolean | |
| has_honeymoon | boolean | |
| key_decisions | text | Persistent context for AI assistant |
| trial_started_at | timestamptz | Start of 14-day free trial |
| tour_complete | boolean | Whether the user completed the onboarding tour |
| phase | text | active, post_wedding, archived, sunset |
| memory_plan_active | boolean | $29/yr retention plan |
| memory_plan_expires_at | timestamptz | |
| ceremony_time | text | HH:MM 24h. Single source of truth — day_of_plans mirrors this. |
| trial_reminder_sent_at | timestamptz | Set after the 3-day trial-expiry reminder email is sent. Null = not yet sent. Used by the daily cron as a deduplication key. |
| shared_attire_note | text | Shared attire description shown on wedding party page |
| rsvp_deadline | text | RSVP deadline for wedding website |
| photo_approval_required | boolean | Whether uploaded photos need approval |
| meal_options | jsonb | Array of meal choices for RSVP |
| website_slug | text | Public URL: eydn.app/w/{slug} |
| website_enabled | boolean | |
| website_headline | text | |
| website_story | text | |
| website_cover_url | text | |
| website_couple_photo_url | text | |
| website_schedule | jsonb[] | |
| website_travel_info | text | |
| website_accommodations | text | |
| website_hotels | jsonb | Structured hotel recommendations |
| website_faq | jsonb[] | |
| website_theme | jsonb | Theme configuration for public website |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `guests`
Guest list with RSVP tracking, meal preferences, and addresses.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| name | text | |
| email | text | |
| rsvp_status | text | not_invited, invite_sent, pending, accepted, declined |
| meal_preference | text | |
| role | text | family, friend, wedding_party, coworker, plus_one, other |
| plus_one | boolean | |
| plus_one_name | text | |
| phone | text | |
| group_name | text | |
| table_number | integer | |
| address_line1 | text | |
| address_line2 | text | |
| city | text | |
| state | text | |
| zip | text | |
| deleted_at | timestamptz | Soft delete |
| created_at | timestamptz | |

### `vendors`
Vendor pipeline with contacts, financials, and day-of details.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| name | text | |
| category | text | 13 categories |
| status | text | searching → contacted → quote_received → booked → deposit_paid → paid_in_full |
| poc_name | text | Point of contact |
| poc_email | text | |
| poc_phone | text | |
| notes | text | |
| amount | numeric | Quoted/contract amount |
| amount_paid | numeric | |
| arrival_time | text | Day-of arrival |
| meal_needed | boolean | |
| insurance_submitted | boolean | |
| gmb_place_id | text | Google Places ID |
| gmb_data | jsonb | Cached Google business data |
| gmb_fetched_at | timestamptz | Cache timestamp |
| deleted_at | timestamptz | Soft delete |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `tasks`
Planning timeline with 50+ auto-generated tasks.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| title | text | |
| description | text | |
| due_date | text | YYYY-MM-DD |
| completed | boolean | |
| status | text | not_started, in_progress, done |
| priority | text | high, medium, low |
| category | text | Photography, Catering, Venue, etc. |
| edyn_message | text | AI assistant tip |
| timeline_phase | text | "12 Months Before", etc. |
| sort_order | integer | |
| is_system_generated | boolean | |
| parent_task_id | uuid | FK → tasks (subtasks) |
| notes | text | |
| deleted_at | timestamptz | Soft delete |
| created_at | timestamptz | |

### `expenses`
Budget tracker with 36 pre-seeded line items.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| description | text | |
| estimated | numeric | |
| amount_paid | numeric | |
| final_cost | numeric | |
| category | text | 13 categories |
| paid | boolean | |
| vendor_id | uuid | FK → vendors (optional link) |
| deleted_at | timestamptz | Soft delete |
| created_at | timestamptz | |

### `wedding_party`
Wedding party members with photos, attire, and addresses.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| name | text | |
| role | text | Honor Attendant, Attendant, Officiant, etc. |
| email | text | |
| phone | text | |
| address_line1 | text | |
| address_line2 | text | |
| city | text | |
| state | text | |
| zip | text | |
| job_assignment | text | Comma-separated day-of task assignments |
| photo_url | text | |
| attire | text | Outfit description |
| sort_order | integer | |
| deleted_at | timestamptz | Soft delete |
| created_at | timestamptz | |

---

## Seating & Ceremony

### `seating_tables`
Drag-and-drop table layout.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| table_number | integer | |
| name | text | |
| x | numeric | Canvas position |
| y | numeric | Canvas position |
| shape | text | round, rectangle |
| capacity | integer | |
| deleted_at | timestamptz | Soft delete |
| created_at | timestamptz | |

### `seat_assignments`
Guest-to-table assignments.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| seating_table_id | uuid | FK → seating_tables |
| guest_id | uuid | FK → guests |
| seat_number | integer | |

### `ceremony_positions`
Who stands where at the altar.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| person_type | text | wedding_party, officiant, couple |
| person_id | text | |
| person_name | text | |
| role | text | |
| side | text | left, right, center |
| position_order | integer | |

---

## Planning & Day-of

### `day_of_plans`
Comprehensive day-of planning document stored as JSONB.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| content | jsonb | See structure below |
| generated_at | timestamptz | |
| edited_at | timestamptz | |

**content JSONB structure:**
- `ceremonyTime` — string
- `timeline[]` — { time, event, notes, forGroup }
- `ceremonyScript` — string (full ceremony text)
- `processionalOrder[]` — string[] (ordered names)
- `officiantNotes` — string
- `music[]` — { moment, song, artist }
- `speeches[]` — { speaker, role, topic }
- `setupTasks[]` — { task, assignedTo, notes }
- `attire[]` — { person, description, photoUrl }
- `vendorContacts[]` — { vendor, category, contact, phone }
- `partyAssignments[]` — { name, role, job, phone }
- `packingChecklist[]` — { item, notes }

### `rehearsal_dinner`
Rehearsal dinner planning.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings (unique) |
| venue | text | |
| date | text | |
| time | text | |
| address | text | |
| notes | text | |
| timeline | jsonb | [{ time, event }] |
| guest_list | jsonb | [names] |
| hosted_by | text | Host name(s) |
| dress_code | text | e.g. "Black tie optional" |
| capacity | integer | Maximum attendees |
| created_at | timestamptz | |

### `date_change_alerts`
Tracks wedding date and ceremony time changes that require acknowledgment. The `DateSyncBanner` dashboard component reads unacknowledged rows and shows a persistent warning until the user acknowledges.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| change_type | text | wedding_date, ceremony_time, rehearsal_date |
| old_value | text | Previous value |
| new_value | text | Updated value |
| affected_tasks | jsonb | Array of { title, due_date } objects |
| message | text | Human-readable summary |
| acknowledged | boolean | false until user confirms |
| created_at | timestamptz | |

### `questionnaire_responses`
Onboarding questionnaire data.

| Column | Type | Notes |
|--------|------|-------|
| wedding_id | uuid | FK → weddings (PK) |
| responses | jsonb | Full form data |
| completed | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `guide_responses`
Guided planning questionnaire responses (e.g., hair & makeup, colors & theme).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| guide_slug | text | Which guide (e.g., hair-makeup, colors-theme) |
| section_index | integer | Which section within the guide |
| responses | jsonb | User answers |
| completed | boolean | |
| vendor_brief | text | Generated vendor brief from responses |
| created_at | timestamptz | |

### `mood_board_items`
Pinterest-style inspiration board. Items can be linked to a vendor for inspiration-to-booking tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| image_url | text | |
| caption | text | |
| category | text | Florals, Attire, Colors, etc. Custom categories also supported. |
| location | text | Ceremony, Reception, Bar, etc. |
| vendor_id | uuid | FK → vendors (optional) |
| sort_order | integer | |
| deleted_at | timestamptz | Soft delete |
| created_at | timestamptz | |

---

## AI & Chat

### `chat_messages`
Conversation history with the eydn AI assistant.

| Column | Type | Notes |
|--------|------|-------|
| wedding_id | uuid | FK → weddings |
| role | text | user, assistant |
| content | text | |
| created_at | timestamptz | |

---

## Wedding Website

### `wedding_photos`
Guest-uploaded photo gallery with approval workflow.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| uploaded_by | text | |
| uploader_name | text | |
| file_url | text | |
| caption | text | |
| approved | boolean | |
| created_at | timestamptz | |

### `rsvp_tokens`
Unique RSVP links per guest.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| guest_id | uuid | FK → guests |
| wedding_id | uuid | FK → weddings |
| token | text | Unique token |
| responded | boolean | |
| responded_at | timestamptz | |
| qr_code_url | text | Generated QR code image URL |
| created_at | timestamptz | |

### `registry_links`
Wedding registry links.

| Column | Type | Notes |
|--------|------|-------|
| wedding_id | uuid | FK → weddings |
| name | text | e.g. Amazon, Zola |
| url | text | |
| sort_order | integer | |

---

## Collaboration

### `wedding_collaborators`
Invite partner, coordinator, or parent to share access.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| email | text | |
| role | text | partner, coordinator, parent |
| invite_status | text | pending, accepted |
| invited_by | text | Clerk user ID |
| user_id | text | Filled on auto-accept |
| created_at | timestamptz | |

### `comments`
Collaborative comments on any entity.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| entity_type | text | task, vendor, guest, expense, general |
| entity_id | text | |
| user_id | text | |
| user_name | text | |
| content | text | |
| created_at | timestamptz | |

---

## AI planning features

### `catch_up_plans`
Stores AI-generated catch-up plans surfaced to Pro users when planning progress has stalled (overdue tasks, or nothing completed recently). One row per generated plan. The "latest active" plan is the most recent row where `dismissed_at IS NULL`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings ON DELETE CASCADE |
| generated_at | timestamptz | |
| trigger_reason | text | Human-readable description of why the plan was generated (e.g. "8 overdue tasks") |
| plan | jsonb | `{ summary: string, priorities: [{ title, why, when }] }` |
| model | text | Claude model that generated the plan |
| dismissed_at | timestamptz | Set when the user dismisses the plan; null = still active |

Indexes: `(wedding_id, generated_at DESC)` for latest-plan lookups; partial index on `(wedding_id) WHERE dismissed_at IS NULL` for active-plan lookups. RLS: service role full access.

### `budget_optimizations`
Stores AI-generated budget optimization suggestions surfaced to Pro users when budget categories exceed their estimated allocation. Follows the same generate-store-dismiss pattern as `catch_up_plans`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings ON DELETE CASCADE |
| generated_at | timestamptz | |
| trigger_reason | text | Human-readable description of the over-budget trigger |
| suggestion | jsonb | `{ summary: string, suggestions: [{ title, why, action }] }` |
| model | text | Claude model that generated the suggestion |
| dismissed_at | timestamptz | Null = still active |

Indexes and RLS policy mirror `catch_up_plans`.

---

## Vendor Directory

Eydn does not charge vendors for inclusion or placement. All vendor-shaped data is in three tables: the curated platform directory, couple-suggested additions, and per-wedding vendor tracking.

### `suggested_vendors`
Platform-curated vendor directory.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| category | text | |
| city, state, zip | text | city + state NOT NULL |
| website, phone, email, address | text | |
| price_range | text | $, $$, $$$, $$$$ |
| description | text | |
| featured | boolean | Sorts to top of search results when true |
| active | boolean | Soft-disable flag |
| search_vector | tsvector | Generated full-text search index |
| gmb_place_id | text UNIQUE | Google Places canonical ID; dedup key for the seeder |
| gmb_data | jsonb | Cached enrichment (reviews, photos, hours) — populated on-demand by `/api/suggested-vendors/[id]/gmb` |
| gmb_last_refreshed_at | timestamptz | |
| seed_source | text | `'places_api'` / `'csv'` / `'manual'` / `'submission'` — audit trail of where the row came from |
| created_at, updated_at | timestamptz | |

### `places_seed_configs`
Category × city combinations the seeder cron should pull from Google Places.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| category, city, state, country | text | UNIQUE (category, city, state) |
| max_results | int | 1–60, capped by Google's per-textSearch pagination limit |
| enabled | boolean | Cron skips disabled rows |
| last_run_at, next_run_at | timestamptz | Cron stamps after each run |
| last_result_count | int | Diagnostics |
| last_error | text | |

### `places_api_usage_log`
Per-call audit so the daily cost cap can be enforced via `SUM(cost_units) today < PLACES_API_DAILY_CAP`. Truncate older than 30 days when convenient.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| endpoint | text | `'places.searchText'`, etc. |
| cost_units | int | ≈ 8 per textSearch with our field mask |
| called_at | timestamptz | |

### `vendor_submissions`
Couple-submitted vendor suggestions awaiting admin review. Status: pending → approved → rejected.

### `vendors`
Per-wedding vendor tracking (each couple's personal shortlist with status, contact, and payment notes). FK to `weddings.id`, soft-deletable.

---

## Payments & Promo Codes

### `subscriber_purchases`
One-time $79 purchase records (or $0 for promo code purchases).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | text | Clerk user ID |
| wedding_id | uuid | FK → weddings |
| amount | numeric(10,2) | |
| stripe_payment_intent_id | text | |
| stripe_session_id | text | |
| status | text | active, refunded |
| payment_method | text | stripe or promo_code |
| purchased_at | timestamptz | |

### `promo_codes`
Promotional discount codes with usage tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| code | text | Unique, case-insensitive |
| description | text | |
| discount_type | text | percentage or fixed |
| discount_value | numeric(10,2) | |
| max_uses | integer | Null for unlimited |
| current_uses | integer | Atomically incremented via RPC |
| is_active | boolean | |
| expires_at | timestamptz | |
| created_by | text | Admin user ID |
| created_at | timestamptz | |

### `promo_code_redemptions`
Records which users redeemed which codes.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| promo_code_id | uuid | FK → promo_codes |
| user_id | text | |
| purchase_id | uuid | FK → subscriber_purchases |
| original_amount | numeric(10,2) | |
| discount_amount | numeric(10,2) | |
| final_amount | numeric(10,2) | |
| redeemed_at | timestamptz | |

---

## Growth & Leads

### `waitlist`
Beta overflow waitlist signups.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| email | text | Unique, case-insensitive |
| source | text | e.g. "beta" |
| discount_code_sent | boolean | Whether WAITLIST20 email was sent |
| notes | text | |
| created_at | timestamptz | |

### `calculator_saves`
Saved wedding budget calculator sessions (public lead capture tool).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| short_code | text | Unique shareable code |
| name | text | |
| email | text | |
| budget | numeric | |
| guests | integer | |
| state | text | US state |
| month | text | Wedding month |
| created_at | timestamptz | |

### `onboarding_survey`
Post-signup survey for segmentation (what tools they used before, venue status).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | text | Clerk user ID |
| prior_tools | text[] | e.g. ["zola", "spreadsheet", "nothing"] |
| venue_status | text | |
| created_at | timestamptz | |

### `blog_posts`
Blog CMS content.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| slug | text | Unique URL slug |
| title | text | |
| excerpt | text | |
| content | text | HTML content |
| cover_image | text | |
| category | text | |
| tags | text[] | |
| author_name | text | |
| status | text | draft, published |
| published_at | timestamptz | |
| seo_title | text | |
| seo_description | text | |
| read_time_minutes | integer | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

## Notifications & Email

### `notifications`
In-app notification bell items.

### `notification_preferences`
Per-wedding notification settings.

### `email_preferences`
CAN-SPAM compliant email preferences with unsubscribe tokens.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings (unique) |
| unsubscribe_token | text | Unique, auto-generated |
| marketing_emails | boolean | |
| deadline_reminders | boolean | |
| lifecycle_emails | boolean | |
| unsubscribed_all | boolean | |
| sms_reminders | boolean | |
| phone_number | text | |
| push_notifications | boolean | |
| updated_at | timestamptz | |

### `email_events`
Tracks email delivery events via Resend webhooks.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| email_id | text | Resend email ID |
| event_type | text | delivered, opened, clicked, bounced, complained |
| recipient | text | |
| metadata | jsonb | |
| created_at | timestamptz | |

### `lifecycle_emails`
Tracks which lifecycle emails have been sent per wedding.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| email_type | text | post_wedding_welcome, download_reminder_1mo, etc. |
| sent_at | timestamptz | |

### `push_subscriptions`
Web push notification subscriptions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | text | Clerk user ID |
| subscription | jsonb | Web Push API subscription object |
| created_at | timestamptz | |

---

## System

### `user_roles`
Role assignments for access control.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | text | Clerk user ID |
| role | text | user, admin, vendor, beta |
| created_at | timestamptz | |

Roles: `user` (default), `admin` (platform admin), `vendor` (vendor portal), `beta` (free lifetime access).

### `activity_log`
Audit trail for all create/update/delete/restore actions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| user_id | text | |
| action | text | create, update, delete, restore |
| entity_type | text | |
| entity_id | text | |
| entity_name | text | |
| details | jsonb | |
| created_at | timestamptz | |

### `cron_log`
Cron job execution history.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| job_name | text | backup, lifecycle, check-deadlines |
| status | text | success, error |
| duration_ms | integer | |
| details | jsonb | |
| error_message | text | |
| started_at | timestamptz | |

### `calendar_feed_tokens`
Secret tokens for unauthenticated iCal feed access.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| token | text | Unique secret token |
| revoked_at | timestamptz | Null if active |
| created_at | timestamptz | |

### `attachments`
File uploads for tasks, vendors, website, mood board.

### `related_tasks`
Task-to-task relationships.

### `task_resources`
External links attached to tasks.

### `app_settings`
Platform-wide configuration (key/value JSONB).

---

## RPC Functions

| Function | Purpose |
|----------|---------|
| `increment_promo_uses(code_id uuid)` | Atomically increment `promo_codes.current_uses` to prevent race conditions on concurrent purchases |
