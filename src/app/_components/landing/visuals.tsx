/**
 * Decorative visual components used by the marketing landing page.
 * All inline-styled (matching the rest of page.tsx) — this is the style
 * the landing page is committed to; don't mix Tailwind here until the
 * whole page migrates.
 */

import {
  MiniTaskTimeline,
  MiniBudgetTracker,
  MiniGuestList,
  MiniVendorPipeline,
  MiniWeddingSite,
  MiniDayOfBinder,
  MiniDataSecurity,
} from "./mini-features";

export { BotanicalOverlay } from "./botanical";
export { HeroTaskCard, HeroBudgetCard, HeroAIChatCard } from "./hero-cards";
export {
  MiniTaskTimeline,
  MiniBudgetTracker,
  MiniGuestList,
  MiniVendorPipeline,
  MiniWeddingSite,
  MiniDayOfBinder,
  MiniDataSecurity,
} from "./mini-features";
export { SpotlightChat } from "./spotlight-chat";

/** Ordered list of visuals shown in each row of the features section. */
export const featureVisuals = [
  MiniTaskTimeline,
  MiniBudgetTracker,
  MiniGuestList,
  MiniVendorPipeline,
  MiniWeddingSite,
  MiniDayOfBinder,
  MiniDataSecurity,
];
