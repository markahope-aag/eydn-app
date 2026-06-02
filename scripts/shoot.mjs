/**
 * Screenshot script for design iteration. Ported from the kestralis-website
 * workflow. Uses Chromium's native `--screenshot` CLI rather than Playwright's
 * CDP — Playwright's --remote-debugging-pipe IPC hangs on this Windows config.
 *
 *   node scripts/shoot.mjs [route]            (defaults to /)
 *   SHOOT_BASE=http://localhost:3000 node scripts/shoot.mjs /
 *
 * Output → .screenshots/<slug>/<viewport>-<top|full>.png  (gitignored)
 */
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";

const BASE = process.env.SHOOT_BASE ?? "http://localhost:3000";
const rawRoute = process.argv[2] ?? "/";
const route = /^[A-Z]:/i.test(rawRoute) ? "/" : rawRoute;

// Default to desktop only for fast iteration; pass SHOOT_VIEWPORTS=all for the
// full responsive set.
const ALL_VIEWPORTS = [
  { name: "mobile", width: 375, height: 820 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
];
const VIEWPORTS =
  process.env.SHOOT_VIEWPORTS === "all"
    ? ALL_VIEWPORTS
    : ALL_VIEWPORTS.filter((v) => v.name === "desktop");

const FULL_PAGE_HEIGHT = 9000;

const slug =
  route === "/"
    ? "home"
    : route.replace(/^\//, "").replace(/\/$/, "").replace(/\//g, "-");

async function resolveChrome() {
  if (process.env.SHOOT_CHROME) return process.env.SHOOT_CHROME;

  if (os.platform() === "win32") {
    const root = path.join(os.homedir(), "AppData", "Local", "ms-playwright");
    const entries = await fs.readdir(root).catch(() => []);
    const candidate = entries
      .filter((n) => /^chromium-\d+$/.test(n))
      .sort()
      .at(-1);
    if (candidate) {
      for (const sub of ["chrome-win64", "chrome-win"]) {
        const exe = path.join(root, candidate, sub, "chrome.exe");
        try {
          await fs.access(exe);
          return exe;
        } catch {
          /* next */
        }
      }
    }
    for (const guess of [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    ]) {
      try {
        await fs.access(guess);
        return guess;
      } catch {
        /* next */
      }
    }
    throw new Error(
      "Could not locate chrome.exe. Run `npx playwright install chromium` or set SHOOT_CHROME."
    );
  }
  return process.env.SHOOT_CHROME ?? "chromium";
}

async function shoot(chrome, spec) {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--force-prefers-reduced-motion",
    "--virtual-time-budget=6000",
    `--window-size=${spec.width},${spec.height}`,
    `--screenshot=${spec.out}`,
    spec.url,
  ];
  await new Promise((resolve, reject) => {
    const proc = spawn(chrome, args, { stdio: "ignore" });
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("chrome timed out after 45s"));
    }, 45_000);
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`chrome exited with code ${code}`));
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function main() {
  const outDir = path.join(process.cwd(), ".screenshots", slug);
  await fs.mkdir(outDir, { recursive: true });
  const chrome = await resolveChrome();

  console.log(`  chrome: ${chrome}`);
  console.log(`  url:    ${BASE}${route}`);
  console.log(`  out:    ${outDir}\n`);

  for (const vp of VIEWPORTS) {
    const top = path.join(outDir, `${vp.name}-top.png`);
    const full = path.join(outDir, `${vp.name}-full.png`);
    await shoot(chrome, { url: `${BASE}${route}`, out: top, width: vp.width, height: vp.height });
    await shoot(chrome, { url: `${BASE}${route}`, out: full, width: vp.width, height: FULL_PAGE_HEIGHT });
    const topKb = Math.round((await fs.stat(top)).size / 1024);
    const fullKb = Math.round((await fs.stat(full)).size / 1024);
    console.log(`  ${vp.name.padEnd(8)} ${vp.width}×${vp.height}  top:${topKb}KB  full:${fullKb}KB`);
  }
  console.log(`\n→ ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
