# Deployment Guide

This guide covers deployment procedures, environment configuration, and operational practices for the eydn wedding planning platform.

## Overview

The eydn platform is deployed using a modern serverless architecture with:
- **Vercel** for hosting and edge functions
- **Supabase** for database and storage
- **Clerk** for authentication
- **Stripe** for payments
- **Upstash Redis** for rate limiting
- **Sentry** for error monitoring

## Deployment Architecture

```
GitHub Repository → Vercel Build → Edge Functions → Global CDN
                                      ↓
                              Supabase Database
                                      ↓
                           Third-party Services (Clerk, Stripe, etc.)
```

## Environment Configuration

### Development Environment

```env
# .env.local (development)
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (Development)
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_dev_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_dev_service_role_key

# Clerk (Development)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_dev_key
CLERK_SECRET_KEY=sk_test_your_dev_key

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_test_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret

# Anthropic (Development)
ANTHROPIC_API_KEY=sk-ant-your_dev_key

# Upstash Redis (Development)
UPSTASH_REDIS_REST_URL=https://your-dev-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_dev_redis_token

# Optional Development Settings
ADMIN_EMAILS=admin@example.com
CRON_SECRET=your_dev_cron_secret
RESEND_API_KEY=your_dev_resend_key
```

### Staging Environment

```env
# .env.staging (staging)
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.eydn.app

# Supabase (Staging)
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_staging_service_role_key

# Clerk (Staging)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_staging_key
CLERK_SECRET_KEY=sk_test_your_staging_key

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_staging_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_staging_key
STRIPE_WEBHOOK_SECRET=whsec_your_staging_webhook_secret

# Production-like settings
ANTHROPIC_API_KEY=sk-ant-your_staging_key
UPSTASH_REDIS_REST_URL=https://your-staging-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_staging_redis_token
```

### Production Environment

```env
# Production environment variables (set in Vercel dashboard)
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://eydn.app

# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_role_key

# Clerk (Production)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_prod_key
CLERK_SECRET_KEY=sk_live_your_prod_key

# Stripe (Live Mode)
STRIPE_SECRET_KEY=sk_live_your_prod_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_prod_key
STRIPE_WEBHOOK_SECRET=whsec_your_prod_webhook_secret

# Production services
ANTHROPIC_API_KEY=sk-ant-your_prod_key
UPSTASH_REDIS_REST_URL=https://your-prod-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_prod_redis_token

# Production settings
ADMIN_EMAILS=admin@eydn.app,support@eydn.app
CRON_SECRET=your_secure_prod_cron_secret
RESEND_API_KEY=your_prod_resend_key
```

## Vercel Deployment

### Initial Setup

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Login to Vercel
   vercel login
   
   # Link project
   vercel link
   ```

2. **Configure Project Settings**
   ```json
   // vercel.json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm ci",
     "framework": "nextjs",
     "functions": {
       "src/app/api/**/*.ts": {
         "maxDuration": 30
       }
     },
     "crons": [
       {
         "path": "/api/cron/check-deadlines",
         "schedule": "0 9 * * *"
       },
       {
         "path": "/api/cron/backup",
         "schedule": "0 2 * * *"
       },
       {
         "path": "/api/cron/lifecycle",
         "schedule": "0 1 * * *"
       },
       {
         "path": "/api/cron/storage-cleanup",
         "schedule": "0 3 * * 0"
       }
     ]
   }
   ```

3. **Environment Variables**
   ```bash
   # Set production environment variables
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   vercel env add CLERK_SECRET_KEY production
   vercel env add STRIPE_SECRET_KEY production
   vercel env add ANTHROPIC_API_KEY production
   vercel env add UPSTASH_REDIS_REST_URL production
   vercel env add UPSTASH_REDIS_REST_TOKEN production
   ```

### Deployment Process

#### Automatic Deployment

```yaml
# Automatic deployment on push to main
# Configured in Vercel dashboard:
# - Production: main branch
# - Preview: all other branches
# - Build command: npm run build
# - Install command: npm ci
```

#### Manual Deployment

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# Deploy with specific environment
vercel --prod --env NODE_ENV=production
```

### Build Configuration

