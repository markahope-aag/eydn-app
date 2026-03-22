# eydn — AI Wedding Planning Platform

**eydn** is a comprehensive wedding planning SaaS platform that combines AI-powered guidance with practical planning tools. Built with Next.js 16, React 19, and powered by Claude AI, eydn helps couples plan their perfect wedding from engagement to "I do."

## 🌟 Features

### Core Planning Tools
- **AI Wedding Guide**: Chat with eydn, your AI wedding planner powered by Claude
- **Smart Task Timeline**: Automatically generated timeline with 12-month planning schedule
- **Budget Tracker**: Comprehensive budget management with category breakdowns
- **Guest Management**: RSVP tracking, meal preferences, and guest list import
- **Vendor Pipeline**: Vendor discovery, contact management, and email templates
- **Seating Chart Builder**: Drag-and-drop seating arrangement with visual editor
- **Wedding Party Management**: Track bridesmaids, groomsmen, and their responsibilities
- **Day-of Planner**: Auto-generated timeline and coordination tools

### Advanced Features
- **Public Wedding Websites**: Beautiful guest-facing sites at `/w/[slug]`
- **Vendor Marketplace**: Tiered vendor placements and discovery system
- **Admin Dashboard**: Platform management and analytics
- **Subscription System**: 14-day trial + $79 one-time purchase via Stripe
- **Notification System**: Automated deadline reminders and updates
- **Mobile-Responsive**: Optimized for all devices

## 🛠 Tech Stack

- **Framework**: Next.js 16.2.0 with App Router
- **Frontend**: React 19.2.4, TypeScript 5, Tailwind CSS 4
- **Authentication**: Clerk 7.0.5 with middleware protection
- **Database**: Supabase 2.99.2 (PostgreSQL) with Row Level Security
- **AI**: Anthropic Claude SDK 0.80.0 for wedding planning assistance
- **Payments**: Stripe 20.4.1 with webhook integration
- **File Storage**: Supabase Storage for images and documents
- **Rate Limiting**: Upstash Redis for API protection
- **Testing**: Vitest 4.1.0 + React Testing Library 16.3.2
- **Deployment**: Vercel with edge functions and cron jobs

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm
- Supabase account
- Clerk account
- Anthropic API key
- Stripe account

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd eydn-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Required environment variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Anthropic AI
ANTHROPIC_API_KEY=your_anthropic_api_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

4. Set up the database:
```bash
# Run Supabase migrations
npx supabase db reset
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Authenticated dashboard pages
│   ├── w/[slug]/         # Public wedding websites
│   ├── api/              # API routes
│   └── layout.tsx        # Root layout with Clerk + global styles
├── components/           # Shared React components
├── lib/                 # Server-side utilities and business logic
│   ├── supabase/        # Database client and types
│   ├── auth.ts          # Authentication helpers
│   ├── ai/              # Claude AI integration
│   ├── stripe.ts        # Payment processing
│   └── tasks/           # Task timeline logic
└── test/               # Test configuration

supabase/
├── config.toml         # Supabase configuration
└── migrations/         # Database schema migrations

docs/                   # Product and technical documentation
```

## 🏗 Architecture

### Authentication Flow
- **Clerk** handles user authentication and session management
- Each user is linked to a single `weddings` record in Supabase
- API routes use `getWeddingForUser()` for authorization

### Database Schema
- **weddings**: Core wedding data and settings
- **tasks**: Planning timeline with categories and deadlines
- **vendors**: Vendor pipeline and contact management
- **guests**: Guest list, RSVPs, and meal preferences
- **expenses**: Budget tracking and payments
- **wedding_party**: Bridesmaids, groomsmen, and roles
- **seating**: Table assignments and ceremony seating
- **notifications**: System notifications and reminders

### AI Integration
- **Claude API** powers the wedding planning chat
- Custom system prompt with wedding-specific knowledge
- Context-aware responses based on user's wedding data

### Subscription Model
- 14-day free trial for all users
- $79 one-time purchase for full access
- Stripe webhooks handle payment processing
- `Paywall` component gates premium features

## 🧪 Testing

Run the test suite:
```bash
npm run test        # Run once
npm run test:watch  # Watch mode
```

## 📚 Documentation

### Product Documentation
- **[Product Vision & Roadmap](docs/PRODUCT_VISION.md)** - Complete feature overview, business model, and future roadmap
- **[Target Market Analysis](docs/TARGET_MARKET.md)** - Market research, user personas, and competitive analysis
- **[eydn AI Persona](docs/EDYN_PERSONA.md)** - AI assistant personality, voice, and interaction patterns

### Feature Documentation
- **[Task Timeline](docs/TASK_TIMELINE.md)** - Complete 12-month wedding planning timeline with AI guidance
- **[Wedding Collaboration](docs/COLLABORATION.md)** - Partner and coordinator collaboration system
- **[Mood Board](docs/MOOD_BOARD.md)** - Visual inspiration board and organization tools
- **[Vendor Marketplace](docs/VENDOR_MARKETPLACE.md)** - Vendor portal, placement tiers, and marketplace operations
- **[Wedding Websites](docs/WEDDING_WEBSITES.md)** - Public wedding site features, RSVP system, and customization
- **[Subscription Model](docs/SUBSCRIPTION_MODEL.md)** - Pricing strategy, trial system, and revenue model
- **[Vendor Categories](docs/VENDOR_CATEGORIES.md)** - Supported vendor types and classifications
- **[Email Templates](docs/VENDOR_EMAIL_TEMPLATES.md)** - Pre-built vendor outreach templates
- **[Onboarding Process](docs/ONBOARDING_QUESTIONNAIRE.md)** - User onboarding flow and questionnaire

### Technical Documentation
- **[System Architecture](docs/ARCHITECTURE.md)** - Technical architecture, database schema, and infrastructure
- **[API Reference](docs/API.md)** - Complete API documentation with endpoints and examples
- **[Development Guide](docs/DEVELOPMENT.md)** - Setup instructions, deployment, and contribution guidelines

📖 **[Complete Documentation Index](docs/README.md)** - Full documentation overview and navigation

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support, email support@eydn.com or create an issue in this repository.
