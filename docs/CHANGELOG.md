# eydn Platform Changelog

This document tracks all notable changes, updates, and improvements to the eydn wedding planning platform.

## [1.8.0] - April 25, 2026

### Vendor sourcing pipeline — Google Places API + CSV import

Two new ways to grow the curated `suggested_vendors` directory without writing code or running custom scripts. The directory now has four distinct sources, all visible in the new `seed_source` column:

- **Places API seeder** (new) — A scheduled cron pulls businesses from Google Places for category × city combinations the admin configures. Runs Sundays at 02:00 UTC; per-config refresh interval is 30 days. Bounded by a `PLACES_API_DAILY_CAP` env var (default 200 cost units, ~25 textSearch calls/day) and tracked in a new `places_api_usage_log` table. Admin UI at `/dashboard/admin/vendors` → Places Seed tab supports add/edit/run-now/disable per config.
- **CSV import** (new) — Admin uploads a CSV with `name, category, city, state` (required) plus optional fields (`website`, `phone`, `email`, `address`, `description`, `price_range`, `gmb_place_id`). Dry-run mode shows a preview before commit. Dedups on `gmb_place_id` first, then on `(name, city, state)` lowercase. Existing rows are not overwritten.
- **Manual entry** (existing) — admin form on the Directory tab.
- **Couple submissions** (improved) — approval now stamps `seed_source = 'submission'` and explicitly sets `active = true, featured = false` so the audit trail is consistent.

Schema additions:
- `places_seed_configs` table — categories × cities the cron should populate
- `places_api_usage_log` table — per-call audit + daily cap source of truth
- `suggested_vendors.gmb_place_id` (UNIQUE), `gmb_data`, `gmb_last_refreshed_at`, `seed_source`

The seeder writes basic info only (name, address, phone, website, place ID). Reviews, photos, and full GMB data are pulled on-demand when a couple opens a vendor card via the existing `/api/suggested-vendors/[id]/gmb` route — keeps per-row seeding cheap.

---

## [1.7.0] - April 25, 2026

### Vendor monetization removed in full

Per the Eydn Pledge, vendors are never charged. An earlier migration dropped the `vendor_placements` and `placement_tiers` tables, but left the surrounding surface area in place — vendor self-registration accounts, performance analytics, the dead-column placement fields on `suggested_vendors`, and the `'vendor'` user role. All of that is now gone.

What was deleted:
- **Tables**: `vendor_accounts`, `vendor_analytics`. Orphaned columns removed from `suggested_vendors` (`vendor_account_id`, `placement_tier`, `placement_expires_at`). The `'vendor'` role removed from the `user_roles_role_check` constraint.
- **API**: `/api/vendor-portal/account`, `/api/vendor-portal/analytics`, `/api/admin/vendor-accounts`. The dead `vendor_account_id` metadata branch in the Stripe checkout webhook handler.
- **UI**: `/dashboard/vendor-portal/page.tsx` (564 lines — the full vendor self-service dashboard). The Vendor Insights admin page (`/dashboard/admin/vendor-analytics`) was kept and slimmed: the Vendor Accounts and Active Placements / Monthly Revenue cards are gone; the page now shows only directory health, booking patterns, and submission queue depth.
- **Code helpers**: `trackVendorPlacement()` analytics helper removed.
- **Docs**: `docs/VENDOR_MARKETPLACE.md` deleted entirely. Surgical edits to ARCHITECTURE.md, API.md, DATABASE_SCHEMA.md, DEVELOPMENT.md, RESPONSIVE_LAYOUT_CHANGES.md, PRODUCT_VISION.md, README.md, docs/README.md.

What stayed:
- `suggested_vendors` (the curated platform directory)
- `vendor_submissions` (couples suggesting vendors for the directory)
- `vendors` (per-wedding vendor tracking)
- The marketing pages that name paid placements as a *competitor contrast* (`/pledge`, `/why-we-charge-for-pro`, `/what-free-costs`) — that's the brand position, not implementation.
- Google Places enrichment for individual vendor cards (post-hoc decoration, unaffected)

