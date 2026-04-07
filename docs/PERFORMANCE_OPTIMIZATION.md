# Performance Optimization Guide

This guide covers performance optimization strategies, monitoring, and best practices for the eydn wedding planning platform.

## Overview

The eydn platform is built for performance with Next.js 16, React 19, and serverless architecture. This guide provides specific optimization techniques and monitoring strategies to ensure optimal user experience.

## Current Performance Status

### Strengths
- ✅ Modern Next.js 16 + React 19 architecture
- ✅ Server components and streaming
- ✅ Redis-backed rate limiting with memory fallback
- ✅ In-memory wedding data caching (60s TTL)
- ✅ Image optimization with Next.js Image component
- ✅ Bundle analysis configured

### Areas for Improvement
- 🟡 Chat API context building (23 parallel queries)
- 🟡 N+1 query patterns in some routes
- 🟡 Missing database composite indexes
- 🟡 No Redis caching for frequently accessed data
- 🟡 Bundle size optimization opportunities

## Frontend Performance Optimization

### 1. Code Splitting and Lazy Loading

#### Current Implementation
```typescript
// src/app/dashboard/layout.tsx - Good example
const TasksPage = dynamic(() => import("./tasks/page"), {
  loading: () => <div>Loading tasks...</div>,
});
```

#### Recommended Improvements
```typescript
// Lazy load heavy components
const ExcelExport = lazy(() => import('./components/ExcelExport'));
const PDFExport = lazy(() => import('./components/PDFExport'));
const MoodBoard = lazy(() => import('./components/MoodBoard'));

// Use Suspense for better loading states
<Suspense fallback={<ComponentSkeleton />}>
  <ExcelExport data={guestData} />
</Suspense>
```

#### Route-Level Code Splitting
```typescript
// Split large pages into smaller chunks
// src/app/dashboard/guests/page.tsx (985 lines - should be split)

// Split into:
// - GuestList component
// - GuestForm component  
// - GuestImport component
// - GuestExport component

const GuestList = dynamic(() => import('./components/GuestList'));
const GuestForm = dynamic(() => import('./components/GuestForm'));
```

### 2. Bundle Optimization

#### Current Bundle Analysis
```bash
# Run bundle analysis
npm run analyze

# Check current bundle size
du -sh .next/static/chunks/
```

#### Optimization Strategies
```typescript
// 1. Tree shake unused imports
// Instead of:
import * as Icons from 'lucide-react';

// Use:
import { Calendar, Users, DollarSign } from 'lucide-react';

// 2. Dynamic imports for large libraries
const ExcelJS = await import('exceljs');
const jsPDF = await import('jspdf');

// 3. Optimize third-party libraries
// Use lighter alternatives where possible
```

#### Bundle Size Targets
```typescript
// Target bundle sizes
const BUNDLE_TARGETS = {
  'main': '200KB',      // Main application bundle
  'vendor': '300KB',    // Third-party libraries
  'pages': '50KB',      // Individual page bundles
  'chunks': '100KB',    // Shared chunks
};
```

### 3. Image Optimization

#### Current Implementation
```typescript
// next.config.ts - Already well configured
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "pnclblivqpakijkerykn.supabase.co",
      pathname: "/storage/v1/object/public/**",
    },
    // ... other domains
  ],
}
```

#### Additional Optimizations
```typescript
// Use proper image sizing
<Image
  src={imageUrl}
  alt="Wedding photo"
  width={400}
  height={300}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={isAboveFold}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>

// Implement progressive loading for galleries
const [visibleImages, setVisibleImages] = useState(12);
const loadMoreImages = useCallback(() => {
  setVisibleImages(prev => prev + 12);
}, []);
```

### 4. Component Performance

#### Memoization Strategies
```typescript
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return calculateBudgetBreakdown(expenses);
}, [expenses]);

// Memoize callback functions
const handleGuestUpdate = useCallback((guestId: string, updates: Partial<Guest>) => {
  updateGuest(guestId, updates);
}, [updateGuest]);

// Memoize components with React.memo
const GuestListItem = React.memo(({ guest, onUpdate }: GuestListItemProps) => {
  return (
    <div className="guest-item">
      {/* Component content */}
    </div>
  );
});
```

