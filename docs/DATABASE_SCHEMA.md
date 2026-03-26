# eydn Database Schema

**41 tables · 64 migrations · Supabase (PostgreSQL)**

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
| budget | numeric | |
| guest_count_estimate | integer | |
| style_description | text | |
| has_wedding_party | boolean | |
| wedding_party_count | integer | |
| has_pre_wedding_events | boolean | |
| has_honeymoon | boolean | |
| trial_started_at | timestamptz | |
| phase | text | active, post_wedding, archived, sunset |
| memory_plan_active | boolean | $29/yr retention plan |
| memory_plan_expires_at | timestamptz | |
| ceremony_time | text | Canonical ceremony start time (HH:MM 24h). Single source of truth — day_of_plans mirrors this. |
| shared_attire_note | text | Shared attire description shown on the wedding party page |
| website_slug | text | Public URL: eydn.app/w/{slug} |
| website_enabled | boolean | |
| website_headline | text | |
| website_story | text | |
| website_cover_url | text | |
| website_couple_photo_url | text | |
| website_schedule | jsonb[] | |
| website_travel_info | text | |
| website_accommodations | text | |
| website_faq | jsonb[] | |
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
Wedding party members with photos, attire, and address for delivery/shipping.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| name | text | |
| role | text | Honor Attendant, Attendant, Officiant, etc. |
| email | text | |
| phone | text | |
| address_line1 | text | Street address (added migration 20260326000000) |
| address_line2 | text | Apt, suite, etc. |
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
| hosted_by | text | Host name(s) — added migration 20260326200000 |
| dress_code | text | e.g. "Black tie optional" |
| capacity | integer | Maximum attendees |
| created_at | timestamptz | |

### `date_change_alerts`
Tracks wedding date and ceremony time changes that require acknowledgment. The `DateSyncBanner` dashboard component reads unacknowledged rows and shows a persistent warning until the user acknowledges. See the architecture doc for the full cascade behavior.

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
| vendor_id | uuid | FK → vendors (optional — added migration 20260326100000) |
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
| guest_id | uuid | FK → guests |
| wedding_id | uuid | FK → weddings |
| token | text | Unique token |
| responded | boolean | |
| responded_at | timestamptz | |

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
Invite partner or coordinator to share access.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| email | text | |
| role | text | partner, coordinator |
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

## Vendor Marketplace

### `vendor_accounts`
Vendor business profiles (vendor-side).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | text | |
| business_name | text | |
| category | text | |
| description | text | |
| website | text | |
| phone | text | |
| email | text | |
| address, city, state, zip | text | |
| logo_url | text | |
| price_range | text | $, $$, $$$, $$$$ |
| status | text | pending, approved, suspended |
| is_preferred | boolean | |

### `vendor_submissions`
User-submitted vendor suggestions for admin review.

### `suggested_vendors`
Platform-curated vendor directory (34 seeded vendors).

### `placement_tiers`
Tiered advertising packages for vendors.

### `vendor_placements`
Active vendor advertising placements with Stripe billing.

### `vendor_analytics`
Impression/click/lead tracking for vendor listings.

---

## Payments

### `subscriber_purchases`
One-time $79 purchase records.

| Column | Type | Notes |
|--------|------|-------|
| user_id | text | |
| wedding_id | uuid | |
| amount | numeric | |
| stripe_payment_intent_id | text | |
| stripe_session_id | text | |
| status | text | active, refunded |
| purchased_at | timestamptz | |

---

## System

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

### `lifecycle_emails`
Tracks which lifecycle emails have been sent per wedding.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| wedding_id | uuid | FK → weddings |
| email_type | text | post_wedding_welcome, download_reminder_3mo, etc. |
| sent_at | timestamptz | |

### `notifications`
In-app notification bell items.

### `notification_preferences`
Per-wedding notification settings.

### `attachments`
File uploads for tasks, vendors, website, mood board.

### `related_tasks`
Task-to-task relationships.

### `task_resources`
External links attached to tasks.

### `user_roles`
Admin role assignments.

### `app_settings`
Platform-wide configuration (key/value JSONB).
