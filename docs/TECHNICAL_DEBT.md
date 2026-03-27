# Technical Debt & Post-Launch Todos

Items identified during development that are not blocking beta launch but should be addressed.

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
