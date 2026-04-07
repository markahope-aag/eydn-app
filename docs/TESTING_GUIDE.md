# Testing Guide

This guide covers testing practices, configuration, and procedures for the eydn wedding planning platform.

## Overview

The eydn platform uses a comprehensive testing strategy with **388 tests across 35 test files**, covering unit tests, integration tests, and API route testing.

### Testing Stack

- **Framework**: Vitest 4.1.0 with jsdom environment
- **React Testing**: React Testing Library 16.3.2
- **Coverage**: V8 coverage provider with detailed reports
- **Setup**: `src/test/setup.ts` configures test environment
- **CI Integration**: Tests run on every push and pull request

## Test Configuration

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Test Setup

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
```

## Running Tests

### Local Development

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test src/lib/validation.test.ts

# Run tests matching pattern
npm run test -- --grep "authentication"
```

### CI/CD Integration

Tests automatically run in GitHub Actions on:
- Every push to `master`
- Every pull request
- Manual workflow dispatch

```yaml
# .github/workflows/ci.yml
- name: Run Tests
  run: npm run test -- --coverage
  
- name: Upload Coverage
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
```

## Test Categories

### 1. Unit Tests

Test individual functions and utilities in isolation.

**Location**: `src/lib/**/*.test.ts`

**Example**:
```typescript
// src/lib/validation.test.ts
import { describe, it, expect } from "vitest";
import { isValidEmail, pickFields, escapeHtml } from "./validation";

describe("isValidEmail", () => {
  it("accepts valid email addresses", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("first.last@sub.domain.org")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@missing-local.com")).toBe(false);
  });

  it("rejects strings longer than 320 characters", () => {
    const longEmail = "a".repeat(310) + "@example.com";
    expect(isValidEmail(longEmail)).toBe(false);
  });
});
```

### 2. Component Tests

Test React components in isolation with proper mocking.

**Location**: `src/components/**/*.test.tsx`

**Example**:
```typescript
// src/components/ConfirmDialog.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders with correct title and message', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete Task"
        message="Are you sure you want to delete this task?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Delete Task')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this task?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Delete Task"
        message="Confirm deletion"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
```

### 3. API Route Tests

Test API endpoints with proper mocking of external services.

**Location**: `src/app/api/**/*.test.ts`

**Example**:
```typescript
// src/app/api/guests/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getWeddingForUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdmin: vi.fn(),
}));

describe('POST /api/guests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a guest successfully', async () => {
    // Mock successful authentication
    const mockAuth = {
      wedding: { id: 'wedding-123' },
      supabase: {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'guest-123', name: 'John Doe' }],
              error: null,
            }),
          }),
        }),
      },
      userId: 'user-123',
      role: 'owner',
    };

    vi.mocked(getWeddingForUser).mockResolvedValue(mockAuth);

    const request = new Request('http://localhost/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        rsvp_status: 'pending',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.guest.name).toBe('John Doe');
  });
});
```

### 4. Integration Tests

Test complete workflows and feature interactions.

**Location**: `src/lib/**/*.integration.test.ts`

**Example**:
```typescript
// src/lib/validation.integration.test.ts
import { describe, it, expect } from "vitest";
import { safeParseJSON, pickFields, requireFields } from "./validation";

describe("Validation Integration", () => {
  it("handles complete API request validation flow", async () => {
    const mockRequest = new Request("http://localhost/test", {
      method: "POST",
      body: JSON.stringify({
        name: "John Doe",
        email: "john@example.com",
        extra_field: "should_be_removed",
        malicious_script: "<script>alert('xss')</script>",
      }),
      headers: { "Content-Type": "application/json" },
    });

    // Parse JSON safely
    const body = await safeParseJSON(mockRequest);
    expect(body).not.toBeInstanceOf(Response);

    // Pick only allowed fields
    const allowedFields = pickFields(body, ["name", "email"]);
    expect(allowedFields).toEqual({
      name: "John Doe",
      email: "john@example.com",
    });
    expect(allowedFields).not.toHaveProperty("extra_field");
    expect(allowedFields).not.toHaveProperty("malicious_script");

    // Validate required fields
    const missingField = requireFields(allowedFields, ["name", "email", "phone"]);
    expect(missingField).toBe("phone");
  });
});
```

## Testing Best Practices

### 1. Test Organization

```typescript
// Group related tests
describe("Authentication", () => {
  describe("getWeddingForUser", () => {
    it("returns wedding for owner", () => {
      // Test owner access
    });

    it("returns wedding for collaborator", () => {
      // Test collaborator access
    });

    it("rejects unauthorized user", () => {
      // Test unauthorized access
    });
  });
});
```

### 2. Mocking External Dependencies

```typescript
// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdmin: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  }),
}));

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
}));

// Mock Next.js
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));
```

### 3. Test Data Management

```typescript
// Create test data factories
export const createMockWedding = (overrides = {}) => ({
  id: 'wedding-123',
  user_id: 'user-123',
  partner1_name: 'Alice',
  partner2_name: 'Bob',
  date: '2024-06-15',
  venue: 'Test Venue',
  ...overrides,
});

export const createMockGuest = (overrides = {}) => ({
  id: 'guest-123',
  wedding_id: 'wedding-123',
  name: 'John Doe',
  email: 'john@example.com',
  rsvp_status: 'pending',
  ...overrides,
});
```

