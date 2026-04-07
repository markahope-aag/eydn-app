import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { fetchBinderData } from "./fetch-data";

describe("fetchBinderData", () => {
  const originalFetch = globalThis.fetch;

  function mockFetchResponses(responses: Record<string, unknown>) {
    globalThis.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;

      for (const [pattern, data] of Object.entries(responses)) {
        if (urlStr.includes(pattern)) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(data),
          } as Response);
        }
      }

      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve(null),
      } as Response);
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns default wedding data when all fetches fail", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(null),
    });

    const result = await fetchBinderData();

    expect(result.wedding.partner1_name).toBe("Partner 1");
    expect(result.wedding.partner2_name).toBe("Partner 2");
    expect(result.wedding.date).toBeNull();
    expect(result.wedding.venue).toBeNull();
    expect(result.wedding.budget).toBeNull();
  });

  it("returns empty arrays for missing list data", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(null),
    });

    const result = await fetchBinderData();

    expect(result.vendorList).toEqual([]);
    expect(result.partyList).toEqual([]);
    expect(result.guestList).toEqual([]);
    expect(result.tableList).toEqual([]);
    expect(result.assignmentList).toEqual([]);
    expect(result.positionList).toEqual([]);
    expect(result.expenseList).toEqual([]);
    expect(result.registry).toEqual([]);
  });

  it("returns null rehearsal when fetch fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(null),
    });

    const result = await fetchBinderData();

    expect(result.rehearsal).toBeNull();
  });

  it("populates wedding data from successful API response", async () => {
    mockFetchResponses({
      "/api/weddings": {
        partner1_name: "Alice",
        partner2_name: "Bob",
        date: "2025-09-20",
        venue: "Grand Ballroom",
        budget: 25000,
      },
    });

    const result = await fetchBinderData();

    expect(result.wedding.partner1_name).toBe("Alice");
    expect(result.wedding.partner2_name).toBe("Bob");
    expect(result.wedding.date).toBe("2025-09-20");
    expect(result.wedding.venue).toBe("Grand Ballroom");
  });

  it("populates day-of plan from API response", async () => {
    mockFetchResponses({
      "/api/day-of": {
        content: {
          ceremonyTime: "4:00 PM",
          timeline: [{ time: "4:00 PM", event: "Ceremony", notes: "" }],
          vendorContacts: [],
          partyAssignments: [],
          packingChecklist: [{ item: "Rings", notes: "Double check" }],
          ceremonyScript: "We gather here today...",
          processionalOrder: ["Partner 1", "Partner 2"],
          officiantNotes: "Speak slowly",
          music: [],
          speeches: [],
          setupTasks: [],
          attire: [],
        },
      },
    });

    const result = await fetchBinderData();

    expect(result.dayOf.ceremonyTime).toBe("4:00 PM");
    expect(result.dayOf.timeline).toHaveLength(1);
    expect(result.dayOf.packingChecklist).toHaveLength(1);
    expect(result.dayOf.ceremonyScript).toBe("We gather here today...");
  });

  it("migrates old string[] packing checklist format", async () => {
    mockFetchResponses({
      "/api/day-of": {
        content: {
          packingChecklist: ["Rings", "Vows", "Bouquet"],
        },
      },
    });

    const result = await fetchBinderData();

    expect(result.dayOf.packingChecklist).toEqual([
      { item: "Rings", notes: "" },
      { item: "Vows", notes: "" },
      { item: "Bouquet", notes: "" },
    ]);
  });

  it("sorts guest list alphabetically by name", async () => {
    mockFetchResponses({
      "/api/guests": [
        { id: "1", name: "Zara", rsvp_status: "pending", meal_preference: null, role: null, group_name: null },
        { id: "2", name: "Alice", rsvp_status: "yes", meal_preference: null, role: null, group_name: null },
        { id: "3", name: "Mike", rsvp_status: "no", meal_preference: null, role: null, group_name: null },
      ],
    });

    const result = await fetchBinderData();

    expect(result.guestList[0].name).toBe("Alice");
    expect(result.guestList[1].name).toBe("Mike");
    expect(result.guestList[2].name).toBe("Zara");
  });

  it("populates vendor list from API response", async () => {
    mockFetchResponses({
      "/api/vendors": [
        { id: "v1", category: "Photography", name: "SnapShot Studio", poc_name: "Jane", poc_email: null, poc_phone: null, notes: null, amount: 3000, amount_paid: 500, arrival_time: null, meal_needed: false },
      ],
    });

    const result = await fetchBinderData();

    expect(result.vendorList).toHaveLength(1);
    expect(result.vendorList[0].name).toBe("SnapShot Studio");
  });

  it("handles fetch exceptions gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await fetchBinderData();

    // Should return defaults, not throw
    expect(result.wedding.partner1_name).toBe("Partner 1");
    expect(result.vendorList).toEqual([]);
  });

  it("defaults empty day-of fields when content is missing", async () => {
    mockFetchResponses({
      "/api/day-of": { content: {} },
    });

    const result = await fetchBinderData();

    expect(result.dayOf.ceremonyTime).toBe("");
    expect(result.dayOf.timeline).toEqual([]);
    expect(result.dayOf.vendorContacts).toEqual([]);
    expect(result.dayOf.partyAssignments).toEqual([]);
    expect(result.dayOf.packingChecklist).toEqual([]);
    expect(result.dayOf.ceremonyScript).toBe("");
    expect(result.dayOf.processionalOrder).toEqual([]);
    expect(result.dayOf.officiantNotes).toBe("");
    expect(result.dayOf.music).toEqual([]);
    expect(result.dayOf.speeches).toEqual([]);
    expect(result.dayOf.setupTasks).toEqual([]);
    expect(result.dayOf.attire).toEqual([]);
  });
});
