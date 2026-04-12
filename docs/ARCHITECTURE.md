# System Architecture Documentation

This document provides a comprehensive overview of the eydn wedding planning platform's system architecture, database design, and technical implementation.

## Architecture Overview

eydn follows a modern, serverless architecture built on Next.js 16 with a focus on performance, scalability, and developer experience.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Next.js App   │    │   External APIs │
│                 │    │                 │    │                 │
│ • Web Browser   │◄──►│ • App Router    │◄──►│ • Anthropic     │
│ • Mobile Web    │    │ • API Routes    │    │ • Stripe        │
│ • Public Sites  │    │ • Server Comp.  │    │ • Clerk         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Supabase      │
                       │                 │
                       │ • PostgreSQL    │
                       │ • Row Level Sec │
                       │ • Real-time     │
                       │ • Storage       │
                       └─────────────────┘
```

## Technology Stack

### Frontend Layer
- **Next.js 16.2.0**: React framework with App Router and server components
- **React 19.2.4**: Latest React with concurrent features and improved hydration
- **TypeScript 5**: Type-safe development with strict configuration
- **Tailwind CSS 4**: Utility-first CSS framework with modern features
- **DM Sans Font**: Custom Google Font for brand consistency
- **Sonner 2.0.7**: Toast notification system with rich colors

### Backend Layer
- **Next.js API Routes**: Serverless API endpoints with TypeScript
- **Supabase 2.99.2**: Backend-as-a-Service with PostgreSQL database
- **Clerk 7.0.5**: Authentication and user management with middleware
- **Anthropic Claude 0.80.0**: AI-powered chat and planning assistance
- **Upstash Redis**: Rate limiting and caching layer

### Infrastructure
- **Vercel**: Hosting platform with edge functions, CDN, and cron jobs
- **Stripe 20.4.1**: Payment processing with webhook integration
- **DND Kit 6.3.1**: Drag-and-drop functionality for seating charts
- **React PDF 4.3.2**: PDF generation for day-of planning documents
- **ExcelJS 4.4.0**: Excel file generation for guest list exports

## Database Architecture

### Core Schema Design

The database is designed around the central `weddings` table with related entities following a hub-and-spoke pattern:

```sql
weddings (1) ──┬── (n) tasks
               ├── (n) guests
               ├── (n) vendors
               ├── (n) expenses
               ├── (n) wedding_party
               ├── (n) seating_tables
               ├── (n) notifications
               ├── (n) chat_messages
               ├── (n) wedding_collaborators
               ├── (n) mood_board_items
               ├── (n) date_change_alerts
               ├── (n) catch_up_plans
               ├── (n) budget_optimizations
               └── (1) rehearsal_dinner
```

### Primary Tables

#### `weddings`
Core wedding information and settings. `ceremony_time` is the canonical source of truth for the ceremony start time — `day_of_plans.content.ceremonyTime` mirrors this value but `weddings.ceremony_time` takes precedence.

```sql
create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,                    -- Clerk user ID
  partner1_name text not null,
  partner2_name text not null,
  date date,
  venue text,
  budget numeric(12,2),
  guest_count integer,
  style text,
  location text,
  ceremony_time text,                       -- Canonical ceremony start time (HH:MM 24h)
  shared_attire_note text,                  -- Shared attire description for wedding party
  website_slug text unique,                 -- Public website URL
  website_enabled boolean default false,
  website_couple_photo_url text,           -- Couple photo for website
  trial_started_at timestamptz,            -- Trial start date
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

#### `tasks`
Planning timeline with categorized tasks and deadlines.

```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  title text not null,
  description text,
  category text not null,                   -- venue, catering, photography, etc.
  due_date date,
  completed boolean not null default false,
  priority text default 'medium',          -- high, medium, low
  edyn_message text,                        -- AI assistant message
  resources text[],                         -- Related URLs/resources
  order_index integer,                      -- Custom ordering
  created_at timestamptz not null default now()
);
```

#### `vendors`
Vendor pipeline and contact management.

```sql
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  category text not null,                   -- photographer, caterer, etc.
  status text not null default 'searching', -- searching, contacted, booked, etc.
  contact_name text,
  email text,
  phone text,
  website text,
  notes text,
  estimated_cost numeric(12,2),
  actual_cost numeric(12,2),
  deposit_paid boolean default false,
  balance_due numeric(12,2),
  created_at timestamptz not null default now()
);
```

