import { describe, it, expect } from "vitest";
import { formatDate, money, createStyles, rowStyle, brand, SECTIONS } from "./styles";

describe("formatDate", () => {
  it("formats a valid ISO date string", () => {
    const result = formatDate("2025-09-20");
    expect(result).toContain("September");
    expect(result).toContain("20");
    expect(result).toContain("2025");
    expect(result).toContain("Saturday");
  });

  it("returns 'Date TBD' for null input", () => {
    expect(formatDate(null)).toBe("Date TBD");
  });

  it("returns 'Date TBD' for empty string", () => {
    // Empty string is falsy, so it should return TBD
    expect(formatDate("")).toBe("Date TBD");
  });

  it("formats a date at the start of the year", () => {
    const result = formatDate("2025-01-01");
    expect(result).toContain("January");
    expect(result).toContain("1");
    expect(result).toContain("2025");
  });

  it("formats a date at the end of the year", () => {
    const result = formatDate("2025-12-31");
    expect(result).toContain("December");
    expect(result).toContain("31");
    expect(result).toContain("2025");
  });

  it("includes the weekday in the formatted output", () => {
    // 2025-09-20 is a Saturday
    const result = formatDate("2025-09-20");
    expect(result).toContain("Saturday");
  });
});

describe("money", () => {
  it("formats a positive number with two decimal places", () => {
    expect(money(1500)).toBe("$1,500.00");
  });

  it("formats zero", () => {
    expect(money(0)).toBe("$0.00");
  });

  it("returns $0.00 for null", () => {
    expect(money(null)).toBe("$0.00");
  });

  it("returns $0.00 for undefined", () => {
    expect(money(undefined)).toBe("$0.00");
  });

  it("formats decimal values correctly", () => {
    expect(money(99.9)).toBe("$99.90");
  });

  it("formats large numbers with comma separators", () => {
    expect(money(25000)).toBe("$25,000.00");
  });

  it("formats negative numbers", () => {
    const result = money(-500);
    expect(result).toContain("500.00");
  });
});

describe("brand", () => {
  it("contains expected color keys", () => {
    expect(brand.forest).toBe("#2C3E2D");
    expect(brand.gold).toBe("#C9A84C");
    expect(brand.cream).toBe("#FAF6F1");
    expect(brand.charcoal).toBe("#1A1A2E");
    expect(brand.rose).toBe("#C08080");
    expect(brand.champagne).toBe("#E8D5B7");
    expect(brand.white).toBe("#FFFFFF");
    expect(brand.muted).toBe("#6B6B6B");
  });
});

describe("SECTIONS", () => {
  it("contains all expected section names", () => {
    expect(SECTIONS).toContain("Vendor Contact Sheet");
    expect(SECTIONS).toContain("Timeline");
    expect(SECTIONS).toContain("Ceremony");
    expect(SECTIONS).toContain("Guest List");
    expect(SECTIONS).toContain("Budget Summary");
    expect(SECTIONS).toContain("Packing Checklist");
    expect(SECTIONS).toContain("Notes");
  });

  it("has 15 sections", () => {
    expect(SECTIONS).toHaveLength(15);
  });
});

describe("createStyles", () => {
  it("creates styles using the provided StyleSheet factory", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockStyleSheet = { create: (styles: any) => styles };
    const styles = createStyles(mockStyleSheet);

    expect(styles).toHaveProperty("page");
    expect(styles).toHaveProperty("body");
    expect(styles).toHaveProperty("coverPage");
    expect(styles).toHaveProperty("coverNames");
    expect(styles).toHaveProperty("sectionName");
    expect(styles).toHaveProperty("tableContainer");
    expect(styles).toHaveProperty("tableHeaderRow");
    expect(styles).toHaveProperty("tableRow");
    expect(styles).toHaveProperty("tableRowAlt");
    expect(styles).toHaveProperty("footer");
    expect(styles).toHaveProperty("checkRow");
    expect(styles).toHaveProperty("tocRow");
    expect(styles).toHaveProperty("noteLine");
    expect(styles).toHaveProperty("totalRow");
  });

  it("applies brand colors to style properties", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockStyleSheet = { create: (styles: any) => styles };
    const styles = createStyles(mockStyleSheet);

    expect(styles.page.color).toBe(brand.charcoal);
    expect(styles.coverPage.backgroundColor).toBe(brand.cream);
    expect(styles.coverNames.color).toBe(brand.forest);
    expect(styles.sectionName.color).toBe(brand.forest);
    expect(styles.tableHeaderRow.backgroundColor).toBe(brand.champagne);
  });

  it("uses Helvetica font family", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockStyleSheet = { create: (styles: any) => styles };
    const styles = createStyles(mockStyleSheet);

    expect(styles.page.fontFamily).toBe("Helvetica");
    expect(styles.coverNames.fontFamily).toBe("Helvetica-Bold");
  });
});

describe("rowStyle", () => {
  it("returns tableRow for even indices", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockStyleSheet = { create: (styles: any) => styles };
    const styles = createStyles(mockStyleSheet);

    expect(rowStyle(styles, 0)).toBe(styles.tableRow);
    expect(rowStyle(styles, 2)).toBe(styles.tableRow);
    expect(rowStyle(styles, 4)).toBe(styles.tableRow);
  });

  it("returns tableRowAlt for odd indices", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockStyleSheet = { create: (styles: any) => styles };
    const styles = createStyles(mockStyleSheet);

    expect(rowStyle(styles, 1)).toBe(styles.tableRowAlt);
    expect(rowStyle(styles, 3)).toBe(styles.tableRowAlt);
    expect(rowStyle(styles, 5)).toBe(styles.tableRowAlt);
  });
});
