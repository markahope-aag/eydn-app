 
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import GuestsPage from "./page";

// Mock sonner to avoid toast rendering issues in jsdom
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

beforeEach(() => {
  global.fetch = vi.fn((url: string | URL | Request) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    if (urlStr.includes("/api/guests")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);
    }
    if (urlStr.includes("/api/subscription-status")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ hasAccess: true, isPaid: true, isTrialing: false, trialDaysLeft: 0, trialExpired: false }),
      } as Response);
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
  }) as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GuestsPage", () => {
  it("renders the guest list heading after loading", async () => {
    render(<GuestsPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Guest List" })).toBeInTheDocument();
    });
  });

  it("shows empty state when no guests", async () => {
    render(<GuestsPage />);
    await waitFor(() => {
      expect(screen.getByText("No guests yet")).toBeInTheDocument();
    });
  });

  it("shows the add guest form", async () => {
    render(<GuestsPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Guest name")).toBeInTheDocument();
      expect(screen.getByText("Add Guest")).toBeInTheDocument();
    });
  });
});