---

## [1.6.0] - April 12, 2026

### Freemium model — reverse trial to free tier

The business model has changed from a binary trial-to-lockout to a **freemium + reverse trial** structure. Couples who do not upgrade after their 14-day trial are now **downgraded to a free tier** rather than locked out. Their guest list, budget tracker, AI-personalized task timeline, partner collaboration, and wedding website remain accessible indefinitely. Pro-only features (AI chat web search, day-of binder export, vendor email templates, file attachments on real entities, AI catch-up plans, AI budget optimizer) are gated behind an upgrade prompt rather than a hard paywall.

The subscription library (`src/lib/subscription.ts`) was refactored from a single `hasAccess` boolean to an explicit `Tier` enum (`trialing | free | pro | beta | admin`) with a per-feature `Features` map. Legacy fields (`hasAccess`, `isPaid`, `isTrialing`, `trialDaysLeft`, `trialExpired`) are derived from the tier and kept for backward compatibility. New code should use `tier` and the `features` map directly, and should guard routes with `requireFeature(featureKey)` rather than the generic `requirePremium()`.

**Free-tier chat is capped** (tool calls, not messages) rather than blocked. The cap is enforced in `/api/chat` via `tool-call-counter.ts`; the `web_search` tool is filtered out of the tool list for free-tier users so Claude never attempts it.

A 3-day trial-expiry reminder email is sent by a new daily cron job (`/api/cron/trial-reminders`). The job uses `trial_reminder_sent_at` on the `weddings` table as a deduplication key so each couple receives at most one reminder email. Paid, beta, and admin users are skipped.

### AI features — catch-up plans and budget optimizer

Two new Pro-gated AI features are now live:

- **AI catch-up plans** — when a couple's planning progress has stalled (overdue tasks or nothing completed recently), the dashboard surfaces a personalized recovery plan generated by Claude. Plans are stored in the `catch_up_plans` table and can be dismissed once acted on.
- **AI budget optimizer** — when one or more budget categories have gone meaningfully over their estimated allocation, the budget page surfaces targeted optimization suggestions generated by Claude. Suggestions are stored in the `budget_optimizations` table and can be dismissed.

Both features follow the same generate-store-dismiss pattern. Free-tier users see an upgrade prompt instead of the plan content.

**AI task messages** — onboarding task messages are now personalized using Claude, replacing the previous hardcoded template text.

### Chat — hardening and free-tier UX

- Input disambiguation and validation improvements in the AI chat tools prevent incorrect matches on fuzzy vendor or guest names.
- A tool-call meter pill is shown on the chat page for free-tier users, displaying their usage against the monthly cap.
- After the trial ends, free-tier users see an upgrade banner in the chat UI rather than a hard block.

---

## [1.5.0] - March 2026

### Inclusive language — platform-wide

- Replaced "bride", "groom", "bridesmaids", and "groomsmen" throughout the UI with gender-neutral terms: Partner 1, Partner 2, Attendant, Honor Attendant, and Wedding Party
- Wedding party roles now default to "Attendant" rather than a gendered title
- Day-of planner timeline auto-assigns groups using "Partner 1", "Partner 2", and "Attendants" instead of gendered labels

### Date and time synchronization

- `ceremony_time` promoted to a first-class column on the `weddings` table; it is the single source of truth — `day_of_plans.content.ceremonyTime` is kept in sync but `weddings.ceremony_time` is canonical
- Date or time changes now cascade: milestone tasks auto-shift relative to the new wedding date; appointment-type tasks are flagged for manual review
- New `date_change_alerts` table records each change with `old_value`, `new_value`, affected tasks, and an `acknowledged` flag
- `DateSyncBanner` component added to the dashboard layout — renders a persistent amber warning banner for every unacknowledged alert, listing affected task names and their previous due dates; the banner requires explicit acknowledgment before it dismisses

### Budget page

