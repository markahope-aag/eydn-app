import { TimelineItem } from "./types";

function parseCeremonyTime(input: string): number | null {
  const trimmed = input.trim();

  // Try "4:30 PM", "4:30PM", "4:30 pm", "4:30pm"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1]);
    const m = parseInt(match12[2]);
    const p = match12[3].toUpperCase();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }

  // Try "4 PM", "4PM", "4 pm"
  const matchHourOnly = trimmed.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (matchHourOnly) {
    let h = parseInt(matchHourOnly[1]);
    const p = matchHourOnly[2].toUpperCase();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h * 60;
  }

  // Try 24-hour "16:30", "09:00"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1]);
    const m = parseInt(match24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return h * 60 + m;
    }
  }

  // Try HTML time input "16:30" (same as above but also handles leading zeros)
  return null;
}

export function generateTimelineFromCeremony(ceremonyTime: string): TimelineItem[] {
  const ceremonyMinutes = parseCeremonyTime(ceremonyTime);
  if (ceremonyMinutes === null) return [];

  function formatTime(totalMinutes: number): string {
    let h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const p = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m.toString().padStart(2, "0")} ${p}`;
  }

  return [
    { time: formatTime(ceremonyMinutes - 510), event: "Hair & makeup begins", notes: "", forGroup: "Partner 1,Attendants", duration: 120, vendorCategory: "Hair & Makeup" },
    { time: formatTime(ceremonyMinutes - 390), event: "Photographer arrives", notes: "", forGroup: "Vendors", duration: 30, vendorCategory: "Photography" },
    { time: formatTime(ceremonyMinutes - 330), event: "Getting ready photos", notes: "", forGroup: "Partner 1,Partner 2,Attendants", duration: 60 },
    { time: formatTime(ceremonyMinutes - 270), event: "Lunch for wedding party", notes: "", forGroup: "Partner 1,Partner 2,Attendants", duration: 45 },
    { time: formatTime(ceremonyMinutes - 150), event: "First look (if applicable)", notes: "", forGroup: "Partner 1,Partner 2", duration: 30 },
    { time: formatTime(ceremonyMinutes - 90), event: "Wedding party photos", notes: "", forGroup: "Partner 1,Partner 2,Attendants", duration: 60 },
    { time: formatTime(ceremonyMinutes - 30), event: "Guests arrive", notes: "", forGroup: "Everyone", duration: 30 },
    { time: formatTime(ceremonyMinutes), event: "Ceremony begins", notes: "", forGroup: "Everyone", duration: 30 },
    { time: formatTime(ceremonyMinutes + 30), event: "Cocktail hour", notes: "", forGroup: "Everyone", duration: 60, vendorCategory: "Catering" },
    { time: formatTime(ceremonyMinutes + 90), event: "Reception entrance", notes: "", forGroup: "Everyone", duration: 15 },
    { time: formatTime(ceremonyMinutes + 105), event: "First dance", notes: "", forGroup: "Partner 1,Partner 2", duration: 5, vendorCategory: "DJ / Band" },
    { time: formatTime(ceremonyMinutes + 120), event: "Dinner service", notes: "", forGroup: "Everyone", duration: 60, vendorCategory: "Catering" },
    { time: formatTime(ceremonyMinutes + 180), event: "Speeches & toasts", notes: "", forGroup: "Everyone", duration: 30 },
    { time: formatTime(ceremonyMinutes + 210), event: "Cake cutting", notes: "", forGroup: "Partner 1,Partner 2", duration: 15, vendorCategory: "Bakery" },
    { time: formatTime(ceremonyMinutes + 225), event: "Parent dances", notes: "", forGroup: "Partner 1,Partner 2,Family", duration: 10 },
    { time: formatTime(ceremonyMinutes + 240), event: "Open dancing", notes: "", forGroup: "Everyone", duration: 120, vendorCategory: "DJ / Band" },
    { time: formatTime(ceremonyMinutes + 360), event: "Last dance", notes: "", forGroup: "Partner 1,Partner 2", duration: 5 },
    { time: formatTime(ceremonyMinutes + 375), event: "Send-off", notes: "", forGroup: "Everyone", duration: 15 },
  ];
}
