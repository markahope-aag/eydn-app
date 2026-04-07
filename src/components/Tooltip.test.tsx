import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { Tooltip, HelpLabel } from "./Tooltip";

afterEach(() => {
  cleanup();
});

describe("Tooltip", () => {
  it("renders the ? trigger button", () => {
    const { getByRole } = render(<Tooltip text="Help text here" />);
    const button = getByRole("button", { name: /help/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("?");
  });

  it("does not show tooltip text by default", () => {
    const { queryByRole } = render(<Tooltip text="Hidden help text" />);
    expect(queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows tooltip on focus", () => {
    const { getByRole } = render(<Tooltip text="Focused help text" />);
    const button = getByRole("button", { name: /help/i });
    fireEvent.focus(button);
    expect(getByRole("tooltip")).toBeInTheDocument();
    expect(getByRole("tooltip")).toHaveTextContent("Focused help text");
  });

  it("shows tooltip on mouseEnter", () => {
    const { getByRole } = render(<Tooltip text="Hovered help text" />);
    const button = getByRole("button", { name: /help/i });
    fireEvent.mouseEnter(button);
    expect(getByRole("tooltip")).toBeInTheDocument();
    expect(getByRole("tooltip")).toHaveTextContent("Hovered help text");
  });

  it("hides tooltip on mouseLeave", () => {
    const { getByRole, queryByRole } = render(<Tooltip text="Temporary text" />);
    const button = getByRole("button", { name: /help/i });
    fireEvent.mouseEnter(button);
    expect(getByRole("tooltip")).toBeInTheDocument();
    fireEvent.mouseLeave(button);
    expect(queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("hides tooltip on blur", () => {
    const { getByRole, queryByRole } = render(<Tooltip text="Blur test" />);
    const button = getByRole("button", { name: /help/i });
    fireEvent.focus(button);
    expect(getByRole("tooltip")).toBeInTheDocument();
    fireEvent.blur(button);
    expect(queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("has aria-label=Help on the trigger button", () => {
    const { getByRole } = render(<Tooltip text="Accessible" />);
    const button = getByRole("button", { name: /help/i });
    expect(button).toHaveAttribute("aria-label", "Help");
  });

  it("renders children alongside the trigger", () => {
    const { getByText, getByRole } = render(
      <Tooltip text="Tooltip text"><span>Label Text</span></Tooltip>
    );
    expect(getByText("Label Text")).toBeInTheDocument();
    expect(getByRole("button", { name: /help/i })).toBeInTheDocument();
  });

  it("toggles tooltip on click", () => {
    const { getByRole, queryByRole } = render(<Tooltip text="Click toggle" />);
    const button = getByRole("button", { name: /help/i });
    fireEvent.click(button);
    expect(getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(button);
    expect(queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("closes tooltip on Escape key", () => {
    const { getByRole, queryByRole } = render(<Tooltip text="Escape test" />);
    const button = getByRole("button", { name: /help/i });
    fireEvent.click(button);
    expect(getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("closes tooltip on outside click", () => {
    const { getByRole, queryByRole } = render(
      <div>
        <Tooltip text="Outside click" />
        <button data-testid="outside">Other</button>
      </div>
    );
    const helpButton = getByRole("button", { name: /help/i });
    fireEvent.click(helpButton);
    expect(getByRole("tooltip")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("applies wide class when wide prop is true", () => {
    const { getByRole } = render(<Tooltip text="Wide tooltip" wide />);
    const button = getByRole("button", { name: /help/i });
    fireEvent.focus(button);
    const tooltip = getByRole("tooltip");
    expect(tooltip.className).toContain("w-72");
  });

  it("applies narrow class when wide prop is false", () => {
    const { getByRole } = render(<Tooltip text="Narrow tooltip" />);
    const button = getByRole("button", { name: /help/i });
    fireEvent.focus(button);
    const tooltip = getByRole("tooltip");
    expect(tooltip.className).toContain("w-56");
  });
});

describe("HelpLabel", () => {
  it("renders label text with a tooltip trigger", () => {
    const { getByText, getByRole } = render(
      <HelpLabel label="Budget" tooltip="Your total budget" />
    );
    expect(getByText("Budget")).toBeInTheDocument();
    expect(getByRole("button", { name: /help/i })).toBeInTheDocument();
  });

  it("renders as a label element", () => {
    const { container } = render(<HelpLabel label="Budget" tooltip="Help" />);
    const label = container.querySelector("label");
    expect(label).toBeInTheDocument();
  });

  it("applies default className when none provided", () => {
    const { container } = render(<HelpLabel label="Budget" tooltip="Help" />);
    const label = container.querySelector("label");
    expect(label?.className).toContain("text-muted");
  });

  it("applies custom className when provided", () => {
    const { container } = render(
      <HelpLabel label="Budget" tooltip="Help" className="custom-class" />
    );
    const label = container.querySelector("label");
    expect(label?.className).toContain("custom-class");
  });

  it("passes wide prop to Tooltip", () => {
    const { getByRole } = render(
      <HelpLabel label="Budget" tooltip="Wide help" wide />
    );
    const button = getByRole("button", { name: /help/i });
    fireEvent.focus(button);
    const tooltip = getByRole("tooltip");
    expect(tooltip.className).toContain("w-72");
  });
});
