import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type Stripe from "stripe";
import {
  classifyWindow,
  handleCheckoutCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleChargeRefunded,
  handleDisputeCreated,
  type AdminSupabase,
} from "./handlers";

// ─── Mocks ────────────────────────────────────────────────────────

const mockStripe = {
  subscriptions: { retrieve: vi.fn() },
  setupIntents: { retrieve: vi.fn() },
  customers: { create: vi.fn(), update: vi.fn() },
  paymentMethods: { attach: vi.fn() },
};

vi.mock("@/lib/stripe", () => ({
  getStripe: () => mockStripe,
}));

const captureServer = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/analytics-server", () => ({
  captureServer: (...args: unknown[]) => captureServer(...args),
}));

// ─── Supabase mock builder ────────────────────────────────────────
//
// Each test constructs exactly the mock shape it needs. The builder
// lets tests collect calls per (table, method) pair for assertion.

type MethodCall = { table: string; method: string; payload: unknown; match?: unknown };

function createMockSupabase() {
  const calls: MethodCall[] = [];
  const weddings: { trial_started_at: string | null; created_at: string } | null = null;

  const supabase = {
    from: vi.fn((table: string) => {
      const api = {
        select: vi.fn(() => {
          return {
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: weddings, error: null }),
              single: vi.fn().mockResolvedValue({ data: { id: "purchase_1" }, error: null }),
            })),
          };
        }),
        insert: vi.fn((payload: unknown) => {
          calls.push({ table, method: "insert", payload });
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: "purchase_1" }, error: null }),
            })),
          };
        }),
        update: vi.fn((payload: unknown) => {
          calls.push({ table, method: "update", payload });
          const entry = calls[calls.length - 1];
          // Chainable: supports terminal single-.eq() updates as well as
          // the .eq().eq().select() / .eq().neq().select() chains used by
          // the refund and dispute handlers.
          const chain = {
            eq: vi.fn((_col: string, val: unknown) => {
              void _col;
              if (entry) entry.match = val;
              return chain;
            }),
            neq: vi.fn(() => chain),
            select: vi.fn(() =>
              Promise.resolve({ data: [{ user_id: "user_1" }], error: null })
            ),
            // Awaitable for updates that never call .select().
            then: (resolve: (v: { data: null; error: null }) => unknown) =>
              resolve({ data: null, error: null }),
          };
          return chain;
        }),
        upsert: vi.fn((payload: unknown) => {
          calls.push({ table, method: "upsert", payload });
          return Promise.resolve({ data: null, error: null });
        }),
        rpc: vi.fn(),
      };
      return api;
    }),
    rpc: vi.fn(),
  };

  return { supabase: supabase as unknown as AdminSupabase, calls };
}

// ─── Classified window mock via supabase for classifyWindow tests ─

function createWindowSupabase(trialStartedAt: string | null, createdAt: string) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { trial_started_at: trialStartedAt, created_at: createdAt },
            error: null,
          }),
        })),
      })),
    })),
  } as unknown as AdminSupabase;
}

// ─── Event fixtures ───────────────────────────────────────────────

