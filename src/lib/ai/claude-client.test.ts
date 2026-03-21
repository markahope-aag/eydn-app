 
import { vi, describe, it, expect, beforeEach } from "vitest";

const MockAnthropic = vi.fn().mockImplementation(function () {
  return { messages: { create: vi.fn() } };
});

vi.mock("@anthropic-ai/sdk", () => ({
  default: MockAnthropic,
}));

describe("getClaudeClient", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns an Anthropic client instance", async () => {
    const { getClaudeClient } = await import("./claude-client");
    const client = getClaudeClient();
    expect(client).toBeDefined();
    expect(client.messages).toBeDefined();
    expect(client.messages.create).toBeDefined();
  });

  it("returns the same instance on subsequent calls (singleton)", async () => {
    const { getClaudeClient } = await import("./claude-client");
    const first = getClaudeClient();
    const second = getClaudeClient();
    expect(first).toBe(second);
  });
});
