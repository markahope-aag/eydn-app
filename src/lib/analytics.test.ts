import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  trackSignUp,
  trackOnboardingComplete,
  trackTrialStart,
  trackPurchase,
  trackVendorPlacement,
  trackChatMessage,
  trackGuestAdded,
  trackGuestImport,
  trackVendorAdded,
  trackGuideComplete,
  trackVendorBriefGenerated,
  trackWebsitePublished,
  trackRsvpSent,
  trackFileUpload,
  trackExport,
  trackTaskCreated,
  trackTaskCompleted,
  trackMoodBoardAdd,
  trackCollaboratorInvited,
  trackSectionView,
} from "./analytics";

describe("analytics tracking", () => {
  beforeEach(() => {
    // Reset dataLayer before each test
    window.dataLayer = [];
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).dataLayer;
  });

  it("trackSignUp pushes sign_up event", () => {
    trackSignUp();
    expect(window.dataLayer).toEqual([{ event: "sign_up" }]);
  });

  it("trackOnboardingComplete pushes onboarding_complete event", () => {
    trackOnboardingComplete();
    expect(window.dataLayer).toEqual([{ event: "onboarding_complete" }]);
  });

  it("trackTrialStart pushes trial_start event", () => {
    trackTrialStart();
    expect(window.dataLayer).toEqual([{ event: "trial_start" }]);
  });

  it("trackPurchase pushes purchase event with default value", () => {
    trackPurchase();
    expect(window.dataLayer).toEqual([{ event: "purchase", value: 79, currency: "USD" }]);
  });

  it("trackPurchase pushes purchase event with custom value", () => {
    trackPurchase(49);
    expect(window.dataLayer).toEqual([{ event: "purchase", value: 49, currency: "USD" }]);
  });

  it("trackVendorPlacement pushes vendor_placement with tier and value", () => {
    trackVendorPlacement("gold", 199);
    expect(window.dataLayer).toEqual([
      { event: "vendor_placement", tier: "gold", value: 199, currency: "USD" },
    ]);
  });

  it("trackChatMessage pushes chat_message event", () => {
    trackChatMessage();
    expect(window.dataLayer).toEqual([{ event: "chat_message" }]);
  });

  it("trackGuestAdded pushes guest_added event", () => {
    trackGuestAdded();
    expect(window.dataLayer).toEqual([{ event: "guest_added" }]);
  });

  it("trackGuestImport pushes guest_import with count", () => {
    trackGuestImport(25);
    expect(window.dataLayer).toEqual([{ event: "guest_import", guest_count: 25 }]);
  });

  it("trackVendorAdded pushes vendor_added with category", () => {
    trackVendorAdded("florist");
    expect(window.dataLayer).toEqual([{ event: "vendor_added", vendor_category: "florist" }]);
  });

  it("trackGuideComplete pushes guide_complete with slug", () => {
    trackGuideComplete("music");
    expect(window.dataLayer).toEqual([{ event: "guide_complete", guide_name: "music" }]);
  });

  it("trackVendorBriefGenerated pushes vendor_brief_generated with slug", () => {
    trackVendorBriefGenerated("florist");
    expect(window.dataLayer).toEqual([
      { event: "vendor_brief_generated", guide_name: "florist" },
    ]);
  });

  it("trackWebsitePublished pushes website_published event", () => {
    trackWebsitePublished();
    expect(window.dataLayer).toEqual([{ event: "website_published" }]);
  });

  it("trackRsvpSent pushes rsvp_sent with count", () => {
    trackRsvpSent(50);
    expect(window.dataLayer).toEqual([{ event: "rsvp_sent", rsvp_count: 50 }]);
  });

  it("trackFileUpload pushes file_upload with entity type", () => {
    trackFileUpload("task");
    expect(window.dataLayer).toEqual([{ event: "file_upload", entity_type: "task" }]);
  });

  it("trackExport pushes data_export with format", () => {
    trackExport("pdf");
    expect(window.dataLayer).toEqual([{ event: "data_export", export_format: "pdf" }]);
  });

  it("trackTaskCreated pushes task_created event", () => {
    trackTaskCreated();
    expect(window.dataLayer).toEqual([{ event: "task_created" }]);
  });

  it("trackTaskCompleted pushes task_completed event", () => {
    trackTaskCompleted();
    expect(window.dataLayer).toEqual([{ event: "task_completed" }]);
  });

  it("trackMoodBoardAdd pushes mood_board_add event", () => {
    trackMoodBoardAdd();
    expect(window.dataLayer).toEqual([{ event: "mood_board_add" }]);
  });

  it("trackCollaboratorInvited pushes collaborator_invited event", () => {
    trackCollaboratorInvited();
    expect(window.dataLayer).toEqual([{ event: "collaborator_invited" }]);
  });

  it("trackSectionView pushes section_view with section name", () => {
    trackSectionView("dashboard");
    expect(window.dataLayer).toEqual([{ event: "section_view", section_name: "dashboard" }]);
  });

  it("initializes dataLayer if it does not exist", () => {
    delete (window as unknown as Record<string, unknown>).dataLayer;
    trackSignUp();
    expect(window.dataLayer).toEqual([{ event: "sign_up" }]);
  });

  it("appends to existing dataLayer entries", () => {
    window.dataLayer = [{ event: "existing" }];
    trackSignUp();
    expect(window.dataLayer).toHaveLength(2);
    expect(window.dataLayer![1]).toEqual({ event: "sign_up" });
  });
});

describe("analytics SSR safety", () => {
  it("does not throw when window is undefined", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error -- simulating SSR
    delete globalThis.window;

    expect(() => trackSignUp()).not.toThrow();
    expect(() => trackPurchase(79)).not.toThrow();
    expect(() => trackChatMessage()).not.toThrow();
    expect(() => trackGuideComplete("test")).not.toThrow();

    globalThis.window = originalWindow;
  });
});