- Monetary values now display with comma formatting (e.g., $12,500 instead of $12500)
- Remaining budget card is visually prominent — color changes to indicate healthy, tight, or over-budget states
- Empty state for the Budget vs. Spent chart when no expenses exist
- Budget allocation recommendations shown per category as a percentage of the total budget; the recommended amount is calculated from the stored percentage split
- "% of budget" indicator shown inline with each category row
- Legend on the Budget vs. Spent chart corrected
- Trash icons on expense rows appear on hover rather than always being visible

### Guest list

- Name fields auto-capitalize on entry
- "Not Invited" status renamed to "Save for Later" in the UI (the underlying `rsvp_status` value remains `not_invited`)
- "Awaiting" stat added to the header showing guests with `invite_sent` or `pending` status
- Venue capacity from the wedding record is shown alongside total guest count; an over-capacity warning appears when the list exceeds it
- Search bar added for filtering guests by name
- Sort options added (name, RSVP status, group)
- Column headers added to the guest table
- Trash icons on guest rows appear on hover
- CSV import includes a downloadable template (`guest-import-template.csv`)

### Wedding party

- Address fields added to each member card: address line 1, address line 2, city, state, zip (backed by new `wedding_party` columns)
- Job assignments now use multi-select chips rather than a single text input
- Shared attire note field added at the page level, stored in `weddings.shared_attire_note`
- Member avatar supports a photo upload
- X (close/remove) button added to member cards
- Trash icons appear on hover

### Seating chart — reception

- Distinct table shapes rendered visually: round, rectangle, and square
- Seat position dots shown around each table shape
- Zoom controls added to the canvas (percentage displayed)
- Undo button backed by a client-side undo stack
- Search field added to the unassigned guests panel

### Seating chart — ceremony

- Partner names pulled from onboarding data and shown in the ceremony layout
- Altar rendered with prominent visual hierarchy
- Aisle line drawn between left and right sides
- Processional reorder arrows allow changing the walk order without drag-and-drop
- Print button generates a printer-friendly version of the ceremony layout in a new window

### Vision board (mood board)

- Drag-and-drop file upload with visual drag-over state
- Custom categories supported alongside the preset list
- Vendor linking: each mood board item can be associated with a vendor from the wedding's vendor list, stored via the new `mood_board_items.vendor_id` foreign key
- URL input includes a hint/placeholder
- Location label display corrected
- Share button added
- Empty state placeholder shown when the board has no items

### Planning guides

- Progress bar across all guides showing percentage complete
- Consistent SVG icons used throughout
- Color-coded call-to-action buttons per guide state
- Time estimates shown per guide
- "Not Started" badge displayed on guides not yet begun
- Recommended completion order defined; the first incomplete guide in that order is labeled "Start here"

### Day-of planner

- Ceremony time input displayed prominently; value is read from and written back to `weddings.ceremony_time`
- Timeline event assignees use multi-select chips showing group names (Partner 1, Partner 2, Attendants, Vendors, Everyone, Family)
- Auto-assigned groups pre-populated when the timeline is generated from the ceremony time
- Duration field added to each timeline event
- Vendor category tags shown on timeline events where applicable
- Page uses a wider layout
- Export button hierarchy clarified; binder tooltip explains what the PDF export contains

### Rehearsal dinner

- Date and time fields use dedicated date/time picker inputs
- Timeline generator creates a suggested schedule based on the rehearsal start time
- Guest lookup pulls from the main guest list when adding rehearsal dinner attendees
- RSVP tracking for rehearsal dinner guests
- Host, dress code, and capacity fields added (backed by new `rehearsal_dinner` columns)
- Print button generates a printer-friendly rehearsal dinner summary

### CI and dependency fixes

- `picomatch` vulnerability resolved
- GitHub Actions updated to `actions/checkout@v6` and `actions/setup-node@v6`
- Security audit step in CI now runs with `--audit-level=high` to reduce noise from low/moderate false positives

### Database migrations (this release)

