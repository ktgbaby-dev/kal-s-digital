// Kal’s Digital project-enquiry endpoint (Vercel Node.js function, no dependencies).
//
//   GET  /api/contact  -> { email: true|false }  tells the page whether email delivery is set up
//   POST /api/contact  -> sends the enquiry to the Kal’s Digital inbox through Resend
//
// Email delivery is OFF until both of these environment variables are set on the
// kal-s-digital Vercel project (never in code):
//   RESEND_API_KEY      a Resend API key created for this website only
//   CONTACT_TO_EMAIL    the inbox that receives enquiries
// Optional:
//   CONTACT_FROM_EMAIL  verified sender, e.g. "Kal’s Digital <website@your-domain>".
//                       Defaults to Resend's test sender, which can only deliver to the
//                       Resend account's own address.
//
// While delivery is off the page uses its WhatsApp route instead. This endpoint never
// touches Slotù's inbox, Blob stores or keys.

"use strict";

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Kal’s Digital website <onboarding@resend.dev>";
const INTERESTS = { general: "General digital services", kard: "KARD", slotu: "Slotù", other: "Something else" };
const LIMITS = { name: 120, business: 160, email: 200, phone: 40, message: 4000 };
const RATE = { windowMs: 10 * 60 * 1000, max: 5 };
const hits = new Map(); // best effort, per function instance

function isConfigured(env) {
  return Boolean(env.RESEND_API_KEY && env.CONTACT_TO_EMAIL);
}

function clean(value, max) {
  return String(value == null ? "" : value).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max + 1);
}

function validate(input) {
  const body = input && typeof input === "object" ? input : {};
  const data = {
    name: clean(body.name, LIMITS.name),
    business: clean(body.business, LIMITS.business),
    email: clean(body.email, LIMITS.email),
    phone: clean(body.phone, LIMITS.phone),
    interest: clean(body.interest, 20),
    message: clean(body.message, LIMITS.message),
  };
  const errors = {};
  if (!data.name) errors.name = "Please tell us your name.";
  else if (data.name.length > LIMITS.name) errors.name = "Please shorten your name.";
  if (data.business.length > LIMITS.business) errors.business = "Please shorten the business name.";
  if (!data.email) errors.email = "Please add an email address so we can reply.";
  else if (data.email.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = "That email address doesn’t look complete. Check it and try again.";
  if (data.phone && (data.phone.length > LIMITS.phone || !/^[+\d][\d\s()-]{6,}$/.test(data.phone))) errors.phone = "Use digits only, for example 0803 123 4567 or +234 803 123 4567.";
  if (!Object.prototype.hasOwnProperty.call(INTERESTS, data.interest)) errors.interest = "Choose what you’re interested in.";
  if (data.message.length < 10) errors.message = "Tell us a little about the project, in a sentence or two.";
  else if (data.message.length > LIMITS.message) errors.message = "Please keep the message under 4,000 characters.";
  return { ok: Object.keys(errors).length === 0, errors, data };
}

function buildEmail(data, env) {
  const interest = INTERESTS[data.interest];
  const lines = [
    "New project enquiry from the Kal’s Digital website",
    "",
    "Name: " + data.name,
    "Business: " + (data.business || "not given"),
    "Email: " + data.email,
    "Phone/WhatsApp: " + (data.phone || "not given"),
    "Interested in: " + interest,
    "",
    data.message,
  ];
  return {
    from: env.CONTACT_FROM_EMAIL || DEFAULT_FROM,
    to: [env.CONTACT_TO_EMAIL],
    reply_to: data.email,
    subject: "Website enquiry: " + interest + " · " + (data.business || data.name),
    text: lines.join("\n"),
  };
}

function rateLimited(ip, now) {
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > RATE.max;
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") return parseText(req.body, req.headers["content-type"]);
    if (Buffer.isBuffer(req.body)) return parseText(req.body.toString("utf8"), req.headers["content-type"]);
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) throw Object.assign(new Error("too large"), { status: 413 });
    chunks.push(chunk);
  }
  return parseText(Buffer.concat(chunks).toString("utf8"), req.headers["content-type"]);
}

function parseText(text, type) {
  if (/application\/x-www-form-urlencoded/i.test(type || "")) return Object.fromEntries(new URLSearchParams(text));
  try { return JSON.parse(text || "{}"); } catch { return null; }
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

// Plain HTML answer for the rare visitor whose browser posts the form without JavaScript.
function sendPage(res, status, title, text) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · Kal’s Digital</title><body><main><h1>${title}</h1><p>${text}</p><p><a href="/contact/">Back to the contact page</a></p></main></body></html>`);
}

async function handler(req, res, deps = {}) {
  const env = deps.env || process.env;
  const fetchImpl = deps.fetch || globalThis.fetch;
  const now = deps.now ? deps.now() : Date.now();

  if (req.method === "GET" || req.method === "HEAD") return send(res, 200, { email: isConfigured(env) });
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const wantsHtml = !/application\/json/i.test(req.headers["content-type"] || "");
  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return send(res, err.status || 400, { ok: false, error: "bad_request" });
  }
  if (!body || typeof body !== "object") return send(res, 400, { ok: false, error: "bad_request" });

  // Bot trap: a hidden field people never fill. Pretend success, send nothing.
  if (clean(body.company_website, 200)) return wantsHtml ? sendPage(res, 200, "Thank you", "Your message has been received.") : send(res, 200, { ok: true });

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  if (rateLimited(ip, now)) return send(res, 429, { ok: false, error: "rate_limited" });

  const result = validate(body);
  if (!result.ok) {
    return wantsHtml
      ? sendPage(res, 400, "Some details are missing", "Please go back and check the form: " + Object.values(result.errors).join(" "))
      : send(res, 400, { ok: false, errors: result.errors });
  }

  if (!isConfigured(env)) {
    return wantsHtml
      ? sendPage(res, 503, "Message not sent", "Email delivery is not set up on this website yet, so nothing was sent. Please message us on WhatsApp on 0808 881 2532 or call 0903 292 3267.")
      : send(res, 503, { ok: false, error: "not_configured" });
  }

  try {
    const r = await fetchImpl(RESEND_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(buildEmail(result.data, env)),
    });
    if (!r.ok) {
      console.error("contact: delivery failed with status", r.status);
      return wantsHtml
        ? sendPage(res, 502, "Message not sent", "Your message could not be delivered, and nothing reached us. Please message us on WhatsApp on 0808 881 2532.")
        : send(res, 502, { ok: false, error: "delivery_failed" });
    }
  } catch (err) {
    console.error("contact: delivery error", err && err.name);
    return send(res, 502, { ok: false, error: "delivery_failed" });
  }
  return wantsHtml ? sendPage(res, 200, "Thank you", "Your enquiry reached the Kal’s Digital inbox. We will reply as soon as we can.") : send(res, 200, { ok: true });
}

module.exports = handler;
module.exports.validate = validate;
module.exports.buildEmail = buildEmail;
module.exports.isConfigured = isConfigured;
module.exports._resetRateLimit = () => hits.clear();
