/**
 * GTM dataLayer event tracking utility.
 * Pushes structured events to the dataLayer for GTM to process.
 */

type DataLayerEvent = {
  event: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

function push(event: DataLayerEvent) {
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
  }
}

// ─── Conversion Events ──────────────────────────────────────────────────────

/** User signs up (Clerk registration complete) */
export function trackSignUp() {
  push({ event: "sign_up" });
}

/** User completes onboarding questionnaire */
export function trackOnboardingComplete() {
  push({ event: "onboarding_complete" });
}

/** User starts 14-day free trial */
export function trackTrialStart() {
  push({ event: "trial_start" });
}

/** User completes $79 purchase */
export function trackPurchase(value = 79) {
  push({ event: "purchase", value, currency: "USD" });
}

// ─── Feature Usage Events ───────────────────────────────────────────────────

/** User sends a message to Eydn AI */
export function trackChatMessage() {
  push({ event: "chat_message" });
}

/** User adds a guest */
export function trackGuestAdded() {
  push({ event: "guest_added" });
}

/** User imports guests via CSV */
export function trackGuestImport(count: number) {
  push({ event: "guest_import", guest_count: count });
}

/** User adds a vendor */
export function trackVendorAdded(category: string) {
  push({ event: "vendor_added", vendor_category: category });
}

/** User completes a planning guide */
export function trackGuideComplete(guideSlug: string) {
  push({ event: "guide_complete", guide_name: guideSlug });
}

/** User generates a vendor brief */
export function trackVendorBriefGenerated(guideSlug: string) {
  push({ event: "vendor_brief_generated", guide_name: guideSlug });
}

/** User enables their wedding website */
export function trackWebsitePublished() {
  push({ event: "website_published" });
}

/** User sends RSVP links */
export function trackRsvpSent(count: number) {
  push({ event: "rsvp_sent", rsvp_count: count });
}

/** User uploads a file (contract, photo, etc.) */
export function trackFileUpload(entityType: string) {
  push({ event: "file_upload", entity_type: entityType });
}

/** User exports data (PDF binder, CSV, etc.) */
export function trackExport(format: string) {
  push({ event: "data_export", export_format: format });
}

/** User creates a task */
export function trackTaskCreated() {
  push({ event: "task_created" });
}

/** User completes a task */
export function trackTaskCompleted() {
  push({ event: "task_completed" });
}

/** User adds to mood board */
export function trackMoodBoardAdd() {
  push({ event: "mood_board_add" });
}

/** User invites a collaborator */
export function trackCollaboratorInvited() {
  push({ event: "collaborator_invited" });
}

// ─── Page/Section Views ─────────────────────────────────────────────────────

/** User views a specific dashboard section */
export function trackSectionView(section: string) {
  push({ event: "section_view", section_name: section });
}
