import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { DayOfReveal } from "./DayOfReveal";

// Mock Confetti
const mockTriggerConfetti = vi.fn();
vi.mock("@/components/Confetti", () => ({
  triggerConfetti: (...args: unknown[]) => mockTriggerConfetti(...args),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const STORAGE_KEY = "eydn_dayof_revealed";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("DayOfReveal", () => {
  it("renders the reveal overlay on first visit", () => {
    const { getByText } = render(
      <DayOfReveal partnerNames="Alex & Jordan" daysLeft={3} />
    );
    expect(getByText("Your big day is almost here.")).toBeInTheDocument();
  });

  it("displays the days countdown", () => {
    const { getByText } = render(
      <DayOfReveal partnerNames="Alex & Jordan" daysLeft={5} />
    );
    expect(getByText(/5 days to go/)).toBeInTheDocument();
  });

  it("uses singular 'day' when daysLeft is 1", () => {
    const { getByText } = render(
      <DayOfReveal partnerNames="Alex & Jordan" daysLeft={1} />
    );
    expect(getByText(/1 day to go/)).toBeInTheDocument();
  });

  it("displays partner names", () => {
    const { getByText } = render(
      <DayOfReveal partnerNames="Sam & Riley" daysLeft={7} />
    );
    expect(getByText(/Sam & Riley, this is going to be beautiful/)).toBeInTheDocument();
  });

  it("renders the day-of planner link", () => {
    const { getByText } = render(
      <DayOfReveal partnerNames="Alex & Jordan" daysLeft={3} />
    );
    const link = getByText("View Your Day-of Planner");
    expect(link.closest("a")).toHaveAttribute("href", "/dashboard/day-of");
  });

  it("sets localStorage flag on first render", () => {
    render(<DayOfReveal partnerNames="Alex & Jordan" daysLeft={3} />);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
  });

  it("does not render if localStorage flag already set", () => {
    localStorage.setItem(STORAGE_KEY, "1");
    const { container } = render(
      <DayOfReveal partnerNames="Alex & Jordan" daysLeft={3} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("dismisses when 'Continue to Dashboard' is clicked", () => {
    const { getByText, container } = render(
      <DayOfReveal partnerNames="Alex & Jordan" daysLeft={3} />
    );
    expect(getByText("Your big day is almost here.")).toBeInTheDocument();
    fireEvent.click(getByText("Continue to Dashboard"));
    expect(container.innerHTML).toBe("");
  });

  it("triggers confetti on first render", () => {
    mockTriggerConfetti.mockClear();
    render(<DayOfReveal partnerNames="Alex & Jordan" daysLeft={3} />);
    vi.advanceTimersByTime(400);
    expect(mockTriggerConfetti).toHaveBeenCalled();
  });

  it("does not trigger confetti on subsequent renders", () => {
    localStorage.setItem(STORAGE_KEY, "1");
    mockTriggerConfetti.mockClear();
    render(<DayOfReveal partnerNames="Alex & Jordan" daysLeft={3} />);
    vi.advanceTimersByTime(500);
    expect(mockTriggerConfetti).not.toHaveBeenCalled();
  });
});