#### `guests`
Guest list with RSVP tracking and meal preferences.

```sql
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  rsvp_status text not null default 'pending', -- pending, accepted, declined
  meal_preference text,
  dietary_restrictions text,
  plus_one boolean not null default false,
  plus_one_name text,
  plus_one_meal text,
  table_assignment integer,
  ceremony_side text,                       -- bride, groom, either
  guest_type text default 'guest',         -- guest, family, wedding_party
  created_at timestamptz not null default now()
);
```

#### `expenses`
Budget tracking and payment management.

```sql
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  category text not null,
  description text not null,
  budgeted_amount numeric(12,2),
  actual_amount numeric(12,2),
  paid_amount numeric(12,2) default 0,
  due_date date,
  paid boolean default false,
  payment_method text,
  notes text,
  created_at timestamptz not null default now()
);
```

### Extended Tables

#### `wedding_party`
Wedding party member management. Address fields support attire delivery and gift shipping workflows.

```sql
create table public.wedding_party (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  role text not null,                       -- Honor Attendant, Attendant, etc.
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  job_assignment text,                      -- Comma-separated day-of assignments
  photo_url text,
  attire text,
  sort_order integer,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
```

#### `seating_tables`
Table configuration for seating charts.

```sql
create table public.seating_tables (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,                       -- "Table 1", "Head Table"
  shape text not null default 'round',     -- round, rectangular, square
  capacity integer not null,
  x_position numeric(8,2) default 0,       -- Visual positioning
  y_position numeric(8,2) default 0,
  created_at timestamptz not null default now()
);
```

#### `seating_assignments`
Guest-to-table assignments.

```sql
create table public.seating_assignments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  table_id uuid not null references public.seating_tables(id) on delete cascade,
  seat_number integer,
  created_at timestamptz not null default now(),
  unique(guest_id, wedding_id)
);
```

### Vendor Marketplace Tables

#### `suggested_vendors`
Curated vendor directory for recommendations.

```sql
create table public.suggested_vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  location text not null,
  description text,
  website text,
  email text,
  phone text,
  price_range text,                         -- $, $$, $$$, $$$$
  rating numeric(3,2),
  image_url text,
  is_featured boolean default false,
  created_at timestamptz not null default now()
);
```

#### `vendor_accounts`
Vendor portal accounts for marketplace participation.

```sql
create table public.vendor_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,                    -- Clerk user ID
  business_name text not null,
  category text not null,
  location text not null,
  description text,
  website text,
  email text not null,
  phone text,
  verified boolean default false,
  created_at timestamptz not null default now()
);
```

#### `vendor_placements`
Paid vendor placement tracking.

```sql
create table public.vendor_placements (
  id uuid primary key default gen_random_uuid(),
  vendor_account_id uuid not null references public.vendor_accounts(id) on delete cascade,
  tier text not null,                       -- premium, featured, standard
  category text not null,
  location text not null,
  start_date date not null,
  end_date date not null,
  amount_paid numeric(12,2) not null,
  stripe_payment_intent_id text,
  is_active boolean default true,
  created_at timestamptz not null default now()
);
```

### System Tables