- `wedding_party`: added `address_line1`, `address_line2`, `city`, `state`, `zip`
- `weddings`: added `shared_attire_note`, `ceremony_time`
- `mood_board_items`: added `vendor_id uuid REFERENCES vendors(id)`
- `rehearsal_dinner`: added `hosted_by`, `dress_code`, `capacity`
- New table: `date_change_alerts` — tracks wedding date and ceremony time changes with acknowledgment workflow and affected-task list

---

## [1.4.0] - March 2026

### Brand Voice & Copy Audit
- Complete audit and rewrite of all user-facing copy across the app
- Established brand voice rules: warm, direct, real — no cheerleader energy
- Rewrote ~100 toast messages (errors and successes) to be calm and specific
- Removed all unnecessary exclamation points from success messages
- Rewrote all empty states to feel like potential, not absence
- Updated paywall, archive, and read-only messaging

### AI Assistant Persona Overhaul
- Complete rewrite of the system prompt with new persona specification
- Replaced "Friendly & warm / Romantic / Fun & energetic" with direct, honest, calm voice
- Added explicit "What You Never Do" rules (no "Oops!", "Amazing!", "Great question!", etc.)
- Added urgency flags to context: WEDDING IS THIS WEEK, FINAL MONTH, OVER BUDGET
- Added budget category status tracking (OVER/TIGHT/OK per category)
- Added overdue task highlighting and 14-day lookahead
- Added vendor status grouping (booked/contracted, in conversation, still needed)
- Added RSVP response rate calculation
- Integrated buildCoupleContext patterns for structured context injection

### Onboarding Flow Redesign
- Rebuilt from 11-screen conversational flow to 7-screen focused wizard
- Names moved before Date for personalization ("When's the wedding, Sarah?")
- Budget and Guest Count combined into single screen (both skippable)
- Two AI screens merged into one (intro + greeting + chat input)
- Existing Tools screen removed (moved to post-onboarding)
- Booked Vendors screen added back (drives task generation)
- AI greeting generated client-side from template with timeframe variants
- Budget allocations auto-calculated using percentage splits
- Review mode (?review=true) for revisiting from Settings

### Gift Registry Planning Guide
- New 5-section guide with 14 questions covering platform selection, Amazon setup, price range strategy, cash funds, and registry link collection
- Integration: completed guide auto-saves registry URLs to wedding website
- Registry links now appear in day-of binder PDF export

### Database Changes
- Added onboarding_survey table for prior planning tools segmentation
- Added venue_city column to weddings table
- Added Gift Registry section to binder PDF export

## [Current] - March 2026

### 🆕 Major Features Added

#### Wedding Collaboration System
- **Multi-role Access Control**: Owners can invite partners and coordinators
- **Role-based Permissions**: Different access levels for owners, partners, and coordinators
- **Auto-accept Invitations**: Automatic invitation acceptance when user signs up with matching email
- **Subscription Inheritance**: Collaborators inherit owner's premium status
- **Collaborative Comments**: Comment system for tasks, vendors, guests, and expenses

#### Mood Board Feature
- **Pinterest-style Interface**: Visual inspiration board with drag-and-drop organization
- **Category Organization**: Organize by Florals, Attire, Colors, Decor, Venue, etc.
- **Location Tagging**: Tag items for Ceremony, Reception, Bar, Lounge areas
- **Collaborative Editing**: All roles can add and organize mood board items
- **Soft Delete Support**: Deleted items preserved in audit trail

#### Premium Feature Enforcement
- **Server-side Protection**: Robust premium feature enforcement with `requirePremium()` function
- **Protected Endpoints**: AI chat, file uploads, and PDF exports require premium access
- **Trial Integration**: 14-day trial with full feature access
- **Paywall Components**: Client-side premium gates with upgrade prompts

### 🔧 Technical Improvements

#### Technology Stack Updates
- **Next.js 16.2.0**: Latest framework with App Router and server components
- **React 19.2.4**: Upgraded to latest React with concurrent features
- **TypeScript 5**: Strict type checking with improved developer experience
- **Tailwind CSS 4**: Modern utility-first styling framework
- **Clerk 7.0.5**: Enhanced authentication with middleware protection