#### Virtualization for Large Lists
```typescript
// For large guest lists (100+ guests)
import { FixedSizeList as List } from 'react-window';

const GuestList = ({ guests }: { guests: Guest[] }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <GuestListItem guest={guests[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={guests.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

## Backend Performance Optimization

### 1. Database Query Optimization

#### Current Issues
```typescript
// src/app/api/chat/route.ts - 23 parallel queries
const [
  { count: taskTotal },
  { count: taskCompleted },
  { data: expenses },
  // ... 20 more queries
] = await Promise.all([
  supabase.from("tasks").select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id),
  // ... more queries
]);
```

#### Optimized Approach
```typescript
// Selective context loading based on chat history
const buildSelectiveContext = async (weddingId: string, messageHistory: ChatMessage[]) => {
  const needsTasks = messageHistory.some(m => 
    m.content.toLowerCase().includes('task') || 
    m.content.toLowerCase().includes('timeline')
  );
  
  const needsVendors = messageHistory.some(m => 
    m.content.toLowerCase().includes('vendor') || 
    m.content.toLowerCase().includes('photographer')
  );

  const queries = [];
  
  if (needsTasks) {
    queries.push(
      supabase.from("tasks")
        .select("id, title, completed, due_date, category")
        .eq("wedding_id", weddingId)
        .limit(10)
    );
  }
  
  if (needsVendors) {
    queries.push(
      supabase.from("vendors")
        .select("id, name, category, status")
        .eq("wedding_id", weddingId)
        .limit(5)
    );
  }

  return Promise.all(queries);
};
```

#### Database Indexing
```sql
-- Add composite indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_guests_wedding_active 
ON guests(wedding_id, created_at) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_tasks_wedding_status 
ON tasks(wedding_id, completed, due_date) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_vendors_wedding_category 
ON vendors(wedding_id, category, status) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_expenses_wedding_category 
ON expenses(wedding_id, category, paid) WHERE deleted_at IS NULL;

-- Partial indexes for common filters
CREATE INDEX CONCURRENTLY idx_guests_pending_rsvp 
ON guests(wedding_id, created_at) 
WHERE rsvp_status = 'pending' AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_tasks_overdue 
ON tasks(wedding_id, due_date) 
WHERE completed = false AND due_date < CURRENT_DATE AND deleted_at IS NULL;
```

### 2. Caching Strategy Implementation

#### Redis Caching Layer
```typescript
// src/lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export class CacheManager {
  private static instance: CacheManager;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new CacheManager();
    }
    return this.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached as string) : null;
    } catch (error) {
      console.warn('[CACHE] Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.warn('[CACHE] Redis set error:', error);
    }
  }

  async invalidate(pattern: string) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.warn('[CACHE] Redis invalidate error:', error);
    }
  }
}

// Usage in API routes
export async function getCachedWedding(userId: string) {
  const cache = CacheManager.getInstance();
  const cacheKey = `wedding:${userId}`;
  
  let wedding = await cache.get<Wedding>(cacheKey);
  if (wedding) return wedding;
  
  wedding = await fetchWeddingFromDB(userId);
  if (wedding) {
    await cache.set(cacheKey, wedding, 300); // 5 minutes
  }
  
  return wedding;
}
```

#### API Response Caching
```typescript
// Add caching headers to API responses
export async function GET() {
  const data = await fetchData();
  
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'CDN-Cache-Control': 'public, s-maxage=3600',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=3600',
    }
  });
}

// Static data caching
export const revalidate = 3600; // 1 hour for static data
export const dynamic = 'force-static'; // For truly static content
```

### 3. API Route Optimization

#### Batch Operations
```typescript
// src/app/api/guests/batch/route.ts
export async function POST(request: Request) {
  const { operations } = await request.json();
  
  // Batch multiple operations into single transaction
  const { data, error } = await supabase.rpc('batch_guest_operations', {
    operations: operations,
    wedding_id: wedding.id
  });
  
  if (error) throw error;
  
  // Invalidate related caches
  await cache.invalidate(`guests:${wedding.id}:*`);
  
  return NextResponse.json({ success: true, results: data });
}
```

#### Connection Pooling
```typescript
// src/lib/supabase/server.ts - Optimize connection usage
export function createSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: {
        schema: 'public',
      },
      global: {
        headers: { 'x-client-info': 'eydn-app' },
      },
      // Connection pooling configuration
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );
}
```

## Performance Monitoring

### 1. Core Web Vitals Tracking

#### Vercel Analytics Integration
```typescript
// src/app/layout.tsx - Already implemented
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

