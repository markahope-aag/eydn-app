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
- **Next.js 16**: React framework with App Router for modern development
- **React 19**: Latest React with server components and concurrent features
- **TypeScript**: Type-safe development with strict configuration
- **Tailwind CSS 4**: Utility-first CSS framework with modern features
- **Nunito Font**: Custom Google Font for brand consistency

### Backend Layer
- **Next.js API Routes**: Serverless API endpoints with TypeScript
- **Supabase**: Backend-as-a-Service with PostgreSQL database
- **Clerk**: Authentication and user management service
- **Anthropic Claude**: AI-powered chat and planning assistance

### Infrastructure
- **Vercel**: Hosting platform with edge functions and CDN
- **Stripe**: Payment processing and subscription management
- **Sonner**: Toast notification system
- **DND Kit**: Drag-and-drop functionality for seating charts

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
               └── (n) mood_board_items
```

### Primary Tables

#### `weddings`
Core wedding information and settings.

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
Wedding party member management.

```sql
create table public.wedding_party (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  role text not null,                       -- maid_of_honor, best_man, etc.
  side text not null,                       -- bride, groom
  email text,
  phone text,
  address text,
  day_of_responsibilities text[],
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
Wedding collaboration and sharing.

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

#### `mood_board_items`
Wedding inspiration and mood board.

```sql
create table public.mood_board_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  image_url text not null,
  caption text,
  category text not null default 'General',
  sort_order integer not null default 0,
  created_at timestamptz default now()
);
```

## Security Architecture

### Authentication Flow

```
User Request → Clerk Middleware → API Route → getWeddingForUser() → Database
```

1. **Clerk Authentication**: All requests authenticated via Clerk session tokens
2. **Middleware Protection**: `clerkMiddleware()` in `src/proxy.ts` protects routes
3. **API Authorization**: `getWeddingForUser()` resolves user access with role-based permissions
4. **Row Level Security**: Database-level protection via Supabase RLS policies

### Authorization Levels

The `getWeddingForUser()` function now supports multiple access levels:

```typescript
// Returns: { wedding, supabase, userId, role }
// role: "owner" | "partner" | "coordinator"

// 1. Wedding owner (user_id matches wedding)
// 2. Accepted collaborator (invited partner/coordinator)  
// 3. Pending invite auto-accept (email matches Clerk user)
```

**Access Control:**
- **Owner**: Full access to all wedding data and settings
- **Partner**: Collaborative planning access (invited by owner)
- **Coordinator**: Professional coordinator access (invited by owner)

**Role Restrictions:**
- Collaborator management: Owner only
- Subscription management: Owner only
- Most planning features: All roles

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

- **Rate Limiting**: Implemented per endpoint to prevent abuse
- **Input Validation**: All inputs validated and sanitized
- **HTTPS Only**: Enforced in production environments
- **CORS Configuration**: Restricted to allowed origins
- **Webhook Verification**: Stripe webhooks verified with signatures

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
├── chat/                   # AI assistant (premium)
├── attachments/            # File uploads (premium)
├── collaborators/          # Wedding collaboration
├── mood-board/             # Inspiration board
├── public/                 # Public wedding website APIs
├── admin/                  # Admin functionality
├── vendor-portal/          # Vendor marketplace
├── webhooks/               # External service webhooks
└── cron/                   # Scheduled tasks
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
- **Vercel Analytics**: Performance and usage metrics
- **Error Tracking**: Built-in error boundaries and logging
- **API Monitoring**: Response times and error rates
- **User Analytics**: Feature usage and engagement tracking

### Database Monitoring
- **Supabase Dashboard**: Query performance and usage
- **Connection Monitoring**: Active connections and pool usage
- **Storage Monitoring**: File storage usage and limits
- **Backup Verification**: Automated backup health checks

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