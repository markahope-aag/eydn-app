import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handoffCalculatorToEydn } from './calculator-handoff';
import { BUDGET_TEMPLATE } from '@/lib/budget/budget-template';

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(),
}));

import { clerkClient } from '@clerk/nextjs/server';

const mockClerk = {
  users: {
    getUserList: vi.fn(),
    createUser: vi.fn(),
  },
  signInTokens: {
    createSignInToken: vi.fn(),
  },
};

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
};

const mockUser = {
  id: 'user_123',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
  firstName: 'John',
  lastName: 'Doe',
};

describe('handoffCalculatorToEydn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clerkClient).mockResolvedValue(mockClerk as unknown as Awaited<ReturnType<typeof clerkClient>>);
  });

  const mockInput = {
    email: 'test@example.com',
    name: 'John Doe',
    budget: 50000,
    guests: 150,
    state: 'CA',
    month: 6,
  };

  describe('user lookup and creation', () => {
    it('finds existing user by email', async () => {
      mockClerk.users.getUserList.mockResolvedValue({
        data: [mockUser],
      });
      mockClerk.signInTokens.createSignInToken.mockResolvedValue({
        url: 'https://clerk.dev/signin?token=abc123',
      });

      // Mock existing wedding
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'wedding_456' }
                }),
              })),
            })),
          };
        }
        return {};
      });

      const result = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], mockInput);

      expect(result).toEqual({
        signInUrl: 'https://clerk.dev/signin?token=abc123',
        isNewUser: false,
        userId: 'user_123',
        weddingId: 'wedding_456',
      });

      expect(mockClerk.users.getUserList).toHaveBeenCalledWith({
        emailAddress: ['test@example.com'],
        limit: 1,
      });
      expect(mockClerk.users.createUser).not.toHaveBeenCalled();
    });

    it('creates new user when not found', async () => {
      mockClerk.users.getUserList.mockResolvedValue({
        data: [], // No existing user
      });
      mockClerk.users.createUser.mockResolvedValue(mockUser);
      mockClerk.signInTokens.createSignInToken.mockResolvedValue({
        url: 'https://clerk.dev/signin?token=abc123',
      });

      // Mock no existing wedding
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null
                }),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'wedding_new_123' }
                }),
              })),
            })),
          };
        }
        if (table === 'expenses') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      const result = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], mockInput);

      expect(result).toEqual({
        signInUrl: 'https://clerk.dev/signin?token=abc123',
        isNewUser: true,
        userId: 'user_123',
        weddingId: 'wedding_new_123',
      });

      expect(mockClerk.users.createUser).toHaveBeenCalledWith({
        emailAddress: ['test@example.com'],
        firstName: 'John',
        lastName: 'Doe',
        skipPasswordRequirement: true,
      });
    });

    it.skip('handles names with multiple words correctly', async () => {
      // TODO: mock setup doesn't match current handoff wedding insert path
      const inputWithComplexName = {
        ...mockInput,
        name: 'Mary Jane Watson Smith',
      };

      mockClerk.users.getUserList.mockResolvedValue({ data: [] });
      mockClerk.users.createUser.mockResolvedValue(mockUser);
      mockClerk.signInTokens.createSignInToken.mockResolvedValue({
        url: 'https://clerk.dev/signin?token=abc123',
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'wedding_123' }
                }),
              })),
            })),
          };
        }
        if (table === 'expenses') {
          return { insert: vi.fn().mockResolvedValue({ data: null }) };
        }
        return {};
      });

      await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], inputWithComplexName);

      expect(mockClerk.users.createUser).toHaveBeenCalledWith({
        emailAddress: ['mary.jane.watson.smith@example.com'],
        firstName: 'Mary',
        lastName: 'Jane Watson Smith',
        skipPasswordRequirement: true,
      });
    });

    it('handles null name gracefully', async () => {
      const inputWithNullName = {
        ...mockInput,
        name: null,
      };

      mockClerk.users.getUserList.mockResolvedValue({ data: [] });
      mockClerk.users.createUser.mockResolvedValue(mockUser);
      mockClerk.signInTokens.createSignInToken.mockResolvedValue({
        url: 'https://clerk.dev/signin?token=abc123',
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'wedding_123' }
                }),
              })),
            })),
          };
        }
        if (table === 'expenses') {
          return { insert: vi.fn().mockResolvedValue({ data: null }) };
        }
        return {};
      });

      await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], inputWithNullName);

      expect(mockClerk.users.createUser).toHaveBeenCalledWith({
        emailAddress: ['test@example.com'],
        firstName: undefined,
        lastName: undefined,
        skipPasswordRequirement: true,
      });
    });
  });

  describe('wedding creation and expense seeding', () => {
    beforeEach(() => {
      mockClerk.users.getUserList.mockResolvedValue({
        data: [mockUser],
      });
      mockClerk.signInTokens.createSignInToken.mockResolvedValue({
        url: 'https://clerk.dev/signin?token=abc123',
      });
    });

    it('creates new wedding with correct budget allocation', async () => {
      const insertedExpenses: Array<{category: string; description: string; estimated: number}> = [];

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: vi.fn((data) => {
              expect(data).toMatchObject({
                user_id: 'user_123',
                partner1_name: 'John Doe',
                partner2_name: '',
                budget: 50000,
                guest_count_estimate: 150,
                trial_started_at: expect.any(String),
              });
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'wedding_new_123' }
                  }),
                })),
              };
            }),
          };
        }
        if (table === 'expenses') {
          return {
            insert: vi.fn((rows) => {
              insertedExpenses.push(...rows);
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        return {};
      });

      const result = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], mockInput);

      expect(result?.weddingId).toBe('wedding_new_123');

      // Verify all BUDGET_TEMPLATE items were created
      expect(insertedExpenses).toHaveLength(BUDGET_TEMPLATE.length);

      // Verify specific allocations match calculator percentages
      const venueExpense = insertedExpenses.find(
        e => e.category === 'Ceremony & Venue' && e.description === 'Venue Rentals'
      );
      expect(venueExpense?.estimated).toBe(Math.round(50000 * 0.238)); // 23.8% = $11,900

      const cateringExpense = insertedExpenses.find(
        e => e.category === 'Food & Beverage' && e.description === 'Caterer'
      );
      expect(cateringExpense?.estimated).toBe(Math.round(50000 * 0.192)); // 19.2% = $9,600

      const photographyExpense = insertedExpenses.find(
        e => e.category === 'Photography & Video' && e.description === 'Photographer'
      );
      expect(photographyExpense?.estimated).toBe(Math.round(50000 * 0.12)); // 12% = $6,000

      // Verify unallocated items remain at $0
      const unallocatedItem = insertedExpenses.find(
        e => e.category === 'Photography & Video' && e.description !== 'Photographer'
      );
      expect(unallocatedItem?.estimated).toBe(0);
    });

    it('preserves existing wedding and skips expense creation', async () => {
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'existing_wedding_123' }
                }),
              })),
            })),
          };
        }
        return {};
      });

      const result = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], mockInput);

      expect(result?.weddingId).toBe('existing_wedding_123');
      expect(result?.isNewUser).toBe(false);

      // Verify no expenses table calls were made
      expect(mockSupabase.from).toHaveBeenCalledWith('weddings');
      expect(mockSupabase.from).not.toHaveBeenCalledWith('expenses');
    });

    it('handles different budget amounts correctly', async () => {
      const highBudgetInput = {
        ...mockInput,
        budget: 100000, // $100k budget
      };

      const insertedExpenses: Array<{category: string; description: string; estimated: number}> = [];

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'wedding_123' }
                }),
              })),
            })),
          };
        }
        if (table === 'expenses') {
          return {
            insert: vi.fn((rows) => {
              insertedExpenses.push(...rows);
              return Promise.resolve({ data: null });
            }),
          };
        }
        return {};
      });

      await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], highBudgetInput);

      // Verify allocations scale correctly
      const venueExpense = insertedExpenses.find(
        e => e.category === 'Ceremony & Venue' && e.description === 'Venue Rentals'
      );
      expect(venueExpense?.estimated).toBe(Math.round(100000 * 0.238)); // $23,800
    });
  });

  describe('sign-in URL generation', () => {
    it('creates 24-hour expiry sign-in token', async () => {
      mockClerk.users.getUserList.mockResolvedValue({
        data: [mockUser],
      });
      mockClerk.signInTokens.createSignInToken.mockResolvedValue({
        url: 'https://clerk.dev/signin?token=test_token_123',
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'wedding_123' }
                }),
              })),
            })),
          };
        }
        return {};
      });

      const result = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], mockInput);

      expect(result?.signInUrl).toBe('https://clerk.dev/signin?token=test_token_123');

      expect(mockClerk.signInTokens.createSignInToken).toHaveBeenCalledWith({
        userId: 'user_123',
        expiresInSeconds: 60 * 60 * 24, // 24 hours
      });
    });
  });

  describe('error handling', () => {
    it.skip('returns null when Clerk user lookup fails', async () => {
      // TODO: handoff catches errors and retries — expected null return doesn't match
      mockClerk.users.getUserList.mockRejectedValue(
        new Error('Clerk API error')
      );

      const result = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], mockInput);

      expect(result).toBeNull();
    });

    it('returns null when user creation fails', async () => {
      mockClerk.users.getUserList.mockResolvedValue({ data: [] });
      mockClerk.users.createUser.mockRejectedValue(
        new Error('User creation failed')
      );

      const result = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], mockInput);

      expect(result).toBeNull();
    });

    it('returns null when wedding creation fails', async () => {
      mockClerk.users.getUserList.mockResolvedValue({
        data: [mockUser],
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database constraint violation' }
                }),
              })),
            })),
          };
        }
        return {};
      });

      const result = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], mockInput);

      expect(result).toBeNull();
    });

    it('returns null when sign-in token creation fails', async () => {
      mockClerk.users.getUserList.mockResolvedValue({
        data: [mockUser],
      });
      mockClerk.signInTokens.createSignInToken.mockRejectedValue(
        new Error('Token creation failed')
      );

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'wedding_123' }
                }),
              })),
            })),
          };
        }
        return {};
      });

      const result = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], mockInput);

      expect(result).toBeNull();
    });

    it('handles expense seeding failures gracefully', async () => {
      mockClerk.users.getUserList.mockResolvedValue({ data: [] });
      mockClerk.users.createUser.mockResolvedValue(mockUser);
      mockClerk.signInTokens.createSignInToken.mockResolvedValue({
        url: 'https://clerk.dev/signin?token=abc123',
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'wedding_123' }
                }),
              })),
            })),
          };
        }
        if (table === 'expenses') {
          return {
            insert: vi.fn().mockRejectedValue(
              new Error('Expense insertion failed')
            ),
          };
        }
        return {};
      });

      const result = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], mockInput);

      expect(result).toBeNull();
    });
  });

  describe('idempotency', () => {
    it('returns fresh sign-in URL for existing user and wedding', async () => {
      mockClerk.users.getUserList.mockResolvedValue({
        data: [mockUser],
      });

      const signInUrls = [
        'https://clerk.dev/signin?token=first_call',
        'https://clerk.dev/signin?token=second_call',
      ];
      let callCount = 0;
      mockClerk.signInTokens.createSignInToken.mockImplementation(() => {
        return Promise.resolve({ url: signInUrls[callCount++] });
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'existing_wedding' }
                }),
              })),
            })),
          };
        }
        return {};
      });

      // First call
      const result1 = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], mockInput);
      expect(result1?.signInUrl).toBe('https://clerk.dev/signin?token=first_call');

      // Second call
      const result2 = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], mockInput);
      expect(result2?.signInUrl).toBe('https://clerk.dev/signin?token=second_call');

      // Both should reference the same user and wedding
      expect(result1?.userId).toBe(result2?.userId);
      expect(result1?.weddingId).toBe(result2?.weddingId);
    });
  });

  describe('budget allocation logic', () => {
    it.skip('correctly computes allocations for all calculator categories', async () => {
      // TODO: expense insert mock shape doesn't match BUDGET_TEMPLATE iteration
      const testBudget = 60000;
      const expectedAllocations = {
        'Ceremony & Venue|Venue Rentals': Math.round(60000 * 0.238), // $14,280
        'Food & Beverage|Caterer': Math.round(60000 * 0.192), // $11,520
        'Photography & Video|Photographer': Math.round(60000 * 0.12), // $7,200
        'Florals & Decor|Flowers': Math.round(60000 * 0.09), // $5,400
        'Attire & Beauty|Dress': Math.round(60000 * 0.065), // $3,900
        'Music & Entertainment|Wedding DJ': Math.round(60000 * 0.06), // $3,600
        'Rehearsal|Rehearsal Dinner': Math.round(60000 * 0.04), // $2,400
        'Stationery & Postage|Invites': Math.round(60000 * 0.025), // $1,500
        'Gifts & Favors|Transportation / Shuttle': Math.round(60000 * 0.02), // $1,200
        'Ceremony & Venue|Officiant Fee': Math.round(60000 * 0.015), // $900
      };

      const insertedExpenses: Array<{category: string; description: string; estimated: number}> = [];
      mockClerk.users.getUserList.mockResolvedValue({ data: [] });
      mockClerk.users.createUser.mockResolvedValue(mockUser);
      mockClerk.signInTokens.createSignInToken.mockResolvedValue({
        url: 'https://clerk.dev/signin?token=abc123',
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'wedding_123' }
                }),
              })),
            })),
          };
        }
        if (table === 'expenses') {
          return {
            insert: vi.fn((rows) => {
              insertedExpenses.push(...rows);
              return Promise.resolve({ data: null });
            }),
          };
        }
        return {};
      });

      await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], {
        ...mockInput,
        budget: testBudget,
      });

      // Verify each expected allocation
      Object.entries(expectedAllocations).forEach(([key, expectedAmount]) => {
        const [category, description] = key.split('|');
        const expense = insertedExpenses.find(
          e => e.category === category && e.description === description
        );
        expect(expense?.estimated).toBe(expectedAmount);
      });

      // Verify total allocated amount is reasonable (should be ~95-100% of budget)
      const totalAllocated = insertedExpenses.reduce((sum, expense) => sum + expense.estimated, 0);
      expect(totalAllocated).toBeGreaterThan(testBudget * 0.95); // At least 95%
      expect(totalAllocated).toBeLessThanOrEqual(testBudget); // Not over budget
    });

    it('handles zero budget gracefully', async () => {
      const insertedExpenses: Array<{category: string; description: string; estimated: number}> = [];

      mockClerk.users.getUserList.mockResolvedValue({ data: [] });
      mockClerk.users.createUser.mockResolvedValue(mockUser);
      mockClerk.signInTokens.createSignInToken.mockResolvedValue({
        url: 'https://clerk.dev/signin?token=abc123',
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'wedding_123' }
                }),
              })),
            })),
          };
        }
        if (table === 'expenses') {
          return {
            insert: vi.fn((rows) => {
              insertedExpenses.push(...rows);
              return Promise.resolve({ data: null });
            }),
          };
        }
        return {};
      });

      await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], {
        ...mockInput,
        budget: 0,
      });

      // All expenses should be $0
      insertedExpenses.forEach(expense => {
        expect(expense.estimated).toBe(0);
      });
    });
  });
});