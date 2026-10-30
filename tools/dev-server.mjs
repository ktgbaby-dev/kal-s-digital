// Local preview with the contact API (Node 20+, no dependencies).
//
//   node tools/dev-server.mjs                 static site + /api/contact, email delivery OFF
//   MOCK_EMAIL=ok   node tools/dev-server.mjs email ON, delivery faked as accepted (nothing leaves the machine)
//   MOCK_EMAIL=fail node tools/dev-server.mjs email ON, delivery faked as failing
//   PORT=5671 (default)
//
// With real RESEND_API_KEY and CONTACT_TO_EMAIL in the environment and no MOCK_EMAIL,
// it sends real email through Resend, exactly as the Vercel function would.
import http from "node:http";
import { createRequire } from "node:module";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const handler = createRequire(import.meta.url)("../api/contact.js");
const PORT = Number(process.env.PORT || 5671);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json" };

const mock = process.env.MOCK_EMAIL;
const sent = [];
const deps = mock
  ? {
      env: { RESEND_API_KEY: "mock", CONTACT_TO_EMAIL: "inbox@example.test" },
      fetch: async (url, init) => { sent.push(JSON.parse(init.body)); return { ok: mock === "ok", status: mock === "ok" ? 200 : 500 }; },
    }
  : {};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/contact" || url.pathname === "/api/contact/") {
    return handler(req, res, deps);
  }
  if (url.pathname === "/__mock/sent") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(sent));
  }
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root)) { res.statusCode = 403; return res.end(); }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const body = await readFile(file);
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(await readFile(path.join(root, "404.html")));
  }
}).listen(PORT, "127.0.0.1", () => console.log(`Kal’s Digital preview with API on http://127.0.0.1:${PORT} (email: ${mock ? "mock " + mock : "environment"})`));