### 4. Async Testing

```typescript
// Test async operations
it("handles async API calls", async () => {
  const promise = apiCall();
  
  // Test loading state
  expect(screen.getByText("Loading...")).toBeInTheDocument();
  
  // Wait for completion
  await promise;
  
  // Test final state
  expect(screen.getByText("Success")).toBeInTheDocument();
});
```

## Coverage Requirements

### Current Coverage

- **Total Tests**: 388 tests across 35 files
- **Target Coverage**: 80% line coverage minimum
- **Critical Paths**: 95% coverage required for:
  - Authentication (`src/lib/auth.ts`)
  - Validation (`src/lib/validation.ts`)
  - Payment processing (`src/lib/stripe.ts`)
  - API routes (`src/app/api/**/route.ts`)

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Check coverage thresholds
npm run test -- --coverage --reporter=json
```

## Debugging Tests

### Common Issues

#### 1. Test Environment Setup

```typescript
// Ensure proper test environment
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";

// Add global test utilities
global.fetch = vi.fn();
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

#### 2. Mock Cleanup

```typescript
// Clean up mocks between tests
import { beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

#### 3. Async Test Debugging

```typescript
// Debug async operations
it("handles async operation", async () => {
  const result = await someAsyncFunction();
  
  // Add debugging
  console.log("Result:", result);
  
  // Wait for DOM updates
  await waitFor(() => {
    expect(screen.getByText("Expected text")).toBeInTheDocument();
  });
});
```

### Test Debugging Tools

```bash
# Run tests with verbose output
npm run test -- --reporter=verbose

# Run single test file with debugging
npm run test -- --reporter=verbose src/lib/auth.test.ts

# Debug specific test
npm run test -- --grep "should authenticate user"
```

## Continuous Integration

### GitHub Actions Integration

The test suite runs automatically in CI with:

- **Node.js 20** environment
- **PostgreSQL** test database
- **Coverage reporting** with artifact upload
- **Parallel test execution** for faster builds

### CI Test Commands

```yaml
# Install dependencies
- run: npm ci

# Run tests with coverage
- run: npm run test -- --coverage --reporter=json

# Upload coverage artifacts
- uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
```

## Writing New Tests

### 1. Test File Structure

```typescript
// src/lib/new-feature.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { newFeature } from './new-feature';

describe('newFeature', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('when given valid input', () => {
    it('should return expected result', () => {
      // Test implementation
    });
  });

  describe('when given invalid input', () => {
    it('should throw appropriate error', () => {
      // Test error cases
    });
  });
});
```

### 2. API Route Test Template

```typescript
// src/app/api/new-endpoint/route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from './route';

vi.mock('@/lib/auth');
vi.mock('@/lib/supabase/server');

describe('/api/new-endpoint', () => {
  describe('GET', () => {
    it('returns data for authenticated user', async () => {
      // Mock authentication
      // Create request
      // Call handler
      // Assert response
    });
  });

  describe('POST', () => {
    it('creates new resource', async () => {
      // Test creation
    });

    it('validates input data', async () => {
      // Test validation
    });
  });
});
```

### 3. Component Test Template

```typescript
// src/components/NewComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NewComponent } from './NewComponent';

describe('NewComponent', () => {
  it('renders correctly', () => {
    render(<NewComponent />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    const onAction = vi.fn();
    render(<NewComponent onAction={onAction} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalled();
  });
});
```

## Performance Testing

### Test Performance Monitoring

```typescript
// Monitor test execution time
it('should complete within reasonable time', async () => {
  const start = Date.now();
  
  await someExpensiveOperation();
  
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(1000); // Should complete within 1 second
});
```

### Memory Leak Detection

```typescript
// Test for memory leaks in components
it('should not leak memory', () => {
  const { unmount } = render(<ComponentWithListeners />);
  
  // Component should clean up listeners
  unmount();
  
  // Verify cleanup (implementation depends on component)
  expect(global.eventListeners).toHaveLength(0);
});
```

## Troubleshooting

### Common Test Failures

#### 1. Path Resolution Issues

```bash
# Error: Cannot find module
Error: Cannot find module '/@fs/D:/projects/eydn-app/src/test/setup.ts'

# Solution: Use relative paths in vitest.config.ts
setupFiles: ["./src/test/setup.ts"] // Not path.resolve()
```

#### 2. Mock Issues

```typescript
// Error: Module not mocked properly
// Solution: Ensure mocks are properly configured
vi.mock('@/lib/auth', () => ({
  getWeddingForUser: vi.fn().mockResolvedValue({
    wedding: { id: 'test' },
    supabase: mockSupabase,
    userId: 'test-user',
    role: 'owner',
  }),
}));
```

#### 3. Async Test Timeouts

```typescript
// Increase timeout for slow tests
it('handles slow operation', async () => {
  // ... test implementation
}, 10000); // 10 second timeout
```

### Getting Help

- **Documentation**: Check this guide and Vitest documentation
- **Issues**: Create GitHub issues for test-related bugs
- **Discussions**: Use GitHub discussions for testing questions
- **Support**: Contact the development team for complex testing scenarios

This testing guide ensures comprehensive test coverage and maintains code quality throughout the development process.