function makeCheckoutEvent(sessionOverrides: Partial<Stripe.Checkout.Session>): Stripe.Event {
  return {
    id: "evt_test",
    object: "event",
    api_version: "2020-08-27",
    created: Date.now(),
    data: {
      object: {
        id: "cs_test",
        object: "checkout.session",
        ...sessionOverrides,
      } as unknown as Stripe.Checkout.Session,
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "checkout.session.completed",
  } as unknown as Stripe.Event;
}

function makeSubscriptionEvent(
  type: Stripe.Event.Type,
  subOverrides: Partial<Stripe.Subscription>
): Stripe.Event {
  return {
    id: "evt_test",
    object: "event",
    api_version: "2020-08-27",
    created: Date.now(),
    data: {
      object: {
        id: "sub_test",
        object: "subscription",
        metadata: {},
        ...subOverrides,
      } as unknown as Stripe.Subscription,
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
  } as unknown as Stripe.Event;
}

function makeInvoiceEvent(
  type: Stripe.Event.Type,
  subscriptionId: string | null
): Stripe.Event {
  const parent = subscriptionId
    ? { subscription_details: { subscription: subscriptionId } }
    : undefined;
  return {
    id: "evt_test",
    object: "event",
    api_version: "2020-08-27",
    created: Date.now(),
    data: {
      object: {
        id: "in_test",
        object: "invoice",
        parent,
      } as unknown as Stripe.Invoice,
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
  } as unknown as Stripe.Event;
}

function makeChargeEvent(chargeOverrides: Partial<Stripe.Charge>): Stripe.Event {
  return {
    id: "evt_test",
    object: "event",
    api_version: "2020-08-27",
    created: Date.now(),
    data: {
      object: {
        id: "ch_test",
        object: "charge",
        ...chargeOverrides,
      } as unknown as Stripe.Charge,
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "charge.refunded",
  } as unknown as Stripe.Event;
}

function makeDisputeEvent(disputeOverrides: Partial<Stripe.Dispute>): Stripe.Event {
  return {
    id: "evt_test",
    object: "event",
    api_version: "2020-08-27",
    created: Date.now(),
    data: {
      object: {
        id: "dp_test",
        object: "dispute",
        ...disputeOverrides,
      } as unknown as Stripe.Dispute,
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "charge.dispute.created",
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── classifyWindow ───────────────────────────────────────────────

describe("classifyWindow", () => {
  it("returns 'other' when no wedding exists", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    } as unknown as AdminSupabase;

    expect(await classifyWindow(supabase, "user_1")).toBe("other");
  });

  it("returns 'trial_expiry' for a trial started 5 days ago", async () => {
    const trialStart = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const supabase = createWindowSupabase(trialStart, trialStart);
    expect(await classifyWindow(supabase, "user_1")).toBe("trial_expiry");
  });

  it("returns 'trial_expiry' at exactly 14 days", async () => {
    const trialStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 1000).toISOString();
    const supabase = createWindowSupabase(trialStart, trialStart);
    expect(await classifyWindow(supabase, "user_1")).toBe("trial_expiry");
  });

  it("returns 'post_downgrade' at 15 days", async () => {
    const trialStart = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const supabase = createWindowSupabase(trialStart, trialStart);
    expect(await classifyWindow(supabase, "user_1")).toBe("post_downgrade");
  });

  it("falls back to created_at when trial_started_at is null", async () => {
    const createdAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const supabase = createWindowSupabase(null, createdAt);
    expect(await classifyWindow(supabase, "user_1")).toBe("trial_expiry");
  });
});

// ─── handleCheckoutCompleted ─────────────────────────────────────

describe("handleCheckoutCompleted", () => {
  it("does nothing when metadata is empty", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeCheckoutEvent({ metadata: {} });
    await handleCheckoutCompleted(supabase, event);
    expect(calls).toHaveLength(0);
  });

  it("handles pro_monthly_subscription checkout — upserts purchase (analytics handled by subscription.created)", async () => {
    const { supabase, calls } = createMockSupabase();
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      id: "sub_pro_1",
      customer: "cus_pro_1",
      cancel_at_period_end: false,
      items: { data: [{ current_period_end: 1800000000 }] },
    });

    const event = makeCheckoutEvent({
      subscription: "sub_pro_1",
      metadata: { type: "pro_monthly_subscription", user_id: "user_1", wedding_id: "w_1" },
    });

    await handleCheckoutCompleted(supabase, event);

    const upsert = calls.find((c) => c.table === "subscriber_purchases" && c.method === "upsert");
    expect(upsert).toBeDefined();
    expect((upsert?.payload as { plan: string }).plan).toBe("pro_monthly");
    // paid_conversion is fired by handleSubscriptionCreated, not here, so
    // that the cron trial-conversion path (no Checkout Session) also emits
    // exactly one paid_conversion event.
    expect(captureServer).not.toHaveBeenCalled();
  });

  it("handles subscriber_purchase (lifetime) — inserts purchase and captures event", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeCheckoutEvent({
      payment_intent: "pi_1",
      amount_total: 7900,
      metadata: { type: "subscriber_purchase", user_id: "user_1", wedding_id: "w_1" },
    });

    await handleCheckoutCompleted(supabase, event);

    const insert = calls.find((c) => c.table === "subscriber_purchases" && c.method === "insert");
    expect(insert).toBeDefined();
    expect((insert?.payload as { plan: string; amount: number }).plan).toBe("lifetime");
    expect((insert?.payload as { plan: string; amount: number }).amount).toBe(79);
    expect(captureServer).toHaveBeenCalledWith(
      "user_1",
      "paid_conversion",
      expect.objectContaining({ plan: "lifetime", amount: 79 })
    );
  });

  it("handles memory_plan checkout — updates wedding with expiry one year out", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeCheckoutEvent({
      metadata: { type: "memory_plan", wedding_id: "w_1" },
    });

    await handleCheckoutCompleted(supabase, event);

    const update = calls.find((c) => c.table === "weddings" && c.method === "update");
    expect(update).toBeDefined();
    expect((update?.payload as { memory_plan_active: boolean }).memory_plan_active).toBe(true);
    expect((update?.payload as { memory_plan_expires_at: string }).memory_plan_expires_at).toMatch(/^\d{4}-/);
    expect(update?.match).toBe("w_1");
  });

  it("ignores unrecognized checkout metadata silently", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeCheckoutEvent({
      metadata: { type: "unknown_purchase_kind" },
    });

    await handleCheckoutCompleted(supabase, event);

    expect(calls).toHaveLength(0);
    expect(captureServer).not.toHaveBeenCalled();
  });
});

