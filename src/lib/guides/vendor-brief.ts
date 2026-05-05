/**
 * Generates formatted vendor briefs from completed guide responses.
 * Returns { text, sections } where text is the copy-ready brief.
 */

type WeddingInfo = {
  partner1: string;
  partner2: string;
  date: string | null;
  venue: string | null;
};

type MoodBoardImage = {
  url: string;
  caption: string | null;
};

type BriefResult = {
  text: string;
  sections: { title: string; content: string }[];
};

/**
 * Build a "Visual references" section from saved mood board images. Renders
 * as a numbered list of URLs with captions — copy-paste friendly so vendors
 * can click each link directly from the email body.
 */
function buildVisualReferencesSection(images: MoodBoardImage[]): { title: string; content: string } | null {
  if (!images || images.length === 0) return null;
  const lines = images.slice(0, 10).map((img, i) => {
    const caption = img.caption?.trim();
    return caption ? `${i + 1}. ${img.url} — ${caption}` : `${i + 1}. ${img.url}`;
  });
  return {
    title: "Visual references",
    content: `Pinned to our mood board (open each link to see the image):\n${lines.join("\n")}`,
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "TBD";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function val(responses: Record<string, unknown>, key: string, fallback = "Not specified"): string {
  const v = responses[key];
  if (v == null) return fallback;
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : fallback;
  return String(v);
}

function money(responses: Record<string, unknown>, key: string): string {
  const v = responses[key];
  if (v == null) return "Not specified";
  return `$${Number(v).toLocaleString()}`;
}

export function generateVendorBrief(
  slug: string,
  responses: Record<string, unknown>,
  crossData: Record<string, Record<string, unknown>>,
  wedding: WeddingInfo,
  moodBoardImages: MoodBoardImage[] = []
): BriefResult | null {
  const header = `${wedding.partner1} & ${wedding.partner2}\nWedding Date: ${formatDate(wedding.date)}\nVenue: ${wedding.venue || "TBD"}\n`;
  const colors = crossData["colors-theme"];
  const palette = colors ? val(colors, "q5") : val(responses, "q13", "Not yet decided");

  switch (slug) {
    case "florist":
      return buildFloristBrief(responses, header, palette, moodBoardImages);
    case "rentals":
      return buildRentalsBrief(responses, header);
    case "hair-makeup":
      return buildHairMakeupBrief(responses, header, wedding, moodBoardImages);
    case "music":
      return buildMusicBrief(responses, header);
    case "decor":
      return buildDecorBrief(responses, header, palette, moodBoardImages);
    default:
      return null;
  }
}

function buildFloristBrief(r: Record<string, unknown>, header: string, palette: string, images: MoodBoardImage[]): BriefResult {
  const sections = [
    { title: "Overview", content: `Budget: ${money(r, "q1")}\nPreferred florist: ${val(r, "q2")}\nCeremony setting: ${val(r, "q3")}` },
    { title: "Ceremony Florals", content: `Needs: ${val(r, "q4")}\nArch fullness: ${val(r, "q5")}` },
    { title: "Wedding Party", content: `Bouquets: ${val(r, "q6")}\nBoutonnieres: ${val(r, "q7")}\nCorsages: ${val(r, "q8")}\nBouquet style: ${val(r, "q9")}` },
    { title: "Reception", content: `Guest tables: ${val(r, "q10")}\nCenterpiece style: ${val(r, "q11")}\nOther areas: ${val(r, "q12")}` },
    { title: "Style & Preferences", content: `Color palette: ${palette}\nFlowers loved: ${val(r, "q14")}\nFlowers to avoid: ${val(r, "q15")}\nVenue restrictions: ${val(r, "q16")}` },
  ];
  const visualSection = buildVisualReferencesSection(images);
  if (visualSection) sections.push(visualSection);
  const text = `FLORIST BRIEF\n${header}\n${sections.map((s) => `${s.title}\n${s.content}`).join("\n\n")}`;
  return { text, sections };
}

function buildRentalsBrief(r: Record<string, unknown>, header: string): BriefResult {
  const sections = [
    { title: "Overview", content: `Budget: ${money(r, "q2")}\nGuest count: ${val(r, "q3")}\nVenue provides tables/chairs: ${val(r, "q1")}\nRental company: ${val(r, "q4")}` },
    { title: "Seating", content: `Tables needed: ${val(r, "q5")}\nTable shape: ${val(r, "q6")}\nChairs needed: ${val(r, "q7")}\nChair style: ${val(r, "q8")}` },
    { title: "Linens", content: `Tablecloths: ${val(r, "q9")}\nNapkins: ${val(r, "q10")}\nOther linens: ${val(r, "q11")}` },
    { title: "Tabletop", content: `Place settings: ${val(r, "q12")}\nGlassware: ${val(r, "q13")}\nSpecialty items: ${val(r, "q14")}` },
    { title: "Extras", content: `Furniture: ${val(r, "q15")}\nDance floor: ${val(r, "q16")}\nTent/canopy: ${val(r, "q17")}\nLighting: ${val(r, "q18")}` },
  ];
  const text = `RENTALS BRIEF\n${header}\n${sections.map((s) => `${s.title}\n${s.content}`).join("\n\n")}`;
  return { text, sections };
}

function buildHairMakeupBrief(r: Record<string, unknown>, header: string, wedding: WeddingInfo, images: MoodBoardImage[]): BriefResult {
  const sections = [
    { title: "Overview", content: `Date: ${formatDate(wedding.date)}\nCeremony time: ${val(r, "q2")}\nPeople needing services: ${val(r, "q3")}\nBudget: ${money(r, "q4")}\nBooked: Hair — ${val(r, "q5")}` },
    { title: "Trials", content: `Hair trial: ${val(r, "q6")}\nMakeup trial: ${val(r, "q7")}\nTrial timing: ${val(r, "q8")}` },
    { title: "Hair", content: `Hair type: ${val(r, "q9")}\nLength: ${val(r, "q10")}\nUp/down: ${val(r, "q11")}\nAccessories: ${val(r, "q12")}\nStyles to love/avoid: ${val(r, "q13")}` },
    { title: "Makeup", content: `Skin tone: ${val(r, "q14")}\nSkin type: ${val(r, "q15")}\nLook: ${val(r, "q16")}\nEmphasis: ${val(r, "q17")}\nAllergies: ${val(r, "q18")}\nLooks to love/avoid: ${val(r, "q19")}` },
  ];
  const visualSection = buildVisualReferencesSection(images);
  if (visualSection) sections.push(visualSection);
  const text = `HAIR & MAKEUP BRIEF\n${header}\n${sections.map((s) => `${s.title}\n${s.content}`).join("\n\n")}`;
  return { text, sections };
}

function buildMusicBrief(r: Record<string, unknown>, header: string): BriefResult {
  const sections = [
    { title: "Overview", content: `Budget: ${money(r, "q1")}\nFormat: ${val(r, "q2")}\nSame for ceremony & reception: ${val(r, "q3")}` },
    { title: "Ceremony Music", content: `Moments needing music: ${val(r, "q4")}\nSpecific songs: ${val(r, "q5")}\nDo not play: ${val(r, "q6")}` },
    { title: "Reception Music", content: `Vibe: ${val(r, "q7")}\nFirst dance: ${val(r, "q8")}\nOther key songs: ${val(r, "q9")}\nGenres/artists to avoid: ${val(r, "q10")}` },
    { title: "Logistics", content: `Sound restrictions/curfew: ${val(r, "q11")}\nCocktail hour music: ${val(r, "q12")}\nMicrophone for speeches: ${val(r, "q13")}\nDJ/band setup area: ${val(r, "q14")}` },
  ];
  const text = `MUSIC / DJ BRIEF\n${header}\n${sections.map((s) => `${s.title}\n${s.content}`).join("\n\n")}`;
  return { text, sections };
}

function buildDecorBrief(r: Record<string, unknown>, header: string, palette: string, images: MoodBoardImage[]): BriefResult {
  const sections = [
    { title: "Overview", content: `Budget: ${money(r, "q1")}\nDIY elements: ${val(r, "q2")}\nDecorator/stylist: ${val(r, "q3")}\nIndoors/outdoors: ${val(r, "q4")}\nVenue restrictions: ${val(r, "q5")}` },
    { title: "Ceremony Decor", content: `Needs: ${val(r, "q6")}\nWeather contingency: ${val(r, "q7")}` },
    { title: "Reception", content: `Tablescape vision: ${val(r, "q8")}\nLighting: ${val(r, "q9")}\nBackdrop: ${val(r, "q10")}\nSignage: ${val(r, "q11")}` },
    { title: "Style", content: `Three words: ${val(r, "q12")}\nColor palette: ${palette}\nDo not want: ${val(r, "q14")}` },
  ];
  const visualSection = buildVisualReferencesSection(images);
  if (visualSection) sections.push(visualSection);
  const text = `DECOR BRIEF\n${header}\n${sections.map((s) => `${s.title}\n${s.content}`).join("\n\n")}`;
  return { text, sections };
}
