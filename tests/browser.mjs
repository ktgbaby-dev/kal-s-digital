// Browser checks for the Kal’s Digital site: accessibility (axe), layout at six widths,
// keyboard and menu behaviour, reveal-on-scroll, and the contact form's WhatsApp route.
//
//   python -m http.server 5670 --bind 127.0.0.1      (from the repository root)
//   node tests/browser.mjs                            (BASE=http://127.0.0.1:5670 by default)
//
// Needs playwright-core and axe-core plus an installed Chrome. By default they are borrowed,
// read only, from kals-pipeline/modules/testing; set PLAYWRIGHT_FROM to another package.json
// that depends on both to use a different install.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const from = process.env.PLAYWRIGHT_FROM || path.resolve(root, "..", "kals-pipeline", "modules", "testing", "package.json");
const req = createRequire(from);
const { chromium } = req("playwright-core");
const AXE = readFileSync(req.resolve("axe-core/axe.min.js"), "utf8");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE || "http://127.0.0.1:5670";
const site = JSON.parse(readFileSync(path.join(root, "site.json"), "utf8"));
const PAGES = site.pages.map((p) => p.path);

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  // 1. axe at desktop and phone, every page
  for (const [label, viewport, mobile] of [["desktop", { width: 1440, height: 900 }, false], ["phone", { width: 390, height: 844 }, true]]) {
    // bypassCSP lets axe be injected; the live site's policy (correctly) forbids inline scripts.
    const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce", bypassCSP: true });
    const page = await ctx.newPage();
    for (const p of PAGES) {
      const errors = [];
      page.removeAllListeners("pageerror");
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(BASE + p, { waitUntil: "networkidle" });
      // Sections use content-visibility:auto, so render each one (as a visitor scrolling would)
      // before axe measures colours; skipped sections have no painted background to measure.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
        window.scrollTo(0, 0);
      });
      await page.addScriptTag({ content: AXE });
      const axe = await page.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
        return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, target: v.nodes[0]?.target?.join(" ") }));
      });
      check(`axe ${label} ${p}`, axe.length === 0, axe.map((v) => `${v.id}(${v.impact}) x${v.n} @ ${v.target}`).join("; "));
      check(`no script errors ${label} ${p}`, errors.length === 0, errors.join("; "));
    }
    await ctx.close();
  }

  // 2. no horizontal overflow at six widths
  for (const width of [320, 375, 768, 1024, 1280, 1920]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const bad = [];
    for (const p of PAGES) {
      await page.goto(BASE + p, { waitUntil: "networkidle" });
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 0) bad.push(`${p} (+${over}px)`);
    }
    check(`no horizontal overflow at ${width}px`, bad.length === 0, bad.join(", "));
    await ctx.close();
  }

  // 3. keyboard: skip link first, visible focus ring, touch target sizes on phone
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    const first = await page.evaluate(() => ({ text: document.activeElement.textContent.trim(), outline: getComputedStyle(document.activeElement).outlineStyle, top: document.activeElement.getBoundingClientRect().top }));
    check("first Tab lands on a visible skip link", first.text === "Skip to content" && first.top >= 0, JSON.stringify(first));
    await page.keyboard.press("Enter");
    const hash = await page.evaluate(() => location.hash);
    check("skip link moves to #main", hash === "#main", hash);
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { tag: document.activeElement.tagName, outline: s.outlineStyle, width: s.outlineWidth }; });
    check("focused link shows an outline", ring.outline !== "none" && parseFloat(ring.width) >= 2, JSON.stringify(ring));
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const small = [];
    for (const p of PAGES) {
      await page.goto(BASE + p, { waitUntil: "networkidle" });
      // Radio buttons are excluded because their whole .choice label (52px) is the tap target;
      // the off-screen honeypot field is never shown to people.
      const found = await page.evaluate(() => [...document.querySelectorAll("a.btn, button, .menu-toggle, .text-link, .primary-nav a, .footer-cols a, input:not([type=radio]), textarea, .choice")]
        .filter((el) => el.offsetParent !== null && !el.closest(".hp"))
        .map((el) => ({ h: el.getBoundingClientRect().height, t: (el.textContent || el.name || "").trim().slice(0, 30) }))
        .filter((x) => x.h > 0 && x.h < 40));
      found.forEach((x) => small.push(`${p}: "${x.t}" ${Math.round(x.h)}px`));
    }
    check("touch targets are at least 40px tall on phones", small.length === 0, small.slice(0, 8).join("; "));
    await ctx.close();
  }

  // 4. small-screen menu
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(BASE + "/work/", { waitUntil: "networkidle" });
    const toggle = page.locator("[data-menu-toggle]");
    await toggle.click();
    let s = await page.evaluate(() => ({ expanded: document.querySelector("[data-menu-toggle]").getAttribute("aria-expanded"), hidden: document.querySelector("[data-menu]").hidden, focus: document.activeElement.textContent.trim(), inert: document.querySelector("main").hasAttribute("inert"), current: document.querySelector('.mobile-link[aria-current="page"]')?.textContent }));
    check("menu opens, moves focus in and marks the page", s.expanded === "true" && !s.hidden && s.focus === "Home" && s.inert && s.current === "Our work", JSON.stringify(s));
    await page.keyboard.press("Escape");
    s = await page.evaluate(() => ({ expanded: document.querySelector("[data-menu-toggle]").getAttribute("aria-expanded"), hidden: document.querySelector("[data-menu]").hidden, focusIsToggle: document.activeElement.matches("[data-menu-toggle]"), inert: document.querySelector("main").hasAttribute("inert") }));
    check("Escape closes the menu and returns focus", s.expanded === "false" && s.hidden && s.focusIsToggle && !s.inert, JSON.stringify(s));
    await toggle.click();
    await page.locator('.mobile-link[href="/about/"]').click();
    await page.waitForURL("**/about/");
    check("menu link navigates", page.url().endsWith("/about/"));
    await ctx.close();
  }

  // 5. reveal-on-scroll never leaves content hidden
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const pendingAtStart = await page.evaluate(() => document.querySelectorAll(".reveal-pending").length);
    const aboveFoldHidden = await page.evaluate(() => [...document.querySelectorAll(".reveal-pending")].filter((el) => el.getBoundingClientRect().top < innerHeight).length);
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= H; y += 300) { await page.mouse.wheel(0, 300); await page.waitForTimeout(60); }
    await page.waitForTimeout(1200);
    const left = await page.evaluate(() => document.querySelectorAll(".reveal-pending").length);
    check("reveal hides only below-the-fold content and shows all of it on scroll", pendingAtStart > 0 && aboveFoldHidden === 0 && left === 0, `pending at start ${pendingAtStart}, above fold hidden ${aboveFoldHidden}, still hidden after scroll ${left}`);
    await ctx.close();
  }

  // 6. contact form (static preview: no /api/contact, so the WhatsApp route is used)
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return {}; }; });
    await page.goto(BASE + "/contact/?interest=kard", { waitUntil: "networkidle" });
    const pre = await page.evaluate(() => document.querySelector('input[name="interest"]:checked')?.value);
    check("?interest=kard preselects KARD", pre === "kard", String(pre));
    const label = await page.locator("[data-submit-text]").textContent();
    check("without an email endpoint the button says Continue on WhatsApp", label.trim() === "Continue on WhatsApp", label);
    await page.locator("[data-submit]").click();
    let st = await page.evaluate(() => ({
      errors: [...document.querySelectorAll("[data-error-for]")].filter((e) => !e.hidden).map((e) => e.dataset.errorFor),
      invalid: [...document.querySelectorAll('[aria-invalid="true"]')].map((e) => e.name),
      focus: document.activeElement.name,
      opened: window.__opened.length,
    }));
    check("empty submit shows errors, marks fields and focuses the first", st.errors.join() === "name,email,message" && st.invalid.includes("name") && st.focus === "name" && st.opened === 0, JSON.stringify(st));
    await page.fill("#f-name", "Test Visitor");
    await page.fill("#f-business", "Test Studio");
    await page.fill("#f-email", "visitor@example.test");
    await page.fill("#f-message", "We would like a KARD with a landing page for our studio.");
    await page.locator("[data-submit]").click();
    st = await page.evaluate(() => ({
      opened: window.__opened,
      status: document.querySelector("[data-form-status]").hidden ? "" : document.querySelector("[data-form-status]").textContent,
      errors: [...document.querySelectorAll("[data-error-for]")].filter((e) => !e.hidden).length,
    }));
    const url = st.opened[0] || "";
    const text = decodeURIComponent(url.split("text=")[1] || "");
    check("valid submit opens WhatsApp to 0808 881 2532 with the message filled in", url.startsWith("https://wa.me/2348088812532?text=") && /Interested in: KARD/.test(text) && /Test Studio/.test(text) && st.errors === 0, url.slice(0, 60));
    check("status explains nothing is sent until the visitor presses send", /nothing has been sent/i.test(st.status), st.status.slice(0, 90));
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nbrowser checks: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
