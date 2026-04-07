import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { PremiumButton } from "./PremiumGate";

// Mock sonner
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

beforeEach(() => {
  // Mock fetch for subscription-status endpoint
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          hasAccess: true,
          isPaid: true,
          isTrialing: false,
          trialDaysLeft: 0,
          trialExpired: false,
        }),
    } as Response)
  ) as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PremiumButton", () => {
  it("renders the button with children", () => {
    const { getByText } = render(
      <PremiumButton onClick={() => {}}>Upgrade</PremiumButton>
    );
    expect(getByText("Upgrade")).toBeInTheDocument();
  });

  it("renders as a button element", () => {
    const { getByText } = render(
      <PremiumButton onClick={() => {}}>Click me</PremiumButton>
    );
    expect(getByText("Click me").tagName).toBe("BUTTON");
  });

  it("applies custom className", () => {
    const { getByText } = render(
      <PremiumButton onClick={() => {}} className="btn-primary">
        Styled
      </PremiumButton>
    );
    expect(getByText("Styled").className).toContain("btn-primary");
  });

  it("respects disabled prop", () => {
    const { getByText } = render(
      <PremiumButton onClick={() => {}} disabled>
        Disabled
      </PremiumButton>
    );
    expect(getByText("Disabled")).toBeDisabled();
  });

  it("has type=button attribute", () => {
    const { getByText } = render(
      <PremiumButton onClick={() => {}}>Type check</PremiumButton>
    );
    expect(getByText("Type check")).toHaveAttribute("type", "button");
  });

  it("calls onClick when clicked and has access (default while loading)", () => {
    const onClick = vi.fn();
    const { getByText } = render(
      <PremiumButton onClick={onClick}>Action</PremiumButton>
    );
    fireEvent.click(getByText("Action"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
