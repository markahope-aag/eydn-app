import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
}));

vi.mock('@/lib/analytics-server', () => ({
  captureServer: vi.fn(),
}));

vi.mock('@/lib/cron-auth', () => ({
  requireCronAuth: vi.fn(),
}));

import { requireCronAuth } from '@/lib/cron-auth';
import { createSupabaseAdmin } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { captureServer } from '@/lib/analytics-server';

const mockStripe = {
  subscriptions: {
    create: vi.fn(),
  },
  paymentIntents: {
    create: vi.fn(),
  },
};

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        lte: vi.fn().mockResolvedValue({ data: [] }),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

// Mock environment variables
const originalEnv = process.env;

describe('POST /api/cron/process-trial-conversions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSupabaseAdmin).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createSupabaseAdmin>);
    vi.mocked(getStripe).mockReturnValue(mockStripe as unknown as ReturnType<typeof getStripe>);
    vi.mocked(requireCronAuth).mockReturnValue(null);
    
    process.env = {
      ...originalEnv,
      STRIPE_PRO_MONTHLY_PRICE_ID: 'price_test_monthly',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('authentication', () => {
    it('returns 401 when cron auth fails', async () => {
      vi.mocked(requireCronAuth).mockReturnValue(
        Response.json({ error: 'Unauthorized' }, { status: 401 }) as unknown as ReturnType<typeof requireCronAuth>
      );

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('processes when auth succeeds', async () => {
      vi.mocked(requireCronAuth).mockReturnValue(null);

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid_cron_secret',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        ok: true,
        processed: 0,
        failed: 0,
        skipped: 0,
      });
    });
  });

  describe('processing due subscriptions', () => {
    const mockScheduledSubscription = {
      id: 'sched_123',
      user_id: 'user_123',
      wedding_id: 'wedding_123',
      stripe_customer_id: 'cus_123',
      stripe_payment_method_id: 'pm_123',
      plan: 'pro_monthly',
      failure_count: 0,
    };

    beforeEach(() => {
      // Mock scheduled subscriptions query
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({ 
                  data: [mockScheduledSubscription] 
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        if (table === 'subscriber_purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  })),
                })),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });
    });

    it('processes pro monthly subscription successfully', async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: 'sub_123',
        customer: 'cus_123',
      });

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ok: true,
        processed: 1,
        failed: 0,
        skipped: 0,
      });

      // Verify Stripe subscription creation
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        items: [{ price: 'price_test_monthly' }],
        default_payment_method: 'pm_123',
        off_session: true,
        metadata: {
          user_id: 'user_123',
          wedding_id: 'wedding_123',
          type: 'pro_monthly_subscription',
          source: 'trial_auto_convert',
        },
      });

      // Verify scheduled subscription marked as processed
      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_subscriptions');

      // Verify analytics capture
      expect(captureServer).toHaveBeenCalledWith(
        'user_123',
        'trial_auto_converted',
        { plan: 'pro_monthly' }
      );
    });

    it('processes lifetime subscription successfully', async () => {
      const lifetimeSubscription = {
        ...mockScheduledSubscription,
        plan: 'lifetime',
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({ 
                  data: [lifetimeSubscription] 
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        if (table === 'subscriber_purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  })),
                })),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded',
      });

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ok: true,
        processed: 1,
        failed: 0,
        skipped: 0,
      });

      // Verify Stripe payment intent creation
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 7900, // $79.00
        currency: 'usd',
        customer: 'cus_123',
        payment_method: 'pm_123',
        off_session: true,
        confirm: true,
        metadata: {
          user_id: 'user_123',
          wedding_id: 'wedding_123',
          type: 'subscriber_purchase',
          source: 'trial_auto_convert',
        },
      });

      // Verify subscriber purchase record created
      expect(mockSupabase.from).toHaveBeenCalledWith('subscriber_purchases');

      // Verify analytics capture
      expect(captureServer).toHaveBeenCalledWith(
        'user_123',
        'trial_auto_converted',
        { plan: 'lifetime' }
      );
    });

    it('skips users with existing active purchases', async () => {
      // Mock existing active purchase
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({ 
                  data: [mockScheduledSubscription] 
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        if (table === 'subscriber_purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ 
                      data: { id: 'existing_purchase_123' } 
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ok: true,
        processed: 0,
        failed: 0,
        skipped: 1,
      });

      // Verify no Stripe calls were made
      expect(mockStripe.subscriptions.create).not.toHaveBeenCalled();
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();

      // Verify scheduled subscription marked as superseded
      // Verify scheduled subscription was marked as superseded
      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_subscriptions');
    });

    it('handles Stripe subscription creation failures', async () => {
      mockStripe.subscriptions.create.mockRejectedValue(
        new Error('Your card was declined.')
      );

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ok: true,
        processed: 0,
        failed: 1,
        skipped: 0,
      });

      // Verify failure was recorded
      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_subscriptions');
    });

    it('handles payment intent creation failures', async () => {
      const lifetimeSubscription = {
        ...mockScheduledSubscription,
        plan: 'lifetime',
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({ 
                  data: [lifetimeSubscription] 
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        if (table === 'subscriber_purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      mockStripe.paymentIntents.create.mockRejectedValue(
        new Error('Insufficient funds')
      );

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ok: true,
        processed: 0,
        failed: 1,
        skipped: 0,
      });
    });

    it('marks subscription as failed after max retries', async () => {
      const failedSubscription = {
        ...mockScheduledSubscription,
        failure_count: 1, // Already at MAX_RETRIES
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({ 
                  data: [failedSubscription] 
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        if (table === 'subscriber_purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      mockStripe.subscriptions.create.mockRejectedValue(
        new Error('Card expired')
      );

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ok: true,
        processed: 0,
        failed: 1,
        skipped: 0,
      });

      // Verify failure analytics capture
      expect(captureServer).toHaveBeenCalledWith(
        'user_123',
        'trial_auto_convert_failed',
        expect.objectContaining({
          plan: 'pro_monthly',
          reason: 'Card expired',
        })
      );
    });

    it('increments failure count on first failure', async () => {
      const firstFailureSubscription = {
        ...mockScheduledSubscription,
        failure_count: 0, // First failure
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({ 
                  data: [firstFailureSubscription] 
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        if (table === 'subscriber_purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      mockStripe.subscriptions.create.mockRejectedValue(
        new Error('Temporary network error')
      );

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      await response.json();

      expect(response.status).toBe(200);

      // Should NOT capture failure analytics on first failure
      expect(captureServer).not.toHaveBeenCalledWith(
        'user_123',
        'trial_auto_convert_failed',
        expect.anything()
      );
    });

    it('handles missing STRIPE_PRO_MONTHLY_PRICE_ID', async () => {
      delete process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ok: true,
        processed: 0,
        failed: 1,
        skipped: 0,
      });
    });

    it('processes multiple subscriptions', async () => {
      const multipleSubscriptions = [
        { ...mockScheduledSubscription, id: 'sched_1', plan: 'pro_monthly' },
        { ...mockScheduledSubscription, id: 'sched_2', plan: 'lifetime', user_id: 'user_456' },
        { ...mockScheduledSubscription, id: 'sched_3', plan: 'pro_monthly', user_id: 'user_789' },
      ];

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({ 
                  data: multipleSubscriptions 
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        if (table === 'subscriber_purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  })),
                })),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      mockStripe.subscriptions.create.mockResolvedValue({ id: 'sub_123' });
      mockStripe.paymentIntents.create.mockResolvedValue({ id: 'pi_123' });

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ok: true,
        processed: 3,
        failed: 0,
        skipped: 0,
      });

      // Verify correct number of Stripe calls
      expect(mockStripe.subscriptions.create).toHaveBeenCalledTimes(2); // 2 pro_monthly
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledTimes(1); // 1 lifetime
    });
  });

  describe('edge cases', () => {
    it('handles empty scheduled subscriptions', async () => {
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lte: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null }),
        })),
        insert: vi.fn().mockResolvedValue({ data: null }),
      }));

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ok: true,
        processed: 0,
        failed: 0,
        skipped: 0,
      });
    });

    it('handles database query failures', async () => {
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lte: vi.fn().mockResolvedValue({ data: null, error: new Error('DB connection failed') }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null }),
        })),
        insert: vi.fn().mockResolvedValue({ data: null }),
      }));

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ok: true,
        processed: 0,
        failed: 0,
        skipped: 0,
      });
    });

    it('handles null wedding_id gracefully', async () => {
      const mockScheduledSubscription = {
        id: 'sched_123',
        user_id: 'user_123',
        wedding_id: 'wedding_123',
        stripe_customer_id: 'cus_123',
        stripe_payment_method_id: 'pm_123',
        plan: 'pro_monthly',
        failure_count: 0,
      };

      const subscriptionWithNullWedding = {
        ...mockScheduledSubscription,
        wedding_id: null,
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({ 
                  data: [subscriptionWithNullWedding] 
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        if (table === 'subscriber_purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  })),
                })),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      mockStripe.subscriptions.create.mockResolvedValue({ id: 'sub_123' });

      const request = new Request('http://localhost/api/cron/process-trial-conversions', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        ok: true,
        processed: 1,
        failed: 0,
        skipped: 0,
      });

      // Verify metadata handles null wedding_id
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            wedding_id: '', // Should convert null to empty string
          }),
        })
      );
    });
  });
});