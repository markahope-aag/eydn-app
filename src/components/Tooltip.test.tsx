import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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
});
