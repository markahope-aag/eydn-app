 
import { describe, it, expect } from "vitest";
import {
  pickFields,
  isOneOf,
  isValidString,
  isValidOptionalString,
  isValidEmail,
  isValidUrl,
  isValidNumber,
  isValidDate,
  isValidBoolean,
  requireFields,
  safeParseJSON,
  isParseError,
} from "./validation";

function mockRequest(body: string) {
  return new Request("http://localhost/test", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });
}

describe("pickFields", () => {
  it("picks only allowed keys", () => {
    const result = pickFields({ a: 1, b: 2, c: 3 }, ["a", "c"]);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("drops keys not in the allowed list", () => {
    const result = pickFields({ secret: "bad", name: "ok" }, ["name"]);
    expect(result).toEqual({ name: "ok" });
    expect(result).not.toHaveProperty("secret");
  });

  it("handles empty body", () => {
    const result = pickFields({}, ["a", "b"]);
    expect(result).toEqual({});
  });

  it("handles empty allowed list", () => {
    const result = pickFields({ a: 1, b: 2 }, []);
    expect(result).toEqual({});
  });
});

describe("isOneOf", () => {
  const allowed = ["red", "green", "blue"] as const;

  it("returns true for a valid value", () => {
    expect(isOneOf("red", allowed)).toBe(true);
    expect(isOneOf("blue", allowed)).toBe(true);
  });

  it("returns false for an invalid value", () => {
    expect(isOneOf("yellow", allowed)).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isOneOf(42, allowed)).toBe(false);
    expect(isOneOf(null, allowed)).toBe(false);
    expect(isOneOf(undefined, allowed)).toBe(false);
  });
});

describe("isValidString", () => {
  it("accepts a string within the default max length", () => {
    expect(isValidString("hello")).toBe(true);
  });

  it("accepts an empty string", () => {
    expect(isValidString("")).toBe(true);
  });

  it("accepts a string at the custom max length", () => {
    expect(isValidString("abc", 3)).toBe(true);
  });

  it("rejects a string exceeding max length", () => {
    expect(isValidString("abcd", 3)).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidString(123)).toBe(false);
    expect(isValidString(null)).toBe(false);
    expect(isValidString(undefined)).toBe(false);
    expect(isValidString(true)).toBe(false);
  });
});

describe("isValidOptionalString", () => {
  it("accepts null", () => {
    expect(isValidOptionalString(null)).toBe(true);
  });

  it("accepts undefined", () => {
    expect(isValidOptionalString(undefined)).toBe(true);
  });

  it("accepts a valid string", () => {
    expect(isValidOptionalString("hello")).toBe(true);
  });

  it("rejects a string exceeding max length", () => {
    expect(isValidOptionalString("abcd", 3)).toBe(false);
  });

  it("rejects non-string, non-null values", () => {
    expect(isValidOptionalString(42)).toBe(false);
    expect(isValidOptionalString(true)).toBe(false);
  });
});

describe("isValidEmail", () => {
  it("accepts valid email addresses", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("first.last@sub.domain.org")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@missing-local.com")).toBe(false);
    expect(isValidEmail("missing@.com")).toBe(false);
    expect(isValidEmail("has spaces@example.com")).toBe(false);
  });

  it("rejects strings longer than 320 characters", () => {
    const longEmail = "a".repeat(310) + "@example.com";
    expect(isValidEmail(longEmail)).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidEmail(42)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });
});

describe("isValidUrl", () => {
  it("accepts valid URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://localhost:3000/path?q=1")).toBe(true);
  });

  it("rejects invalid URLs", () => {
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("://missing-scheme")).toBe(false);
  });

  it("rejects URLs longer than 2048 characters", () => {
    const longUrl = "https://example.com/" + "a".repeat(2040);
    expect(isValidUrl(longUrl)).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidUrl(42)).toBe(false);
    expect(isValidUrl(null)).toBe(false);
  });
});

