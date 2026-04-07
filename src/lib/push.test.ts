import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const mockSendNotification = vi.fn();

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: mockSendNotification,
  },
}));

import { sendPushNotification } from "./push";

describe("sendPushNotification", () => {
  const originalEnv = process.env;

  const validSubscription = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
    keys: { p256dh: "test-p256dh-key", auth: "test-auth-key" },
  };

  const validPayload = {
    title: "New RSVP",
    body: "Jane Doe has RSVP'd yes",
    url: "/dashboard/guests",
    tag: "rsvp",
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns error when VAPID public key is not set", async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    const result = await sendPushNotification(validSubscription, validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("VAPID keys not configured");
  });

  it("returns error when VAPID private key is not set", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    delete process.env.VAPID_PRIVATE_KEY;

    const result = await sendPushNotification(validSubscription, validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("VAPID keys not configured");
  });

  it("sends notification successfully when VAPID keys are configured", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
    mockSendNotification.mockResolvedValue({});

    const result = await sendPushNotification(validSubscription, validPayload);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("passes serialized payload to web-push", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
    mockSendNotification.mockResolvedValue({});

    await sendPushNotification(validSubscription, validPayload);

    const payloadArg = mockSendNotification.mock.calls[0][1];
    const parsed = JSON.parse(payloadArg);
    expect(parsed.title).toBe("New RSVP");
    expect(parsed.body).toBe("Jane Doe has RSVP'd yes");
    expect(parsed.url).toBe("/dashboard/guests");
    expect(parsed.tag).toBe("rsvp");
  });

  it("returns subscription_expired error for 410 status", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
    mockSendNotification.mockRejectedValue({ statusCode: 410, message: "Gone" });

    const result = await sendPushNotification(validSubscription, validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("subscription_expired");
  });

  it("returns error message for non-410 failures", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
    mockSendNotification.mockRejectedValue({ statusCode: 500, message: "Server Error" });

    const result = await sendPushNotification(validSubscription, validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Server Error");
  });

  it("handles errors without message property", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
    mockSendNotification.mockRejectedValue({ statusCode: 500 });

    const result = await sendPushNotification(validSubscription, validPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unknown error");
  });

  it("sends with TTL of 24 hours", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
    mockSendNotification.mockResolvedValue({});

    await sendPushNotification(validSubscription, validPayload);

    const options = mockSendNotification.mock.calls[0][2];
    expect(options.TTL).toBe(86400);
  });
});