// ─── handleSubscriptionUpdated ───────────────────────────────────

describe("handleSubscriptionUpdated", () => {
  it("ignores subscriptions without pro_monthly_subscription metadata", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeSubscriptionEvent("customer.subscription.updated", {
      metadata: {},
    });
    await handleSubscriptionUpdated(supabase, event);
    expect(calls).toHaveLength(0);
  });

  it("sets status=active when subscription is active", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeSubscriptionEvent("customer.subscription.updated", {
      id: "sub_1",
      status: "active",
      cancel_at_period_end: false,
      items: {
        object: "list",
        data: [{ current_period_end: 1800000000 } as Stripe.SubscriptionItem],
        has_more: false,
        url: "",
      },
      metadata: { type: "pro_monthly_subscription", user_id: "user_1" },
    });
    await handleSubscriptionUpdated(supabase, event);

    const update = calls.find((c) => c.table === "subscriber_purchases" && c.method === "update");
    expect((update?.payload as { status: string }).status).toBe("active");
    expect(update?.match).toBe("sub_1");
  });

  it("sets status=past_due when subscription is past_due", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeSubscriptionEvent("customer.subscription.updated", {
      id: "sub_1",
      status: "past_due",
      cancel_at_period_end: false,
      items: {
        object: "list",
        data: [{ current_period_end: 1800000000 } as Stripe.SubscriptionItem],
        has_more: false,
        url: "",
      },
      metadata: { type: "pro_monthly_subscription", user_id: "user_1" },
    });
    await handleSubscriptionUpdated(supabase, event);

    const update = calls.find((c) => c.table === "subscriber_purchases" && c.method === "update");
    expect((update?.payload as { status: string }).status).toBe("past_due");
  });

  it("sets status=cancelled when subscription is canceled", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeSubscriptionEvent("customer.subscription.updated", {
      id: "sub_1",
      status: "canceled",
      cancel_at_period_end: false,
      items: {
        object: "list",
        data: [{ current_period_end: 1800000000 } as Stripe.SubscriptionItem],
        has_more: false,
        url: "",
      },
      metadata: { type: "pro_monthly_subscription", user_id: "user_1" },
    });
    await handleSubscriptionUpdated(supabase, event);

    const update = calls.find((c) => c.table === "subscriber_purchases" && c.method === "update");
    expect((update?.payload as { status: string }).status).toBe("cancelled");
  });
});

// ─── handleInvoicePaymentSucceeded ───────────────────────────────