describe("isValidNumber", () => {
  it("accepts valid numbers", () => {
    expect(isValidNumber(42)).toBe(true);
    expect(isValidNumber(0)).toBe(true);
    expect(isValidNumber(-3.14)).toBe(true);
  });

  it("respects min constraint", () => {
    expect(isValidNumber(5, 1)).toBe(true);
    expect(isValidNumber(0, 1)).toBe(false);
  });

  it("respects max constraint", () => {
    expect(isValidNumber(5, undefined, 10)).toBe(true);
    expect(isValidNumber(15, undefined, 10)).toBe(false);
  });

  it("respects min and max together", () => {
    expect(isValidNumber(5, 1, 10)).toBe(true);
    expect(isValidNumber(0, 1, 10)).toBe(false);
    expect(isValidNumber(11, 1, 10)).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(isValidNumber(NaN)).toBe(false);
    expect(isValidNumber(Infinity)).toBe(false);
    expect(isValidNumber(-Infinity)).toBe(false);
  });

  it("rejects non-number values", () => {
    expect(isValidNumber("5")).toBe(false);
    expect(isValidNumber(null)).toBe(false);
    expect(isValidNumber(undefined)).toBe(false);
  });
});

describe("isValidDate", () => {
  it("accepts valid YYYY-MM-DD dates", () => {
    expect(isValidDate("2024-01-15")).toBe(true);
    expect(isValidDate("2000-12-31")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidDate("01-15-2024")).toBe(false);
    expect(isValidDate("2024/01/15")).toBe(false);
    expect(isValidDate("Jan 15, 2024")).toBe(false);
  });

  it("rejects invalid dates that match the pattern", () => {
    expect(isValidDate("2024-13-01")).toBe(false);
    expect(isValidDate("2024-00-01")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidDate(20240115)).toBe(false);
    expect(isValidDate(null)).toBe(false);
  });
});

describe("isValidBoolean", () => {
  it("accepts true and false", () => {
    expect(isValidBoolean(true)).toBe(true);
    expect(isValidBoolean(false)).toBe(true);
  });

  it("rejects string representations", () => {
    expect(isValidBoolean("true")).toBe(false);
    expect(isValidBoolean("false")).toBe(false);
  });

  it("rejects numbers", () => {
    expect(isValidBoolean(0)).toBe(false);
    expect(isValidBoolean(1)).toBe(false);
  });
});

describe("requireFields", () => {
  it("returns null when all required fields are present", () => {
    expect(requireFields({ name: "Alice", age: 30 }, ["name", "age"])).toBeNull();
  });

  it("returns the first missing field name", () => {
    expect(requireFields({ name: "Alice" }, ["name", "email"])).toBe("email");
  });

  it("treats null values as missing", () => {
    expect(requireFields({ name: null }, ["name"])).toBe("name");
  });

  it("treats undefined values as missing", () => {
    expect(requireFields({ name: undefined }, ["name"])).toBe("name");
  });

  it("treats empty/whitespace strings as missing", () => {
    expect(requireFields({ name: "" }, ["name"])).toBe("name");
    expect(requireFields({ name: "   " }, ["name"])).toBe("name");
  });

  it("accepts non-string truthy values", () => {
    expect(requireFields({ count: 0, active: false }, ["count", "active"])).toBeNull();
  });
});

describe("safeParseJSON", () => {
  it("parses valid JSON from a request", async () => {
    const req = mockRequest(JSON.stringify({ name: "test" }));
    const result = await safeParseJSON(req);
    expect(isParseError(result)).toBe(false);
    expect(result).toEqual({ name: "test" });
  });

  it("returns a Response for invalid JSON", async () => {
    const req = mockRequest("not json{{{");
    const result = await safeParseJSON(req);
    expect(isParseError(result)).toBe(true);
    expect(result).toBeInstanceOf(Response);
  });
});

describe("isParseError", () => {
  it("returns true for a Response instance", () => {
    const response = new Response("error", { status: 400 });
    expect(isParseError(response)).toBe(true);
  });

  it("returns false for a plain object", () => {
    expect(isParseError({ name: "test" })).toBe(false);
  });
});