#### `notifications`
User notification management.

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,                    -- Clerk user ID
  wedding_id uuid references public.weddings(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,                       -- deadline, reminder, system
  read boolean default false,
  action_url text,
  created_at timestamptz not null default now()
);
```

#### `chat_messages`
AI chat conversation history.

```sql
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  role text not null,                       -- user, assistant
  content text not null,
  metadata jsonb,                           -- Additional context
  created_at timestamptz not null default now()
);
```

#### `subscriber_purchases`
Subscription and payment tracking.

```sql
create table public.subscriber_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,                    -- Clerk user ID
  wedding_id uuid references public.weddings(id) on delete set null,
  amount numeric(10,2) not null,
  stripe_payment_intent_id text,
  stripe_session_id text,
  status text not null default 'active' check (status in ('active', 'refunded')),
  purchased_at timestamptz not null default now()
);
```

#### `wedding_collaborators`
Wedding collaboration and sharing system.

```sql
create table public.wedding_collaborators (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  email text not null,
  role text not null check (role in ('partner', 'coordinator')),
  invite_status text not null default 'pending' check (invite_status in ('pending', 'accepted')),
  invited_by text not null,                -- Clerk user ID of inviter
  user_id text,                            -- Clerk user ID when accepted
  created_at timestamptz default now(),
  unique(wedding_id, email)
);
```

**Collaboration Flow:**
1. **Invitation**: Owner invites collaborator by email with role assignment
2. **Auto-Accept**: When invitee signs up with matching email, invitation auto-accepts
3. **Access Control**: Role-based permissions enforced at API level
4. **Subscription Inheritance**: Collaborators inherit owner's premium status

#### `mood_board_items`
Pinterest-style wedding inspiration board. Items can be linked to a vendor in the wedding's vendor pipeline for inspiration-to-booking tracking.

```sql
create table public.mood_board_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  image_url text not null,
  caption text,
  category text not null default 'General',
  location text,                           -- Ceremony, Reception, Bar, etc.
  vendor_id uuid references public.vendors(id), -- Optional vendor association
  sort_order integer not null default 0,
  deleted_at timestamptz,                  -- Soft delete support
  created_at timestamptz default now()
);
```

**Categories:** Florals, Attire, Colors, Decor, Venue, Food, and custom user-defined categories
**Locations:** Ceremony, Reception, Bar, Lounge, Photo Areas

#### `date_change_alerts`
Tracks wedding date and ceremony time changes that require user acknowledgment. When a date or time changes, a record is created listing the old value, new value, and any tasks whose due dates are affected. The `DateSyncBanner` component in the dashboard layout reads unacknowledged alerts and shows a persistent warning banner until the user confirms they understand which appointments may need rescheduling.

```sql
create table public.date_change_alerts (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id),
  change_type text not null,               -- 'wedding_date' | 'ceremony_time' | 'rehearsal_date'
  old_value text,
  new_value text,
  affected_tasks jsonb default '[]',       -- [{ title, due_date }]
  message text not null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);
```

#### `comments`
Collaborative commenting system for all entities.

```sql
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  entity_type text not null,               -- task, vendor, guest, expense, general
  entity_id text not null,
  user_id text not null,                   -- Clerk user ID
  user_name text not null,                 -- Display name
  content text not null,
  created_at timestamptz default now()
);
```

**Entity Types:** Tasks, vendors, guests, expenses, general wedding comments
**Collaboration:** All roles can comment, fostering team communication

## Date and time synchronization

When a user changes their wedding date or ceremony time, the platform cascades updates across related data:

1. **Task shifting** — milestone tasks whose due dates are calculated relative to the wedding date are automatically recalculated to maintain their relative offset (e.g., "12 months before").
2. **Appointment flagging** — appointment-type tasks with fixed dates are not auto-shifted; instead they are included in the `affected_tasks` payload of the alert so the user can review and update vendor appointments manually.
3. **Alert creation** — a `date_change_alerts` record is inserted with the old and new values, the affected task list, and a human-readable message.
4. **Banner display** — the `DateSyncBanner` component (rendered in `src/app/dashboard/layout.tsx`) fetches unacknowledged alerts via `GET /api/date-alerts` on every dashboard page load and displays an amber warning banner. The banner will not disappear until the user clicks "I understand — I will update affected appointments", which calls `POST /api/date-alerts` to set `acknowledged = true`.

`weddings.ceremony_time` is the canonical source of truth for ceremony start time. `day_of_plans.content.ceremonyTime` is kept in sync but treated as a copy; API routes that read ceremony time should prefer `weddings.ceremony_time`.

## Security Architecture

### Authentication Flow

```
User Request → Next.js Proxy → Clerk Authentication → API Route → getWeddingForUser() → Database
```

1. **Next.js 16 Proxy**: Modern proxy pattern in `src/proxy.ts` handles edge-level authentication
2. **Clerk Authentication**: All requests authenticated via Clerk session tokens with rate limiting
3. **API Authorization**: `getWeddingForUser()` resolves user access with role-based permissions
4. **Row Level Security**: Database-level protection via Supabase RLS policies

### Authorization Levels

The `getWeddingForUser()` function supports multi-role access control:

```typescript
// Returns: { wedding, supabase, userId, role }
// role: "owner" | "partner" | "coordinator"

