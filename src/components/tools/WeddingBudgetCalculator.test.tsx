import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import WeddingBudgetCalculator from "./WeddingBudgetCalculator";

// Mock sonner
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, priority, unoptimized, ...rest } = props;
    void fill; void priority; void unoptimized;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// Mock useSearchParams
const mockSearchParams = new Map<string, string>();
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) ?? null,
  }),
}));

beforeEach(() => {
  mockSearchParams.clear();
  // Mock window.history.replaceState
  vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WeddingBudgetCalculator", () => {
  it("renders without crashing", () => {
    render(<WeddingBudgetCalculator />);
    expect(screen.getByLabelText("Total wedding budget")).toBeInTheDocument();
    expect(screen.getByLabelText("Number of wedding guests")).toBeInTheDocument();
  });

  it("renders the budget slider with default value of $25,000", () => {
    render(<WeddingBudgetCalculator />);
    const slider = screen.getByLabelText("Total wedding budget") as HTMLInputElement;
    expect(slider.value).toBe("25000");
  });

  it("renders the guest count slider with default value of 120", () => {
    render(<WeddingBudgetCalculator />);
    const slider = screen.getByLabelText("Number of wedding guests") as HTMLInputElement;
    expect(slider.value).toBe("120");
  });

  it("renders the state selector defaulting to Wisconsin", () => {
    render(<WeddingBudgetCalculator />);
    const select = screen.getByLabelText("Wedding state") as HTMLSelectElement;
    expect(select.value).toBe("Wisconsin");
  });

  it("renders the month selector defaulting to September (index 8)", () => {
    render(<WeddingBudgetCalculator />);
    const select = screen.getByLabelText("Wedding month") as HTMLSelectElement;
    expect(select.value).toBe("8");
  });

  it("displays per-guest cost in summary", () => {
    // Default: $25,000 / 120 guests = $208 per guest
    render(<WeddingBudgetCalculator />);
    expect(screen.getByText("Per guest")).toBeInTheDocument();
    expect(screen.getByText("$208")).toBeInTheDocument();
  });

  it("displays hidden cost buffer information", () => {
    // 9% of $25,000 = $2,250
    render(<WeddingBudgetCalculator />);
    expect(screen.getByText(/Reserve \$2,250 \(9%\) for hidden costs/)).toBeInTheDocument();
  });

  it("displays all budget category names", () => {
    render(<WeddingBudgetCalculator />);
    expect(screen.getByText("Venue")).toBeInTheDocument();
    expect(screen.getByText("Catering & bar")).toBeInTheDocument();
    expect(screen.getByText("Photography & video")).toBeInTheDocument();
    expect(screen.getByText("Florals & decor")).toBeInTheDocument();
    expect(screen.getByText("Attire & beauty")).toBeInTheDocument();
    expect(screen.getByText("Music & entertainment")).toBeInTheDocument();
    expect(screen.getByText("Rehearsal dinner")).toBeInTheDocument();
    expect(screen.getByText("Stationery & gifts")).toBeInTheDocument();
    expect(screen.getByText("Transportation")).toBeInTheDocument();
    expect(screen.getByText("Ceremony & officiant")).toBeInTheDocument();
  });

  it("shows peak season note for peak months", () => {
    // Default month is September (peak)
    render(<WeddingBudgetCalculator />);
    expect(screen.getByText(/Peak season months/)).toBeInTheDocument();
  });

  it("shows off-season note when selecting an off-season month", () => {
    render(<WeddingBudgetCalculator />);
    const monthSelect = screen.getByLabelText("Wedding month") as HTMLSelectElement;
    fireEvent.change(monthSelect, { target: { value: "0" } }); // January
    expect(screen.getByText(/Off-season dates often unlock/)).toBeInTheDocument();
  });

  it("updates budget when slider is changed", () => {
    render(<WeddingBudgetCalculator />);
    const slider = screen.getByLabelText("Total wedding budget") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "50000" } });
    expect(slider.value).toBe("50000");
  });

  it("updates guest count when slider is changed", () => {
    render(<WeddingBudgetCalculator />);
    const slider = screen.getByLabelText("Number of wedding guests") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "200" } });
    expect(slider.value).toBe("200");
  });

  it("renders the CTA link to sign up", () => {
    render(<WeddingBudgetCalculator />);
    const ctaLink = screen.getByText(/Start free/);
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink.closest("a")).toHaveAttribute("href", "/sign-up");
  });

  it("renders share and save buttons", () => {
    render(<WeddingBudgetCalculator />);
    expect(screen.getByText("Share your breakdown")).toBeInTheDocument();
    expect(screen.getByText("Save as PDF")).toBeInTheDocument();
    expect(screen.getByText("Save my breakdown")).toBeInTheDocument();
  });

  // URL param initialization tests
  it("initializes budget from URL param", () => {
    mockSearchParams.set("budget", "40000");
    render(<WeddingBudgetCalculator />);
    const slider = screen.getByLabelText("Total wedding budget") as HTMLInputElement;
    expect(slider.value).toBe("40000");
  });

  it("clamps budget URL param to min of 5000", () => {
    mockSearchParams.set("budget", "1000");
    render(<WeddingBudgetCalculator />);
    const slider = screen.getByLabelText("Total wedding budget") as HTMLInputElement;
    expect(slider.value).toBe("5000");
  });

  it("clamps budget URL param to max of 75000", () => {
    mockSearchParams.set("budget", "100000");
    render(<WeddingBudgetCalculator />);
    const slider = screen.getByLabelText("Total wedding budget") as HTMLInputElement;
    expect(slider.value).toBe("75000");
  });

  it("initializes guests from URL param", () => {
    mockSearchParams.set("guests", "200");
    render(<WeddingBudgetCalculator />);
    const slider = screen.getByLabelText("Number of wedding guests") as HTMLInputElement;
    expect(slider.value).toBe("200");
  });

  it("clamps guests URL param to min of 10", () => {
    mockSearchParams.set("guests", "2");
    render(<WeddingBudgetCalculator />);
    const slider = screen.getByLabelText("Number of wedding guests") as HTMLInputElement;
    expect(slider.value).toBe("10");
  });

  it("clamps guests URL param to max of 300", () => {
    mockSearchParams.set("guests", "500");
    render(<WeddingBudgetCalculator />);
    const slider = screen.getByLabelText("Number of wedding guests") as HTMLInputElement;
    expect(slider.value).toBe("300");
  });

  it("initializes state from URL param", () => {
    mockSearchParams.set("state", "California");
    render(<WeddingBudgetCalculator />);
    const select = screen.getByLabelText("Wedding state") as HTMLSelectElement;
    expect(select.value).toBe("California");
  });

  it("falls back to Wisconsin for invalid state URL param", () => {
    mockSearchParams.set("state", "Narnia");
    render(<WeddingBudgetCalculator />);
    const select = screen.getByLabelText("Wedding state") as HTMLSelectElement;
    expect(select.value).toBe("Wisconsin");
  });

  it("initializes month from URL param", () => {
    mockSearchParams.set("month", "5"); // June
    render(<WeddingBudgetCalculator />);
    const select = screen.getByLabelText("Wedding month") as HTMLSelectElement;
    expect(select.value).toBe("5");
  });

  it("clamps month URL param to valid range", () => {
    mockSearchParams.set("month", "15");
    render(<WeddingBudgetCalculator />);
    const select = screen.getByLabelText("Wedding month") as HTMLSelectElement;
    expect(select.value).toBe("11");
  });

  it("displays owner name when name param is provided", () => {
    mockSearchParams.set("name", "Sarah");
    render(<WeddingBudgetCalculator />);
    expect(screen.getByText(/Sarah.*Wedding Budget/)).toBeInTheDocument();
  });

  it("does not display owner name when no name param", () => {
    render(<WeddingBudgetCalculator />);
    expect(screen.queryByText(/Wedding Budget/)).not.toBeInTheDocument();
  });

  it("displays state average for the selected state", () => {
    // Wisconsin avg is $24,500 -> "$25K" via formatShort
    render(<WeddingBudgetCalculator />);
    expect(screen.getByText("Wisconsin avg")).toBeInTheDocument();
    expect(screen.getByText("$25K")).toBeInTheDocument();
  });

  it("shows save modal when 'Save my breakdown' is clicked", () => {
    render(<WeddingBudgetCalculator />);
    fireEvent.click(screen.getByText("Save my breakdown"));
    expect(screen.getByText("Save your breakdown")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("First name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Your email")).toBeInTheDocument();
  });
});
