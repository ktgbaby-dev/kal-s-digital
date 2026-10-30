// Browser test of the contact form's email route against tools/dev-server.mjs with a mock provider.
//   node tests/email-mode.mjs        (starts its own servers on ports 5681 and 5682)
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const from = process.env.PLAYWRIGHT_FROM || path.resolve(root, "..", "kals-pipeline", "modules", "testing", "package.json");
const { chromium } = createRequire(from)("playwright-core");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

function server(port, mock) {
  const child = spawn(process.execPath, [path.join(root, "tools", "dev-server.mjs")], { env: { ...process.env, PORT: String(port), MOCK_EMAIL: mock } });
  return new Promise((resolve) => child.stdout.once("data", () => resolve(child)));
}

const ok = await server(5681, "ok");
const fail = await server(5682, "fail");
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  async function submit(base) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return {}; }; });
    await page.goto(base + "/contact/", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("[data-contact-form]").dataset.mode === "email", null, { timeout: 5000 }).catch(() => {});
    const label = (await page.locator("[data-submit-text]").textContent()).trim();
    await page.fill("#f-name", "Test Visitor");
    await page.fill("#f-email", "visitor@example.test");
    await page.check('input[name="interest"][value="general"]');
    await page.fill("#f-message", "We need a new website and better social profiles.");
    await page.locator("[data-submit]").click();
    await page.waitForFunction(() => !document.querySelector("[data-form-status]").hidden, null, { timeout: 5000 });
    const state = await page.evaluate(() => ({
      status: document.querySelector("[data-form-status]").textContent,
      cleared: document.querySelector("#f-name").value === "",
      whatsappLink: !!document.querySelector('[data-form-status] a[href^="https://wa.me/2348088812532"]'),
      opened: window.__opened.length,
    }));
    await page.close();
    return { label, ...state };
  }

  const good = await submit("http://127.0.0.1:5681");
  check("with email configured the button says Send enquiry", good.label === "Send enquiry", good.label);
  check("accepted delivery shows a thank-you and clears the form", /reached our inbox/.test(good.status) && good.cleared && good.opened === 0, good.status.slice(0, 70));
  const sent = await (await fetch("http://127.0.0.1:5681/__mock/sent")).json();
  check("one email was handed to the provider with reply-to set", sent.length === 1 && sent[0].reply_to === "visitor@example.test" && /General digital services/.test(sent[0].subject), JSON.stringify(sent[0]?.subject));

  const bad = await submit("http://127.0.0.1:5682");
  check("failed delivery says nothing was sent and offers WhatsApp", /nothing reached us/.test(bad.status) && bad.whatsappLink && !bad.cleared, bad.status.slice(0, 70));
} finally {
  await browser.close();
  ok.kill();
  fail.kill();
}
console.log(`\nemail-mode checks: ${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