```typescript
// next.config.ts - Production optimizations
const nextConfig: NextConfig = {
  // External packages for serverless
  serverExternalPackages: ["ssh2-sftp-client", "ssh2"],
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pnclblivqpakijkerykn.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // ... other allowed domains
    ],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // ... comprehensive security headers
        ],
      },
    ];
  },
};

// Sentry configuration for production monitoring
export default withSentryConfig(analyzer(nextConfig), {
  org: "asymmetric",
  project: "eydn-app",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
```

## Database Deployment

### Supabase Setup

1. **Create Projects**
   ```bash
   # Development
   supabase projects create eydn-dev --org your-org
   
   # Staging
   supabase projects create eydn-staging --org your-org
   
   # Production
   supabase projects create eydn-prod --org your-org
   ```

2. **Link Local Development**
   ```bash
   # Link to development project
   supabase link --project-ref your-dev-project-ref
   
   # Generate types
   supabase gen types typescript --local > src/lib/supabase/types.ts
   ```

3. **Deploy Migrations**
   ```bash
   # Deploy to staging
   supabase db push --project-ref your-staging-project-ref
   
   # Deploy to production
   supabase db push --project-ref your-prod-project-ref
   ```

### Migration Strategy

```bash
# 1. Test migrations locally
supabase db reset

# 2. Deploy to staging
supabase db push --project-ref staging-ref

# 3. Verify staging deployment
npm run test:integration

# 4. Deploy to production (with backup)
supabase db dump --project-ref prod-ref --file backup-$(date +%Y%m%d).sql
supabase db push --project-ref prod-ref

# 5. Verify production deployment
curl https://eydn.app/api/health
```

## Third-Party Service Configuration

### Clerk Authentication

1. **Development Setup**
   ```bash
   # Configure development instance
   # - Add localhost:3000 to allowed origins
   # - Set up development webhooks
   # - Configure social providers (optional)
   ```

2. **Production Setup**
   ```bash
   # Configure production instance
   # - Add production domain to allowed origins
   # - Set up production webhooks: https://eydn.app/api/webhooks/clerk
   # - Configure social providers
   # - Enable MFA (recommended)
   ```

### Stripe Payment Processing

1. **Webhook Configuration**
   ```bash
   # Development webhooks (using Stripe CLI)
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   
   # Production webhooks
   # Configure in Stripe dashboard:
   # - Endpoint: https://eydn.app/api/webhooks/stripe
   # - Events: checkout.session.completed, invoice.payment_succeeded
   ```

2. **Product Configuration**
   ```bash
   # Create products and prices in Stripe dashboard
   # - One-time purchase: $79
   # - Set up tax configuration
   # - Configure customer portal
   ```

### Upstash Redis

1. **Create Redis Instances**
   ```bash
   # Development Redis
   # - Create database in Upstash console
   # - Configure for development workload
   
   # Production Redis
   # - Create database in Upstash console
   # - Configure for production workload with persistence
   # - Set up monitoring and alerts
   ```

## Monitoring and Observability

### Sentry Configuration

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://your-dsn@sentry.io/project-id",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enableLogs: true,
  sendDefaultPii: false,
  environment: process.env.NODE_ENV,
});
```

### Health Checks

```typescript
// src/app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    stripe: await checkStripe(),
    clerk: await checkClerk(),
    timestamp: new Date().toISOString(),
  };
  
  const allHealthy = Object.values(checks).every(check => 
    typeof check === 'boolean' ? check : check.status === 'healthy'
  );
  
  return NextResponse.json(checks, { 
    status: allHealthy ? 200 : 503 
  });
}
```

### Monitoring Setup

1. **Vercel Analytics**
   ```typescript
   // Automatically enabled in production
   import { Analytics } from '@vercel/analytics/next';
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     );
   }
   ```

2. **Custom Metrics**
   ```typescript
   // Track business metrics
   import { track } from '@vercel/analytics';
   
   // Track user actions
   track('Wedding Created', { plan: 'trial' });
   track('Payment Completed', { amount: 79 });
   ```

## Security Configuration

### SSL/TLS Setup

```bash
# Automatic SSL with Vercel
# - Certificates automatically provisioned
# - HTTPS redirect enabled by default
# - HSTS headers configured in next.config.ts
```

### Security Headers

```typescript
// Configured in next.config.ts
{
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://pnclblivqpakijkerykn.supabase.co",
    "connect-src 'self' https://pnclblivqpakijkerykn.supabase.co https://api.stripe.com",
    "frame-src 'self' https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
}
```

### API Security

```typescript
// Rate limiting configured in src/proxy.ts
const ROUTE_LIMITS: [string, RLConfig][] = [
  ["/api/public/", { limit: 20, window: "60 s" }],
  ["/api/chat", { limit: 10, window: "60 s" }],
  ["/api/", { limit: 60, window: "60 s" }],
];
```

## Backup and Recovery

### Database Backups

```bash
# Automated backups (configured in Supabase)
# - Point-in-time recovery enabled
# - Daily automated backups
# - 7-day retention for development
# - 30-day retention for production

