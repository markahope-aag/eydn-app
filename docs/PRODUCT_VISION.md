# eydn - Product Vision & Roadmap

**eydn** is a comprehensive AI-powered wedding planning platform that combines intelligent guidance with practical planning tools. Our mission is to make wedding planning stress-free, organized, and enjoyable for every couple.

## AI Persona: Eydn

**Tone:** Warm, direct, real. Like a smart friend who has planned a wedding — not a corporate app, not a cheerleader, not a robot.

**Voice:** Calm, honest, concise. Leads with recommendations, not options. Acknowledges stress without amplifying it. No exclamation points, no "Amazing!", no "Congratulations!" on every open.

**AI Approach:** Powered by Anthropic Claude with full wedding context injection (budget status, overdue tasks, vendor gaps, RSVP rates). Tool use for direct actions (add guests, update RSVPs, search vendors, etc.). See `docs/EDYN_PERSONA.md` for the complete persona specification.

---

## Core Features (Implemented)

### ✅ 1. Onboarding Wizard
- 7-screen focused flow: names, date, budget+guests, venue, booked vendors, AI intro
- Automatic task timeline generation based on wedding date and booked vendors
- Budget allocation auto-calculated using category percentage splits
- AI greeting with timeframe-aware variant (see `docs/ONBOARDING_QUESTIONNAIRE.md`)

### ✅ 2. Intelligent Dashboard
- Wedding countdown with progress tracking
- Vendor pipeline overview with status indicators
- Upcoming and overdue task management
- Budget progress and expense tracking
- Guest RSVP summary and analytics

### ✅ 3. Smart Task Management
- 12-month planning timeline with 100+ pre-built tasks
- Category-based organization (venue, catering, photography, etc.)
- Automated deadline notifications via email and in-app
- Task dependencies and related resource suggestions
- File attachment support for contracts and documents

### ✅ 4. Comprehensive Vendor Management
- Full vendor pipeline with status tracking
- Pre-built email templates for vendor outreach
- Suggested vendor directory with local recommendations
- Vendor contact management and communication history
- Integration with vendor marketplace and placements

### ✅ 5. Advanced Budget Tracking
- Category-based budget allocation with templates
- Expense tracking with vendor linking
- Payment status monitoring (deposit, balance, paid in full)
- Visual spending breakdown and progress indicators
- Budget vs. actual spending analysis

### ✅ 6. Guest Management & RSVPs
- Complete guest list management with import/export
- RSVP tracking with meal preferences and dietary restrictions
- Plus-one management and tracking
- Guest communication tools and reminders
- Integration with public wedding website

### ✅ 7. Wedding Party Coordination
- Member management with roles and responsibilities
- Contact information and communication tools
- Day-of assignment tracking
- Coordination with seating and ceremony planning

### ✅ 8. Interactive Seating Chart
- Drag-and-drop table and guest assignment
- Visual seating layout with customizable table shapes
- Guest dietary restriction and preference integration
- Ceremony seating separate from reception
- Print-ready seating charts

### ✅ 9. Public Wedding Website
- Beautiful, customizable wedding websites at `/w/[slug]`
- Guest RSVP collection with meal preferences
- Wedding schedule and venue information
- Photo gallery and registry integration
- Mobile-optimized for guest convenience

### ✅ 10. Day-of Planning Tools
- Auto-generated day-of timeline
- Vendor contact sheets and coordination
- Wedding party assignment tracking
- Ceremony timeline and coordination
- Print-ready planning documents

### ✅ 11. AI Wedding Assistant
- Context-aware chat powered by Anthropic Claude with tool use (9 tools)
- Full wedding data injection: tasks, vendors, guests, budget, seating, day-of plan, guide answers
- Web search via Tavily for vendor/venue research
- Direct actions: add guests, update RSVPs, add tasks, add vendors, save to mood board
- Urgency-aware: flags overdue tasks, budget overruns, vendor gaps, RSVP rates

### ✅ 12. Notification System
- Automated deadline reminders (1 week before due dates)
- Task completion celebrations and next step suggestions
- Vendor follow-up reminders
- RSVP deadline notifications
- System-wide announcement capabilities

## Advanced Features (Implemented)

### ✅ Vendor Marketplace & Monetization
- **Vendor Portal**: Self-service portal for vendor account management
- **Tiered Placements**: Premium, featured, and standard vendor listings
- **Analytics Dashboard**: Performance tracking for vendor partners
- **Checkout System**: Stripe-powered placement purchases
- **Vendor Directory**: Curated directory with local vendor suggestions

### ✅ Subscription & Monetization
- **14-Day Free Trial**: Full access to all features
- **One-Time Purchase**: $79 lifetime access model
- **Stripe Integration**: Secure payment processing and webhooks
- **Subscription Management**: Trial tracking and premium feature gating
- **Paywall System**: Seamless upgrade experience

