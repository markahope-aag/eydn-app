# Development Guide

This guide covers development setup, deployment, and contribution guidelines for the eydn wedding planning platform.

## Prerequisites

Before starting development, ensure you have:

- **Node.js** 18.0.0 or higher
- **npm**, **yarn**, or **pnpm** package manager
- **Git** for version control
- **VS Code** (recommended) with TypeScript extensions

### Required Accounts

You'll need accounts for the following services:

1. **Supabase** - Database and authentication
2. **Clerk** - User authentication and management
3. **Anthropic** - AI chat functionality
4. **Stripe** - Payment processing
5. **Vercel** - Deployment (recommended)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd eydn-app
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Configure the following environment variables:

#### Supabase Configuration
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### Clerk Authentication
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_key
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret
```

#### Anthropic AI
```env
ANTHROPIC_API_KEY=sk-ant-your_api_key
```

#### Stripe Payments
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

#### Optional Configuration
```env
# For development
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For admin functionality
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

### 4. Database Setup

#### Initialize Supabase

1. Create a new Supabase project
2. Copy the project URL and anon key to your `.env.local`
3. Install Supabase CLI:

```bash
npm install -g supabase
```

4. Login and link your project:

```bash
supabase login
supabase link --project-ref your-project-ref
```

5. Run database migrations:

```bash
supabase db reset
```

This will create all necessary tables, RLS policies, and seed data.

#### Database Schema Overview

The database includes these main tables:

- `weddings` - Core wedding information
- `tasks` - Planning timeline and tasks
- `vendors` - Vendor pipeline management
- `guests` - Guest list and RSVP tracking
- `expenses` - Budget and expense tracking
- `wedding_party` - Wedding party members
- `seating_tables` & `seating_assignments` - Seating arrangements
- `notifications` - System notifications
- `suggested_vendors` - Vendor directory
- `vendor_accounts` - Vendor portal accounts
- `vendor_placements` - Paid vendor placements
- `subscriber_purchases` - Subscription tracking

### 5. Authentication Setup

#### Clerk Configuration

1. Create a Clerk application
2. Configure authentication providers (email, Google, etc.)
3. Set up webhooks for user events
4. Add your domain to allowed origins

#### Webhook Endpoints

Configure these webhook endpoints in Clerk:

- `https://your-domain.com/api/webhooks/clerk` - User events

### 6. Payment Setup

#### Stripe Configuration

1. Create Stripe account and get API keys
2. Set up webhook endpoints:
   - `https://your-domain.com/api/webhooks/stripe`
3. Configure webhook events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`

### 7. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Development Workflow

### Code Structure

Follow these conventions:

- **Components**: Reusable UI components in `src/components/`
- **Pages**: Next.js pages in `src/app/`
- **API Routes**: Server endpoints in `src/app/api/`
- **Utilities**: Helper functions in `src/lib/`
- **Types**: TypeScript types in `src/lib/supabase/types.ts`

### Naming Conventions

- **Files**: Use kebab-case for files (`task-list.tsx`)
- **Components**: Use PascalCase (`TaskList`)
- **Functions**: Use camelCase (`getWeddingForUser`)
- **Constants**: Use UPPER_SNAKE_CASE (`API_ENDPOINTS`)

### Git Workflow

1. Create feature branches from `main`:
   ```bash
   git checkout -b feature/task-management
   ```

2. Make atomic commits with descriptive messages:
   ```bash
   git commit -m "feat: add task completion tracking"
   ```

3. Push and create pull requests:
   ```bash
   git push origin feature/task-management
   ```

### Testing

Run tests before committing:

```bash
npm run test        # Run all tests
npm run test:watch  # Watch mode for development
```

#### Test Structure

- **Unit tests**: Test individual functions and components
- **Integration tests**: Test API endpoints and database operations
- **E2E tests**: Test complete user workflows

#### Writing Tests

```typescript
// Example component test
import { render, screen } from '@testing-library/react'
import { TaskList } from './TaskList'

describe('TaskList', () => {
  it('renders tasks correctly', () => {
    const tasks = [{ id: '1', title: 'Book venue', completed: false }]
    render(<TaskList tasks={tasks} />)
    expect(screen.getByText('Book venue')).toBeInTheDocument()
  })
})
```

### Code Quality

#### Linting

```bash
npm run lint        # Check for linting errors
npm run lint:fix    # Fix auto-fixable issues
```

#### Type Checking

```bash
npx tsc --noEmit    # Check TypeScript types
```

#### Pre-commit Hooks

The project uses Husky for pre-commit hooks:

- Lint staged files
- Run type checking
- Run relevant tests

## Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository**:
   - Link your GitHub repository to Vercel
   - Import the project

2. **Configure Environment Variables**:
   - Add all production environment variables
   - Use Vercel's environment variable interface

3. **Configure Build Settings**:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm install"
   }
   ```

