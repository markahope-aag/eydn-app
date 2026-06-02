import { chromium } from "playwright";
const BASE = process.env.SHOOT_BASE ?? "http://localhost:3100";
const route = process.argv[2] ?? "/";
const slug = route === "/" ? "home" : route.replace(/^\//,"").replace(/\//g,"-");
const out = `.screenshots/${slug}/desktop-fullpage.png`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
// Scroll through the whole page in steps so lazy-loaded (non-priority) images
// enter the viewport and decode before the full-page snap.
await page.evaluate(async () => {
  const step = 700;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1200);
await page.screenshot({ path: out, fullPage: true });
const h = await page.evaluate(() => document.body.scrollHeight);
console.log("OK fullPage height:", h, "→", out);
await browser.close();