// 1. Wedding owner (user_id matches wedding)
// 2. Accepted collaborator (invited partner/coordinator)  
// 3. Pending invite auto-accept (email matches Clerk user)
```

**Access Control:**
- **Owner**: Full access to all wedding data, settings, and collaborator management
- **Partner**: Full collaborative planning access (invited by owner)
- **Coordinator**: Professional planning access with limited settings (invited by owner)

**Role Restrictions:**
- **Owner Only**: Collaborator management, subscription management, core wedding settings
- **Owner + Partner**: All planning features, budget management, vendor communications
- **All Roles**: Task management, guest management, day-of planning, AI chat (premium)

**Subscription tier and feature gating (`src/lib/subscription.ts`):**

The subscription system uses an explicit `Tier` enum (`trialing | free | pro | beta | admin`) as its source of truth, replacing the previous single `hasAccess` boolean. Each tier maps to a `Features` record of per-feature booleans:

| Feature key | Free | Trialing | Pro / Beta / Admin |
|-------------|------|----------|--------------------|
| `chat` | capped | unlimited | unlimited |
| `webSearch` | no | yes | yes |
| `exportBinder` | no | yes | yes |
| `emailTemplates` | no | yes | yes |
| `attachments` | no | yes | yes |
| `catchUpPlans` | no | yes | yes |
| `budgetOptimizer` | no | yes | yes |

Free-tier `chat` is capped on tool calls (not messages). The cap is tracked in `tool-call-counter.ts` and enforced in `/api/chat`. The `web_search` tool is removed from the available tool list for free-tier users.

New routes should use `requireFeature(featureKey)` from `src/lib/subscription.ts`. The legacy `requirePremium()` function is retained for backward compatibility and is equivalent to checking `tier !== "free"`.

The legacy fields on `SubscriptionStatus` (`hasAccess`, `isPaid`, `isBeta`, `isTrialing`, `trialDaysLeft`, `trialExpired`) are derived from `tier` automatically.

Collaborators inherit the wedding owner's subscription tier.

### Row Level Security (RLS) Policies

All tables implement RLS policies to ensure data isolation:

```sql
-- Example: Users can only access their wedding data
create policy "Users can manage their own weddings"
  on public.weddings for all
  using (user_id = current_setting('request.jwt.claim.sub', true))
  with check (user_id = current_setting('request.jwt.claim.sub', true));

-- Example: Users can only access guests for their weddings
create policy "Users can manage guests for their weddings"
  on public.guests for all
  using (wedding_id in (
    select id from public.weddings 
    where user_id = current_setting('request.jwt.claim.sub', true)
  ));
```

### API Security Features

- **Rate Limiting**: Upstash Redis-based rate limiting per endpoint and user
- **Input Validation**: Comprehensive input validation with `pickFields` pattern
- **Premium Enforcement**: Server-side protection for premium features
- **HTTPS Only**: Enforced in production with security headers
- **CORS Configuration**: Restricted to allowed origins
- **Webhook Verification**: Stripe webhooks verified with signatures
- **Audit Trail**: Comprehensive activity logging for all user actions
- **Soft Deletes**: Data preservation with audit trail for deleted items

## API Architecture

### Route Organization

```
src/app/api/
├── auth/                    # Authentication endpoints
├── weddings/               # Wedding CRUD operations
├── tasks/                  # Task management
├── vendors/                # Vendor pipeline
├── guests/                 # Guest list management
├── expenses/               # Budget tracking
├── seating/                # Seating chart management
├── chat/                   # AI assistant (free-tier capped, Pro unlimited)
├── catch-up/               # AI catch-up plans (Pro-gated)
├── budget-optimize/        # AI budget optimizer (Pro-gated)
├── attachments/            # File uploads (Pro-gated)
├── subscription-status/    # Tier + feature flags + tool-call meter
├── collaborators/          # Wedding collaboration
├── mood-board/             # Inspiration board
├── public/                 # Public wedding website APIs
├── admin/                  # Admin functionality
├── vendor-portal/          # Vendor marketplace
├── webhooks/               # External service webhooks
└── cron/                   # Scheduled tasks (check-deadlines, trial-reminders)
```

### Authentication Pattern

All authenticated API routes follow this pattern:

```typescript
import { getWeddingForUser } from '@/lib/auth'

export async function GET() {
  const { wedding, error } = await getWeddingForUser()
  
  if (error) {
    return NextResponse.json({ error }, { status: 401 })
  }
  
  // Proceed with authenticated logic
}
```

### Error Handling

Consistent error responses across all endpoints:

```typescript
// Success response
{ data: T, success: true }