# Manual backup
supabase db dump --project-ref prod-ref --file backup-$(date +%Y%m%d-%H%M%S).sql

# Restore from backup
supabase db reset --project-ref staging-ref
psql -h your-db-host -U postgres -d postgres -f backup-file.sql
```

### File Storage Backups

```typescript
// Automated via cron job: /api/cron/backup
export async function GET() {
  // Backup critical files to external storage
  // Verify backup integrity
  // Clean up old backups
  // Send backup status notifications
}
```

## Rollback Procedures

### Application Rollback

```bash
# Vercel rollback to previous deployment
vercel rollback

# Or rollback to specific deployment
vercel rollback --url https://eydn-app-abc123.vercel.app
```

### Database Rollback

```bash
# Point-in-time recovery (Supabase)
# 1. Create new database from backup point
# 2. Update application connection strings
# 3. Verify data integrity
# 4. Switch traffic to new database

# Migration rollback
supabase migration repair --status reverted
```

## Performance Optimization

### Build Optimization

```bash
# Analyze bundle size
npm run analyze

# Build with optimizations
npm run build

# Verify build output
ls -la .next/static/chunks/
```

### CDN Configuration

```typescript
// Automatic via Vercel Edge Network
// - Global CDN with 100+ edge locations
// - Automatic image optimization
# - Brotli compression
// - HTTP/2 and HTTP/3 support
```

### Caching Strategy

```typescript
// API route caching
export const revalidate = 300; // 5 minutes

// Static page generation
export const dynamic = 'force-static';

// Database query caching
const cached = await redis.get(`wedding:${userId}`);
if (cached) return JSON.parse(cached);
```

## Troubleshooting

### Common Deployment Issues

#### 1. Build Failures

```bash
# Check build logs
vercel logs

# Local build test
npm run build

# Clear cache and rebuild
rm -rf .next node_modules
npm ci
npm run build
```

#### 2. Environment Variable Issues

```bash
# Verify environment variables
vercel env ls

# Test environment variable access
vercel env pull .env.local
```

#### 3. Database Connection Issues

```bash
# Test database connectivity
npx supabase status

# Check connection string
echo $NEXT_PUBLIC_SUPABASE_URL
```

#### 4. Third-Party Service Issues

```bash
# Test Clerk configuration
curl -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  https://api.clerk.dev/v1/users

# Test Stripe configuration
curl -u $STRIPE_SECRET_KEY: \
  https://api.stripe.com/v1/customers

# Test Redis connectivity
curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  $UPSTASH_REDIS_REST_URL/ping
```

### Performance Issues

```bash
# Monitor performance
vercel logs --follow

# Check Core Web Vitals
# - Available in Vercel Analytics dashboard
# - Monitor LCP, FID, CLS metrics

# Database performance
# - Monitor slow queries in Supabase dashboard
# - Check connection pool usage
```

## Maintenance Procedures

### Regular Maintenance

```bash
# Weekly tasks
- Review error logs in Sentry
- Check performance metrics in Vercel Analytics
- Verify backup integrity
- Update dependencies (security patches)

# Monthly tasks
- Review and rotate API keys
- Analyze usage patterns and costs
- Update documentation
- Performance optimization review

# Quarterly tasks
- Security audit
- Dependency major version updates
- Infrastructure cost optimization
- Disaster recovery testing
```

### Security Updates

```bash
# Check for security updates
npm audit

# Update dependencies
npm update

# Deploy security updates
git add package*.json
git commit -m "security: update dependencies"
git push origin main
```

This deployment guide ensures reliable, secure, and scalable deployment of the eydn platform across all environments.