import { quizOgImage, OG_SIZE } from "@/lib/og/quiz-og";

export const alt = "What's your wedding planning style? — a free 2-minute quiz from Eydn";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OgImage() {
  return quizOgImage({
    eyebrow: "Free 2-minute quiz",
    title: "What's your wedding planning style?",
    subline: "Find your planning archetype — then compare with your partner.",
  });
}
