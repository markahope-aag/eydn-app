import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handoffCalculatorToEydn } from '@/lib/calculator-handoff';
import { createSupabaseAdmin } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

// Mock all dependencies
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(),
}));

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

import { clerkClient } from '@clerk/nextjs/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { captureServer } from '@/lib/analytics-server';

const mockClerk = {
  users: {
    getUserList: vi.fn(),
    createUser: vi.fn(),
  },
  signInTokens: {
    createSignInToken: vi.fn(),
  },
};

const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  subscriptions: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  setupIntents: {
    retrieve: vi.fn(),
  },
  customers: {
    create: vi.fn(),
    update: vi.fn(),
  },
  paymentMethods: {
    attach: vi.fn(),
  },
  paymentIntents: {
    create: vi.fn(),
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
        lte: vi.fn(),
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
  rpc: vi.fn(),
};

describe('End-to-End Revenue Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clerkClient).mockResolvedValue(mockClerk as unknown as Awaited<ReturnType<typeof clerkClient>>);
    vi.mocked(createSupabaseAdmin).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createSupabaseAdmin>);
    vi.mocked(getStripe).mockReturnValue(mockStripe as unknown as ReturnType<typeof getStripe>);
    vi.mocked(requireCronAuth).mockReturnValue(null);
    
    // Set up environment
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_test_monthly';
  });

  describe('Calculator → Trial → Pro Monthly Conversion → Renewal', () => {
    it('completes full revenue flow from calculator save to paid subscription', async () => {
      // ============ STEP 1: Calculator Handoff ============
      const calculatorInput = {
        email: 'newuser@example.com',
        name: 'Jane Smith',
        budget: 75000,
        guests: 200,
        state: 'NY',
        month: 8,
      };

      const mockUser = {
        id: 'user_revenue_123',
        emailAddresses: [{ emailAddress: 'newuser@example.com' }],
        firstName: 'Jane',
        lastName: 'Smith',
      };

      // Mock user creation (new user scenario)
      mockClerk.users.getUserList.mockResolvedValue({ data: [] });
      mockClerk.users.createUser.mockResolvedValue(mockUser);
      mockClerk.signInTokens.createSignInToken.mockResolvedValue({
        url: 'https://clerk.dev/signin?token=calc_handoff_token',
      });

      // Mock wedding creation
      let insertedWedding: {user_id: string; partner1_name: string; budget: number; guest_count_estimate: number; trial_started_at: string; id: string} | null = null;
      let insertedExpenses: Array<{category: string; description: string; estimated: number}> = [];

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: vi.fn((data) => {
              insertedWedding = { ...data, id: 'wedding_revenue_123' };
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: insertedWedding,
                  }),
                })),
              };
            }),
          };
        }
        if (table === 'expenses') {
          return {
            insert: vi.fn((rows) => {
              insertedExpenses = rows;
              return Promise.resolve({ data: null });
            }),
          };
        }
        return {};
      });

      const handoffResult = await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], calculatorInput);

      expect(handoffResult).toEqual({
        signInUrl: 'https://clerk.dev/signin?token=calc_handoff_token',
        isNewUser: true,
        userId: 'user_revenue_123',
        weddingId: 'wedding_revenue_123',
      });

      // Verify wedding was created with trial
      expect(insertedWedding).toMatchObject({
        user_id: 'user_revenue_123',
        partner1_name: 'Jane Smith',
        budget: 75000,
        guest_count_estimate: 200,
        trial_started_at: expect.any(String),
      });

      // Verify expenses were seeded with budget allocations
      expect(insertedExpenses.length).toBeGreaterThan(0);
      const venueExpense = insertedExpenses.find(
        e => e.category === 'Ceremony & Venue' && e.description === 'Venue Rentals'
      );
      expect(venueExpense?.estimated).toBe(Math.round(75000 * 0.238)); // $17,850

      // ============ STEP 2: Trial Setup (Payment Method Save) ============
      let scheduledSubscription: {user_id: string; wedding_id: string; stripe_customer_id: string; stripe_payment_method_id: string; plan: string; status: string; id: string} | null = null;

      // Mock setup session creation
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_setup_revenue_123',
        url: 'https://checkout.stripe.com/setup/cs_setup_revenue_123',
        mode: 'setup',
      });

      // Mock setup completion webhook
      const setupEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_setup_revenue_123',
            mode: 'setup',
            setup_intent: 'seti_revenue_123',
            metadata: {
              intent: 'trial_auto_convert',
              user_id: 'user_revenue_123',
              wedding_id: 'wedding_revenue_123',
              plan: 'pro_monthly',
              scheduled_for: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(setupEvent);
      mockStripe.setupIntents.retrieve.mockResolvedValue({
        id: 'seti_revenue_123',
        payment_method: 'pm_revenue_123',
        customer: null,
      });
      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_revenue_123',
      });
      mockStripe.paymentMethods.attach.mockResolvedValue({});
      mockStripe.customers.update.mockResolvedValue({});

      // Mock scheduled subscription creation
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: vi.fn((data) => {
              scheduledSubscription = { ...data, id: 'sched_revenue_123' };
              return Promise.resolve({ data: scheduledSubscription });
            }),
          };
        }
        return {};
      });

      // Process setup webhook
      const { POST: webhookHandler } = await import('@/app/api/webhooks/stripe/route');
      const setupRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(setupEvent),
        headers: { 'stripe-signature': 'valid_signature' },
      });

      const setupResponse = await webhookHandler(setupRequest);
      expect(setupResponse.status).toBe(200);

      // Verify scheduled subscription was created
      expect(scheduledSubscription).toMatchObject({
        user_id: 'user_revenue_123',
        wedding_id: 'wedding_revenue_123',
        stripe_customer_id: 'cus_revenue_123',
        stripe_payment_method_id: 'pm_revenue_123',
        plan: 'pro_monthly',
        status: 'pending',
      });

      // ============ STEP 3: Trial Conversion (14 days later) ============
      // Mock cron job processing
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({
                  data: [scheduledSubscription], // Now due for processing
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
        id: 'sub_revenue_123',
        customer: 'cus_revenue_123',
        status: 'active',
      });

      // Process cron job
      const { POST: cronHandler } = await import('@/app/api/cron/process-trial-conversions/route');
      const cronRequest = new Request('http://localhost/cron', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid_cron_secret' },
      });

      const cronResponse = await cronHandler(cronRequest);
      const cronData = await cronResponse.json();

      expect(cronResponse.status).toBe(200);
      expect(cronData).toMatchObject({
        ok: true,
        processed: 1,
        failed: 0,
        skipped: 0,
      });

      // Verify subscription was created with correct metadata
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_revenue_123',
        items: [{ price: 'price_test_monthly' }],
        default_payment_method: 'pm_revenue_123',
        off_session: true,
        metadata: {
          user_id: 'user_revenue_123',
          wedding_id: 'wedding_revenue_123',
          type: 'pro_monthly_subscription',
          source: 'trial_auto_convert',
        },
      });

      // ============ STEP 4: Subscription Activation Webhook ============
      let subscriberPurchase: {user_id: string; wedding_id: string; plan: string; amount: number; status: string; stripe_subscription_id?: string; stripe_customer_id?: string} | null = null;

      const subscriptionCreatedEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_subscription_123',
            mode: 'subscription',
            subscription: 'sub_revenue_123',
            metadata: {
              type: 'pro_monthly_subscription',
              user_id: 'user_revenue_123',
              wedding_id: 'wedding_revenue_123',
            },
          },
        },
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_revenue_123',
        customer: 'cus_revenue_123',
        status: 'active',
        items: {
          data: [{ current_period_end: Math.floor(Date.now() / 1000) + 2592000 }], // 30 days
        },
        cancel_at_period_end: false,
      });

      // Mock classifyWindow for analytics
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { trial_started_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
                }),
              })),
            })),
          };
        }
        if (table === 'subscriber_purchases') {
          return {
            upsert: vi.fn((data) => {
              subscriberPurchase = Array.isArray(data) ? data[0] : data;
              return Promise.resolve({ data: subscriberPurchase });
            }),
          };
        }
        return {};
      });

      mockStripe.webhooks.constructEvent.mockReturnValue(subscriptionCreatedEvent);

      const subscriptionRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(subscriptionCreatedEvent),
        headers: { 'stripe-signature': 'valid_signature' },
      });

      const subscriptionResponse = await webhookHandler(subscriptionRequest);
      expect(subscriptionResponse.status).toBe(200);

      // Verify subscriber purchase was recorded
      expect(subscriberPurchase).toMatchObject({
        user_id: 'user_revenue_123',
        wedding_id: 'wedding_revenue_123',
        plan: 'pro_monthly',
        amount: 14.99,
        status: 'active',
        stripe_subscription_id: 'sub_revenue_123',
        stripe_customer_id: 'cus_revenue_123',
      });

      // ============ STEP 5: Monthly Renewal ============
      const renewalEvent = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_renewal_123',
            subscription: 'sub_revenue_123',
          },
        },
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_revenue_123',
        metadata: { type: 'pro_monthly_subscription' },
        items: {
          data: [{ current_period_end: Math.floor(Date.now() / 1000) + 5184000 }], // 60 days from now
        },
      });

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

      mockStripe.webhooks.constructEvent.mockReturnValue(renewalEvent);

      const renewalRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(renewalEvent),
        headers: { 'stripe-signature': 'valid_signature' },
      });

      const renewalResponse = await webhookHandler(renewalRequest);
      expect(renewalResponse.status).toBe(200);

      // ============ VERIFICATION ============
      // Verify analytics capture calls were made
      expect(captureServer).toHaveBeenCalledWith(
        'user_revenue_123',
        'trial_card_saved',
        expect.objectContaining({ plan: 'pro_monthly' })
      );
      expect(captureServer).toHaveBeenCalledWith(
        'user_revenue_123',
        'trial_auto_converted',
        expect.objectContaining({ plan: 'pro_monthly' })
      );
      expect(captureServer).toHaveBeenCalledWith(
        'user_revenue_123',
        'paid_conversion',
        expect.objectContaining({ 
          plan: 'pro_monthly',
          amount: 14.99,
          window: 'trial_expiry',
        })
      );
    });
  });

  describe('Calculator → Direct Lifetime Purchase', () => {
    it.skip('completes direct lifetime purchase flow with promo code', async () => {
      // TODO: promo code redemption path mock doesn't match current /api/subscribe flow
      // ============ STEP 1: Calculator Handoff ============
      const calculatorInput = {
        email: 'lifetime@example.com',
        name: 'Bob Johnson',
        budget: 100000,
        guests: 300,
        state: 'TX',
        month: 10,
      };

      const mockUser = {
        id: 'user_lifetime_456',
        emailAddresses: [{ emailAddress: 'lifetime@example.com' }],
        firstName: 'Bob',
        lastName: 'Johnson',
      };

      mockClerk.users.getUserList.mockResolvedValue({ data: [] });
      mockClerk.users.createUser.mockResolvedValue(mockUser);
      mockClerk.signInTokens.createSignInToken.mockResolvedValue({
        url: 'https://clerk.dev/signin?token=lifetime_token',
      });

      let insertedWedding: {user_id: string; partner1_name: string; budget: number; guest_count_estimate: number; trial_started_at: string; id: string} | null = null;
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: vi.fn((data) => {
              insertedWedding = { ...data, id: 'wedding_lifetime_456' };
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: insertedWedding,
                  }),
                })),
              };
            }),
          };
        }
        if (table === 'expenses') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null }),
          };
        }
        return {};
      });

      await handoffCalculatorToEydn(mockSupabase as unknown as Parameters<typeof handoffCalculatorToEydn>[0], calculatorInput);

      // ============ STEP 2: Direct Lifetime Purchase ============
      const lifetimePurchaseEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_lifetime_456',
            mode: 'payment',
            amount_total: 6320, // $79 - 20% promo = $63.20
            payment_intent: 'pi_lifetime_456',
            metadata: {
              type: 'subscriber_purchase',
              user_id: 'user_lifetime_456',
              wedding_id: 'wedding_lifetime_456',
              promo_code: 'EARLY20',
              promo_code_id: 'promo_456',
              discount_amount: '15.80',
            },
          },
        },
      };

      let subscriberPurchase: {user_id: string; wedding_id: string; plan: string; amount: number; status: string; stripe_subscription_id?: string; stripe_customer_id?: string} | null = null;
      let promoRedemption: {promo_code_id: string; user_id: string; purchase_id: string; original_amount: number; discount_amount: number; final_amount: number} | null = null;

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { trial_started_at: new Date().toISOString() }
                }),
              })),
            })),
          };
        }
        if (table === 'subscriber_purchases') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn((data) => {
                  subscriberPurchase = { ...data, id: 'purchase_lifetime_456' };
                  return Promise.resolve({
                    data: subscriberPurchase,
                  });
                }),
              })),
            })),
          };
        }
        if (table === 'promo_code_redemptions') {
          return {
            insert: vi.fn((data) => {
              promoRedemption = data;
              return Promise.resolve({ data: null });
            }),
          };
        }
        return {};
      });

      mockSupabase.rpc.mockResolvedValue({ data: null });

      mockStripe.webhooks.constructEvent.mockReturnValue(lifetimePurchaseEvent);

      const { POST: webhookHandler } = await import('@/app/api/webhooks/stripe/route');
      const lifetimeRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(lifetimePurchaseEvent),
        headers: { 'stripe-signature': 'valid_signature' },
      });

      const lifetimeResponse = await webhookHandler(lifetimeRequest);
      expect(lifetimeResponse.status).toBe(200);

      // Verify lifetime purchase was recorded
      expect(subscriberPurchase).toMatchObject({
        user_id: 'user_lifetime_456',
        wedding_id: 'wedding_lifetime_456',
        plan: 'lifetime',
        amount: 63.2, // Discounted amount
        status: 'active',
      });

      // Verify promo code redemption
      expect(promoRedemption).toMatchObject({
        promo_code_id: 'promo_456',
        user_id: 'user_lifetime_456',
        purchase_id: 'purchase_lifetime_456',
        original_amount: 79, // SUBSCRIPTION_PRICE
        discount_amount: 15.80,
        final_amount: 63.2,
      });

      // Verify promo code usage incremented
      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_promo_uses', {
        code_id: 'promo_456',
      });

      // Verify analytics
      expect(captureServer).toHaveBeenCalledWith(
        'user_lifetime_456',
        'paid_conversion',
        expect.objectContaining({
          plan: 'lifetime',
          amount: 63.2,
          promo_code: 'EARLY20',
        })
      );
    });
  });

  describe('Revenue Flow Error Recovery', () => {
    it('handles failed trial conversion with eventual success', async () => {
      // ============ STEP 1: Setup Scheduled Subscription ============
      const scheduledSub = {
        id: 'sched_recovery_789',
        user_id: 'user_recovery_789',
        wedding_id: 'wedding_recovery_789',
        stripe_customer_id: 'cus_recovery_789',
        stripe_payment_method_id: 'pm_recovery_789',
        plan: 'pro_monthly',
        failure_count: 0,
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({
                  data: [scheduledSub],
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

      // ============ STEP 2: First Attempt Fails (Card Declined) ============
      mockStripe.subscriptions.create.mockRejectedValueOnce(
        new Error('Your card was declined.')
      );

      const { POST: cronHandler } = await import('@/app/api/cron/process-trial-conversions/route');
      
      const firstAttemptRequest = new Request('http://localhost/cron', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid_cron_secret' },
      });

      const firstAttemptResponse = await cronHandler(firstAttemptRequest);
      const firstAttemptData = await firstAttemptResponse.json();

      expect(firstAttemptData).toMatchObject({
        ok: true,
        processed: 0,
        failed: 1,
        skipped: 0,
      });

      // ============ STEP 3: Second Attempt Succeeds ============
      // Mock updated scheduled subscription with failure_count = 1
      const failedOnceSub = { ...scheduledSub, failure_count: 1 };
      
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({
                  data: [failedOnceSub],
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

      // Second attempt succeeds
      mockStripe.subscriptions.create.mockResolvedValueOnce({
        id: 'sub_recovery_789',
        customer: 'cus_recovery_789',
        status: 'active',
      });

      const secondAttemptRequest = new Request('http://localhost/cron', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid_cron_secret' },
      });

      const secondAttemptResponse = await cronHandler(secondAttemptRequest);
      const secondAttemptData = await secondAttemptResponse.json();

      expect(secondAttemptData).toMatchObject({
        ok: true,
        processed: 1,
        failed: 0,
        skipped: 0,
      });

      // Verify successful subscription creation
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_recovery_789',
        items: [{ price: 'price_test_monthly' }],
        default_payment_method: 'pm_recovery_789',
        off_session: true,
        metadata: {
          user_id: 'user_recovery_789',
          wedding_id: 'wedding_recovery_789',
          type: 'pro_monthly_subscription',
          source: 'trial_auto_convert',
        },
      });

      // Verify success analytics (not failure analytics)
      expect(captureServer).toHaveBeenCalledWith(
        'user_recovery_789',
        'trial_auto_converted',
        { plan: 'pro_monthly' }
      );
    });

    it('handles maximum retry failures and marks as permanently failed', async () => {
      const maxFailedSub = {
        id: 'sched_max_fail_999',
        user_id: 'user_max_fail_999',
        wedding_id: 'wedding_max_fail_999',
        stripe_customer_id: 'cus_max_fail_999',
        stripe_payment_method_id: 'pm_expired_999',
        plan: 'pro_monthly',
        failure_count: 1, // At MAX_RETRIES threshold
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'scheduled_subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({
                  data: [maxFailedSub],
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

      // Final attempt fails
      mockStripe.subscriptions.create.mockRejectedValue(
        new Error('Card is expired and cannot be used.')
      );

      const { POST: cronHandler } = await import('@/app/api/cron/process-trial-conversions/route');
      
      const finalAttemptRequest = new Request('http://localhost/cron', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid_cron_secret' },
      });

      const finalAttemptResponse = await cronHandler(finalAttemptRequest);
      const finalAttemptData = await finalAttemptResponse.json();

      expect(finalAttemptData).toMatchObject({
        ok: true,
        processed: 0,
        failed: 1,
        skipped: 0,
      });

      // Verify failure analytics were captured for permanent failure
      expect(captureServer).toHaveBeenCalledWith(
        'user_max_fail_999',
        'trial_auto_convert_failed',
        expect.objectContaining({
          plan: 'pro_monthly',
          reason: 'Card is expired and cannot be used.',
        })
      );
    });
  });

  describe('Revenue Analytics Tracking', () => {
    it('tracks complete revenue funnel with proper window classification', async () => {
      const revenueUser = 'user_analytics_111';
      const mockWeddingData = { 
        trial_started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Mock classifyWindow behavior
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockWeddingData,
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
                  data: { id: 'purchase_analytics_111' },
                }),
              })),
            })),
          };
        }
        return {};
      });

      const purchaseEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_analytics_111',
            mode: 'payment',
            amount_total: 7900,
            payment_intent: 'pi_analytics_111',
            metadata: {
              type: 'subscriber_purchase',
              user_id: revenueUser,
              wedding_id: 'wedding_analytics_111',
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(purchaseEvent);

      const { POST: webhookHandler } = await import('@/app/api/webhooks/stripe/route');
      const analyticsRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(purchaseEvent),
        headers: { 'stripe-signature': 'valid_signature' },
      });

      await webhookHandler(analyticsRequest);

      // Verify analytics capture with correct window classification
      expect(captureServer).toHaveBeenCalledWith(
        revenueUser,
        'paid_conversion',
        expect.objectContaining({
          plan: 'lifetime',
          amount: 79,
          window: 'trial_expiry', // 5 days is within 14-day trial window
        })
      );
    });

    it('tracks post-downgrade revenue window correctly', async () => {
      const postDowngradeUser = 'user_post_downgrade_222';
      const mockWeddingData = { 
        trial_started_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      (mockSupabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockWeddingData,
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
                  data: { id: 'purchase_post_downgrade_222' },
                }),
              })),
            })),
          };
        }
        return {};
      });

      const postDowngradePurchaseEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_post_downgrade_222',
            mode: 'payment',
            amount_total: 7900,
            payment_intent: 'pi_post_downgrade_222',
            metadata: {
              type: 'subscriber_purchase',
              user_id: postDowngradeUser,
              wedding_id: 'wedding_post_downgrade_222',
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(postDowngradePurchaseEvent);

      const { POST: webhookHandler } = await import('@/app/api/webhooks/stripe/route');
      const postDowngradeRequest = new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify(postDowngradePurchaseEvent),
        headers: { 'stripe-signature': 'valid_signature' },
      });

      await webhookHandler(postDowngradeRequest);

      // Verify analytics capture with post-downgrade window
      expect(captureServer).toHaveBeenCalledWith(
        postDowngradeUser,
        'paid_conversion',
        expect.objectContaining({
          plan: 'lifetime',
          amount: 79,
          window: 'post_downgrade', // 30 days is beyond 14-day trial window
        })
      );
    });
  });
});