#### Database Enhancements
- **36-table Schema**: Comprehensive database with 50+ auto-generated tasks
- **Soft Delete System**: Data preservation with audit trails
- **Row Level Security**: Enhanced RLS policies for multi-role access
- **Google Places Integration**: Vendor enrichment with business data caching
- **Activity Logging**: Comprehensive audit trail for all user actions

#### Security & Performance
- **Rate Limiting**: Upstash Redis-based rate limiting per endpoint
- **Security Headers**: Comprehensive security headers and CSP
- **Input Validation**: Enhanced validation with `pickFields` pattern
- **Audit Trails**: Complete activity logging and monitoring
- **Performance Optimization**: Bundle analysis and optimization

### 🔄 API Updates

#### New Endpoints
- `GET/POST/DELETE /api/collaborators` - Wedding collaboration management
- `GET/POST /api/comments` - Collaborative commenting system
- `GET/POST/PATCH/DELETE /api/mood-board` - Mood board management
- `POST /api/chat` - AI wedding assistant (premium)
- `POST /api/attachments` - File uploads (premium)

#### Enhanced Endpoints
- **Authentication**: All endpoints now support multi-role access control
- **Premium Protection**: Server-side premium feature enforcement
- **Rate Limiting**: All endpoints protected with appropriate rate limits
- **Audit Logging**: All data changes logged with user attribution

### 📱 User Experience Improvements

#### Dashboard Enhancements
- **Role Indicators**: Clear display of user role and permissions
- **Collaboration UI**: Intuitive invitation and management interface
- **Premium Indicators**: Clear premium feature identification
- **Responsive Design**: Optimized for all device sizes

#### Planning Tools
- **Enhanced Task System**: 50+ auto-generated tasks with AI guidance
- **Vendor Pipeline**: Google Places integration for business data
- **Guest Management**: Enhanced RSVP system with address collection
- **Budget Tracking**: 36 pre-seeded budget categories
- **Day-of Planning**: Comprehensive timeline and coordination tools

### 🏗 Infrastructure Updates

#### Deployment & Operations
- **Vercel Integration**: Edge functions and cron job scheduling
- **Environment Management**: Comprehensive environment variable documentation
- **Monitoring**: Enhanced logging and error tracking
- **Backup Strategy**: Automated backups with point-in-time recovery

#### Development Experience
- **Testing Framework**: Vitest 4.1.0 with React Testing Library
- **Code Quality**: ESLint 9 with Next.js configuration
- **Security Auditing**: Automated dependency vulnerability scanning
- **Documentation**: Comprehensive technical and user documentation

## [Previous Releases] - 2024-2025

### Version 1.0 - Initial Release (2024)

#### Core Features
- **Wedding Planning Dashboard**: Complete planning interface
- **Task Timeline**: 12-month planning schedule
- **Vendor Management**: Contact and pipeline management
- **Guest List**: RSVP tracking and management
- **Budget Tracker**: Expense tracking and management
- **Seating Charts**: Drag-and-drop seating arrangement
- **Wedding Party**: Member management and coordination

#### Technical Foundation
- **Next.js 14**: React framework with App Router
- **Supabase**: PostgreSQL database with authentication
- **Clerk**: User authentication and management
- **Stripe**: Payment processing
- **Tailwind CSS**: Utility-first styling

#### Business Model
- **14-day Trial**: Full feature access trial period
- **$79 One-time Purchase**: Lifetime access model
- **Vendor Marketplace**: Tiered vendor placement system

### Version 1.1 - AI Integration (2024)

#### AI Features
- **eydn AI Assistant**: Claude-powered wedding planning guidance
- **Contextual Responses**: AI responses based on wedding data
- **Task Recommendations**: AI-generated task suggestions
- **Planning Insights**: Intelligent planning recommendations