#### Custom Performance Tracking
```typescript
// src/lib/performance.ts
export class PerformanceTracker {
  static trackPageLoad(pageName: string) {
    if (typeof window !== 'undefined') {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      const metrics = {
        page: pageName,
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      };
      
      // Send to analytics
      this.sendMetrics('page_load', metrics);
    }
  }

  static trackAPICall(endpoint: string, duration: number, success: boolean) {
    const metrics = {
      endpoint,
      duration,
      success,
      timestamp: Date.now(),
    };
    
    this.sendMetrics('api_call', metrics);
  }

  private static sendMetrics(event: string, data: any) {
    // Send to Vercel Analytics
    if (typeof window !== 'undefined' && window.va) {
      window.va('track', event, data);
    }
    
    // Send to Sentry for performance monitoring
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.addBreadcrumb({
        category: 'performance',
        message: event,
        data,
        level: 'info',
      });
    }
  }
}
```

### 2. Database Performance Monitoring

#### Query Performance Tracking
```typescript
// src/lib/db-monitor.ts
export class DatabaseMonitor {
  static async trackQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`[DB] Slow query detected: ${queryName} took ${duration}ms`);
      }
      
      // Track metrics
      PerformanceTracker.trackAPICall(`db:${queryName}`, duration, true);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      PerformanceTracker.trackAPICall(`db:${queryName}`, duration, false);
      throw error;
    }
  }
}

// Usage
const guests = await DatabaseMonitor.trackQuery('fetch_guests', () =>
  supabase.from('guests').select('*').eq('wedding_id', weddingId)
);
```

### 3. Real-time Performance Alerts

#### Performance Budget Configuration
```typescript
// src/lib/performance-budget.ts
export const PERFORMANCE_BUDGETS = {
  // Core Web Vitals targets
  LCP: 2500,  // Largest Contentful Paint (ms)
  FID: 100,   // First Input Delay (ms)
  CLS: 0.1,   // Cumulative Layout Shift

  // API response time targets
  API_RESPONSE_TIME: 500,  // ms
  DB_QUERY_TIME: 200,      // ms
  
  // Bundle size targets
  INITIAL_JS: 200 * 1024,  // 200KB
  TOTAL_JS: 500 * 1024,    // 500KB
};

export function checkPerformanceBudget(metric: string, value: number): boolean {
  const budget = PERFORMANCE_BUDGETS[metric as keyof typeof PERFORMANCE_BUDGETS];
  if (!budget) return true;
  
  const withinBudget = value <= budget;
  
  if (!withinBudget) {
    console.warn(`[PERFORMANCE] Budget exceeded: ${metric} = ${value}, budget = ${budget}`);
    
    // Send alert in production
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service
      sendPerformanceAlert(metric, value, budget);
    }
  }
  
  return withinBudget;
}
```

## Optimization Techniques

### 1. Preloading and Prefetching

#### Link Prefetching
```typescript
// Prefetch critical routes
<Link href="/dashboard/tasks" prefetch={true}>
  Tasks
</Link>

// Preload critical resources
<link rel="preload" href="/fonts/dm-sans.woff2" as="font" type="font/woff2" crossOrigin="" />
<link rel="preload" href="/api/wedding" as="fetch" crossOrigin="" />
```

#### Data Prefetching
```typescript
// Prefetch data for likely next pages
const prefetchTaskData = useCallback(async () => {
  const taskData = await fetch('/api/tasks');
  // Cache in React Query or SWR
}, []);

// Prefetch on hover
<Link 
  href="/dashboard/tasks"
  onMouseEnter={prefetchTaskData}
>
  Tasks
</Link>
```

### 2. Streaming and Progressive Loading

#### Streaming Server Components
```typescript
// src/app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <DashboardHeader />
      
      <Suspense fallback={<TasksSkeleton />}>
        <TasksSection />
      </Suspense>
      
      <Suspense fallback={<VendorsSkeleton />}>
        <VendorsSection />
      </Suspense>
      
      <Suspense fallback={<GuestsSkeleton />}>
        <GuestsSection />
      </Suspense>
    </div>
  );
}
```

