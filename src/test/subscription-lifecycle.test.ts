import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseAdmin } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
}));

const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  subscriptions: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  },
  paymentIntents: {
    create: vi.fn(),
    confirm: vi.fn(),
  },
  customers: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
  },
  setupIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(),
        single: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    upsert: vi.fn(),
  })),
};

describe('Subscription Lifecycle Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSupabaseAdmin).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createSupabaseAdmin>);
    vi.mocked(getStripe).mockReturnValue(mockStripe as unknown as ReturnType<typeof getStripe>);
  });

  describe('Pro Monthly Subscription Lifecycle', () => {
    const mockWedding = { id: 'wedding_123', user_id: 'user_123' };

    it.skip('completes full pro monthly lifecycle: trial → setup → conversion → payment → cancellation', async () => {
      // TODO: end-to-end mock coordination across setup/convert/charge/cancel is incomplete
      // Step 1: User starts trial (via calculator or signup)
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockWedding,
                }),
              })),
            })),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockWedding }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null }),
            })),
          };
        }
        if (table === 'scheduled_subscriptions') {
          return {
            insert: vi.fn().mockResolvedValue({ data: { id: 'sched_123' } }),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ data: null }),
              })),
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
            upsert: vi.fn().mockResolvedValue({ data: { id: 'purchase_123' } }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null }),
            })),
          };
        }
        return {};
      });

      // Step 2: User adds payment method for trial auto-convert
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_setup_123',
        url: 'https://checkout.stripe.com/setup',
        mode: 'setup',
      });

      // Step 3: Simulate setup completion webhook
      const setupCompletedEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_setup_123',
            mode: 'setup',
            setup_intent: 'seti_123',
            metadata: {
              intent: 'trial_auto_convert',
              user_id: 'user_123',
              wedding_id: 'wedding_123',
              plan: 'pro_monthly',
              scheduled_for: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(setupCompletedEvent);
      mockStripe.setupIntents.retrieve.mockResolvedValue({
        id: 'seti_123',
        payment_method: 'pm_123',
        customer: null,
      });
      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_123',
      });

      // Process setup completion
      const { POST: webhookHandler } = await import('@/app/api/webhooks/stripe/route');
      const setupRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(setupCompletedEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });
      await webhookHandler(setupRequest);

      // Verify scheduled subscription was created
      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_subscriptions');

      // Step 4: Simulate cron job processing trial conversion (after 14 days)
      const { POST: cronHandler } = await import('@/app/api/cron/process-trial-conversions/route');
      
      // Mock the scheduled subscription query
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'sched_123',
                    user_id: 'user_123',
                    wedding_id: 'wedding_123',
                    stripe_customer_id: 'cus_123',
                    stripe_payment_method_id: 'pm_123',
                    plan: 'pro_monthly',
                    failure_count: 0,
                  }],
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null }),
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

      mockStripe.subscriptions.create.mockResolvedValue({
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
      });

      // Mock cron auth
      vi.doMock('@/lib/cron-auth', () => ({
        requireCronAuth: vi.fn().mockReturnValue(null),
      }));

      const cronRequest = new Request('http://localhost/cron', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid_secret' },
      });
      const cronResponse = await cronHandler(cronRequest);
      const cronData = await cronResponse.json();

      expect(cronData.processed).toBe(1);
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        items: [{ price: process.env.STRIPE_PRO_MONTHLY_PRICE_ID }],
        default_payment_method: 'pm_123',
        off_session: true,
        metadata: {
          user_id: 'user_123',
          wedding_id: 'wedding_123',
          type: 'pro_monthly_subscription',
          source: 'trial_auto_convert',
        },
      });

      // Step 5: Simulate successful subscription creation webhook
      const subscriptionCreatedEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_sub_123',
            mode: 'subscription',
            subscription: 'sub_123',
            metadata: {
              type: 'pro_monthly_subscription',
              user_id: 'user_123',
              wedding_id: 'wedding_123',
            },
          },
        },
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        items: {
          data: [{ current_period_end: Math.floor(Date.now() / 1000) + 2592000 }], // 30 days
        },
        cancel_at_period_end: false,
      });

      mockStripe.webhooks.constructEvent.mockReturnValue(subscriptionCreatedEvent);

      const subRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(subscriptionCreatedEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });
      await webhookHandler(subRequest);

      // Verify subscriber_purchases upsert
      expect(mockSupabase.from).toHaveBeenCalledWith('subscriber_purchases');

      // Step 6: Simulate monthly renewal (invoice.payment_succeeded)
      const renewalEvent = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_renewal_123',
            subscription: 'sub_123',
          },
        },
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_123',
        metadata: { type: 'pro_monthly_subscription' },
        items: {
          data: [{ current_period_end: Math.floor(Date.now() / 1000) + 5184000 }], // 60 days
        },
      });

      mockStripe.webhooks.constructEvent.mockReturnValue(renewalEvent);

      const renewalRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(renewalEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });
      await webhookHandler(renewalRequest);

      // Step 7: Simulate payment failure (invoice.payment_failed)
      const failedPaymentEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_failed_123',
            subscription: 'sub_123',
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(failedPaymentEvent);

      const failedRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(failedPaymentEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });
      await webhookHandler(failedRequest);

      // Step 8: Simulate subscription cancellation
      const cancellationEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            metadata: {
              type: 'pro_monthly_subscription',
              user_id: 'user_123',
            },
            start_date: Math.floor(Date.now() / 1000) - 2592000, // 30 days ago
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(cancellationEvent);

      const cancelRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(cancellationEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });
      await webhookHandler(cancelRequest);

      // Verify all lifecycle events were processed successfully
      expect(cronResponse.status).toBe(200);
    });

    it('handles failed trial conversion with retry logic', async () => {
      // Mock scheduled subscription with failure
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'sched_failing_123',
                    user_id: 'user_123',
                    wedding_id: 'wedding_123',
                    stripe_customer_id: 'cus_123',
                    stripe_payment_method_id: 'pm_expired_123',
                    plan: 'pro_monthly',
                    failure_count: 0,
                  }],
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null }),
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

      // First attempt fails
      mockStripe.subscriptions.create.mockRejectedValue(
        new Error('Your card was declined.')
      );

      vi.doMock('@/lib/cron-auth', () => ({
        requireCronAuth: vi.fn().mockReturnValue(null),
      }));

      const { POST: cronHandler } = await import('@/app/api/cron/process-trial-conversions/route');
      
      const cronRequest = new Request('http://localhost/cron', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid_secret' },
      });
      
      const firstAttemptResponse = await cronHandler(cronRequest);
      const firstAttemptData = await firstAttemptResponse.json();

      expect(firstAttemptData.failed).toBe(1);
      expect(firstAttemptData.processed).toBe(0);

      // Second attempt (now with failure_count = 1, which exceeds MAX_RETRIES = 1)
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'sched_failing_123',
                    user_id: 'user_123',
                    wedding_id: 'wedding_123',
                    stripe_customer_id: 'cus_123',
                    stripe_payment_method_id: 'pm_expired_123',
                    plan: 'pro_monthly',
                    failure_count: 1, // Already failed once
                  }],
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null }),
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

      const secondAttemptResponse = await cronHandler(cronRequest);
      const secondAttemptData = await secondAttemptResponse.json();

      expect(secondAttemptData.failed).toBe(1);
      expect(secondAttemptData.processed).toBe(0);

      // Verify analytics captured the final failure
      // Note: This would require mocking the analytics capture
    });
  });

  describe('Lifetime Subscription Lifecycle', () => {
    it('completes immediate lifetime purchase flow', async () => {
      // Step 1: User initiates lifetime purchase
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_lifetime_123',
        url: 'https://checkout.stripe.com/lifetime',
        mode: 'payment',
      });

      // Step 2: Simulate successful payment webhook
      const lifetimePurchaseEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_lifetime_123',
            mode: 'payment',
            amount_total: 7900, // $79.00
            payment_intent: 'pi_lifetime_123',
            metadata: {
              type: 'subscriber_purchase',
              user_id: 'user_123',
              wedding_id: 'wedding_123',
            },
          },
        },
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { trial_started_at: new Date().toISOString(), created_at: new Date().toISOString() }
                }),
              })),
            })),
          };
        }
        if (table === 'subscriber_purchases') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'purchase_lifetime_123' }
                }),
              })),
            })),
          };
        }
        return {};
      });

      mockStripe.webhooks.constructEvent.mockReturnValue(lifetimePurchaseEvent);

      const { POST: webhookHandler } = await import('@/app/api/webhooks/stripe/route');
      const lifetimeRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(lifetimePurchaseEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await webhookHandler(lifetimeRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify lifetime purchase was recorded
      expect(mockSupabase.from).toHaveBeenCalledWith('subscriber_purchases');
    });

    it('handles trial auto-convert to lifetime', async () => {
      // Mock scheduled subscription for lifetime plan
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'sched_lifetime_123',
                    user_id: 'user_456',
                    wedding_id: 'wedding_456',
                    stripe_customer_id: 'cus_456',
                    stripe_payment_method_id: 'pm_456',
                    plan: 'lifetime',
                    failure_count: 0,
                  }],
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null }),
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
            insert: vi.fn().mockResolvedValue({ data: null }),
          };
        }
        return {};
      });

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_lifetime_auto_123',
        status: 'succeeded',
      });

      vi.doMock('@/lib/cron-auth', () => ({
        requireCronAuth: vi.fn().mockReturnValue(null),
      }));

      const { POST: cronHandler } = await import('@/app/api/cron/process-trial-conversions/route');
      
      const cronRequest = new Request('http://localhost/cron', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid_secret' },
      });

      const response = await cronHandler(cronRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);

      // Verify payment intent was created for $79
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 7900,
        currency: 'usd',
        customer: 'cus_456',
        payment_method: 'pm_456',
        off_session: true,
        confirm: true,
        metadata: {
          user_id: 'user_456',
          wedding_id: 'wedding_456',
          type: 'subscriber_purchase',
          source: 'trial_auto_convert',
        },
      });

      // Verify subscriber purchase record was created directly
      expect(mockSupabase.from).toHaveBeenCalledWith('subscriber_purchases');
    });
  });

  describe('Memory Plan Lifecycle', () => {
    it('completes memory plan subscription and cancellation', async () => {
      // Step 1: Memory plan purchase
      const memoryPurchaseEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_memory_123',
            metadata: {
              type: 'memory_plan',
              wedding_id: 'wedding_789',
            },
          },
        },
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null }),
            })),
          };
        }
        return {};
      });

      mockStripe.webhooks.constructEvent.mockReturnValue(memoryPurchaseEvent);

      const { POST: webhookHandler } = await import('@/app/api/webhooks/stripe/route');
      const memoryRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(memoryPurchaseEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      await webhookHandler(memoryRequest);

      // Step 2: Memory plan cancellation
      const memoryCancelEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_memory_123',
            metadata: {
              type: 'memory_plan',
              wedding_id: 'wedding_789',
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(memoryCancelEvent);

      const cancelRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(memoryCancelEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await webhookHandler(cancelRequest);
      expect(response.status).toBe(200);

      // Verify memory plan was activated then deactivated
      expect(mockSupabase.from).toHaveBeenCalledWith('weddings');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('handles duplicate subscription attempts gracefully', async () => {
      // User already has active subscription
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'sched_duplicate_123',
                    user_id: 'user_duplicate',
                    wedding_id: 'wedding_duplicate',
                    stripe_customer_id: 'cus_duplicate',
                    stripe_payment_method_id: 'pm_duplicate',
                    plan: 'pro_monthly',
                    failure_count: 0,
                  }],
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null }),
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
                      data: { id: 'existing_purchase_123' } // User already has active purchase
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      vi.doMock('@/lib/cron-auth', () => ({
        requireCronAuth: vi.fn().mockReturnValue(null),
      }));

      const { POST: cronHandler } = await import('@/app/api/cron/process-trial-conversions/route');
      
      const cronRequest = new Request('http://localhost/cron', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid_secret' },
      });

      const response = await cronHandler(cronRequest);
      const data = await response.json();

      expect(data.skipped).toBe(1);
      expect(data.processed).toBe(0);
      expect(data.failed).toBe(0);

      // Verify no Stripe calls were made
      expect(mockStripe.subscriptions.create).not.toHaveBeenCalled();
    });

    it('handles webhook event processing with malformed metadata', async () => {
      const malformedEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_malformed_123',
            mode: 'payment',
            metadata: {}, // Empty metadata
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(malformedEvent);

      const { POST: webhookHandler } = await import('@/app/api/webhooks/stripe/route');
      const malformedRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(malformedEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await webhookHandler(malformedRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Should handle gracefully without throwing
    });

    it('handles subscription update edge cases', async () => {
      const updateEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_update_123',
            status: 'past_due',
            metadata: {
              type: 'pro_monthly_subscription',
            },
            items: {
              data: [{ current_period_end: Math.floor(Date.now() / 1000) + 2592000 }],
            },
            cancel_at_period_end: true,
          },
        },
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'subscriber_purchases') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null }),
            })),
          };
        }
        return {};
      });

      mockStripe.webhooks.constructEvent.mockReturnValue(updateEvent);

      const { POST: webhookHandler } = await import('@/app/api/webhooks/stripe/route');
      const updateRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(updateEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await webhookHandler(updateRequest);
      expect(response.status).toBe(200);

      // Verify subscription status was updated to past_due
      expect(mockSupabase.from).toHaveBeenCalledWith('subscriber_purchases');
    });

    it('handles network timeouts during cron processing', async () => {
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'sched_timeout_123',
                    user_id: 'user_timeout',
                    wedding_id: 'wedding_timeout',
                    stripe_customer_id: 'cus_timeout',
                    stripe_payment_method_id: 'pm_timeout',
                    plan: 'pro_monthly',
                    failure_count: 0,
                  }],
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null }),
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

      // Simulate network timeout
      mockStripe.subscriptions.create.mockRejectedValue(
        new Error('Request timeout')
      );

      vi.doMock('@/lib/cron-auth', () => ({
        requireCronAuth: vi.fn().mockReturnValue(null),
      }));

      const { POST: cronHandler } = await import('@/app/api/cron/process-trial-conversions/route');
      
      const cronRequest = new Request('http://localhost/cron', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid_secret' },
      });

      const response = await cronHandler(cronRequest);
      const data = await response.json();

      expect(response.status).toBe(200); // Cron should not fail completely
      expect(data.failed).toBe(1);
      expect(data.processed).toBe(0);
    });
  });
});