#### Enhanced Features
- **Public Wedding Websites**: Guest-facing wedding sites
- **RSVP System**: Online RSVP with meal preferences
- **Photo Gallery**: Guest photo sharing with approval
- **Registry Integration**: Wedding registry links

### Version 1.2 - Vendor Marketplace (2025)

#### Marketplace Features
- **Vendor Portal**: Business account management
- **Tiered Placements**: Premium, featured, and standard listings
- **Analytics Dashboard**: Vendor performance tracking
- **Lead Generation**: Couple-to-vendor connection system

#### Platform Enhancements
- **Admin Dashboard**: Platform management interface
- **Vendor Directory**: Curated vendor recommendations
- **Search & Filtering**: Advanced vendor discovery
- **Review System**: Vendor rating and review platform

## Breaking Changes

### March 2026 Updates

#### Database Schema Changes
- **New Tables**: `wedding_collaborators`, `comments`, `mood_board_items`
- **Enhanced Tables**: Added soft delete columns, audit fields
- **RLS Updates**: New policies for multi-role access

#### API Changes
- **Authentication**: `getWeddingForUser()` now returns role information
- **Premium Enforcement**: New `requirePremium()` middleware
- **Rate Limiting**: All endpoints now have rate limiting

#### Environment Variables
- **New Required**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Optional**: `GOOGLE_PLACES_API_KEY`, `RESEND_API_KEY`

## Migration Guide

### Updating from Previous Versions

#### Database Migration
```bash
# Run latest migrations
supabase db push

# Verify migration success
supabase db diff
```

#### Environment Setup
```env
# Add new required variables
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Optional enhancements
GOOGLE_PLACES_API_KEY=your_google_key
RESEND_API_KEY=your_resend_key
```

#### Code Updates
```typescript
// Update authentication calls
const result = await getWeddingForUser();
if ("error" in result) return result.error;
const { wedding, role, userId } = result; // Now includes role

// Add premium protection
const premiumCheck = await requirePremium();
if (premiumCheck) return premiumCheck;
```

## Upcoming Features

### Q2 2026 Roadmap

#### Enhanced Collaboration
- **Real-time Collaboration**: Live editing and updates
- **Activity Feeds**: Real-time activity notifications
- **Advanced Permissions**: Granular permission controls
- **Bulk Invitations**: Invite multiple collaborators at once

#### AI Enhancements
- **Advanced Planning**: More sophisticated AI recommendations
- **Budget Optimization**: AI-powered budget suggestions
- **Vendor Matching**: Intelligent vendor recommendations
- **Timeline Optimization**: AI-optimized planning schedules

#### Mobile Experience
- **Progressive Web App**: Enhanced mobile experience
- **Offline Support**: Core features available offline
- **Push Notifications**: Mobile push notification support
- **Mobile-first Features**: Mobile-optimized planning tools

### Q3 2026 Roadmap

#### Integration Platform
- **Third-party Integrations**: Calendar, email, and CRM integrations
- **API Platform**: Public API for third-party developers
- **Webhook System**: Real-time event notifications
- **Import/Export**: Enhanced data portability

#### Advanced Features
- **Multi-language Support**: International localization
- **Custom Branding**: White-label options for professionals
- **Advanced Analytics**: Detailed planning insights
- **Automated Workflows**: Smart automation for common tasks

## Support & Documentation

### Updated Documentation
- **[Security Guide](SECURITY.md)**: Comprehensive security documentation
- **[Troubleshooting Guide](TROUBLESHOOTING.md)**: Common issues and solutions
- **[API Documentation](API.md)**: Complete API reference with new endpoints
- **[Architecture Guide](ARCHITECTURE.md)**: Updated system architecture
- **[Development Guide](DEVELOPMENT.md)**: Current setup and deployment instructions

### Support Resources
- **Technical Support**: dev@eydn.com
- **User Support**: support@eydn.com
- **Security Issues**: security@eydn.com
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Always up-to-date with latest changes

---

This changelog is continuously updated with each release. For the most current information, always refer to the latest version in the repository.