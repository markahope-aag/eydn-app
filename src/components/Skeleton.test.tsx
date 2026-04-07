import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Skeleton, SkeletonCard, SkeletonList, SkeletonGrid } from "./Skeleton";

afterEach(() => {
  cleanup();
});

describe("Skeleton", () => {
  it("renders a div element", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe("DIV");
  });

  it("applies default animation classes", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("bg-lavender");
  });

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="h-4 w-3/4" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-4");
    expect(el.className).toContain("w-3/4");
  });

  it("renders without className prop", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe("SkeletonCard", () => {
  it("renders without crashing", () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders three skeleton lines inside the card", () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(3);
  });
});

describe("SkeletonList", () => {
  it("renders default count of 5 items", () => {
    const { container } = render(<SkeletonList />);
    const rows = container.querySelectorAll(".rounded-\\[16px\\]");
    expect(rows.length).toBe(5);
  });

  it("renders custom count of items", () => {
    const { container } = render(<SkeletonList count={3} />);
    const rows = container.querySelectorAll(".rounded-\\[16px\\]");
    expect(rows.length).toBe(3);
  });

  it("renders two skeletons per list item", () => {
    const { container } = render(<SkeletonList count={1} />);
    const row = container.querySelector(".rounded-\\[16px\\]")!;
    const skeletons = row.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(2);
  });
});

describe("SkeletonGrid", () => {
  it("renders default 4 cards in 2 columns", () => {
    const { container } = render(<SkeletonGrid />);
    const grid = container.firstChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
    // Each card has 3 skeleton divs + the card wrapper
    const cards = grid.children;
    expect(cards.length).toBe(4);
  });

  it("renders custom count and columns", () => {
    const { container } = render(<SkeletonGrid count={6} cols={3} />);
    const grid = container.firstChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(grid.children.length).toBe(6);
  });

  it("renders 1 card when count is 1", () => {
    const { container } = render(<SkeletonGrid count={1} cols={1} />);
    const grid = container.firstChild as HTMLElement;
    expect(grid.children.length).toBe(1);
  });
});
