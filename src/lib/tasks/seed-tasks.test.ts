 
import { describe, it, expect } from "vitest";
import { generateTasks } from "./seed-tasks";

const WEDDING_ID = "test-wedding-123";
const WEDDING_DATE = "2027-06-15";

function makeCtx(overrides: Partial<Parameters<typeof generateTasks>[0]> = {}) {
  return {
    weddingId: WEDDING_ID,
    weddingDate: WEDDING_DATE,
    hasWeddingParty: false,
    hasPreWeddingEvents: false,
    hasHoneymoon: false,
    bookedVendors: [],
    ...overrides,
  };
}

describe("generateTasks – task generation workflow", () => {
  it("generates tasks for a basic wedding (no extras)", () => {
    const tasks = generateTasks(makeCtx());
    expect(tasks.length).toBeGreaterThan(0);

    // Should not include conditional tasks
    const titles = tasks.map((t) => t.title);
    expect(titles).not.toContain("Choose Wedding Party");
    expect(titles).not.toContain("Decide on Honeymoon Destination");
    expect(titles).not.toContain("Have Bachelor/Bachelorette Party");
  });

  it("generates additional tasks when hasWeddingParty is true", () => {
    const withoutParty = generateTasks(makeCtx({ hasWeddingParty: false }));
    const withParty = generateTasks(makeCtx({ hasWeddingParty: true }));

    expect(withParty.length).toBeGreaterThan(withoutParty.length);

    const partyTitles = withParty.map((t) => t.title);
    expect(partyTitles).toContain("Choose Wedding Party");
    expect(partyTitles).toContain("Order Bridesmaid Dresses");
    expect(partyTitles).toContain("Order Groomsmen Suits/Tuxes");
  });

  it("generates honeymoon tasks when hasHoneymoon is true", () => {
    const without = generateTasks(makeCtx({ hasHoneymoon: false }));
    const withHoneymoon = generateTasks(makeCtx({ hasHoneymoon: true }));

    expect(withHoneymoon.length).toBeGreaterThan(without.length);

    const titles = withHoneymoon.map((t) => t.title);
    expect(titles).toContain("Decide on Honeymoon Destination");
    // Sub-tasks of honeymoon
    expect(titles).toContain("Book flights, hotels, and activities");
    expect(titles).toContain("Pack and finalize itinerary");
  });

  it("generates pre-wedding event tasks when hasPreWeddingEvents is true", () => {
    const without = generateTasks(makeCtx({ hasPreWeddingEvents: false }));
    const withEvents = generateTasks(makeCtx({ hasPreWeddingEvents: true }));

    expect(withEvents.length).toBeGreaterThan(without.length);

    const titles = withEvents.map((t) => t.title);
    expect(titles).toContain("Have Bachelor/Bachelorette Party");
  });

  it("marks booked vendor tasks as completed", () => {
    const tasks = generateTasks(
      makeCtx({ bookedVendors: ["Photographer", "Caterer"] })
    );

    const photographerTask = tasks.find((t) => t.title === "Book Photographer");
    const catererTask = tasks.find((t) => t.title === "Book Caterer");
    const venueTask = tasks.find((t) => t.title === "Book Venue");

    expect(photographerTask?.completed).toBe(true);
    expect(catererTask?.completed).toBe(true);
    expect(venueTask?.completed).toBe(false);
  });

  it("all generated tasks have valid due_date relative to wedding date", () => {
    const tasks = generateTasks(
      makeCtx({
        hasWeddingParty: true,
        hasHoneymoon: true,
        hasPreWeddingEvents: true,
      })
    );

    const weddingMs = new Date(WEDDING_DATE).getTime();
    // Allow post-wedding tasks up to 2 months after
    const maxPostWeddingMs = weddingMs + 2 * 30 * 24 * 60 * 60 * 1000;

    for (const task of tasks) {
      expect(task.due_date).toBeDefined();
      const dueMs = new Date(task.due_date!).getTime();
      expect(dueMs).not.toBeNaN();
      // Due dates should be before the max post-wedding boundary
      expect(dueMs).toBeLessThanOrEqual(maxPostWeddingMs);
    }
  });

  it("all tasks have required fields (title, wedding_id, category)", () => {
    const tasks = generateTasks(
      makeCtx({
        hasWeddingParty: true,
        hasHoneymoon: true,
        hasPreWeddingEvents: true,
      })
    );

    for (const task of tasks) {
      expect(task.title).toBeTruthy();
      expect(typeof task.title).toBe("string");
      expect(task.wedding_id).toBe(WEDDING_ID);
      expect(task.category).toBeTruthy();
      expect(typeof task.category).toBe("string");
    }
  });

  it("assigns incrementing sort_order values", () => {
    const tasks = generateTasks(makeCtx());
    for (let i = 0; i < tasks.length; i++) {
      expect(tasks[i].sort_order).toBe(i);
    }
  });

  it("all tasks are marked as system-generated", () => {
    const tasks = generateTasks(makeCtx());
    for (const task of tasks) {
      expect(task.is_system_generated).toBe(true);
    }
  });
});