// Error response
{ error: string, code?: string, details?: any }
```

## AI Integration Architecture

### Claude AI Integration

```
User Message → API Route → Context Builder → Claude API → Response Parser → User
```

#### Context Building
The AI system builds context from:
- Current wedding details (date, venue, budget, guest count)
- Completed and pending tasks
- Vendor pipeline status
- Recent chat history
- User preferences and style

#### System Prompt Structure
```typescript
const systemPrompt = `
You are eydn, an AI wedding planning assistant.

Wedding Context:
- Date: ${wedding.date}
- Venue: ${wedding.venue}
- Guest Count: ${wedding.guest_count}
- Budget: ${wedding.budget}
- Style: ${wedding.style}

Current Status:
- Tasks Completed: ${completedTasks}
- Vendors Booked: ${bookedVendors}
- Days Until Wedding: ${daysUntil}

Respond in eydn's voice: friendly, warm, professional, and helpful.
`
```

## Deployment Architecture

### Vercel Deployment

```
GitHub Repository → Vercel Build → Edge Functions → Global CDN
```

#### Build Process
1. **Dependency Installation**: `npm install`
2. **Type Checking**: TypeScript compilation
3. **Build Optimization**: Next.js build with tree shaking
4. **Asset Optimization**: Image and font optimization
5. **Edge Function Deployment**: API routes to edge locations

#### Environment Configuration
- **Development**: Local `.env.local` with development services
- **Staging**: Vercel preview deployments with staging database
- **Production**: Production environment variables with live services

### Database Deployment

#### Supabase Configuration
- **Development**: Local Supabase instance via Docker
- **Staging**: Dedicated Supabase project for testing
- **Production**: Production Supabase project with backups

#### Migration Strategy
```bash
# Development
supabase db reset

# Production
supabase db push --include-all
```

## Performance Optimization

### Frontend Optimizations
- **Server Components**: Reduced client-side JavaScript
- **Image Optimization**: Next.js Image component with WebP
- **Font Optimization**: Preloaded Google Fonts
- **Code Splitting**: Dynamic imports for large components
- **Caching**: Static generation for public pages

### Database Optimizations
- **Indexing**: Strategic indexes on frequently queried columns
- **Query Optimization**: Efficient joins and subqueries
- **Connection Pooling**: Supabase connection management
- **Real-time Subscriptions**: Selective real-time updates

### API Optimizations
- **Response Caching**: Next.js API route caching
- **Pagination**: Cursor-based pagination for large datasets
- **Batch Operations**: Bulk operations for efficiency
- **Compression**: Gzip compression for responses

## Monitoring and Observability

### Application Monitoring
- **Sentry**: Error tracking, performance monitoring, session replay, release tracking
- **Vercel Analytics**: Core Web Vitals (LCP, CLS, INP) and performance metrics
- **Ahrefs Analytics**: SEO analytics and search performance
- **Google Tag Manager + GA4**: User behavior, conversions, and events
- **UptimeRobot**: Availability and uptime monitoring

### Database Monitoring
- **Supabase Dashboard**: Query performance, database metrics, connection pool monitoring
- **Connection Monitoring**: Active connections and pool usage
- **Storage Monitoring**: File storage usage and limits
- **Backup Verification**: Automated backup health checks via cron jobs

### Business Metrics
- **Conversion Tracking**: Trial to paid conversion rates
- **Feature Adoption**: Usage of key platform features
- **Vendor Marketplace**: Placement performance and revenue
- **User Satisfaction**: Support ticket volume and resolution

## Scalability Considerations

### Horizontal Scaling
- **Serverless Functions**: Auto-scaling API routes
- **Database Scaling**: Supabase auto-scaling capabilities
- **CDN Distribution**: Global content delivery
- **Load Balancing**: Automatic traffic distribution

### Vertical Scaling
- **Database Resources**: Configurable compute and storage
- **Function Memory**: Adjustable memory allocation
- **Connection Limits**: Scalable connection pooling
- **Storage Capacity**: Unlimited file storage scaling

### Future Scaling Plans
- **Database Sharding**: Horizontal database partitioning
- **Microservices**: Service decomposition for complex features
- **Caching Layer**: Redis for high-frequency data
- **Queue System**: Background job processing for heavy tasks

This architecture documentation provides a comprehensive overview of the eydn platform's technical implementation. For specific implementation details, refer to the codebase and individual component documentation.