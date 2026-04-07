import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { ConfirmDialog } from "./ConfirmDialog";

afterEach(() => {
  cleanup();
});

const defaultProps = {
  open: true,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  title: "Delete Item",
  message: "Are you sure you want to delete this item?",
};

// The dialog's parent wrapper has aria-hidden="true" (backdrop overlay),
// so we need { hidden: true } to find the dialog role.
const roleOpts = { hidden: true };

describe("ConfirmDialog", () => {
  it("renders when open=true", () => {
    const { getByRole } = render(<ConfirmDialog {...defaultProps} />);
    expect(getByRole("dialog", roleOpts)).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    const { queryByRole } = render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(queryByRole("dialog", roleOpts)).not.toBeInTheDocument();
  });

  it("has role=dialog and aria-modal=true", () => {
    const { getByRole } = render(<ConfirmDialog {...defaultProps} />);
    const dialog = getByRole("dialog", roleOpts);
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("has aria-labelledby and aria-describedby", () => {
    const { getByRole } = render(<ConfirmDialog {...defaultProps} />);
    const dialog = getByRole("dialog", roleOpts);
    expect(dialog).toHaveAttribute("aria-labelledby", "confirm-dialog-title");
    expect(dialog).toHaveAttribute("aria-describedby", "confirm-dialog-message");
  });

  it("displays the title and message", () => {
    const { getByText } = render(<ConfirmDialog {...defaultProps} />);
    expect(getByText("Delete Item")).toBeInTheDocument();
    expect(getByText("Are you sure you want to delete this item?")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    const { getByText } = render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(getByText("Delete"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    const { getByText } = render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel on Escape key", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("uses custom confirm label", () => {
    const { getByText } = render(<ConfirmDialog {...defaultProps} confirmLabel="Remove" />);
    expect(getByText("Remove")).toBeInTheDocument();
  });

  it("calls onCancel when clicking the backdrop", () => {
    const onCancel = vi.fn();
    const { getByRole } = render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    const backdrop = getByRole("dialog", roleOpts).parentElement!;
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not call onCancel when clicking inside the dialog", () => {
    const onCancel = vi.fn();
    const { getByRole } = render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(getByRole("dialog", roleOpts));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("applies destructive styling by default", () => {
    const { getByText } = render(<ConfirmDialog {...defaultProps} />);
    const confirmBtn = getByText("Delete");
    expect(confirmBtn.className).toContain("bg-error");
  });

  it("applies non-destructive styling when destructive=false", () => {
    const { getByText } = render(
      <ConfirmDialog {...defaultProps} destructive={false} confirmLabel="Save" />
    );
    const confirmBtn = getByText("Save");
    expect(confirmBtn.className).toContain("btn-primary");
    expect(confirmBtn.className).not.toContain("bg-error");
  });

  it("prevents body scroll when open", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body scroll on unmount", () => {
    const { unmount } = render(<ConfirmDialog {...defaultProps} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
