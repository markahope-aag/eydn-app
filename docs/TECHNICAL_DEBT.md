# Technical Debt & Post-Launch Todos

Items identified during development that are not blocking beta launch but should be addressed.

## Wedding Website (Post-Launch)

### Live Preview / Side-by-Side Editor
- Real-time preview of the guest-facing website while editing
- Either iframe-based split view or "Preview" button that opens in new tab
- Priority: High — biggest UX gap in the website builder

### Auto-Save
- Replace manual "Save" button with auto-save on field blur
- Show subtle "Saved" / "Saving..." indicator
- Priority: Medium

### URL Availability Checker
- Inline check when typing the website slug
- Show checkmark (available) or X (taken) in real-time
- Query suggested_vendors or weddings table for slug conflicts
- Priority: Medium

### Theme & Color Customization
- Let couples match their website to wedding colors
- Default to Eydn theme, allow custom primary/accent/background colors
- Store in website_theme JSON field (migration already created)
- Priority: Medium

### QR Code Generation for Invites
- Generate unique QR codes per guest linking to their RSVP page
- Downloadable as PNG for printing on physical invitations
- Each QR encodes the guest's unique RSVP token URL
- Priority: High — critical for physical invitation workflow

### Structured Travel & Accommodation Fields
- Replace plain text with structured fields: hotel name, booking link,
  discount code, distance from venue
- Display as formatted cards on the guest-facing site
- Priority: Low

### Gallery Download All
- "Download All Photos" button for couples after the wedding
- ZIP file generation of all guest-uploaded photos
- Priority: Low

## Vision Board (Post-Launch)

### Drag-to-Reorder Images
- Let couples rearrange pins on the board by dragging
- Needs: sortable library (dnd-kit or similar), sort_order field updates
- Priority: Medium

### Color Palette Extraction
- Automatically pull dominant colors from saved images and suggest a
  wedding palette
- Needs: canvas-based image analysis (client-side) or a third-party API
  like ColorThief.js or Vibrant.js
- Would feed into the website theme color picker
- Priority: Low — genuinely impressive "wow" feature but not essential

### Zoom/Resize on the Board
- Pinterest-style zoom into individual pins, resize images on the board
- Needs: lightbox or modal expansion + resize handles
- Priority: Low

## User Experience (Post-Launch)

### Wedding Week Messaging
- As the wedding date approaches (7 days, 3 days, 1 day, day-of), update
  Eydn's messaging to be extra positive and encouraging
- Dashboard could show a special celebratory card
- Day-of: simplified read-only view with just the timeline and vendor contacts
- Priority: Medium — nice for emotional engagement

### Signup Payment & Promo Codes
- Currently signup does not ask for payment info or offer promo code entry
- Need Stripe Checkout integration in the signup flow, or a trial-to-paid
  conversion flow after the 14-day trial
- Promo code field on the pricing/upgrade page
- Priority: High — revenue critical

### Clerk Login Email Customization
- The first login verification code email uses Clerk's default template
- Customize in Clerk dashboard → Customization → Email templates
- Match Eydn branding (gradient header, font, colors)
- Priority: Medium — brand consistency

## Admin Monitoring (Post-Launch)

### Sentry Error Monitoring Integration
- Surface Sentry error counts, trends, and recent issues in the admin dashboard
- Requires: `SENTRY_AUTH_TOKEN` env var for Sentry API access
- Show: error rate (24h/7d), top errors by count, affected users
- Link directly to Sentry issue pages
- Priority: High — needed once real users are active

### Vercel Analytics Integration
- Pull bandwidth, hit rate, cache rate from Vercel Analytics API
- Requires: Vercel API token
- Show: page views, unique visitors, top pages, bandwidth usage, cache hit ratio
- Monitor for need to upgrade Vercel plan
- Priority: Medium

### Supabase Deep Metrics
- Database size in MB/GB (requires Supabase Management API)
- Connection pool usage
- Slow query log
- Index usage stats
- RLS policy evaluation times
- Storage bucket usage and quotas
- Priority: Medium — needed for capacity planning

### Full Cache & CDN Monitoring
- Next.js ISR cache hit/miss rates
- Image optimization cache stats
- API response time percentiles (p50, p95, p99)
- Priority: Low

## Code Quality (Ongoing)

### Security Audit Fixes
- Race condition in seating assignments (use UPSERT instead of DELETE+INSERT)
- Missing CHECK constraints on numeric fields (budget, expenses, capacity)
- Soft delete filter missing in date cascade query
- Data URL XSS validation in mood board
- File upload magic byte validation (not just MIME type)
- Priority: High — some are potential data integrity issues

### Test Coverage
- 20.8% API route coverage (76 of 96 routes untested)
- Critical untested: Stripe webhook, admin routes, all [id] mutation routes
- Target: 60% coverage before scaling
- Priority: Medium

### Code Consistency
- Standardize API error handling (inline vs try-catch)
- Centralize hardcoded values (model names, rate limits)
- Replace `as any` in test files with proper types
- Deduplicate type definitions across files
- Priority: Low

## Infrastructure (Scale-Dependent)

### Rate Limiting on All Public Endpoints
- Some public endpoints lack rate limiting
- Add to: wedding-website/registry, newsletter signup
- Priority: Medium

### Admin User Pagination
- Hard limit of 100 users in admin list
- Need cursor-based pagination for growth beyond 100
- Priority: Low (only when approaching 100 users)

### Email Engagement-Based Lifecycle
- Currently lifecycle emails send regardless of engagement
- Should check if previous emails were opened before sending next
- Requires email_events data to be accumulated first
- Priority: Low
