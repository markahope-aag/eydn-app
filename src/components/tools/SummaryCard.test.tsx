import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import SummaryCard from "./SummaryCard";

afterEach(() => {
  cleanup();
});

describe("SummaryCard", () => {
  it("renders the label text", () => {
    const { getByText } = render(<SummaryCard label="Per guest" value="$208" />);
    expect(getByText("Per guest")).toBeInTheDocument();
  });

  it("renders the value text", () => {
    const { getByText } = render(<SummaryCard label="Per guest" value="$208" />);
    expect(getByText("$208")).toBeInTheDocument();
  });

  it("applies default valueClassName when none provided", () => {
    const { getByText } = render(<SummaryCard label="Budget" value="$25,000" />);
    const valueEl = getByText("$25,000");
    expect(valueEl.className).toContain("text-plum");
  });

  it("applies custom valueClassName when provided", () => {
    const { getByText } = render(
      <SummaryCard label="vs. avg" value="+$5,000" valueClassName="text-amber-600" />
    );
    const valueEl = getByText("+$5,000");
    expect(valueEl.className).toContain("text-amber-600");
  });

  it("renders with negative value text", () => {
    const { getByText } = render(
      <SummaryCard label="vs. avg" value="-$3,000" valueClassName="text-emerald-600" />
    );
    expect(getByText("-$3,000")).toBeInTheDocument();
  });

  it("renders with 'On par' value", () => {
    const { getByText } = render(
      <SummaryCard label="vs. avg" value="On par" valueClassName="text-plum" />
    );
    expect(getByText("On par")).toBeInTheDocument();
  });
});
