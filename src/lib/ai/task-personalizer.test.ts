import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Claude client so these tests never hit the network.
const mockCreate = vi.fn();
vi.mock("./claude-client", () => ({
  getClaudeClient: () => ({
    messages: { create: mockCreate },
  }),
}));

import { personalizeTaskMessages, type PersonalizationContext } from "./task-personalizer";
import type { Database } from "@/lib/supabase/types";

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];

const sampleTasks: TaskInsert[] = [
  {
    wedding_id: "w1",
    title: "Set Budget",
    category: "Budget",
    edyn_message: "Original budget message",
    due_date: "2026-01-01",
  },
  {
    wedding_id: "w1",
    title: "Book Venue",
    category: "Venue",
    edyn_message: "Original venue message",
    due_date: "2026-02-01",
  },
];

const sampleCtx: PersonalizationContext = {
  partner1_name: "Alex",
  partner2_name: "Jordan",
  date: "2026-10-15",
  venue: "The Old Mill",
  venue_city: "Milwaukee, WI",
  budget: 30000,
  guest_count_estimate: 120,
  style_description: "Garden casual",
  has_wedding_party: true,
  has_pre_wedding_events: false,
  has_honeymoon: true,
  booked_vendors: ["Photographer"],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
});

describe("personalizeTaskMessages", () => {
  it("returns empty array unchanged", async () => {
    const result = await personalizeTaskMessages([], sampleCtx);
    expect(result).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("skips the Claude call when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const result = await personalizeTaskMessages(sampleTasks, sampleCtx);
    expect(result).toEqual(sampleTasks);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("merges personalized messages into tasks on a valid response", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            { index: 0, edynMessage: "Alex & Jordan, let's nail down your $30k budget for Milwaukee." },
            { index: 1, edynMessage: "Time to lock in The Old Mill — garden casual weddings go fast!" },
          ]),
        },
      ],
    });

    const result = await personalizeTaskMessages(sampleTasks, sampleCtx);

    expect(result).toHaveLength(2);
    expect(result[0].edyn_message).toBe(
      "Alex & Jordan, let's nail down your $30k budget for Milwaukee."
    );
    expect(result[1].edyn_message).toBe(
      "Time to lock in The Old Mill — garden casual weddings go fast!"
    );
    // Non-message fields must be preserved untouched.
    expect(result[0].title).toBe("Set Budget");
    expect(result[0].due_date).toBe("2026-01-01");
    expect(result[1].category).toBe("Venue");
  });

  it("tolerates markdown code fences around the JSON", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '```json\n[{"index": 0, "edynMessage": "Personalized!"}]\n```',
        },
      ],
    });

    const result = await personalizeTaskMessages(sampleTasks, sampleCtx);
    expect(result[0].edyn_message).toBe("Personalized!");
    // Task without a matching index keeps its original message.
    expect(result[1].edyn_message).toBe("Original venue message");
  });

  it("falls back to original tasks on malformed JSON", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not valid json at all" }],
    });

    const result = await personalizeTaskMessages(sampleTasks, sampleCtx);
    expect(result).toEqual(sampleTasks);
  });

  it("falls back to original tasks when Claude throws", async () => {
    mockCreate.mockRejectedValue(new Error("network error"));

    const result = await personalizeTaskMessages(sampleTasks, sampleCtx);
    expect(result).toEqual(sampleTasks);
  });

  it("falls back when response is an empty array", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "[]" }],
    });

    const result = await personalizeTaskMessages(sampleTasks, sampleCtx);
    expect(result).toEqual(sampleTasks);
  });

  it("ignores items with invalid shape but keeps valid ones", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            { index: 0, edynMessage: "Valid" },
            { index: "bad", edynMessage: "Bad index type" },
            { index: 1 }, // missing message
            null,
          ]),
        },
      ],
    });

    const result = await personalizeTaskMessages(sampleTasks, sampleCtx);
    expect(result[0].edyn_message).toBe("Valid");
    expect(result[1].edyn_message).toBe("Original venue message");
  });
});
