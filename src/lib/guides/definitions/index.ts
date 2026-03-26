import type { GuideDefinition } from "@/lib/guides/types";

import guestList from "./guest-list";
import colorsTheme from "./colors-theme";
import florist from "./florist";
import rentals from "./rentals";
import weddingDress from "./wedding-dress";
import { hairMakeupGuide } from "./hair-makeup";
import { decorGuide } from "./decor";
import { musicGuide } from "./music";
import { speechesGuide } from "./speeches";
import registryGuide from "./registry";

export const GUIDES: GuideDefinition[] = [
  guestList,
  colorsTheme,
  florist,
  rentals,
  weddingDress,
  hairMakeupGuide,
  decorGuide,
  musicGuide,
  speechesGuide,
  registryGuide,
];

export const GUIDE_MAP: Record<string, GuideDefinition> = Object.fromEntries(
  GUIDES.map((g) => [g.slug, g]),
);

export const GUIDE_SLUGS: string[] = GUIDES.map((g) => g.slug);
