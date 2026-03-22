# Troubleshooting Guide

This guide covers common issues, solutions, and debugging procedures for the eydn wedding planning platform.

## Quick Reference

### Common Issues
- [Authentication Problems](#authentication-issues)
- [Database Connection Issues](#database-issues)
- [Premium Feature Access](#premium-feature-issues)
- [Collaboration Issues](#collaboration-issues)
- [Build and Deployment Problems](#build-deployment-issues)
- [Performance Issues](#performance-issues)

### Emergency Contacts
- **Technical Issues**: dev@eydn.com
- **User Support**: support@eydn.com
- **Security Issues**: security@eydn.com

## Authentication Issues

### Problem: User Cannot Sign In

#### Symptoms
- Login form shows "Invalid credentials" error
- User redirected back to login page after entering credentials
- Session expires immediately after login

#### Diagnosis
```bash
# Check Clerk configuration
npx @clerk/nextjs doctor

# Verify environment variables
echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
echo $CLERK_SECRET_KEY
```

#### Solutions

**1. Verify Clerk Configuration**
```env
# Ensure correct Clerk keys in .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**2. Check Domain Configuration**
- Verify domain is added to Clerk dashboard
- Ensure redirect URLs are configured correctly
- Check for CORS issues in browser console

**3. Clear Browser Data**
```javascript
// Clear localStorage and cookies
localStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

### Problem: Session Expires Unexpectedly

#### Symptoms
- User logged out randomly during session
- API calls return 401 Unauthorized
- Dashboard redirects to login page

#### Solutions

**1. Check Session Configuration**
```typescript
// Verify session timeout settings in Clerk
// Default: 7 days for web, 30 days for mobile
```

**2. Verify Middleware Configuration**
```typescript
// src/proxy.ts should have correct matcher
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

**3. Check for Clock Skew**
- Ensure server and client clocks are synchronized
- Check for timezone issues in JWT validation

## Database Issues

### Problem: Database Connection Failed

#### Symptoms
- API routes return 500 Internal Server Error
- "Connection refused" errors in logs
- Supabase client initialization fails

#### Diagnosis
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     https://YOUR_PROJECT.supabase.co/rest/v1/weddings

# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### Solutions

**1. Verify Supabase Configuration**
```env
# Ensure correct Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**2. Check RLS Policies**
```sql
-- Verify RLS policies are not blocking access
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

**3. Test Database Migration**
```bash
# Reset database and run migrations
supabase db reset
supabase db push
```

### Problem: Row Level Security Blocking Access

#### Symptoms
- API returns empty results for authenticated user
- Database queries return no rows despite data existing
- "Insufficient privileges" errors

#### Solutions

**1. Check RLS Policy Implementation**
```sql
-- Example: Verify wedding access policy
SELECT * FROM weddings WHERE user_id = 'current_user_id';

-- Check if user is in collaborators table
SELECT * FROM wedding_collaborators WHERE user_id = 'current_user_id';
```

**2. Debug Authentication Context**
```typescript
// Add logging to getWeddingForUser function
console.log('Auth check:', { userId, email });
console.log('Direct ownership query result:', owned);
console.log('Collaboration query result:', collab);
```

**3. Verify Service Role Usage**
```typescript
// Ensure service role is used for admin operations
const supabase = createSupabaseAdmin(); // Uses service role key
```

## Premium Feature Issues

### Problem: Premium Features Not Working Despite Payment

#### Symptoms
- User paid but still sees paywall
- AI chat returns 403 Forbidden
- File uploads fail with premium error

#### Diagnosis
```bash
# Check subscription status
curl -H "Authorization: Bearer USER_TOKEN" \
     http://localhost:3000/api/subscription-status
```

#### Solutions

**1. Verify Payment Record**
```sql
-- Check subscriber_purchases table
SELECT * FROM subscriber_purchases 
WHERE user_id = 'USER_ID' AND status = 'active';
```

**2. Check Stripe Webhook Processing**
```typescript
// Verify webhook endpoint received payment
// Check cron_log table for webhook processing errors
SELECT * FROM cron_log WHERE job_name = 'stripe_webhook';
```

**3. Clear Subscription Cache**
```typescript
// Force refresh subscription status
const status = await getSubscriptionStatus();
console.log('Current status:', status);
```

### Problem: Trial Period Not Working

#### Symptoms
- New users immediately hit paywall
- Trial days remaining shows 0
- Premium features blocked for trial users

#### Solutions

**1. Check Trial Configuration**
```typescript
// Verify TRIAL_DAYS constant in subscription.ts
const TRIAL_DAYS = 14; // Should be 14 days
```

**2. Verify Trial Start Date**
```sql
-- Check wedding trial_started_at field
SELECT user_id, trial_started_at, created_at 
FROM weddings WHERE user_id = 'USER_ID';
```

**3. Debug Trial Calculation**
```typescript
// Add logging to computeTrialStatus function
console.log('Trial calculation:', {
  trialStart,
  trialEnd,
  now,
  daysLeft
});
```

## Collaboration Issues

### Problem: Invited User Cannot Access Wedding

#### Symptoms
- Invited user sees "Wedding not found" error
- Collaborator invitation shows as pending
- Auto-accept not working

#### Solutions

**1. Verify Email Matching**
```sql
-- Check if invitation email matches user's email
SELECT wc.email, u.email_address 
FROM wedding_collaborators wc
JOIN users u ON u.id = 'USER_ID'
WHERE wc.id = 'INVITATION_ID';
```

**2. Check Auto-Accept Logic**
```typescript
// Debug auto-accept in getWeddingForUser
console.log('Checking pending invites for email:', email);
console.log('Found pending invite:', pending);
```

**3. Manual Invitation Accept**
```sql
-- Manually accept invitation if auto-accept fails
UPDATE wedding_collaborators 
SET user_id = 'USER_ID', invite_status = 'accepted'
WHERE email = 'user@example.com' AND invite_status = 'pending';
```

### Problem: Collaborator Permissions Not Working

#### Symptoms
- Partner cannot access certain features
- Coordinator sees owner-only options
- Role restrictions not enforced

#### Solutions

**1. Verify Role Assignment**
```typescript
// Check role returned by getWeddingForUser
const { role } = await getWeddingForUser();
console.log('User role:', role);
```

**2. Check Permission Logic**
```typescript
// Verify role-based restrictions in API routes
if (role !== "owner") {
  return NextResponse.json({ error: "Owner access required" }, { status: 403 });
}
```

## Build and Deployment Issues

### Problem: Build Fails with TypeScript Errors

#### Symptoms
- `npm run build` fails with type errors
- Deployment fails on Vercel
- Type checking passes locally but fails in CI

#### Solutions

**1. Update TypeScript Configuration**
```bash
# Regenerate Supabase types
supabase gen types typescript --local > src/lib/supabase/types.ts
```

**2. Check Type Imports**
```typescript
// Ensure correct type imports
import type { Database } from '@/lib/supabase/types';
```

**3. Clear Build Cache**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Problem: Environment Variables Not Loading

#### Symptoms
- API calls fail with undefined environment variables
- Build process cannot find required variables
- Features work locally but fail in production

#### Solutions

**1. Verify Environment Variable Names**
```bash
# Check for typos in variable names
grep -r "process.env" src/
```

**2. Check Vercel Configuration**
- Ensure all environment variables are set in Vercel dashboard
- Verify variable names match exactly (case-sensitive)
- Check for missing NEXT_PUBLIC_ prefix for client-side variables

**3. Validate Environment Loading**
```typescript
// Add logging to verify environment variables
console.log('Environment check:', {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
  clerkKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Set' : 'Missing',
  stripeKey: process.env.STRIPE_SECRET_KEY ? 'Set' : 'Missing'
});
```

## Performance Issues

### Problem: Slow Page Load Times

#### Symptoms
- Dashboard takes >3 seconds to load
- API responses are slow
- Database queries timeout

#### Diagnosis
```bash
# Analyze bundle size
npm run analyze

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/tasks"
```

#### Solutions

**1. Optimize Database Queries**
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_tasks_wedding_id ON tasks(wedding_id);
CREATE INDEX idx_guests_wedding_id ON guests(wedding_id);
CREATE INDEX idx_vendors_wedding_id ON vendors(wedding_id);
```

**2. Implement Caching**
```typescript
// Add response caching to API routes
export async function GET() {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=300' // 5 minutes
    }
  });
}
```

**3. Optimize Bundle Size**
```typescript
// Use dynamic imports for large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />
});
```

### Problem: Memory Leaks or High Memory Usage

#### Symptoms
- Application crashes with out-of-memory errors
- Memory usage increases over time
- Slow performance after extended use

#### Solutions

**1. Check for Memory Leaks**
```typescript
// Monitor memory usage
console.log('Memory usage:', process.memoryUsage());

// Check for unclosed database connections
// Ensure Supabase client is properly managed
```

**2. Optimize Large Data Sets**
```typescript
// Implement pagination for large lists
const { data, error } = await supabase
  .from('guests')
  .select('*')
  .range(offset, offset + limit - 1);
```

**3. Clean Up Resources**
```typescript
// Ensure proper cleanup in useEffect
useEffect(() => {
  const subscription = supabase
    .channel('changes')
    .subscribe();
    
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

## API Issues

### Problem: Rate Limiting Blocking Requests

#### Symptoms
- API returns 429 Too Many Requests
- Users cannot perform actions
- Rate limit headers in response

#### Solutions

**1. Check Rate Limit Configuration**
```typescript
// Verify rate limits in rate-limit.ts
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"), // Adjust as needed
});
```

**2. Implement Exponential Backoff**
```typescript
// Add retry logic with backoff
async function retryWithBackoff(fn: Function, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

**3. Monitor Rate Limit Usage**
```bash
# Check Upstash Redis dashboard for rate limit metrics
# Monitor API usage patterns
```

## Data Issues

### Problem: Data Corruption or Inconsistency

#### Symptoms
- Missing or incorrect data in database
- Foreign key constraint violations
- Data appears in some views but not others

#### Solutions

**1. Check Data Integrity**
```sql
-- Verify foreign key relationships
SELECT * FROM tasks WHERE wedding_id NOT IN (SELECT id FROM weddings);
SELECT * FROM guests WHERE wedding_id NOT IN (SELECT id FROM weddings);
```

**2. Run Data Validation**
```sql
-- Check for orphaned records
SELECT 'tasks' as table_name, COUNT(*) as orphaned_count
FROM tasks t LEFT JOIN weddings w ON t.wedding_id = w.id 
WHERE w.id IS NULL
UNION ALL
SELECT 'guests', COUNT(*)
FROM guests g LEFT JOIN weddings w ON g.wedding_id = w.id 
WHERE w.id IS NULL;
```

**3. Restore from Backup**
```bash
# If data corruption is severe, restore from backup
supabase db dump --file backup.sql
# Review and restore specific data
```

## Debugging Tools

### Logging and Monitoring

#### Enable Debug Logging
```typescript
// Add comprehensive logging
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('[DEBUG]', 'Function called with:', parameters);
}
```

#### Database Query Logging
```typescript
// Enable Supabase query logging
const supabase = createClient(url, key, {
  auth: { debug: true },
  db: { schema: 'public' },
  global: { headers: { 'x-debug': 'true' } }
});
```

### Testing Tools

#### API Testing
```bash
# Test API endpoints with curl
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/tasks

# Test with different user roles
curl -X POST \
  -H "Authorization: Bearer COLLABORATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","role":"partner"}' \
  http://localhost:3000/api/collaborators
```

#### Database Testing
```sql
-- Test RLS policies
SET request.jwt.claim.sub = 'test_user_id';
SELECT * FROM weddings; -- Should only return user's weddings
```

## Getting Help

### Documentation Resources
- [API Documentation](API.md) - Complete API reference
- [Architecture Guide](ARCHITECTURE.md) - System architecture overview
- [Development Guide](DEVELOPMENT.md) - Setup and development instructions
- [Security Guide](SECURITY.md) - Security measures and compliance

### Support Channels
- **GitHub Issues**: Report bugs and feature requests
- **Email Support**: support@eydn.com for user issues
- **Developer Support**: dev@eydn.com for technical questions
- **Security Issues**: security@eydn.com for security concerns

### Community Resources
- **GitHub Discussions**: Community Q&A and feature discussions
- **Documentation**: Always refer to the latest documentation
- **Changelog**: Check recent changes for known issues

## Preventive Measures

### Regular Maintenance
- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies and run security audits
- **Quarterly**: Review and update documentation
- **Annually**: Comprehensive security audit and penetration testing

### Monitoring Setup
- **Error Tracking**: Implement comprehensive error monitoring
- **Performance Monitoring**: Track API response times and database performance
- **User Feedback**: Monitor user-reported issues and feature requests
- **Security Monitoring**: Track authentication failures and suspicious activity

This troubleshooting guide is regularly updated based on common issues and user feedback. If you encounter an issue not covered here, please report it to help improve this documentation.