#### Progressive Data Loading
```typescript
// Load critical data first, then secondary data
const useDashboardData = () => {
  const [criticalData, setCriticalData] = useState(null);
  const [secondaryData, setSecondaryData] = useState(null);
  
  useEffect(() => {
    // Load critical data immediately
    loadCriticalData().then(setCriticalData);
    
    // Load secondary data after critical data
    setTimeout(() => {
      loadSecondaryData().then(setSecondaryData);
    }, 100);
  }, []);
  
  return { criticalData, secondaryData };
};
```

### 3. Memory Optimization

#### Memory Leak Prevention
```typescript
// Cleanup event listeners and timers
useEffect(() => {
  const handleResize = () => {
    // Handle resize
  };
  
  window.addEventListener('resize', handleResize);
  const interval = setInterval(updateData, 30000);
  
  return () => {
    window.removeEventListener('resize', handleResize);
    clearInterval(interval);
  };
}, []);

// Cleanup subscriptions
useEffect(() => {
  const subscription = supabase
    .channel('wedding-updates')
    .on('postgres_changes', { event: '*', schema: 'public' }, handleUpdate)
    .subscribe();
    
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

#### Efficient State Management
```typescript
// Use useReducer for complex state
const guestReducer = (state: GuestState, action: GuestAction) => {
  switch (action.type) {
    case 'SET_GUESTS':
      return { ...state, guests: action.payload };
    case 'ADD_GUEST':
      return { ...state, guests: [...state.guests, action.payload] };
    case 'UPDATE_GUEST':
      return {
        ...state,
        guests: state.guests.map(guest =>
          guest.id === action.payload.id ? { ...guest, ...action.payload } : guest
        ),
      };
    default:
      return state;
  }
};
```

## Performance Testing

### 1. Load Testing

#### API Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Create load test configuration
# artillery.yml
config:
  target: 'https://eydn.app'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100

scenarios:
  - name: "API Load Test"
    requests:
      - get:
          url: "/api/health"
      - post:
          url: "/api/guests"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            name: "Test Guest"
            email: "test@example.com"

# Run load test
artillery run artillery.yml
```

### 2. Performance Regression Testing

#### Automated Performance Testing
```typescript
// src/tests/performance.test.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('Dashboard loads within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // 3 second budget
    
    // Check Core Web Vitals
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      });
    });
    
    expect(lcp).toBeLessThan(2500); // LCP budget
  });
  
  test('API responses within budget', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/guests');
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(500); // 500ms budget
    expect(response.status()).toBe(200);
  });
});
```

## Optimization Roadmap

### Phase 1: Critical Optimizations (Week 1-2)
1. **Fix N+1 queries** in chat API context building
2. **Add database composite indexes** for common query patterns
3. **Implement selective context loading** for AI chat
4. **Add Redis caching** for frequently accessed data

### Phase 2: Frontend Optimizations (Week 3-4)
1. **Code splitting** for large components
2. **Bundle size optimization** and analysis
3. **Image optimization** improvements
4. **Component memoization** for heavy renders

### Phase 3: Advanced Optimizations (Month 2)
1. **Implement virtualization** for large lists
2. **Add performance monitoring** and alerting
3. **Optimize database queries** with advanced indexing
4. **Implement progressive loading** strategies

### Phase 4: Scaling Optimizations (Month 3)
1. **Database read replicas** for reporting queries
2. **Advanced caching strategies** with cache invalidation
3. **CDN optimization** for global performance
4. **Performance regression testing** automation

## Monitoring and Alerting

### Performance Dashboards
- **Vercel Analytics**: Core Web Vitals and page performance
- **Sentry Performance**: Backend performance and error tracking
- **Supabase Dashboard**: Database performance and query analytics
- **Custom Metrics**: Business-specific performance indicators

### Alert Configuration
```typescript
// Performance alert thresholds
const ALERT_THRESHOLDS = {
  API_RESPONSE_TIME: 1000,    // Alert if > 1s
  ERROR_RATE: 0.05,           // Alert if > 5%
  DATABASE_QUERY_TIME: 500,   // Alert if > 500ms
  MEMORY_USAGE: 0.8,          // Alert if > 80%
  CPU_USAGE: 0.7,             // Alert if > 70%
};
```

This performance optimization guide provides a comprehensive approach to maintaining and improving the performance of the eydn platform as it scales.