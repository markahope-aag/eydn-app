import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { NoWeddingState } from "./NoWeddingState";

// NoWeddingState uses next/link, mock it
import { vi } from "vitest";
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

afterEach(() => {
  cleanup();
});

describe("NoWeddingState", () => {
  it("renders without crashing", () => {
    const { container } = render(<NoWeddingState />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders default heading when no feature prop", () => {
    const { getByText } = render(<NoWeddingState />);
    expect(getByText("Let's set up your wedding")).toBeInTheDocument();
  });

  it("renders feature-specific heading when feature prop is provided", () => {
    const { getByText } = render(<NoWeddingState feature="Budget" />);
    expect(getByText("Budget needs a wedding first")).toBeInTheDocument();
  });

  it("renders descriptive text", () => {
    const { getByText } = render(<NoWeddingState />);
    expect(getByText(/Answer a few quick questions/)).toBeInTheDocument();
  });

  it("renders a link to onboarding", () => {
    const { getByText } = render(<NoWeddingState />);
    const link = getByText("Get started");
    expect(link.closest("a")).toHaveAttribute("href", "/dashboard/onboarding");
  });

  it("renders a link back to dashboard", () => {
    const { getByText } = render(<NoWeddingState />);
    const link = getByText("Back to dashboard");
    expect(link.closest("a")).toHaveAttribute("href", "/dashboard");
  });

  it("renders the ring emoji", () => {
    const { container } = render(<NoWeddingState />);
    expect(container.textContent).toContain("\u{1F48D}");
  });
});
