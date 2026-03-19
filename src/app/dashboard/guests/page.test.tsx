import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import GuestsPage from "./page";

afterEach(cleanup);

describe("GuestsPage", () => {
  it("renders the guest list heading", () => {
    render(<GuestsPage />);
    expect(screen.getByRole("heading", { name: "Guest List" })).toBeInTheDocument();
  });

  it("adds a guest when the form is submitted", () => {
    render(<GuestsPage />);

    fireEvent.change(screen.getByPlaceholderText("Guest name"), {
      target: { value: "Jane Doe" },
    });
    fireEvent.click(screen.getByText("Add Guest"));

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("removes a guest", () => {
    render(<GuestsPage />);

    fireEvent.change(screen.getByPlaceholderText("Guest name"), {
      target: { value: "John Smith" },
    });
    fireEvent.click(screen.getByText("Add Guest"));
    expect(screen.getByText("John Smith")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Remove"));
    expect(screen.queryByText("John Smith")).not.toBeInTheDocument();
  });
});