describe("handleInvoicePaymentSucceeded", () => {
  it("does nothing when invoice has no subscription", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeInvoiceEvent("invoice.payment_succeeded", null);
    await handleInvoicePaymentSucceeded(supabase, event);
    expect(calls).toHaveLength(0);
  });

  it("reactivates pro_monthly subscription on successful payment", async () => {
    const { supabase, calls } = createMockSupabase();
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      id: "sub_1",
      metadata: { type: "pro_monthly_subscription" },
      items: { data: [{ current_period_end: 1800000000 }] },
    });

    const event = makeInvoiceEvent("invoice.payment_succeeded", "sub_1");
    await handleInvoicePaymentSucceeded(supabase, event);

    const update = calls.find((c) => c.table === "subscriber_purchases" && c.method === "update");
    expect(update).toBeDefined();
    expect((update?.payload as { status: string }).status).toBe("active");
  });

  it("ignores subscriptions without pro_monthly_subscription metadata", async () => {
    const { supabase, calls } = createMockSupabase();
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      id: "sub_1",
      metadata: { type: "other" },
      items: { data: [{ current_period_end: 1800000000 }] },
    });

    const event = makeInvoiceEvent("invoice.payment_succeeded", "sub_1");
    await handleInvoicePaymentSucceeded(supabase, event);

    expect(calls).toHaveLength(0);
  });
});

// ─── handleInvoicePaymentFailed ──────────────────────────────────

describe("handleInvoicePaymentFailed", () => {
  it("does nothing when invoice has no subscription", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeInvoiceEvent("invoice.payment_failed", null);
    await handleInvoicePaymentFailed(supabase, event);
    expect(calls).toHaveLength(0);
  });

  it("marks subscriber_purchases as past_due for the subscription", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeInvoiceEvent("invoice.payment_failed", "sub_late");
    await handleInvoicePaymentFailed(supabase, event);

    const update = calls.find((c) => c.table === "subscriber_purchases" && c.method === "update");
    expect((update?.payload as { status: string }).status).toBe("past_due");
    expect(update?.match).toBe("sub_late");
  });
});

// ─── handleSubscriptionDeleted ───────────────────────────────────

describe("handleSubscriptionDeleted", () => {
  it("marks pro_monthly_subscription as cancelled and captures event", async () => {
    const { supabase, calls } = createMockSupabase();
    const startDate = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const event = makeSubscriptionEvent("customer.subscription.deleted", {
      id: "sub_1",
      start_date: startDate,
      metadata: { type: "pro_monthly_subscription", user_id: "user_1" },
    });

    await handleSubscriptionDeleted(supabase, event);

    const update = calls.find((c) => c.table === "subscriber_purchases" && c.method === "update");
    expect((update?.payload as { status: string }).status).toBe("cancelled");
    expect(captureServer).toHaveBeenCalledWith(
      "user_1",
      "subscription_cancelled",
      expect.objectContaining({ plan: "pro_monthly" })
    );
  });

  it("marks memory_plan wedding as inactive when cancelled", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeSubscriptionEvent("customer.subscription.deleted", {
      id: "sub_mem_1",
      metadata: { type: "memory_plan", wedding_id: "w_1" },
    });

    await handleSubscriptionDeleted(supabase, event);

    const update = calls.find((c) => c.table === "weddings" && c.method === "update");
    expect((update?.payload as { memory_plan_active: boolean }).memory_plan_active).toBe(false);
    expect(update?.match).toBe("w_1");
  });

  it("does nothing for unrelated subscription types", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeSubscriptionEvent("customer.subscription.deleted", {
      id: "sub_x",
      metadata: { type: "other" },
    });

    await handleSubscriptionDeleted(supabase, event);

    expect(calls).toHaveLength(0);
    expect(captureServer).not.toHaveBeenCalled();
  });
});

// ─── handleSubscriptionCreated ───────────────────────────────────

