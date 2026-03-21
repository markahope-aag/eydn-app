 
import { describe, it, expect } from "vitest";
import {
  requireFields,
  isValidEmail,
  pickFields,
  isOneOf,
  isValidString,
  isValidOptionalString,
} from "./validation";

describe("validation – simulated create guest workflow", () => {
  it("validates a complete guest creation flow", () => {
    const body: Record<string, unknown> = {
      name: "Jane Doe",
      email: "jane@example.com",
      rsvp_status: "pending",
    };

    // Step 1: Check required fields
    expect(requireFields(body, ["name"])).toBeNull();

    // Step 2: Validate email
    expect(isValidEmail(body.email)).toBe(true);

    // Step 3: Pick allowed fields
    const allowed = pickFields(body, ["name", "email", "rsvp_status"]);
    expect(allowed).toEqual(body);
    expect((allowed as Record<string, unknown>).password).toBeUndefined();
  });

  it("strips extra fields through pickFields", () => {
    const body: Record<string, unknown> = {
      name: "Jane Doe",
      email: "jane@example.com",
      rsvp_status: "pending",
      password: "hunter2",
      isAdmin: true,
    };

    const allowed = pickFields(body, ["name", "email", "rsvp_status"]);
    expect(allowed).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      rsvp_status: "pending",
    });
    expect((allowed as Record<string, unknown>).password).toBeUndefined();
    expect((allowed as Record<string, unknown>).isAdmin).toBeUndefined();
  });
});

describe("validation – simulated create vendor workflow", () => {
  it("accepts valid vendor status", () => {
    const statuses = ["searching", "contacted", "booked"] as const;
    expect(isOneOf("searching", statuses)).toBe(true);
    expect(isOneOf("contacted", statuses)).toBe(true);
    expect(isOneOf("booked", statuses)).toBe(true);
  });

  it("rejects invalid vendor status", () => {
    const body = { name: "Photo Co", category: "Photographer", status: "INVALID" };
    expect(isOneOf(body.status, ["searching", "contacted", "booked"])).toBe(false);
  });

  it("rejects non-string values in isOneOf", () => {
    expect(isOneOf(42, ["searching", "contacted"])).toBe(false);
    expect(isOneOf(null, ["searching"])).toBe(false);
    expect(isOneOf(undefined, ["searching"])).toBe(false);
  });
});

describe("validation – edge cases", () => {
  it("XSS payload in string fields is accepted (validation is format-only)", () => {
    const xss = '<script>alert("xss")</script>';
    expect(isValidString(xss)).toBe(true);
    expect(isValidOptionalString(xss)).toBe(true);
  });

  it("very long strings hit max length", () => {
    const longStr = "a".repeat(501);
    expect(isValidString(longStr, 500)).toBe(false);
    expect(isValidString(longStr, 600)).toBe(true);
  });

  it("empty object passes through pickFields as empty", () => {
    const result = pickFields({}, ["name", "email"]);
    expect(result).toEqual({});
  });

  it("requireFields catches null values", () => {
    const body: Record<string, unknown> = { name: null };
    expect(requireFields(body, ["name"])).toBe("name");
  });

  it("requireFields catches undefined values", () => {
    const body: Record<string, unknown> = {};
    expect(requireFields(body, ["name"])).toBe("name");
  });

  it("requireFields catches empty string (whitespace-only)", () => {
    const body: Record<string, unknown> = { name: "" };
    expect(requireFields(body, ["name"])).toBe("name");

    const bodyWhitespace: Record<string, unknown> = { name: "   " };
    expect(requireFields(bodyWhitespace, ["name"])).toBe("name");
  });

  it("requireFields returns null when all fields are present", () => {
    const body: Record<string, unknown> = { name: "Alice", email: "a@b.com" };
    expect(requireFields(body, ["name", "email"])).toBeNull();
  });

  it("isValidEmail rejects invalid formats", () => {
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("@missing.com")).toBe(false);
    expect(isValidEmail("no spaces@test.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(42)).toBe(false);
  });

  it("isValidEmail rejects overly long emails", () => {
    const longEmail = "a".repeat(310) + "@example.com";
    expect(longEmail.length).toBeGreaterThan(320);
    expect(isValidEmail(longEmail)).toBe(false);
  });
});