### ✅ Admin & Platform Management
- **Admin Dashboard**: Platform statistics and user management
- **Vendor Approval System**: Review and approve vendor submissions
- **Placement Management**: Configure vendor placement tiers and pricing
- **User Analytics**: Platform usage and engagement metrics
- **System Configuration**: Platform settings and feature toggles

### ✅ Public API & Integrations
- **RESTful API**: Complete API for all platform features
- **Webhook Support**: Stripe payment webhooks and event processing
- **File Upload System**: Secure file storage and management
- **Email Integration**: Automated email notifications and templates
- **Cron Jobs**: Automated deadline checking and notifications

---

## Technical Architecture

### Frontend
- **Next.js 16** with App Router for modern React development
- **React 19** with server components and streaming
- **TypeScript** for type safety and developer experience
- **Tailwind CSS 4** for utility-first styling
- **Drag & Drop** powered by @dnd-kit for seating charts

### Backend & Database
- **Supabase** for PostgreSQL database with real-time features
- **Row Level Security (RLS)** for data isolation and security
- **Automated migrations** for schema management
- **Edge functions** for serverless compute

### Authentication & Security
- **Clerk** for user authentication and session management
- **Multi-factor authentication** support
- **Role-based access control** for admin features
- **API rate limiting** and security headers

### AI & Machine Learning
- **Anthropic Claude** for conversational AI and planning advice
- **Context-aware responses** based on wedding data
- **Structured prompts** for consistent, helpful guidance
- **Real-time chat** with wedding-specific knowledge

### Payments & Subscriptions
- **Stripe** for payment processing and subscription management
- **Webhook handling** for real-time payment updates
- **Trial management** with automatic conversion
- **One-time purchase** model with lifetime access

### Deployment & Infrastructure
- **Vercel** for hosting and serverless functions
- **CDN** for global content delivery
- **Automated deployments** from Git
- **Environment management** for staging and production

---

## Business Model

### Revenue Streams

1. **User Subscriptions**
   - 14-day free trial
   - $79 one-time purchase for lifetime access
   - Premium features behind paywall

2. **Vendor Marketplace**
   - Tiered placement fees for vendor visibility
   - Commission on vendor referrals (planned)
   - Featured listing upgrades

3. **Enterprise Partnerships**
   - White-label solutions for wedding planners (planned)
   - API licensing for integration partners (planned)

### Target Market Expansion

**Primary**: Engaged couples (22-40) planning their wedding
**Secondary**: Professional wedding planners and coordinators
**Tertiary**: Vendors seeking couple connections

---

## Roadmap & Future Features

### Phase 1: Enhanced AI & Automation (Q2 2026)
- **Smart Budget Recommendations**: AI-powered budget optimization
- **Automated Vendor Matching**: ML-based vendor suggestions
- **Predictive Timeline Adjustments**: Dynamic timeline updates
- **Voice Assistant Integration**: Voice-activated planning assistance

### Phase 2: Social & Collaboration (Q3 2026)
- **Family & Friend Collaboration**: Shared planning access
- **Social Media Integration**: Instagram/Pinterest inspiration boards
- **Review & Rating System**: Vendor review platform
- **Community Features**: Couple-to-couple advice sharing

### Phase 3: Advanced Planning Tools (Q4 2026)
- **3D Venue Visualization**: Virtual venue tours and layout
- **Weather Integration**: Weather-based planning recommendations
- **Travel Coordination**: Guest travel and accommodation management
- **Live Event Coordination**: Real-time day-of coordination tools

### Phase 4: Platform Expansion (2027)
- **Mobile Apps**: Native iOS and Android applications
- **International Expansion**: Multi-language and currency support
- **White-Label Platform**: Solutions for wedding planners
- **API Marketplace**: Third-party integrations and extensions

---

## Success Metrics

### User Engagement
- **Daily Active Users**: Target 70% of trial users
- **Feature Adoption**: 80% of users complete onboarding
- **Task Completion Rate**: 85% of generated tasks completed
- **Chat Engagement**: 60% of users interact with AI assistant

### Business Metrics
- **Trial to Paid Conversion**: Target 25% conversion rate
- **Customer Lifetime Value**: $79 average revenue per user
- **Vendor Placement Revenue**: Target $50K monthly by end of 2026
- **User Retention**: 90% of paid users remain active through wedding

### Platform Health
- **API Response Time**: <200ms average response time
- **Uptime**: 99.9% availability target
- **User Satisfaction**: 4.8+ star rating target
- **Support Resolution**: <24 hour response time

---

## Competitive Advantages

1. **AI-First Approach**: Only platform with dedicated AI wedding planner
2. **Comprehensive Solution**: All-in-one platform vs. fragmented tools
3. **One-Time Purchase**: No recurring subscriptions unlike competitors
4. **Vendor Ecosystem**: Built-in marketplace for vendor discovery
5. **Public Wedding Websites**: Integrated guest-facing experience
6. **Modern Technology**: Latest Next.js and React for superior performance