describe("handleSubscriptionCreated", () => {
  it("ignores subscriptions without pro_monthly_subscription metadata", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeSubscriptionEvent("customer.subscription.created", {
      metadata: {},
    });
    await handleSubscriptionCreated(supabase, event);
    expect(calls).toHaveLength(0);
    expect(captureServer).not.toHaveBeenCalled();
  });

  it("upserts the purchase and fires paid_conversion (cron trial-conversion path)", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeSubscriptionEvent("customer.subscription.created", {
      id: "sub_cron_1",
      status: "active",
      customer: "cus_1",
      cancel_at_period_end: false,
      items: {
        object: "list",
        data: [{ current_period_end: 1800000000 } as Stripe.SubscriptionItem],
        has_more: false,
        url: "",
      },
      metadata: {
        type: "pro_monthly_subscription",
        user_id: "user_1",
        wedding_id: "w_1",
        source: "trial_auto_convert",
      },
    });

    await handleSubscriptionCreated(supabase, event);

    const upsert = calls.find(
      (c) => c.table === "subscriber_purchases" && c.method === "upsert"
    );
    expect(upsert).toBeDefined();
    expect((upsert?.payload as { plan: string; status: string }).plan).toBe("pro_monthly");
    expect((upsert?.payload as { status: string }).status).toBe("active");
    expect(captureServer).toHaveBeenCalledWith(
      "user_1",
      "paid_conversion",
      expect.objectContaining({ plan: "pro_monthly", source: "trial_auto_convert" })
    );
  });

  it("records status=past_due for an unpaid subscription", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeSubscriptionEvent("customer.subscription.created", {
      id: "sub_unpaid",
      status: "incomplete",
      customer: "cus_1",
      cancel_at_period_end: false,
      items: {
        object: "list",
        data: [{ current_period_end: 1800000000 } as Stripe.SubscriptionItem],
        has_more: false,
        url: "",
      },
      metadata: { type: "pro_monthly_subscription", user_id: "user_1" },
    });

    await handleSubscriptionCreated(supabase, event);

    const upsert = calls.find(
      (c) => c.table === "subscriber_purchases" && c.method === "upsert"
    );
    expect((upsert?.payload as { status: string }).status).toBe("past_due");
  });
});

// ─── handleChargeRefunded ────────────────────────────────────────

describe("handleChargeRefunded", () => {
  it("ignores partial refunds", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeChargeEvent({
      amount: 7900,
      amount_refunded: 4000,
      payment_intent: "pi_1",
    });
    await handleChargeRefunded(supabase, event);
    expect(calls).toHaveLength(0);
  });

  it("revokes access by setting status=refunded on a full refund", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeChargeEvent({
      amount: 7900,
      amount_refunded: 7900,
      payment_intent: "pi_1",
    });
    await handleChargeRefunded(supabase, event);

    const update = calls.find(
      (c) => c.table === "subscriber_purchases" && c.method === "update"
    );
    expect((update?.payload as { status: string }).status).toBe("refunded");
    expect(captureServer).toHaveBeenCalledWith(
      "user_1",
      "purchase_refunded",
      expect.objectContaining({ reason: "refund" })
    );
  });

  it("does nothing when the charge has no payment intent", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeChargeEvent({
      amount: 7900,
      amount_refunded: 7900,
      payment_intent: null,
    });
    await handleChargeRefunded(supabase, event);
    expect(calls).toHaveLength(0);
  });
});

// ─── handleDisputeCreated ────────────────────────────────────────

describe("handleDisputeCreated", () => {
  it("revokes access by setting status=disputed", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeDisputeEvent({ id: "dp_1", payment_intent: "pi_1" });
    await handleDisputeCreated(supabase, event);

    const update = calls.find(
      (c) => c.table === "subscriber_purchases" && c.method === "update"
    );
    expect((update?.payload as { status: string }).status).toBe("disputed");
    expect(captureServer).toHaveBeenCalledWith(
      "user_1",
      "purchase_disputed",
      expect.objectContaining({ dispute_id: "dp_1" })
    );
  });

  it("does nothing when the dispute has no payment intent", async () => {
    const { supabase, calls } = createMockSupabase();
    const event = makeDisputeEvent({ id: "dp_2", payment_intent: null });
    await handleDisputeCreated(supabase, event);
    expect(calls).toHaveLength(0);
  });
});
