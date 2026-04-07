import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { MilestoneCelebration } from "./MilestoneCelebration";

// Mock Confetti component and triggerConfetti
const mockTriggerConfetti = vi.fn();
vi.mock("@/components/Confetti", () => ({
  Confetti: () => <div data-testid="confetti" />,
  triggerConfetti: (...args: unknown[]) => mockTriggerConfetti(...args),
}));

const STORAGE_KEY = "eydn_last_milestone";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("MilestoneCelebration", () => {
  it("renders confetti container always", () => {
    const { getByTestId } = render(
      <MilestoneCelebration taskPct={10} name="Alex" />
    );
    expect(getByTestId("confetti")).toBeInTheDocument();
  });

  it("does not show milestone banner when below 25%", () => {
    const { queryByText } = render(
      <MilestoneCelebration taskPct={20} name="Alex" />
    );
    expect(queryByText(/Milestone Reached/)).not.toBeInTheDocument();
  });

  it("shows 25% milestone banner when at 25%", () => {
    const { getByText } = render(
      <MilestoneCelebration taskPct={25} name="Alex" />
    );
    expect(getByText(/Milestone Reached — 25%/)).toBeInTheDocument();
    expect(getByText(/25% done, Alex/)).toBeInTheDocument();
  });

  it("shows 50% milestone banner when at 50%", () => {
    localStorage.setItem(STORAGE_KEY, "25");
    const { getByText } = render(
      <MilestoneCelebration taskPct={50} name="Jordan" />
    );
    expect(getByText(/Milestone Reached — 50%/)).toBeInTheDocument();
    expect(getByText(/halfway there, Jordan/)).toBeInTheDocument();
  });

  it("shows 75% milestone banner when at 75%", () => {
    localStorage.setItem(STORAGE_KEY, "50");
    const { getByText } = render(
      <MilestoneCelebration taskPct={75} name="Sam" />
    );
    expect(getByText(/Milestone Reached — 75%/)).toBeInTheDocument();
    expect(getByText(/75% done, Sam/)).toBeInTheDocument();
  });

  it("shows 100% milestone banner when at 100%", () => {
    localStorage.setItem(STORAGE_KEY, "75");
    const { getByText } = render(
      <MilestoneCelebration taskPct={100} name="Riley" />
    );
    expect(getByText(/Milestone Reached — 100%/)).toBeInTheDocument();
    expect(getByText(/Every single task is done, Riley/)).toBeInTheDocument();
  });

  it("stores the reached milestone in localStorage", () => {
    render(<MilestoneCelebration taskPct={50} name="Alex" />);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("50");
  });

  it("does not re-show a previously celebrated milestone", () => {
    localStorage.setItem(STORAGE_KEY, "50");
    const { queryByText } = render(
      <MilestoneCelebration taskPct={50} name="Alex" />
    );
    expect(queryByText(/Milestone Reached/)).not.toBeInTheDocument();
  });

  it("shows the highest reached milestone when skipping", () => {
    // Jump from 0 to 75% — should show 75% (the highest)
    const { getByText } = render(
      <MilestoneCelebration taskPct={75} name="Pat" />
    );
    expect(getByText(/Milestone Reached — 75%/)).toBeInTheDocument();
  });

  it("stores the highest milestone when skipping", () => {
    render(<MilestoneCelebration taskPct={75} name="Pat" />);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("75");
  });

  it("dismisses the banner when the dismiss button is clicked", () => {
    const { getByLabelText, queryByText } = render(
      <MilestoneCelebration taskPct={25} name="Alex" />
    );
    expect(queryByText(/Milestone Reached/)).toBeInTheDocument();
    fireEvent.click(getByLabelText("Dismiss"));
    expect(queryByText(/Milestone Reached/)).not.toBeInTheDocument();
  });

  it("triggers confetti on milestone reach", () => {
    mockTriggerConfetti.mockClear();
    render(<MilestoneCelebration taskPct={25} name="Alex" />);
    vi.advanceTimersByTime(300);
    expect(mockTriggerConfetti).toHaveBeenCalled();
  });
});