4. **Deploy**:
   - Automatic deployment on push to main branch
   - Preview deployments for pull requests

### Manual Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm run start
   ```

### Environment-Specific Configuration

#### Production Environment Variables

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Use production keys for all services
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
CLERK_SECRET_KEY=sk_live_your_production_key
STRIPE_SECRET_KEY=sk_live_your_production_key
```

#### Staging Environment

Set up a staging environment for testing:

```env
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.your-domain.com
```

## Database Management

### Migrations

Create new migrations for schema changes:

```bash
supabase migration new add_new_feature
```

Apply migrations:

```bash
supabase db push
```

### Backup and Recovery

Regular database backups are handled by Supabase automatically. For manual backups:

```bash
supabase db dump --file backup.sql
```

### Seeding Data

Development seed data is included in migrations. For custom seeding:

```sql
-- Add to a migration file
INSERT INTO suggested_vendors (name, category, location) VALUES
  ('Amazing Photography', 'photographer', 'New York'),
  ('Perfect Venues', 'venue', 'California');
```

## Monitoring and Debugging

### Logging

Use structured logging throughout the application:

```typescript
console.log('[API] Processing task creation', { userId, taskData })
console.error('[ERROR] Failed to create task', { error, userId })
```

### Error Tracking

Configure error tracking for production:

1. **Sentry** (recommended) for error monitoring
2. **Vercel Analytics** for performance monitoring
3. **Supabase Dashboard** for database monitoring

### Performance Monitoring

Monitor key metrics:

- **Page Load Times**: Use Next.js analytics
- **API Response Times**: Monitor with Vercel
- **Database Performance**: Use Supabase dashboard
- **User Engagement**: Track with analytics tools

## Security Considerations

### Authentication Security

- All API routes use Clerk authentication
- Row Level Security (RLS) enabled on all Supabase tables
- User data is isolated per wedding

### Data Protection

- Sensitive data encrypted at rest (Supabase)
- HTTPS enforced in production
- API rate limiting implemented
- Input validation on all endpoints

### Environment Security

- Never commit `.env` files
- Use different keys for development/production
- Regularly rotate API keys
- Monitor for security vulnerabilities

## Contributing Guidelines

### Pull Request Process

1. **Create Issue**: Describe the feature or bug
2. **Create Branch**: Use descriptive branch names
3. **Implement Changes**: Follow coding standards
4. **Write Tests**: Ensure adequate test coverage
5. **Update Documentation**: Update relevant docs
6. **Create PR**: Use the PR template
7. **Code Review**: Address review feedback
8. **Merge**: Squash and merge when approved

### Code Review Checklist

- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities introduced
- [ ] Performance impact considered
- [ ] Accessibility guidelines followed

### Release Process

1. **Version Bump**: Update version in `package.json`
2. **Changelog**: Update `CHANGELOG.md`
3. **Tag Release**: Create Git tag
4. **Deploy**: Automatic deployment via Vercel
5. **Monitor**: Watch for issues post-deployment

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check Supabase connection
supabase status
```

#### Authentication Problems
```bash
# Verify Clerk configuration
npx @clerk/nextjs doctor
```

#### Build Failures
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

#### Type Errors
```bash
# Regenerate Supabase types
supabase gen types typescript --local > src/lib/supabase/types.ts
```

### Getting Help

- **Documentation**: Check this guide and API docs
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions
- **Support**: Contact the development team

## Performance Optimization

### Next.js Optimization

- Use `next/image` for optimized images
- Implement proper caching strategies
- Use dynamic imports for code splitting
- Optimize bundle size with webpack-bundle-analyzer

### Database Optimization

- Use proper indexes on frequently queried columns
- Implement pagination for large datasets
- Use Supabase edge functions for complex operations
- Monitor query performance

### Caching Strategy

- API response caching with Next.js
- Static generation for public pages
- CDN caching for assets
- Browser caching for static resources

This guide should help you get started with development on the eydn platform. For additional questions, refer to the API documentation or create an issue in the repository.