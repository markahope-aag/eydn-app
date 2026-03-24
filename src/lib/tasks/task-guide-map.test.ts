import { describe, it, expect } from "vitest";
import { TASK_GUIDE_MAP } from "./task-guide-map";

describe("TASK_GUIDE_MAP", () => {
  it("maps 'Book Florist' to florist guide", () => {
    expect(TASK_GUIDE_MAP["Book Florist"]).toEqual({
      slug: "florist",
      label: "Florist Guide",
    });
  });

  it("maps 'Plan Flowers and Centerpieces' to florist guide", () => {
    expect(TASK_GUIDE_MAP["Plan Flowers and Centerpieces"]).toEqual({
      slug: "florist",
      label: "Florist Guide",
    });
  });

  it("maps 'Book DJ or Band' to music guide", () => {
    expect(TASK_GUIDE_MAP["Book DJ or Band"]).toEqual({
      slug: "music",
      label: "Music Guide",
    });
  });

  it("maps 'Choose Ceremony Music' to music guide", () => {
    expect(TASK_GUIDE_MAP["Choose Ceremony Music"]).toEqual({
      slug: "music",
      label: "Music Guide",
    });
  });

  it("maps 'Buy Wedding Dress' to wedding-dress guide", () => {
    expect(TASK_GUIDE_MAP["Buy Wedding Dress"]).toEqual({
      slug: "wedding-dress",
      label: "Wedding Dress Guide",
    });
  });

  it("maps 'Book Hair Stylist' to hair-makeup guide", () => {
    expect(TASK_GUIDE_MAP["Book Hair Stylist"]).toEqual({
      slug: "hair-makeup",
      label: "Hair & Makeup Guide",
    });
  });

  it("maps 'Book Makeup Artist' to hair-makeup guide", () => {
    expect(TASK_GUIDE_MAP["Book Makeup Artist"]).toEqual({
      slug: "hair-makeup",
      label: "Hair & Makeup Guide",
    });
  });

  it("maps 'Create Guest List Draft' to guest-list guide", () => {
    expect(TASK_GUIDE_MAP["Create Guest List Draft"]).toEqual({
      slug: "guest-list",
      label: "Guest List Guide",
    });
  });

  it("maps 'Choose Wedding Colors/Theme' to colors-theme guide", () => {
    expect(TASK_GUIDE_MAP["Choose Wedding Colors/Theme"]).toEqual({
      slug: "colors-theme",
      label: "Colors & Theme Guide",
    });
  });

  it("maps 'Start Decor Planning' to decor guide", () => {
    expect(TASK_GUIDE_MAP["Start Decor Planning"]).toEqual({
      slug: "decor",
      label: "Decor Guide",
    });
  });

  it("maps 'Book Rentals' to rentals guide", () => {
    expect(TASK_GUIDE_MAP["Book Rentals"]).toEqual({
      slug: "rentals",
      label: "Rentals Guide",
    });
  });

  it("maps 'Get Wedding Insurance' to insurance guide", () => {
    expect(TASK_GUIDE_MAP["Get Wedding Insurance"]).toEqual({
      slug: "insurance",
      label: "Insurance Guide",
    });
  });

  it("maps 'Plan Speeches' to speeches guide", () => {
    expect(TASK_GUIDE_MAP["Plan Speeches"]).toEqual({
      slug: "speeches",
      label: "Speeches Guide",
    });
  });

  it("returns undefined for unknown tasks", () => {
    expect(TASK_GUIDE_MAP["Unknown Task"]).toBeUndefined();
    expect(TASK_GUIDE_MAP["Order Cake"]).toBeUndefined();
    expect(TASK_GUIDE_MAP[""]).toBeUndefined();
  });

  it("contains entries for all wedding dress related tasks", () => {
    expect(TASK_GUIDE_MAP["Buy Wedding Dress"]?.slug).toBe("wedding-dress");
    expect(TASK_GUIDE_MAP["Schedule Dress Fittings"]?.slug).toBe("wedding-dress");
    expect(TASK_GUIDE_MAP["Final Dress Fitting"]?.slug).toBe("wedding-dress");
  });
});
