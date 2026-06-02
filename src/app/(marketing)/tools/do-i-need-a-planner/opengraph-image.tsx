import { quizOgImage, OG_SIZE } from "@/lib/og/quiz-og";

export const alt = "Do you need a wedding planner? — a free 2-minute quiz from Eydn";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OgImage() {
  return quizOgImage({
    eyebrow: "Free 2-minute quiz",
    title: "Do you need a wedding planner?",
    subline: "Score your wedding's complexity — DIY, coordinator, or full planner?",
  });
}
