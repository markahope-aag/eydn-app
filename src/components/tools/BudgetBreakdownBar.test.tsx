import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import BudgetBreakdownBar from "./BudgetBreakdownBar";

afterEach(() => {
  cleanup();
});

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

describe("BudgetBreakdownBar", () => {
  it("renders the category name", () => {
    const { getByText } = render(
      <BudgetBreakdownBar name="Venue" amount={5950} barPct={100} color="#2C3E2D" formatCurrency={fmt} />
    );
    expect(getByText("Venue")).toBeInTheDocument();
  });

  it("renders the formatted amount", () => {
    const { getByText } = render(
      <BudgetBreakdownBar name="Catering" amount={4800} barPct={80} color="#C08080" formatCurrency={fmt} />
    );
    expect(getByText("$4,800")).toBeInTheDocument();
  });

  it("renders a meter element with correct aria attributes", () => {
    const { getByRole } = render(
      <BudgetBreakdownBar name="Florals" amount={2250} barPct={45} color="#D4A5A5" formatCurrency={fmt} />
    );
    const meter = getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "45");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute("aria-label", "Florals");
  });

  it("applies the bar width as a percentage style", () => {
    const { getByRole } = render(
      <BudgetBreakdownBar name="Music" amount={1500} barPct={60} color="#3A5240" formatCurrency={fmt} />
    );
    const meter = getByRole("meter");
    expect(meter).toHaveStyle({ width: "60%" });
  });

  it("applies the provided color as background", () => {
    const { getByRole } = render(
      <BudgetBreakdownBar name="Attire" amount={1625} barPct={30} color="#6B5E50" formatCurrency={fmt} />
    );
    const meter = getByRole("meter");
    expect(meter).toHaveStyle({ backgroundColor: "#6B5E50" });
  });

  it("uses the custom formatCurrency function", () => {
    const customFmt = (n: number) => `EUR ${n.toFixed(0)}`;
    const { getByText } = render(
      <BudgetBreakdownBar name="Transport" amount={500} barPct={10} color="#4A6A4E" formatCurrency={customFmt} />
    );
    expect(getByText("EUR 500")).toBeInTheDocument();
  });

  it("handles zero amount and percentage", () => {
    const { getByRole, getByText } = render(
      <BudgetBreakdownBar name="Ceremony" amount={0} barPct={0} color="#2A2018" formatCurrency={fmt} />
    );
    expect(getByText("$0")).toBeInTheDocument();
    expect(getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
  });

  it("handles 100% bar width", () => {
    const { getByRole } = render(
      <BudgetBreakdownBar name="Venue" amount={10000} barPct={100} color="#2C3E2D" formatCurrency={fmt} />
    );
    expect(getByRole("meter")).toHaveStyle({ width: "100%" });
  });
});
