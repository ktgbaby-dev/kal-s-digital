// Render the social-sharing images and app icons from the official brand files.
//
//   1. Start the local preview:  python -m http.server 5670 --bind 127.0.0.1
//   2. node tools/og/render.mjs
//
// Needs playwright-core and an installed Chrome. By default it borrows playwright-core
// from kals-pipeline/modules/testing (read only); set PLAYWRIGHT_FROM to another
// package.json that depends on playwright-core to use a different install.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const from = process.env.PLAYWRIGHT_FROM || path.resolve(root, "..", "kals-pipeline", "modules", "testing", "package.json");
const { chromium } = createRequire(from)("playwright-core");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE || "http://127.0.0.1:5670";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const v of ["default", "kard", "slotu"]) {
    await page.goto(`${BASE}/tools/og/og.html?v=${v}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(root, "assets", "og", `og-${v}.png`) });
    console.log("og", v);
  }
  // App icons: rasterised from the official olive app-icon SVG (white K on olive).
  for (const size of [180, 192, 512]) {
    const icon = await browser.newPage({ viewport: { width: size, height: size } });
    await icon.setContent(`<html><body style="margin:0"><img src="${BASE}/assets/brand/KalsDigital_AppIcon_olive_1024.svg" width="${size}" height="${size}" style="display:block"></body></html>`);
    await icon.waitForLoadState("networkidle");
    const name = size === 180 ? "apple-touch-icon-180.png" : `KalsDigital_AppIcon_olive_${size}.png`;
    await icon.screenshot({ path: path.join(root, "assets", "brand", name) });
    await icon.close();
    console.log("icon", size);
  }
} finally {
  await browser.close();
}
